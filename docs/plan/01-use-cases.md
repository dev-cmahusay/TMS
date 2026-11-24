# 01 — Use Cases (MVP)

Binding source: [AGENTS.md](../../AGENTS.md). If this file conflicts with it, AGENTS.md wins.

## Decisions applied (from planning Q&A, 2026-11-24)

| # | Topic | Decision |
| --- | --- | --- |
| D1 | Customer replies | No inbound email. Notification emails set `Reply-To` to the school IT inbox (`SUPPORT_INBOX_EMAIL`). Agents read replies there and act in the app. |
| D2 | Staff accounts | Supabase Auth email + password. Accounts are created in the Supabase dashboard; a trigger creates the `profiles` row with role `agent`. No self sign-up. |
| D3 | Roles | Two roles: `agent` and `admin`. **Interpreted from answer "2" — confirm.** All staff see and work all tickets. Admin additionally manages categories and the team (name, role, active). |
| D4 | Rate limiting | Postgres table + RPC called only by the server action (service role). No new dependency. |
| D5 | Categories | Admin can create, rename, reorder and deactivate categories in the app (no hard delete). Priorities stay a fixed list: `low`, `normal`, `high`, `urgent`. |
| D6 | First client | A Philippine public high school. Reporters are school staff (teachers, office staff). Students report through their adviser (**assumption — see 06**). |
| D7 | Cost | Free tiers only: Cloudflare Workers Free, Supabase Free, Resend Free, Turnstile, Sentry Developer, UptimeRobot Free. See 06 for the email-domain cost risk. |

## Assumptions (not facts)

- A1. Ticket ref format `TK-000001` (6-digit, zero-padded, from a Postgres sequence).
- A2. "Customer-visible update" means: (a) a reply to the customer, (b) status changed to `resolved`. Status changes to `assigned`, `in_progress`, `waiting_on_customer` and reopen are internal and send no email on their own. Moving to `waiting_on_customer` requires a reply in the same action, so the customer is still told.
- A3. Every outgoing email corresponds to one `ticket_messages` row with `is_internal = false`, so delivery status is visible in the thread.
- A4. Email failures never roll back the ticket or message. The message gets `email_status = 'failed'` and the error goes to Sentry.
- A5. UI text in English; dates shown in Asia/Manila; stored in UTC.
- A6. Customer email is required (only notification channel); phone is optional.
- A7. Seed categories for a school (admin can edit later): `Computer / Laptop`, `Projector / TV`, `Internet / Wi-Fi`, `Printer / Scanner`, `Account / Password`, `Software / Installation`, `CCTV / Bell / PA System`, `Other`.

## Actors

| Actor | Description | Auth |
| --- | --- | --- |
| Customer | School staff member reporting a problem. Anonymous. | None (Turnstile + rate limit) |
| Agent | IT staff (e.g., ICT teacher) handling tickets. | Supabase Auth, `profiles.role = 'agent'`, `is_active = true` |
| Admin | ICT coordinator. Everything an agent can do + categories + team. | Supabase Auth, `profiles.role = 'admin'`, `is_active = true` |
| System | Server actions, DB triggers, email sender. | Service role (server only) |

---

## UC-01 Submit a ticket (with up to 3 images)

- **Actor:** Customer
- **Trigger:** Customer opens the public request page `/`.
- **Preconditions:** At least one active category exists. Turnstile and Supabase reachable.
- **Main flow:**
  1. Page loads active categories (sorted by `sort_order`, then name) and the Turnstile widget.
  2. Customer fills: name, email, phone (optional), category, description, up to 3 images, privacy-notice checkbox.
  3. Browser validates with the shared schema and resizes each image (longest side 1600 px, JPEG quality 0.85).
  4. Customer clicks **Submit request**; the button is disabled and shows "Submitting…".
  5. Server action `?/create`: verifies Turnstile → checks rate limits → validates with the shared schema → inserts the ticket (`status = new`, `priority = normal`) → inserts a system message → issues one signed upload URL per declared image → sends the confirmation email (UC-02) → returns `{ ref, ticketId, uploads[] }`.
  6. Browser uploads each image to its signed URL, then calls `?/finalize` with the uploaded paths.
  7. Server action `?/finalize` verifies each object (exists, ≤ 5 MB, magic bytes are JPEG/PNG/WebP) and inserts `ticket_attachments` rows.
  8. Page shows: "Request received. Your reference number is **TK-000123**. We sent a confirmation to j\*\*\*@gmail.com."
