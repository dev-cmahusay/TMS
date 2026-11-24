# 07 — Frontend Design Plan

Binding sources: [AGENTS.md](../../AGENTS.md), [design-system/tms/MASTER.md](../../design-system/tms/MASTER.md), [design-system/tms/tokens.css](../../design-system/tms/tokens.css), [01-use-cases.md](01-use-cases.md), [02-user-flows.md](02-user-flows.md).

Goal: remove every UI, layout, component, state, and accessibility ambiguity so Slices S1, S3, S4, S6, S7, S8, S9, S10, and S11 can be implemented without guessing. No visual component libraries; Tailwind CSS v4 CSS-first tokens only.

---

## 1. System Rules & Layout Strategy

### 1.1 Styling invariants
- **Theme:** **Swiss Ops** — 2 colors (`#0F172A` Slate Navy + `#F8FAFC` Cool Paper) + 1 accent (`#0369A1` light / `#38BDF8` dark). Full token table and WCAG 2.2 AA contrast verification (44/44 pairs passing) live in [MASTER.md](../../design-system/tms/MASTER.md) and [tokens.css](../../design-system/tms/tokens.css).
- **Token-only classes:** Every color, border, radius, shadow, and font uses mapped Tailwind v4 utilities (`bg-bg`, `bg-surface`, `bg-surface-subtle`, `text-text`, `text-muted`, `bg-primary`, `text-primary-fg`, `border-border`, `border-border-strong`, `rounded-md`, `font-mono`). Zero arbitrary hex or pixel classes (`bg-[#...]`, `text-[13px]`).
- **No `{@html}`:** All user-provided strings render via standard Svelte text interpolation. Multi-line descriptions and messages use `whitespace-pre-wrap break-words`.
- **No external UI or icon packages:** Use native HTML controls (`<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`) and one small inline SVG component `src/lib/components/ui/Icon.svelte` (~12 icons, 1.5px stroke, `aria-hidden="true"` when decorative).

### 1.2 Single-breakpoint mobile-first strategy
Keep responsive rules predictable across all screens (optimized for 360 px Android phones on mobile data and 1280 px+ office screens):
- **Base (`< 1024px`):** Single-column stacked flow, full-width primary buttons (`w-full`), card-based ticket rows (zero horizontal page scroll), `px-4` page padding.
- **Desktop (`lg:` `>= 1024px`):** Left navigation rail (`224px`) in `AppShell`, multi-column grids (dashboard KPI cards, ticket detail 2-column split, semantic table rows), auto-width buttons, `px-8` page padding.
- **`sm:` (`>= 640px`)** used sparingly only for inline 2-field form rows (e.g., email + phone) and horizontal button pairs.

### 1.3 Light + Dark mode behavior
- Default follows OS preference (`@media (prefers-color-scheme: dark)` in [tokens.css](../../design-system/tms/tokens.css)).
- Manual toggle (`ThemeToggle.svelte`, rendered in `PublicShell` and `AppShell` headers) cycles/switches `data-theme="light"` or `data-theme="dark"` on `<html>` and saves `"light" | "dark"` in `localStorage` under key `tms-theme`.
- **No flash of wrong theme (anti-FOUC):** `src/app.html` includes a minimal synchronous inline `<script>` in `<head>` (under 10 lines) that reads `localStorage.getItem('tms-theme')` and sets `document.documentElement.dataset.theme` before first paint.
- **Contrast gate:** Re-run the `design-token-contrast` checker whenever `src/app.css` tokens change; both themes must pass `>= 4.5:1` text and `>= 3.0:1` UI borders (`--color-border-strong`).

### 1.4 Typography & performance budget
- `Inter` (400, 500, 600, 700) + `JetBrains Mono` (400, 500) loaded with `display=swap` and `preconnect` hints in `src/app.html`.
- All form inputs (`Input`, `Textarea`, `Select`) use `text-base` (`16px`) minimum to prevent iOS Safari zoom on focus.
- Ticket refs (`TK-000123`), timestamps, KPI numbers, and badge counts use `font-mono tabular-nums` (or `tabular-nums` for Inter numbers) so columns align cleanly.
- All interactive controls (`Button`, nav links, status filter tabs, checkboxes, file remove buttons) meet `min-h-11` (`44px`) touch height (`min-w-11` for icon-only buttons).
- Motion: `transition-colors duration-150 ease-out` only; respect `motion-reduce:transition-none`. No decorative animations.

