# 04 — Data and Security

Migrations live in `supabase/migrations/`. Types generated to `src/lib/database.types.ts`. All timestamps are `timestamptz` (UTC).

> **Deviation from AGENTS.md data model (needs approval):**
> 1. `tickets.category` becomes `tickets.category_id` → FK to a new `categories` table (required by D5: admin-editable categories).
> 2. New column `ticket_messages.email_status` (tracks delivery, assumption A3/A4).
> 3. New column `profiles.is_active` (deactivate staff without deleting auth users).
> 4. New table `rate_limits` (D4).

## Tables

### `profiles`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text | NOT NULL, CHECK `char_length(full_name) BETWEEN 2 AND 100` |
| `role` | text | NOT NULL DEFAULT `'agent'`, CHECK `role IN ('agent','admin')` |
| `is_active` | boolean | NOT NULL DEFAULT `true` |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` |

- Trigger `on_auth_user_created` (AFTER INSERT on `auth.users`): inserts profile with `full_name = coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1))`, `role = 'agent'`.
- Trigger `profiles_protect_self`: rejects an update where `id = auth.uid()` changes `role` or `is_active` ("You can't change your own role or deactivate your own account.").

### `categories`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | smallint | PK, GENERATED ALWAYS AS IDENTITY |
| `name` | text | NOT NULL, CHECK `char_length(name) BETWEEN 2 AND 50` |
| `is_active` | boolean | NOT NULL DEFAULT `true` |
| `sort_order` | integer | NOT NULL DEFAULT `0` |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT `now()` |

- Unique index `categories_name_lower_uq` on `lower(name)`.
- Seed (A7): 8 school categories, `sort_order` 10, 20, … 80.
- "Keep at least one active category" enforced in the server action (and a trigger raising the same message).

### `tickets`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK DEFAULT `gen_random_uuid()` |
| `ref` | text | NOT NULL UNIQUE DEFAULT `'TK-' \|\| lpad(nextval('ticket_ref_seq')::text, 6, '0')` |
| `customer_name` | text | NOT NULL, CHECK length 2–100 |
| `customer_email` | text | NOT NULL, CHECK length ≤ 254 AND `customer_email = lower(customer_email)` AND `customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'` |
| `customer_phone` | text | NULL, CHECK `customer_phone ~ '^[0-9+()\-\s]{7,20}$'` |
| `category_id` | smallint | NOT NULL, FK → `categories(id)` ON DELETE RESTRICT |
| `description` | text | NOT NULL, CHECK length 10–5000 |
| `status` | text | NOT NULL DEFAULT `'new'`, CHECK IN (`new`,`assigned`,`in_progress`,`waiting_on_customer`,`resolved`) |
| `priority` | text | NOT NULL DEFAULT `'normal'`, CHECK IN (`low`,`normal`,`high`,`urgent`) |
| `assignee_id` | uuid | NULL, FK → `profiles(id)` ON DELETE SET NULL |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT `now()` |
| `resolved_at` | timestamptz | NULL |

- CHECK `tickets_status_assignee_ck`: `(status = 'new') = (assignee_id IS NULL)`
- CHECK `tickets_resolved_at_ck`: `(status = 'resolved') = (resolved_at IS NOT NULL)`
- Indexes: `(status, created_at DESC)`, `(assignee_id, status)`, `(resolved_at)` WHERE `resolved_at IS NOT NULL`.
- Trigger `tickets_before_update`: rejects transitions not in the table below; sets `resolved_at = now()` when entering `resolved`, `NULL` when leaving; sets `updated_at = now()`.

Note on `ON DELETE SET NULL` for `assignee_id`: it would violate the status/assignee CHECK on a non-new ticket. Staff are deactivated, never deleted (UC-13), so this path is not used; the FK stays as a safety net and a delete would fail loudly (acceptable).

### `ticket_messages`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK DEFAULT `gen_random_uuid()` |
| `ticket_id` | uuid | NOT NULL, FK → `tickets(id)` ON DELETE CASCADE |
| `author_id` | uuid | NULL (= system), FK → `profiles(id)` |
| `body` | text | NOT NULL, CHECK length 1–5000 |
| `is_internal` | boolean | NOT NULL DEFAULT `false` |
| `email_status` | text | NULL, CHECK IN (`pending`,`sent`,`failed`) |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` |

- CHECK `messages_email_status_ck`: `NOT is_internal OR email_status IS NULL` (internal notes never have an email status).
- Index: `(ticket_id, created_at)`.

### `ticket_attachments`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK DEFAULT `gen_random_uuid()` |
| `ticket_id` | uuid | NOT NULL, FK → `tickets(id)` ON DELETE CASCADE |
| `storage_path` | text | NOT NULL UNIQUE, CHECK `storage_path ~ '^tickets/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg\|png\|webp)$'` |
| `mime_type` | text | NOT NULL, CHECK IN (`image/jpeg`,`image/png`,`image/webp`) |
| `size_bytes` | integer | NOT NULL, CHECK `size_bytes BETWEEN 1 AND 5242880` |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` |