- **Alternate / failure flows:**
  - 1a. No active categories → form shows Alert "The request form is temporarily unavailable. Please contact the IT office." and no submit button.
  - 3a. File type not JPEG/PNG/WebP → field error "Only JPEG, PNG or WebP images are allowed." File is not added.
  - 3b. More than 3 files → "You can attach up to 3 images." Extra files are not added.
  - 3c. Original file > 25 MB (too large to resize safely on phones) → "This image is too large. Please choose a smaller photo."
  - 3d. Resized file still > 5 MB → "Each image must be 5 MB or smaller."
  - 3e. Resize fails (old phone, out of memory) → "This image could not be prepared. Try another photo or submit without it."
  - 5a. Turnstile fails → form error "We couldn't verify you're human. Please try again." Widget resets. No ticket created.
  - 5b. Rate limit hit (20 per IP per hour, or 5 per email per hour) → "Too many requests from your network. Please try again in an hour, or contact the IT office directly." No ticket created.
  - 5c. Server validation fails → field errors returned (same messages as client, see table below). Entered values are kept, except images must be re-selected only if the browser lost them.
  - 5d. Database error → "Something went wrong on our side. Please try again in a few minutes." Error to Sentry. No ticket created.
  - 5e. Confirmation email fails → ticket still created; success screen still shown (UC-02 failure flow).
  - 6a. One or more uploads fail → success screen plus Alert "Your request was submitted (TK-000123), but 1 image could not be uploaded. You can reply to the confirmation email with the photo." Failed images are not recorded.
  - 7a. Object fails verification (wrong magic bytes or > 5 MB) → object deleted, not recorded; same partial-upload Alert.
  - 7b. `?/finalize` called > 30 minutes after ticket creation, or ticket already has 3 attachments → rejected; same partial-upload Alert.
- **Postconditions:** One `tickets` row (`new`, `normal`, no assignee). One system `ticket_messages` row ("Request received"). 0–3 `ticket_attachments` rows. Rate-limit counters incremented.
- **Field validation messages (shared schema):**

| Field | Rule | Message |
| --- | --- | --- |
| `customer_name` | required, trimmed, 2–100 chars | "Enter your name (2–100 characters)." |
| `customer_email` | required, valid email, ≤ 254 chars, stored lowercase | "Enter a valid email address." |
| `customer_phone` | optional; if present matches `^[0-9+()\-\s]{7,20}$` | "Enter a valid phone number or leave it blank." |
| `category_id` | required, an active category id | "Choose a category." |
| `description` | required, trimmed, 10–5000 chars | "Describe the problem (at least 10 characters)." / "Keep the description under 5,000 characters." |
| `privacy_consent` | must be `true` (not stored as a column; submission implies consent) | "Please agree to the privacy notice to continue." |
| images | 0–3; JPEG/PNG/WebP; each ≤ 5 MB after resize | see 3a–3d |