---

## 2. Page Shells (`src/lib/components/layout/`)

### 2.1 `PublicShell.svelte` (routes: `/`, `/privacy`, `/login`)
```text
+----------------------------------------------------------+
| [School / IT Help Desk]                  [Theme Toggle]  |  <- h-14, border-b border-border, bg-surface
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |   max-w-xl centered card   |              |  <- bg-bg canvas, px-4 py-6 lg:py-10
|              +----------------------------+              |
|                                                          |
+----------------------------------------------------------+
| Privacy notice · Staff sign in                           |  <- text-xs text-muted, centered
+----------------------------------------------------------+
```
- **Skip link:** First focusable element is `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>`.
- **Props:** `title: string` (sets `<svelte:head><title>`), `showStaffLink?: boolean` (true on `/` and `/privacy`, false on `/login`).

### 2.2 `AppShell.svelte` (routes: `/app/**`)
- **Mobile (`< lg`):**
  - Top bar (`h-14 bg-surface border-b border-border px-4 flex items-center justify-between`): `"IT Help Desk"` link to `/app`, Theme toggle, Sign out button.
  - Directly beneath: horizontally scrollable single-row tab strip (`bg-surface border-b border-border px-2 flex gap-1 overflow-x-auto`) with `Dashboard`, `Tickets`, and (admin only) `Categories`, `Team`. Zero hamburger JS required; works with JS disabled.
- **Desktop (`lg:`):**
  - Two-column shell (`min-h-screen lg:grid lg:grid-cols-[14rem_1fr]`):
    - **Left rail (`bg-surface border-r border-border flex flex-col justify-between p-4`):**
      - Top: `"IT Help Desk"` title + primary nav (`Dashboard`, `Tickets`) + divider + Admin nav (`Categories`, `Team`, rendered only when `profile.role === 'admin'`).
      - Active nav link: `bg-surface-subtle text-primary font-medium`, `aria-current="page"`.
      - Bottom: staff full name (`text-sm font-medium`), role `Badge` (`Agent` / `Admin`), `ThemeToggle`, and `Sign out` POST form (`action="/logout"`).
    - **Main column (`bg-bg min-w-0`):** `<main id="main-content" class="max-w-5xl mx-auto px-4 lg:px-8 py-6">`.

---

## 3. UI Primitives Contract (`src/lib/components/ui/`)

Pages compose ONLY these primitives (plus `Icon` and `ThemeToggle`). Every interactive primitive MUST include `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`.

