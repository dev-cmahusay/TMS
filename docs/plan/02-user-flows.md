# 02 — User Flows and Screens

Use case IDs refer to [01-use-cases.md](01-use-cases.md). Visual design comes from `design-system/tms/` and is not specified here.

## Flow 1 — Public request (UC-01, UC-02)

```mermaid
flowchart TD
    A["Customer opens / (request form)"] --> B{"Active categories exist?"}
    B -- No --> B1["Show: form temporarily unavailable"]
    B -- Yes --> C["Fill name, email, phone, category, description, consent"]
    C --> D{"Images selected?"}
    D -- Yes --> E{"Type JPEG/PNG/WebP and count <= 3?"}
    E -- No --> E1["Field error: type or count message"] --> D
    E -- Yes --> F{"Original <= 25 MB?"}
    F -- No --> F1["Error: image too large"] --> D
    F -- Yes --> G["Resize in browser: 1600 px, JPEG 0.85"]
    G --> H{"Resize OK and result <= 5 MB?"}
    H -- No --> H1["Error: could not prepare / must be 5 MB or smaller"] --> D
    H -- Yes --> I
    D -- No --> I["Client validation with shared schema"]
    I -- Invalid --> I1["Inline field errors"] --> C
    I -- Valid --> J["Submit: action create"]
    J --> K{"Turnstile valid?"}
    K -- No --> K1["Error: could not verify you are human; reset widget"] --> C
    K -- Yes --> L{"Rate limit OK? 20/IP/h and 5/email/h"}
    L -- No --> L1["Error: too many requests from your network"]
    L -- Yes --> M{"Server validation OK?"}
    M -- No --> M1["Field errors, values kept"] --> C
    M -- Yes --> N["Insert ticket + system message"]
    N -- DB error --> N1["Error: something went wrong; log to Sentry"]
    N --> O["Send confirmation email"]
    O -- Fails --> O1["email_status = failed; log to Sentry"] --> P
    O -- OK --> P["Return ref, ticketId, signed upload URLs"]
    P --> Q{"Any images?"}
    Q -- No --> S["Success screen with ref and masked email"]
    Q -- Yes --> R["Upload each image to its signed URL"]
    R --> R2["Action finalize: verify size + magic bytes, record attachments"]
    R2 --> R3{"All images recorded?"}
    R3 -- Yes --> S
    R3 -- No --> S2["Success screen + Alert: N image(s) could not be uploaded"]
```

Edge notes:

- **Double click:** submit button disabled while the action runs; a reused Turnstile token fails verification server-side.
- **Finalize window:** only accepted within 30 minutes of ticket creation and only for paths under `tickets/<ticketId>/`.
- **Shared school IP:** the IP limit is 20/hour because the whole school may share one public IP; Turnstile is the main bot defense.

## Flow 2 — Agent handling a ticket (UC-03 to UC-09)

```mermaid
flowchart TD
    A["Agent opens /app/..."] --> B{"Signed in and profile active?"}
    B -- No session --> B1["Redirect /login?next=path"] --> B2{"Credentials OK?"}
    B2 -- No --> B3["Error: incorrect email or password"] --> B1
    B2 -- Inactive --> B4["Sign out; error: account disabled"]
    B2 -- Yes --> C
    B -- Yes --> C["Dashboard /app"]
    C --> D["Tickets /app/tickets?status=open"]
    D --> E["Ticket detail /app/tickets/TK-000123"]
    E --> F{"Action"}
    F -- "Assign / status / priority" --> G{"Transition allowed?"}
    G -- No --> G1["Error: you can't move a ticket from X to Y"] --> E
    G -- Yes --> G2{"Target is waiting_on_customer and no reply?"}
    G2 -- Yes --> G3["Error: add a reply telling the customer what you need"] --> E
    G2 -- No --> H{"updated_at unchanged since load?"}
    H -- No --> H1["Error: changed by someone else. Reload."] --> E
    H -- Yes --> I["Save; auto-assign current agent if needed"]
    I --> I2{"New status resolved?"}
    I2 -- Yes --> N["Notification flow: resolved email"]
    I2 -- No --> E
    F -- "Internal note" --> J["Insert note, is_internal = true, no email"] --> E
    F -- "Reply to customer" --> K["Insert reply, is_internal = false"] --> N2["Notification flow: reply email"]
    F -- "Reopen (resolved)" --> L["resolved -> in_progress, clear resolved_at"] --> E
```