- **Acceptance criteria:**
  - AC-01.1 Submitting valid fields with a passing Turnstile token creates exactly one ticket with `status = 'new'`, `priority = 'normal'`, `assignee_id IS NULL`, and a ref matching `^TK-\d{6}$`.
  - AC-01.2 The success screen shows the ref and the masked email (first character + `***` + `@domain`).
  - AC-01.3 Each field rule in the table above returns its exact message on both client and server (server tested with JS disabled or a direct POST).
  - AC-01.4 A failing Turnstile token creates no ticket and shows "We couldn't verify you're human. Please try again."
  - AC-01.5 The 21st submission from the same IP within one clock hour (or the 6th from the same email) creates no ticket and shows the rate-limit message.
  - AC-01.6 Two valid JPEG images attached produce two `ticket_attachments` rows with `storage_path` matching `^tickets/<ticket_id>/<uuid>\.(jpg|png|webp)$`.
  - AC-01.7 A file renamed `.jpg` whose bytes are a GIF is not recorded and its storage object is deleted.
  - AC-01.8 A 4th image cannot be added in the browser, and a forged 4th `?/finalize` path is rejected by the server.
  - AC-01.9 A direct anonymous insert into `tickets` with the anon key is rejected by RLS.
  - AC-01.10 No original filename appears anywhere in storage paths or the database.
  - AC-01.11 Description containing `<script>alert(1)</script>` is displayed as literal text in the agent view and in emails.

## UC-02 Receive confirmation email

- **Actor:** Customer (recipient), System (sender)
- **Trigger:** UC-01 step 5 inserted the ticket.
- **Preconditions:** Resend API key and verified sending domain configured (production). In dev/test, `EMAIL_MODE=log`.
- **Main flow:**
  1. System inserts message (author `NULL`, `is_internal = false`, body "Request received.", `email_status = 'pending'`).
  2. System sends email: From `IT Help Desk <EMAIL_FROM>`, Reply-To `SUPPORT_INBOX_EMAIL`, Subject `[TK-000123] We received your request`. Body: greeting with customer name, ref, category, the description (escaped), "We'll email you when there is an update. Reply to this email if you need to add information."
  3. On success: `email_status = 'sent'`.
- **Failure flows:**
  - 2a. Resend returns non-2xx or times out after 5 s → `email_status = 'failed'`; error (without email body) to Sentry; customer still sees the success screen.
- **Postconditions:** Message row has `email_status` `sent` or `failed`.
- **Acceptance criteria:**
  - AC-02.1 After a successful submission, the system message for the ticket has `email_status = 'sent'` (log mode in tests).
  - AC-02.2 With `EMAIL_MODE=fail`, the ticket is still created, the success screen is shown, and the message has `email_status = 'failed'`.
  - AC-02.3 The email subject starts with `[TK-` + 6 digits + `]`.
  - AC-02.4 The email `Reply-To` equals `SUPPORT_INBOX_EMAIL`.
  - AC-02.5 HTML special characters in name and description appear escaped in the HTML part.

## UC-03 Staff sign in and sign out

- **Actor:** Agent, Admin
- **Trigger:** Staff opens `/login`, or any `/app/*` URL while signed out (redirect to `/login?next=<path>`).
- **Preconditions:** Account exists in Supabase Auth with a `profiles` row.
- **Main flow:**
  1. Staff enters email and password, clicks **Sign in**.
  2. Server action signs in via Supabase Auth, sets session cookies, loads profile.
  3. Redirect to `next` (if it starts with `/app`) or `/app`.
  4. **Sign out** (in AppShell) ends the session and redirects to `/login`.
- **Failure flows:**
  - 2a. Wrong credentials → "Incorrect email or password."
  - 2b. Profile `is_active = false` → session ended; "Your account is disabled. Contact your administrator."
  - 2c. Supabase Auth rate limit → "Too many sign-in attempts. Please wait a few minutes and try again."
  - 2d. Forgotten password → no in-app reset in MVP; text under the form: "Forgot your password? Ask your administrator to reset it."
- **Postconditions:** Valid session cookie (or none after sign out).
- **Acceptance criteria:**
  - AC-03.1 Valid credentials for an active agent land on `/app` showing the agent's name.
  - AC-03.2 Wrong password shows "Incorrect email or password." and no session cookie is set.
  - AC-03.3 An inactive profile cannot reach any `/app/*` page.
  - AC-03.4 Visiting `/app/tickets` signed out redirects to `/login?next=%2Fapp%2Ftickets`, and signing in returns there.
  - AC-03.5 `next=https://evil.example` is ignored and redirects to `/app`.
  - AC-03.6 After sign out, `/app` redirects to `/login`.