| Primitive | Props (key) | Variants / Visual Rules | Accessibility Contract |
| --- | --- | --- | --- |
| `Button.svelte` | `variant` (`primary` \| `secondary` \| `ghost` \| `danger`), `size` (`sm` \| `md`), `type` (`button` \| `submit`), `loading`, `disabled`, `fullWidth` | `primary`: `bg-primary text-primary-fg hover:bg-primary-hover`; `secondary`: `bg-surface text-text border border-border-strong hover:bg-surface-subtle`; `ghost`: `text-text hover:bg-surface-subtle`; `danger`: `bg-danger text-danger-fg`; `md` = `min-h-11 px-4 text-sm font-medium rounded-md`; `sm` = `min-h-9 px-3 text-xs font-medium rounded-md` (use `md` on primary/mobile actions) | `aria-busy={loading}`, `disabled={disabled \|\| loading}`, inline CSS spinner when loading |
| `Input.svelte` | `id`, `name`, `type`, `value`, `placeholder`, `autocomplete`, `required`, `invalid`, `disabled`, `maxlength` | `w-full min-h-11 px-3 rounded-md bg-surface text-text text-base border border-border-strong placeholder:text-muted`; invalid switches border to `border-danger` | `aria-invalid={invalid \|\| undefined}`, `aria-describedby` passed from `Field` |
| `Textarea.svelte` | `id`, `name`, `value`, `rows` (default 4), `maxlength`, `placeholder`, `required`, `invalid`, `disabled` | Same surface/border/font tokens as `Input`; `py-2.5 resize-y` | Same as `Input`; pair with optional live character count (`text-xs text-muted tabular-nums`) |
| `Select.svelte` | `id`, `name`, `value`, `required`, `invalid`, `disabled`, `children` (`<option>` slots) | Native `<select>` styled identically to `Input` (`min-h-11 px-3 text-base rounded-md bg-surface text-text border border-border-strong`) | Same as `Input`; native keyboard & mobile wheel picker |
| `Field.svelte` | `id`, `label`, `required`, `hint`, `error`, `children` | Vertical stack (`flex flex-col gap-1.5`); label `text-sm font-medium text-text`; hint `text-xs text-muted`; error `text-sm text-danger` | `<label for={id}>`; hint `id="{id}-hint"`; error `id="{id}-error" role="alert"`; children receive describedby IDs |
| `Card.svelte` | `padding` (`none` \| `sm` \| `md`), `subtle` (bool, uses `bg-surface-subtle`) | `bg-surface border border-border rounded-lg shadow-sm`; `md` = `p-4 lg:p-6`, `sm` = `p-3 lg:p-4` | Semantic wrapper (`<section>` or `<div>` via `as` prop) |
| `Badge.svelte` | `kind`: `status` \| `priority` \| `role` \| `neutral` \| `danger` \| `success` \| `warning`; `value` (for `status`/`priority`) | Reads status/priority colors ONLY from `src/lib/ui/status.ts`. `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap` | Always renders readable text label (never dot/color alone) |
| `Table.svelte` | `caption` (sr-only or visible), `columns`, `children` | Desktop: `w-full text-left border-collapse`; header `bg-surface-subtle text-xs font-medium text-muted uppercase tracking-wide border-b border-border`; rows `border-b border-border hover:bg-surface-subtle` | Proper `<thead>`, `<th scope="col">`, `<tbody>`, `<caption>` |
| `Modal.svelte` | `open`, `title`, `onclose`, `children`, `footer` | Native `<dialog>` centered, `max-w-md w-full bg-surface text-text border border-border rounded-lg shadow-md p-6 backdrop:bg-text/40` | Native focus trap, `Escape` closes, `aria-labelledby` points to title |
| `Alert.svelte` | `variant` (`info` \| `success` \| `warning` \| `danger`), `title`, `children` | Rounded-md border + subtle tint + leading `Icon`; `text-sm` | `role="alert"` for `danger`/`warning`; `role="status"` for `info`/`success` |
| `PageHeader.svelte` | `title`, `subtitle`, `backHref`, `backLabel`, `actions` slot | Flex column on mobile (`gap-3`), row `justify-between items-center` on `sm:`; title `text-2xl font-bold text-text` | Renders `<h1>` (one per page) |

### 3.1 Single status & priority map (`src/lib/ui/status.ts`)
Only `Badge.svelte` imports visual classes from this file. Transitions live separately in `src/lib/tickets/transitions.ts`.

| Key | Label | Token CSS variables (Light / Dark auto via `:root`) |
| --- | --- | --- |
| `status: 'new'` | `New` | `bg-[var(--badge-new-bg)] text-[var(--badge-new-fg)]` *(mapped as utility classes `bg-badge-new-bg text-badge-new-fg` in `@theme inline` so zero arbitrary values exist!)* |
| `status: 'assigned'` | `Assigned` | `bg-badge-assigned-bg text-badge-assigned-fg` |
| `status: 'in_progress'` | `In progress` | `bg-badge-progress-bg text-badge-progress-fg ring-1 ring-inset ring-primary/30` |
| `status: 'waiting_on_customer'` | `Waiting on customer` | `bg-badge-waiting-bg text-badge-waiting-fg` |
| `status: 'resolved'` | `Resolved` | `bg-badge-resolved-bg text-badge-resolved-fg` |
| `priority: 'low'` | `Low` | `bg-surface-subtle text-muted` |
| `priority: 'normal'` | `Normal` | `bg-surface-subtle text-text` |
| `priority: 'high'` | `High` | `bg-badge-waiting-bg text-badge-waiting-fg` |
| `priority: 'urgent'` | `Urgent` | `bg-badge-urgent-bg text-badge-urgent-fg` |