Edge notes:

- **Two agents edit the same ticket:** ticket field updates use an `updated_at` check (optimistic concurrency). Notes and replies are append-only, so both succeed and appear in order.
- **Inactive assignee:** existing tickets keep the assignee, shown as "Name (inactive)"; the assignee dropdown lists active staff only.

## Flow 3 — Notification (UC-02, UC-10, UC-14)

```mermaid
flowchart TD
    A["Trigger: ticket created / reply sent / status set to resolved"] --> B["Insert non-internal message with email_status = pending"]
    B --> C{"EMAIL_MODE"}
    C -- log --> C1["Log email to server console; email_status = sent"]
    C -- fail --> C2["email_status = failed (test mode)"]
    C -- live --> D["POST to Resend API, 5 s timeout"]
    D -- "2xx" --> E["email_status = sent"]
    D -- "Error or timeout" --> F["email_status = failed; Sentry event without body"]
    F --> G["Thread shows: Email not sent - copy the reply and email the customer"]
    E --> H["Customer receives email; Reply-To = IT inbox"]
    H --> I{"Customer replies?"}
    I -- No --> Z["Done"]
    I -- Yes --> J["Reply lands in SUPPORT_INBOX_EMAIL, outside the system"]
    J --> K{"Ticket resolved?"}
    K -- No --> K1["Agent adds internal note with the relevant content"]
    K -- Yes --> K2["Agent clicks Reopen, then adds internal note"]
```

Edge notes:

- **Customer replies to a resolved ticket:** handled outside the app (D1). The agent reopens manually. Nothing is automated.
- **No automatic retries** (keeps within Resend Free: 100 emails/day, 3,000/month).

## Screen list

| Screen | Route | Purpose | Who | Links to |
| --- | --- | --- | --- | --- |
| Request form | `/` | Submit a ticket with images; shows success state with ref after submit | Anyone | Privacy notice |
| Privacy notice | `/privacy` | What data is collected, why, who sees it, retention, contact (Data Privacy Act of 2012) | Anyone | Request form |
| Sign in | `/login` | Staff email + password sign-in | Staff | `/app` (after sign in) |
| Dashboard | `/app` | Open count, avg resolution (30 days), per-agent counts | Agent, Admin | Ticket list (each status count links to `/app/tickets?status=…`) |
| Ticket list | `/app/tickets` | List, filter by status, Mine toggle, pagination | Agent, Admin | Ticket detail |
| Ticket detail | `/app/tickets/[ref]` | Fields, attachments, thread, assign/status/priority, note/reply composer, reopen | Agent, Admin | Ticket list (back), mailto customer |
| Categories | `/app/admin/categories` | Add, rename, reorder, activate/deactivate | Admin | Dashboard |
| Team | `/app/admin/team` | Edit name, role, active; instructions to add users in Supabase | Admin | Dashboard |
| Not found | (error page) | 404 "Page not found." / "Ticket not found." | Anyone | `/` or `/app` |
| Forbidden | (error page) | 403 "You don't have access to this page." | Staff | `/app` |
| Health | `/health` | Plain `ok` for UptimeRobot (no UI) | Monitor | — |

AppShell navigation (staff): Dashboard, Tickets; Admin only: Categories, Team; user name + **Sign out**.
PublicShell: school name / "IT Help Desk" header, form or privacy content, footer link to Privacy notice.