## UC-04 View and filter tickets

- **Actor:** Agent, Admin
- **Trigger:** Opens `/app/tickets`.
- **Main flow:**
  1. Loader returns tickets for the selected filter, newest first (`created_at desc`), 25 per page.
  2. Filter tabs: **Open** (default: all except `resolved`), **New**, **Assigned**, **In progress**, **Waiting on customer**, **Resolved**, **All**. Each tab shows a count. Filter is in the URL: `?status=open|new|assigned|in_progress|waiting_on_customer|resolved|all&page=N`.
  3. Optional toggle **Mine** (`?mine=1`): only tickets assigned to the current user.
  4. Each row: ref, customer name, category name, status Badge (text label), priority Badge, assignee name or "Unassigned", created time (Asia/Manila, relative + absolute on hover/title).
  5. Clicking a row opens `/app/tickets/TK-000123`.
- **Failure flows:**
  - 2a. Unknown `status` value → treated as `open`.
  - 1a. No tickets → empty state "No tickets here yet."
- **Acceptance criteria:**
  - AC-04.1 Default view lists only non-resolved tickets, newest first.
  - AC-04.2 `?status=waiting_on_customer` lists only that status, and the tab is marked active (`aria-current="page"`).
  - AC-04.3 Tab counts equal the number of tickets in each status.
  - AC-04.4 With 30 open tickets, page 1 shows 25 and page 2 shows 5.
  - AC-04.5 `?mine=1` shows only tickets where `assignee_id` = current user.
  - AC-04.6 Status is shown as text, not color alone.

## UC-05 View ticket detail

- **Actor:** Agent, Admin
- **Trigger:** Opens `/app/tickets/[ref]`.
- **Main flow:** Shows ref, customer name, email (mailto link), phone, category, description, created/updated time, status, priority, assignee, attachments (thumbnails via signed URLs valid 600 s; click opens full image in new tab), and the message thread in chronological order. Internal notes are visibly marked "Internal note — not sent to customer".
- **Failure flows:** Unknown ref → 404 page "Ticket not found." Signed URL generation fails → attachment shows "Image unavailable. Reload the page."
- **Acceptance criteria:**
  - AC-05.1 All fields of the ticket render; description renders as text with line breaks preserved.
  - AC-05.2 Each attachment link works for at least 600 s and the URL is not a public bucket URL.
  - AC-05.3 Internal notes and customer-visible messages are labeled differently by text.
  - AC-05.4 `/app/tickets/TK-999999` (non-existent) returns HTTP 404.

## UC-06 Assign a ticket

- **Actor:** Agent, Admin
- **Trigger:** Changes **Assignee** on the detail page and clicks **Save**.
- **Main flow:** Options: active staff names + "Unassigned". Saving with an assignee on a `new` ticket moves it to `assigned`. Reassigning keeps the current status. Choosing "Unassigned" moves the ticket to `new`.
- **Failure flows:**
  - Ticket changed since page load → "This ticket was changed by someone else. Reload to see the latest version." Nothing saved.
  - Ticket is `resolved` → assignee control is disabled with hint "Reopen the ticket to change the assignee."
- **Acceptance criteria:**
  - AC-06.1 Assigning a `new` ticket sets `assignee_id` and `status = 'assigned'`.
  - AC-06.2 Setting "Unassigned" sets `assignee_id = NULL` and `status = 'new'`.
  - AC-06.3 Inactive staff do not appear in the assignee list.
  - AC-06.4 A stale save (different `updated_at`) changes nothing and shows the conflict message.
  - AC-06.5 Assignment sends no email.

## UC-07 Change status and priority (including reopen)