> **Implementation detail for `S0`:** Add the 12 `--badge-*` variables from [tokens.css](../../design-system/tms/tokens.css) to the `@theme inline` block in `src/app.css` so Tailwind generates `bg-badge-new-bg`, `text-badge-new-fg`, etc. natively with zero arbitrary syntax.

---

## 4. Screen-by-Screen Blueprints

### 4.1 `/` — Public Request Form (UC-01, UC-02)
- **Shell:** `PublicShell` (`max-w-xl`).
- **Header inside card:** `PageHeader` `"Submit a tech support request"` + short subtitle `"For school staff. Tell us what needs fixing — we'll email your reference number and updates."`
- **No-categories fallback (UC-01 1a):** Replace form with `<Alert variant="warning">The request form is temporarily unavailable. Please contact the IT office.</Alert>`.
- **No-JS fallback:** `<noscript><Alert variant="warning">Please enable JavaScript to submit this form.</Alert></noscript>`.
- **Form layout (single column, `gap-4`):**
  1. Top error summary `<Alert variant="danger">` when Turnstile, rate limit, or server error occurs (focuses on error).
  2. `Field` + `Input` — **Your name** (`customer_name`, required, `autocomplete="name"`).
  3. 2-col on `sm:` (`grid sm:grid-cols-2 gap-4`):
     - `Field` + `Input` — **Email address** (`customer_email`, `type="email"`, required, hint `"Updates will be sent here."`).
     - `Field` + `Input` — **Phone number (optional)** (`customer_phone`, `type="tel"`).
  4. `Field` + `Select` — **Category** (`category_id`, required, placeholder option `"Choose a category"`).
  5. `Field` + `Textarea` — **Describe the problem** (`description`, required, 5 rows, placeholder `"What happened? Include the room or building if relevant."`, live character count `"0 / 5,000"`).
  6. **Photo attachments (optional, up to 3):**
     - Dashed picker box (`border border-dashed border-border-strong rounded-md p-4 bg-surface-subtle/50`): secondary `Button` `"Add photos"` + helper `"JPEG, PNG, or WebP · up to 3 photos · resized automatically (max 5 MB each)"`.
     - Thumbnail grid (`grid-cols-3 gap-3`) for selected images: square preview (`aspect-square object-cover rounded-md border border-border`), file size badge (`"340 KB"`), status (`"Preparing…"` while resizing), and top-right `Remove` button (`min-w-11 min-h-11`, `aria-label="Remove photo 1"`).
     - Inline per-file `<Alert variant="danger">` if type/count/size/resize fails (exact messages from UC-01 3a–3e).
  7. **Privacy consent:** Checkbox (`min-h-11` hit row, `flex items-start gap-3`) — `"I agree to the "` + link to `/privacy` (opens cleanly) + `" so IT staff can respond to my request."` Inline error if unchecked.
  8. **Cloudflare Turnstile widget** container (`min-h-[65px]` reserved to prevent CLS).
  9. **Submit button:** `<Button variant="primary" fullWidth loading={submitting}>` — `"Submit request"` → `"Submitting…"` → `"Uploading photos…"` (during S6 signed-URL PUTs + finalize).
- **Success state (replaces form inside the same `Card`, focus moves to heading):**
  - `<Alert variant="success">` — `"Request received."`
  - Large monospace reference box (`bg-surface-subtle border border-border rounded-md p-4 text-center`): label `"Reference number"` + `<p class="font-mono text-2xl font-bold text-text">TK-000123</p>`.
  - Text: `"We sent a confirmation to j***@gmail.com. Reply to that email if you need to add details."`
  - Partial upload alert (only if any image failed): `<Alert variant="warning">Your request was submitted (TK-000123), but N image(s) could not be uploaded. You can reply to the confirmation email with the photo.</Alert>`
  - Secondary `Button`: `"Submit another request"` (resets form cleanly).

### 4.2 `/privacy` — Privacy Notice
- **Shell:** `PublicShell` (`max-w-xl`).
- `Card` with `PageHeader` (`backHref="/"`, `backLabel="Back to request form"`, title `"Privacy notice"`).
- Structured plain-English prose sections (Data Privacy Act RA 10173): What we collect, Why we collect it, Who can see it, Where it is stored (Supabase Singapore), How long we keep it, Contact the IT office.