- Index: `(ticket_id)`.
- Trigger `enforce_max_attachments` (BEFORE INSERT): raises if the ticket already has 3 rows.

### `rate_limits`

| Column | Type | Constraints |
| --- | --- | --- |
| `key` | text | NOT NULL (SHA-256 hex of `ip:<addr>` or `email:<lowercase>`) |
| `window_start` | timestamptz | NOT NULL (`date_trunc('hour', now())`) |
| `count` | integer | NOT NULL DEFAULT 0 |

- PK `(key, window_start)`.
- Function `check_rate_limit(p_key text, p_limit int)` — `SECURITY DEFINER`, `SET search_path = public`: upserts and increments the counter for the current hour, returns `count <= p_limit`. `EXECUTE` revoked from `anon` and `authenticated`, granted to `service_role` only.
- Cleanup: the same function deletes rows with `window_start < now() - interval '1 day'` (cheap, no cron needed).

### Helper functions

```sql
-- SECURITY DEFINER, STABLE, SET search_path = public
is_staff(): exists (select 1 from profiles where id = auth.uid() and is_active)
is_admin(): exists (select 1 from profiles where id = auth.uid() and is_active and role = 'admin')
```

### Dashboard

Function `dashboard_stats()` — `SECURITY INVOKER` (RLS applies), returns open counts per status, average resolution seconds for the last 30 days, and per-assignee open / resolved-30-day counts. Formatting (`3h 0m`) happens in TypeScript.

## Status transitions

Shared source of truth: `src/lib/tickets/transitions.ts` (`ALLOWED_TRANSITIONS`), mirrored by the DB trigger. (Status colors stay in `src/lib/ui/status.ts`, used by `Badge` only.)

| From \ To | new | assigned | in_progress | waiting_on_customer | resolved |
| --- | --- | --- | --- | --- | --- |
| **new** | — | yes (assignee set) | yes¹ | yes¹ ² | yes¹ |
| **assigned** | yes (unassign) | — | yes | yes² | yes |
| **in_progress** | yes (unassign) | yes | — | yes² | yes |
| **waiting_on_customer** | yes (unassign) | no | yes | — | yes |
| **resolved** | no | no | yes (reopen) | no | — |

¹ Server auto-assigns the current user if no assignee is chosen (keeps the invariant).
² Requires a customer reply in the same submission (server rule; DB does not check).

Reassigning (changing `assignee_id` between two staff) keeps the status. Assignee cannot change while `resolved`.

## Row-level security (RLS ON for every table, default deny)

"Staff" = authenticated user with an active profile (`is_staff()`). "Service role" bypasses RLS and is used only from `$lib/server`.

| Table | anon | Agent (staff) | Admin | Service role (server only) |
| --- | --- | --- | --- | --- |
| `profiles` | none | SELECT all rows | SELECT all; UPDATE `full_name`, `role`, `is_active` of any row (trigger blocks self role/active) | — (insert via auth trigger) |
| `categories` | SELECT where `is_active` | SELECT all | SELECT, INSERT, UPDATE | — |
| `tickets` | none | SELECT all, UPDATE all | same as agent | INSERT (public form) |
| `ticket_messages` | none | SELECT all; INSERT where `author_id = auth.uid()` | same as agent | INSERT system messages; UPDATE `email_status` |
| `ticket_attachments` | none | SELECT all | same as agent | INSERT, DELETE |
| `rate_limits` | none | none | none | via `check_rate_limit` only |

No DELETE policies for anyone except service role on attachments. No UPDATE on messages for staff (messages are immutable; `email_status` updates go through the service role).

Example (to remove ambiguity):

```sql
create policy tickets_staff_select on tickets for select to authenticated using (is_staff());
create policy tickets_staff_update on tickets for update to authenticated using (is_staff()) with check (is_staff());
create policy messages_staff_insert on ticket_messages for insert to authenticated
  with check (is_staff() and author_id = auth.uid());
create policy categories_public_select on categories for select to anon using (is_active);
```