- **Actor:** Agent, Admin
- **Trigger:** Changes **Status** and/or **Priority**, clicks **Save**.
- **Main flow:** Allowed transitions are listed in [04-data-and-security.md](04-data-and-security.md#status-transitions). The status control only offers allowed targets. Rules:
  - Moving an unassigned ticket to `in_progress`, `waiting_on_customer` or `resolved` assigns it to the current user.
  - `waiting_on_customer` requires a customer reply in the same submission (UC-09).
  - `resolved` sets `resolved_at`; sends the resolved email (UC-10) with the optional "Resolution note to customer" text, or the default text if empty.
  - **Reopen** = `resolved → in_progress`; clears `resolved_at`; no email.
  - Priority: `low | normal | high | urgent`; no email.
- **Failure flows:**
  - Disallowed transition (forged request) → "You can't move a ticket from Resolved to Waiting on customer." (labels vary). Nothing saved.
  - `waiting_on_customer` without a reply → "Add a reply telling the customer what you need."
  - Conflict → conflict message (as UC-06).
- **Acceptance criteria:**
  - AC-07.1 Each allowed transition in the table succeeds; each disallowed one is rejected by the server and by the database trigger.
  - AC-07.2 Setting `resolved` sets `resolved_at` to the save time; reopening sets it to `NULL`.
  - AC-07.3 Setting `waiting_on_customer` with an empty reply saves nothing and shows the required-reply message.
  - AC-07.4 Changing only priority sends no email and adds no message.
  - AC-07.5 The invariant "status is `new` if and only if there is no assignee" holds after every save.

## UC-08 Add an internal note

- **Actor:** Agent, Admin
- **Trigger:** Composer on detail page, type **Internal note** (default selection), clicks **Add note**.
- **Main flow:** Inserts `ticket_messages` (`is_internal = true`, `author_id` = current user, `email_status = NULL`). No email.
- **Failure flows:** Empty or > 5000 chars → "Write a note (1–5,000 characters)."
- **Acceptance criteria:**
  - AC-08.1 An internal note appears in the thread labeled "Internal note — not sent to customer".
  - AC-08.2 No email is sent and `email_status IS NULL` for internal notes.
  - AC-08.3 The composer defaults to **Internal note** each time the page loads.

## UC-09 Reply to the customer

- **Actor:** Agent, Admin
- **Trigger:** Composer type **Reply to customer**, clicks **Send reply**. The button label changes to make the difference explicit.
- **Main flow:** Inserts message (`is_internal = false`, `email_status = 'pending'`), then UC-10 sends the email. Thread shows "Sent to customer" with delivery status.
- **Failure flows:** Empty or > 5000 chars → "Write a reply (1–5,000 characters)." Email fails → message kept, label "Email not sent" + hint "Copy the reply and email the customer directly."
- **Acceptance criteria:**
  - AC-09.1 A reply creates one non-internal message and triggers exactly one email.
  - AC-09.2 With `EMAIL_MODE=fail`, the message exists with `email_status = 'failed'` and the thread shows "Email not sent".
  - AC-09.3 Switching to **Reply to customer** changes the button text to "Send reply".

## UC-10 Customer notified by email

- **Actor:** System
- **Trigger:** A non-internal message is inserted by UC-09, or status set to `resolved` (UC-07).
- **Main flow:**
  - Reply: Subject `[TK-000123] Update on your request`; body = reply text (escaped) + ref + "Reply to this email if you need to add information."
  - Resolved: inserts a non-internal message authored by the agent with the resolution note (default: "Your request has been marked as resolved. If the problem continues, reply to this email."); Subject `[TK-000123] Your request has been resolved`.
  - From `IT Help Desk <EMAIL_FROM>`, Reply-To `SUPPORT_INBOX_EMAIL`, To `customer_email`. Never includes internal notes, agent emails or attachment links.
- **Failure flows:** as UC-02 2a.
- **Acceptance criteria:**
  - AC-10.1 Setting `resolved` produces one non-internal message and one email with the resolved subject.
  - AC-10.2 No email body ever contains the text of any internal note on the same ticket (test: internal note with unique marker text, then reply and resolve; marker absent from all sent emails).
  - AC-10.3 Free-tier guard: sending is attempted at most once per message (no automatic retries).

## UC-11 View the dashboard

- **Actor:** Agent, Admin
- **Trigger:** Opens `/app` (default landing page).
- **Main flow:** Three cards:
  1. **Open tickets:** count of status ≠ `resolved`, with a breakdown per status.
  2. **Average resolution time (last 30 days):** mean of `resolved_at − created_at` for tickets with `resolved_at` in the last 30 days, shown as `Xd Yh` or `Yh Zm`; "—" when none.
  3. **Tickets per agent:** per active staff member + "Unassigned": open count and resolved-in-last-30-days count.
- **Acceptance criteria:**
  - AC-11.1 With seeded data (3 open, 2 resolved in the last 30 days taking 2 h and 4 h), the cards show `3` and `3h 0m`.
  - AC-11.2 With no resolved tickets in 30 days, average shows "—".
  - AC-11.3 Per-agent counts sum to the open total (including "Unassigned").

## UC-12 Manage categories

- **Actor:** Admin
- **Trigger:** Opens `/app/admin/categories`.
- **Main flow:** List with name, active state, order. Actions: **Add category** (name), **Rename**, **Move up/down** (changes `sort_order`), **Deactivate/Activate**. No delete (tickets reference categories).
- **Failure flows:** Duplicate name (case-insensitive) → "A category with this name already exists." Name not 2–50 chars → "Enter a category name (2–50 characters)." Deactivating the last active category → "Keep at least one active category."
- **Acceptance criteria:**
  - AC-12.1 A new category appears on the public form after reload.
  - AC-12.2 A deactivated category disappears from the public form but still shows on existing tickets.
  - AC-12.3 An agent opening `/app/admin/categories` gets HTTP 403, and a direct agent update to `categories` is rejected by RLS.
  - AC-12.4 Renaming "Printer" to "printer " (trim + case) when "Printer" exists is rejected as duplicate.

## UC-13 Manage team

- **Actor:** Admin
- **Trigger:** Opens `/app/admin/team`.
- **Main flow:** Lists profiles (name, email, role, active). Admin edits name, role (`agent`/`admin`), active. New accounts are created in the Supabase dashboard (Authentication → Add user); the page shows this instruction text.
- **Failure flows:** Admin edits own role or active flag → "You can't change your own role or deactivate your own account." Name not 2–100 chars → "Enter a name (2–100 characters)."
- **Acceptance criteria:**
  - AC-13.1 Deactivating an agent makes their next request to `/app` end the session (UC-03 2b).
  - AC-13.2 An admin cannot demote or deactivate themselves (server and DB).
  - AC-13.3 An agent gets HTTP 403 on `/app/admin/team` and RLS rejects agent updates to `profiles`.

## UC-14 Customer replies by email (outside the system)

- **Actor:** Customer, Agent
- **Trigger:** Customer replies to any notification email.
- **Main flow:** Reply lands in `SUPPORT_INBOX_EMAIL` (subject contains the ref). Agent opens the ticket by ref, adds an internal note with the relevant content, and, if the ticket is `resolved` and the problem continues, clicks **Reopen**.
- **Acceptance criteria:**
  - AC-14.1 Every notification email has `Reply-To` = `SUPPORT_INBOX_EMAIL` and the ref in the subject.
  - AC-14.2 A `resolved` ticket can be reopened to `in_progress` in one save.

---

## Explicitly OUT of scope (do not build)

From AGENTS.md:

- Multi-client portals (one school only; no tenant column)
- SLA timers
- Job-order PDFs
- Billable time / parts
- Customer status page or customer login
- Viber / SMS notifications
- Realtime updates (lists refresh on page load only)

Also left out of the MVP (see "Later" in [06](06-risks-and-open-questions.md#later)):

- Inbound email-to-ticket
- In-app password reset and user invitations
- Ticket search, CSV export, bulk actions
- Attachments on agent replies; agent-uploaded files
- Ticket or attachment deletion and data-retention automation
- Filipino-language UI
- Automated backups
- Extra form fields (e.g., room/location) — needs an AGENTS.md change first