### 4.3 `/login` — Staff Sign In (UC-03)
- **Shell:** `PublicShell` (`max-w-md` card centered vertically).
- `PageHeader` `"Staff sign in"` + subtitle `"IT Help Desk dashboard"`.
- Error `<Alert variant="danger">` above fields (wrong credentials, disabled account, or auth rate limit).
- `Field` + `Input` (`email`, `type="email"`, `autocomplete="email"`).
- `Field` + `Input` (`password`, `type="password"`, `autocomplete="current-password"`, with an accessible `"Show"` / `"Hide"` toggle button `aria-pressed`).
- `<Button variant="primary" fullWidth>Sign in</Button>`.
- Helper text below form (`text-xs text-muted text-center`): `"Forgot your password? Ask your administrator to reset it."`

### 4.4 `/app` — Dashboard (UC-11)
- **Shell:** `AppShell`.
- `PageHeader`: `"Dashboard"` + action button `<Button variant="primary" href="/app/tickets">View tickets</Button>`.
- **Top KPI Grid (`grid gap-4 lg:grid-cols-3`):**
  1. **Card 1 — Open tickets:** Big number (`text-3xl font-bold tabular-nums`), plus clickable status breakdown chips/links (`New: 4`, `Assigned: 3`, `In progress: 5`, `Waiting: 2`) each linking to `/app/tickets?status=<key>`.
  2. **Card 2 — Avg resolution time (30 days):** Big monospace/tabular figure (`3h 0m`, `1d 4h`, or `—`), caption `"Based on tickets resolved in the last 30 days"`.
  3. **Card 3 — Resolved (30 days):** Total resolved count in last 30 days (derived from the same `dashboard_stats()` data — zero extra query).
- **Tickets per agent section (`Card` below KPIs):**
  - Section heading `"Tickets per agent"`.
  - `Table` with columns: `Agent`, `Open` (`tabular-nums text-right`), `Resolved (30d)` (`tabular-nums text-right`). Includes `"Unassigned"` row at top or bottom so open counts visibly sum to the total.
  - Empty state: `"No tickets recorded yet."`

### 4.5 `/app/tickets` — Ticket List & Filters (UC-04)
- **Shell:** `AppShell`.
- `PageHeader`: `"Tickets"`.
- **Filter bar (above list):**
  - Horizontally scrollable status tabs (`flex gap-1 overflow-x-auto border-b border-border`):
    `Open (N)` (default), `New (N)`, `Assigned (N)`, `In progress (N)`, `Waiting on customer (N)`, `Resolved (N)`, `All (N)`.
    Active tab has `border-b-2 border-primary text-primary font-medium` and `aria-current="page"`.
  - Right/below row: **`Mine` toggle link/pill** (`?mine=1`, `aria-pressed={mine}`), active uses `bg-primary text-primary-fg`.
- **Responsive list (zero horizontal scroll on phones):**
  - **Mobile (`< lg`):** Stack of clickable `Card` items (`gap-3`), each showing:
    - Top row: monospace ref (`TK-000123`) + status `Badge` + priority `Badge`.
    - Middle: customer name (`font-medium`) · category (`text-muted`).
    - Bottom: assignee (`"Unassigned"` or name) + relative Asia/Manila timestamp (`title` shows full date/time).
  - **Desktop (`lg:`):** `Card padding="none"` wrapping `Table` with columns: `Ref`, `Customer`, `Category`, `Status`, `Priority`, `Assignee`, `Created`. Clicking the ref link (or full row) navigates to `/app/tickets/[ref]`.
- **Empty state:** Centered card `"No tickets here yet."` (with link `"Show all open tickets"` if `mine=1` or a specific filter returned 0).
- **Pagination bar (when > 25 tickets):** `"Showing 1–25 of 30"` + `Previous` / `Next` links (`min-h-11`).

