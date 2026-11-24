# 03 — System Flow

## Components and trust boundaries

| Zone | What runs there | Trust |
| --- | --- | --- |
| **Browser** | SvelteKit pages, client validation, image resize, Turnstile widget, direct upload to signed URLs | **Untrusted.** Everything it sends is re-validated. |
| **Cloudflare Worker** (SvelteKit server: `+page.server.ts`, `hooks.server.ts`, `$lib/server/*`) | Form actions, loaders, Turnstile verify, rate limiting, Supabase calls, email sending | **Trusted.** Holds secrets (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`). |
| **Supabase** (Postgres, Auth, Storage — Singapore) | Data, RLS, constraints, triggers, private bucket | **Trusted, last line of defense.** RLS + CHECK constraints + triggers enforce rules even if app code is wrong. Service role bypasses RLS, so it is used only in specific server actions. |
| **External services** | Cloudflare Turnstile siteverify, Resend API, Sentry | Trusted for their single job; failures handled. |

Two Supabase clients on the server:

- `locals.supabase` — per-request client with the user's session cookies (anon key + user JWT). Used for **all staff reads and writes** so RLS applies.
- `supabaseAdmin` in `src/lib/server/supabase-admin.ts` — service role. Used **only** for: anonymous ticket creation, rate-limit RPC, issuing signed upload URLs, finalize verification, attachment inserts, system messages, and `email_status` updates.

## Where validation happens

| Check | Browser | Worker | Database / Storage |
| --- | --- | --- | --- |
| Field rules (lengths, email, phone) | Shared Zod schema (UX only) | **Same schema, authoritative** | CHECK constraints (backstop) |
| Category is active | Select options | Lookup active category | FK to `categories` |
| Human check | Turnstile widget | **siteverify** (token, secret, remote IP) | — |
| Rate limit | — | **RPC `check_rate_limit`** | Table + function |
| Image type / size | Accept list, resize, size check | **Finalize: HEAD size + first 16 bytes magic check** | Bucket `allowed_mime_types` + `file_size_limit` 5 MB |
| Max 3 images | UI | Count in finalize | Trigger `enforce_max_attachments` |
| Status transitions | Only offers allowed targets | **Shared `ALLOWED_TRANSITIONS` map** | Trigger `tickets_before_update` |
| Status/assignee invariant | — | Auto-assign logic | CHECK `(status = 'new') = (assignee_id IS NULL)` |
| Concurrency | Hidden `expected_updated_at` | `UPDATE … WHERE updated_at = $expected` | — |
| Role (admin pages) | Nav hides links | `+layout.server.ts` returns 403 | RLS `is_admin()` |
| Output escaping | Svelte escapes by default; no `{@html}` | Email templates escape user text | — |
| CSRF | — | SvelteKit built-in origin check on form actions | — |

## Sequence 1 — Ticket creation

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer browser
    participant W as SvelteKit action create (Worker)
    participant T as Turnstile siteverify
    participant DB as Supabase Postgres (service role)
    participant ST as Supabase Storage
    participant R as Resend API

    C->>W: POST form fields + turnstile token + image count/types
    W->>T: verify(token, secret, CF-Connecting-IP)
    T-->>W: success true/false
    alt Turnstile failed
        W-->>C: 400 "We couldn't verify you're human..."
    end
    W->>DB: rpc check_rate_limit(sha256 ip, 20, 3600) and (sha256 email, 5, 3600)
    DB-->>W: allowed true/false
    alt Limit exceeded
        W-->>C: 429 "Too many requests from your network..."
    end
    W->>W: Validate with shared schema (authoritative)
    W->>DB: insert tickets (status new, priority normal) returning id, ref
    W->>DB: insert ticket_messages (author null, "Request received.", email_status pending)
    loop each declared image (max 3)
        W->>ST: createSignedUploadUrl(tickets/{id}/{uuid}.{ext})
        ST-->>W: signed URL + token
    end
    W->>R: send confirmation (5 s timeout)
    R-->>W: 2xx or error
    W->>DB: update message email_status sent/failed
    W-->>C: 200 { ref, ticketId, uploads[] }
```

## Sequence 2 — Image upload with signed URLs

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer browser
    participant ST as Supabase Storage (private bucket)
    participant W as SvelteKit action finalize (Worker)
    participant DB as Supabase Postgres (service role)

    Note over C: Images already resized in browser (1600 px, JPEG 0.85, <= 5 MB)
    loop each image
        C->>ST: PUT file to signed upload URL
        ST-->>C: 200, or 4xx (size/mime rejected by bucket)
    end
    C->>W: POST ticketId + list of uploaded paths
    W->>DB: select ticket created_at, attachment count
    alt Older than 30 min or count would exceed 3 or path not under tickets/{ticketId}/
        W-->>C: 400 partial-upload message
    end
    loop each path
        W->>ST: HEAD object (size, content-type)
        W->>ST: GET bytes 0-15 (Range)
        W->>W: Check magic bytes JPEG/PNG/WebP and size <= 5,242,880
        alt Invalid
            W->>ST: delete object
        else Valid
            W->>DB: insert ticket_attachments(path, mime_type, size_bytes)
        end
    end
    W-->>C: 200 { recorded: n, failed: m }
```

Assumption: Supabase Storage honours the HTTP `Range` header on authenticated downloads. Fallback if not: download the whole object (≤ 5 MB; network I/O, not CPU) and read the first 16 bytes.

## Sequence 3 — Agent update with notification

```mermaid
sequenceDiagram
    autonumber
    actor A as Agent browser
    participant W as SvelteKit action update / message (Worker)
    participant DB as Supabase Postgres (user session, RLS)
    participant DBA as Supabase Postgres (service role)
    participant R as Resend API

    A->>W: POST status, priority, assignee, expected_updated_at, optional reply text
    W->>W: Validate schema + ALLOWED_TRANSITIONS + waiting needs reply
    W->>DB: UPDATE tickets SET ... WHERE id = $id AND updated_at = $expected RETURNING *
    alt 0 rows
        W-->>A: 409 "This ticket was changed by someone else. Reload..."
    end
    Note over DB: Trigger checks transition, sets resolved_at, updated_at
    opt Reply text present, or new status = resolved
        W->>DB: insert ticket_messages (is_internal false, author = agent, email_status pending)
        W->>R: send email (5 s timeout)
        R-->>W: 2xx or error
        W->>DBA: update email_status sent/failed
    end
    W-->>A: 200, page reloads data via loader
```

Note: the two writes (ticket update + message insert) are not in one transaction because supabase-js has no client transactions. Order is update first, then message. If the message insert fails after the update succeeded, the agent sees "Status saved, but the reply was not saved. Please send it again." (Assumption: acceptable for MVP; alternative is a single Postgres RPC — see 06.)

## Cloudflare Workers limits and how the design fits

| Limit (Free plan) | Design response |
| --- | --- |
| **10 ms CPU per request** | All heavy work is network I/O (Turnstile, Supabase, Resend, Storage), which counts as wall time, not CPU. No image processing on the server: resize happens in the browser. Magic-byte check reads 16 bytes. No PDF, no zip, no crypto beyond one SHA-256 of IP/email (Web Crypto, microseconds). |
| **No local disk** | Nothing written to the filesystem. Files go browser → Storage directly; data in Postgres; logs to Sentry/console. |
| **No Node-only APIs** | Use Web APIs only: `fetch`, `crypto.subtle`, `Request/Response`. supabase-js and Zod run on Workers. Resend called with `fetch` (no SDK needed). |
| **Request body size** | Images never pass through the Worker, so the form POST is a few KB. |
| **Subrequests (50 per request on Free)** | Create action ≈ 10 subrequests (1 Turnstile + 2 rate-limit + 2 inserts + up to 3 signed URLs + 1 email + 1 status update). Finalize ≈ 10 (1 select + 3 × (HEAD + GET + insert/delete)). |
| **Worker script size (3 MB compressed on Free)** | Keep dependencies minimal; check `wrangler deploy --dry-run` size in Slice 12 after adding Sentry. |
| **100,000 requests/day** | A school help desk uses a tiny fraction; UptimeRobot every 5 min = 288/day. |