## Storage

- Bucket **`ticket-attachments`**: `public = false`, `file_size_limit = 5242880`, `allowed_mime_types = ['image/jpeg','image/png','image/webp']`.
- Path: `tickets/{ticket_id}/{uuid}.{ext}`, generated on the server; `ext` from the declared type (`jpg`/`png`/`webp`). Never the original filename.
- `storage.objects` policies:
  - SELECT for `authenticated` where `bucket_id = 'ticket-attachments' AND is_staff()` (needed to create signed view URLs with the user's session).
  - No INSERT/UPDATE/DELETE policies for `anon` or `authenticated`. Uploads use signed upload URLs created by the service role; deletes only by the service role in finalize.
- View URLs: `createSignedUrls(paths, 600)` in the ticket detail loader.

## Secrets and config

| Name | Where | Public? |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | env | Yes (safe by design, RLS protects data) |
| `PUBLIC_TURNSTILE_SITE_KEY` | env | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare secret | **No** — imported only in `src/lib/server/supabase-admin.ts` |
| `TURNSTILE_SECRET_KEY` | Cloudflare secret | No |
| `RESEND_API_KEY` | Cloudflare secret | No |
| `EMAIL_FROM`, `SUPPORT_INBOX_EMAIL`, `EMAIL_MODE` (`live`/`log`/`fail`) | env | No |
| `RATE_LIMIT_IP_PER_HOUR` (default 20), `RATE_LIMIT_EMAIL_PER_HOUR` (default 5) | env | No |
| `SENTRY_DSN` | env | Yes (DSN is not secret) |

`.env` is git-ignored; `.env.example` lists names only.

## Threats — public form and uploads

| # | Threat | Mitigation |
| --- | --- | --- |
| T1 | Bot spam floods tickets | Turnstile verified server-side (siteverify with secret + `CF-Connecting-IP`); rate limit 20/IP/h and 5/email/h. |
| T2 | Whole school blocked because everyone shares one NAT IP | IP limit set to 20/h (configurable via env); per-email limit catches single-person abuse. |
| T3 | Someone floods a victim's inbox using their email | 5/email/h limit; confirmation contains only ref, category and the submitted text. |
| T4 | Direct anonymous DB insert bypassing the form | No anon INSERT policy on `tickets`; only the service role inserts. |
| T5 | Oversized upload | Bucket `file_size_limit` 5 MB; finalize re-checks size; browser resize. Files never pass through the Worker. |
| T6 | Malicious file disguised as image (HTML, SVG, executable) | MIME allowlist on bucket; magic-byte check in finalize; invalid objects deleted; SVG not allowed; images served via signed URL from Supabase Storage, never inlined as HTML. |
| T7 | Path traversal / overwriting another ticket's files | Paths generated on the server with UUIDs; each signed upload URL is for one exact path; finalize only accepts paths under `tickets/{ticketId}/`; CHECK constraint on `storage_path`. |
| T8 | Attaching files to someone else's ticket via finalize | Requires the ticket UUID (returned only to the submitter); 30-minute window; max 3 (trigger); the object must already exist from a signed URL issued for that ticket. |
| T9 | Stored XSS via name/description | Svelte escaping; no `{@html}` anywhere (lint rule / grep check); email HTML escapes user text; plain-text part included. |
| T10 | Email header injection via name | Resend JSON API (no raw headers); name used only in the body; CR/LF stripped by the schema's trim + `z.string().regex(/^[^\r\n]*$/)`. |
| T11 | Service role key leak | Only in `$lib/server` (SvelteKit blocks client import); CI grep check that `SUPABASE_SERVICE_ROLE_KEY` appears only in allowed files; never `PUBLIC_`. |
| T12 | Ticket enumeration | UUID primary keys for anything public; refs only used in staff routes; no public status page. |
| T13 | Signed URL sharing | View URLs expire in 600 s; bucket is private. |
| T14 | CSRF on staff actions | SvelteKit form-action origin check (default on); session cookies `SameSite=Lax`. |
| T15 | Brute-force staff login | Supabase Auth built-in rate limits; generic error message; no account enumeration. |
| T16 | Personal data of minors / Data Privacy Act (RA 10173) | Form intended for staff (D6); privacy notice page + required consent checkbox; minimal fields; data in Supabase Singapore region (document in privacy notice). Retention policy is an open question (06). |
| T17 | Spoofed client IP | Use only the `CF-Connecting-IP` header (set by Cloudflare), never `X-Forwarded-For` from the client. |