### 4.6 `/app/tickets/[ref]` — Ticket Detail (UC-05 to UC-10, UC-14)
- **Shell:** `AppShell`.
- **Header:** `PageHeader` with `backHref="/app/tickets"` (`"Back to tickets"`), title monospace `TK-000123`, subtitle `"{category} · Submitted {Manila date}"`, status `Badge` + priority `Badge`.
- **Conflict alert (top, if 409):** `<Alert variant="warning">` `"This ticket was changed by someone else. Reload to see the latest version."` + `<Button size="sm" variant="secondary">Reload</Button>`.
- **Resolved banner (when `status === 'resolved'`):** `<Alert variant="success">` showing resolved Manila timestamp + inline `<Button variant="secondary" size="sm">Reopen ticket</Button>` (`resolved → in_progress`).
- **2-column layout (`grid gap-6 lg:grid-cols-[1fr_20rem] items-start`):**
  - **Left column (main flow, stacked `gap-6`):**
    1. **Request card (`Card`):**
       - Customer strip: Name, `<a href="mailto:...">` email, optional phone.
       - Description (`text-base whitespace-pre-wrap break-words`).
       - **Attachments strip (when count > 0):** `"Attachments (N)"` + 3-column thumbnail grid (`aspect-video` or `aspect-square`, `object-cover rounded-md border border-border`), each wrapped in `<a target="_blank" rel="noopener noreferrer">` opening the 600 s signed URL. If signed URL failed: fallback tile `"Image unavailable. Reload the page."`
    2. **Activity & Messages thread:**
       - Chronological list (`flex flex-col gap-3`):
         - **System message** (`author_id === null`): compact subtle strip (`text-xs text-muted`), e.g., `"Request received · 2:15 PM"` + email status badge.
         - **Internal note** (`is_internal === true`): `bg-note-bg border border-dashed border-border-strong rounded-lg p-4`; header shows `[Lock icon] Internal note — not sent to customer` badge + author name + Manila timestamp.
         - **Customer reply** (`is_internal === false`): `bg-surface border border-border rounded-lg p-4`; header shows `[Mail icon] Sent to customer` + author name + Manila timestamp + delivery status:
           - `sent`: subtle `"Email sent"` text
           - `failed`: `<Badge kind="danger">Email not sent</Badge>` + inline hint `"Copy the reply and email the customer directly."`
    3. **Message Composer (`Card`, sticky/bottom of thread):**
       - **Mode switch (defaults to Internal note on every load):**
         Two-option radio/segmented control (`min-h-11`):
         - `[Lock] Internal note` *(default selected)*
         - `[Mail] Reply to customer`
       - Visual safety cue:
         - In **Internal note** mode: card container uses `bg-note-bg border-dashed border-border-strong`, helper `"Visible to staff only. No email is sent."`, submit `<Button variant="secondary">Add note</Button>`.
         - In **Reply to customer** mode: card container uses `bg-surface border-solid border-primary`, helper `"Sends an email to {customer_email}."`, submit `<Button variant="primary">Send reply</Button>`.
       - `Textarea` (4 rows, 1–5,000 chars) + inline validation error.
  - **Right column (metadata sidebar, `Card`):**
    - Form `action="?/update"` with hidden `expected_updated_at`.
    - `Field` + `Select` **Assignee** (active staff + `"Unassigned"`; if current assignee is inactive, show `"Name (inactive)"` as the selected option; disabled when `status === 'resolved'` with hint `"Reopen the ticket to change the assignee."`).
    - `Field` + `Select` **Status** (offers ONLY transitions allowed by `ALLOWED_TRANSITIONS`).
      - **Conditional field 1:** When user selects `waiting_on_customer`, show required `Textarea` `"Reply to customer (required)"` with hint `"Tell the customer what you need — this will be emailed."`
      - **Conditional field 2:** When user selects `resolved`, show optional `Textarea` `"Resolution note to customer (optional)"` with placeholder `"Your request has been marked as resolved. If the problem continues, reply to this email."`
    - `Field` + `Select` **Priority** (`Low`, `Normal`, `High`, `Urgent`).
    - `<Button variant="primary" fullWidth type="submit">Save changes</Button>`.
    - Meta footer (`text-xs text-muted tabular-nums`): Created & Updated timestamps in Asia/Manila.

### 4.7 `/app/admin/categories` — Manage Categories (UC-12, Admin only)
- **Shell:** `AppShell`.
- `PageHeader`: `"Categories"` + subtitle `"Categories shown on the public request form."`
- **Add category card (`Card`):** Inline form (`flex flex-col sm:flex-row gap-3 items-end`): `Field` + `Input` (`name`, 2–50 chars) + `<Button variant="primary">Add category</Button>`.
- **Category list (`Card padding="none"`):** Ordered by `sort_order`, then name. Each row (`flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border`):
  - Left: Inline rename form (`Input` + `Save` button when editing, or name + `Active`/`Inactive` `Badge` + `Rename` button to keep the list scannable).
  - Right: `Move up` / `Move down` icon buttons (`min-w-11 min-h-11`, `aria-label="Move Printer / Scanner up"`, disabled at top/bottom) + `Deactivate` / `Activate` secondary button (error alert if attempting to deactivate last active category).

### 4.8 `/app/admin/team` — Manage Team (UC-13, Admin only)
- **Shell:** `AppShell`.
- `PageHeader`: `"Team"`.
- **Instruction banner:** `<Alert variant="info">To add a new staff member or reset a password, go to your Supabase dashboard → Authentication → Users. New accounts appear here automatically as agents.</Alert>`
- **Staff list:** Responsive `Table` (desktop) / stacked `Card` rows (mobile). Columns: `Name`, `Email` (read-only), `Role`, `Status`, `Action`.
  - Per-row form (`action="?/update"`): editable `full_name` input, `role` select (`Agent` / `Admin`), `is_active` toggle/select (`Active` / `Disabled`), and `Save` button.
  - **Self-protection:** For the signed-in admin's own row, `role` and `is_active` controls are disabled with hint `"You can't change your own role or deactivate your own account."`

### 4.9 Error Pages (`src/routes/+error.svelte`)
- Uses `PublicShell` when signed out, `AppShell` when signed in (or minimal centered `Card` in `PublicShell` if session unavailable).
- **404:** `"Page not found."` (or `"Ticket not found."` when message passed from `[ref]` loader) + link back to `/` or `/app/tickets`.
- **403:** `"You don't have access to this page."` + link to `/app`.
- **500:** `"Something went wrong on our side. Please try again in a few minutes."` (no stack traces or internal details).

---

## 5. Verification Plan (Frontend Slices)

| Check | Slice | How it is verified |
| --- | --- | --- |
| Token-only enforcement | S1 + CI/pre-release | `grep -E "\[#\|\[[0-9]+px\]\|{@html" src` returns 0 matches |
| Contrast (Light + Dark) | S1, S12 | Run `design-token-contrast` script against `src/app.css` — 0 failing pairs |
| Keyboard & ARIA | S1, S4, S8, S9 | Playwright checks Tab focus ring on `Button`/`Input`, `<label for>` + `aria-describedby` on `Field`, `aria-current="page"` on active status tab, `<dialog>` Escape close |
| Mobile viewport (no overflow) | S4, S7, S8 | Playwright at `360×800` verifies `document.documentElement.scrollWidth <= window.innerWidth` on `/`, `/app/tickets`, `/app/tickets/[ref]` |
| Internal-vs-Reply safeguard | S9 | Playwright verifies composer defaults to Internal note on page load, button text changes to `"Send reply"` on toggle, and internal note marker never appears in sent emails |
| Mobile performance | S12 | `frontend-lighthouse` on `/` mobile: Performance >= 90, Accessibility >= 95, CLS < 0.1 |

---

## 6. Frontend Decisions Already Covered vs Optional Tweaks

- **Already locked in:** Swiss Ops palette, Light + Dark mode, `Inter` + `JetBrains Mono`, 11 primitives + 2 shells, English UI, Asia/Manila dates, no component library.
- **Assumptions in this doc (confirm if you want different):**
  - **F1. Theme toggle placement:** Included in both `PublicShell` and `AppShell` (persists to `localStorage`). If you prefer OS-preference only with no toggle button, say so to simplify by one tiny component.
  - **F2. Mobile staff nav:** Horizontal scrollable tab strip under the top bar (0 JS, always visible for 2–4 links) instead of a hamburger slide-over drawer.
  - **F3. Mobile ticket list:** Stacked cards below `1024px` (`lg:`), semantic `<table>` at `>= 1024px` (avoids horizontal scrolling on phones).
  - **F4. Icons:** Minimal inline SVG `Icon.svelte` (~12 icons, 0 npm packages) instead of installing `lucide-svelte`.
