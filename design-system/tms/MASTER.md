# Design System — Swiss Ops (TMS)

Global visual source of truth for the **Tech Support Ticketing System (Philippine SMEs)**.
Derived from `ui-ux-pro-max` (`#5 B2B Service` + `#5 Minimal Swiss` + `#9 Developer Mono`) and aligned with [AGENTS.md](../../AGENTS.md).

> **Rule of precedence:** [AGENTS.md](../../AGENTS.md) overrides any conflicting guidance. Never hard-code hex values, pixel spacing, or font sizes in components or pages — consume tokens from [tokens.css](./tokens.css) (mapped in `src/app.css`) and compose primitives from `src/lib/components/ui/`.

---

## 1. Visual Identity & Strategy

- **Theme name:** **Swiss Ops**
- **Palette discipline:** **2 colors + 1 accent**
  1. **Color 1 — Slate Navy (`#0F172A`)**: primary ink in light mode, primary surface in dark mode, structural anchors.
  2. **Color 2 — Cool Paper (`#F8FAFC` / `#FFFFFF`)**: clean high-legibility canvas in light mode, primary ink in dark mode.
  3. **1 Accent — Cerulean Blue (`#0369A1` light / `#38BDF8` dark)**: primary CTAs (`Submit Request`, `Send Reply`), active filters/tabs, links, and focus rings.
- **Functional status colors (strictly non-decorative):** Danger (`#DC2626` / `#F87171`), Success (`#15803D` / `#4ADE80`), Warning (`#B45309` / `#FBBF24`). Used only in `Badge`, `Alert`, form validation errors, and destructive confirmations — never for layout chrome.
- **Color modes:** Light + Dark from day one (`prefers-color-scheme: dark` by default, overrideable with `data-theme="light" | "dark"` on `<html>`).
- **Aesthetic:** Minimal Swiss operational clarity — crisp 1px borders, flat elevation, subtle shadows, generous touch targets (`>= 44×44px`), tabular numerals for metrics and timestamps, zero visual bloat on slow mobile data.

---

## 2. Color Tokens (WCAG 2.2 AA Verified)

All foreground/background pairs exceed WCAG 2.2 AA (**>= 4.5:1** normal text, **>= 3.0:1** interactive control borders and focus indicators).

| Token | Light | Dark | Role & Verified Contrast |
| --- | --- | --- | --- |
| `--color-bg` | `#F8FAFC` | `#0B1120` | Page canvas |
| `--color-surface` | `#FFFFFF` | `#0F172A` | Cards, tables, modals, inputs |
| `--color-surface-subtle` | `#F1F5F9` | `#1E293B` | Table headers, secondary panels, internal notes |
| `--color-text` | `#0F172A` | `#F8FAFC` | Primary text (17.06:1 light / 18.00:1 dark) |
| `--color-muted` | `#475569` | `#94A3B8` | Secondary labels, timestamps, helper text (7.24:1 / 6.96:1) |
| `--color-primary` | `#0369A1` | `#38BDF8` | **Accent** — primary buttons, active tabs, links (5.93:1 / 8.33:1) |
| `--color-primary-hover` | `#075985` | `#7DD3FC` | Primary hover/active state (7.56:1 / 11.29:1) |
| `--color-primary-fg` | `#FFFFFF` | `#0B1120` | Text on `--color-primary` (5.93:1 / 8.79:1) |
| `--color-border` | `#E2E8F0` | `#1E293B` | Structural dividers, card outlines, table row borders |
| `--color-border-strong` | `#64748B` | `#64748B` | Interactive input/control borders (4.76:1 light / 3.79:1 dark — passes SC 1.4.11) |
| `--color-ring` | `#0369A1` | `#38BDF8` | Visible keyboard focus ring (`2px solid`, `2px` offset) |
| `--color-danger` | `#DC2626` | `#F87171` | Validation errors, urgent priority, destructive actions (4.83:1 / 6.45:1) |
| `--color-danger-fg` | `#FFFFFF` | `#0B1120` | Text on `--color-danger` (4.83:1 / 6.81:1) |
| `--color-success` | `#15803D` | `#4ADE80` | Resolved status, submission confirmation (5.02:1 / 10.25:1) |
| `--color-success-fg` | `#FFFFFF` | `#0B1120` | Text on `--color-success` (5.02:1 / 11.40:1) |
| `--color-warning` | `#B45309` | `#FBBF24` | `waiting_on_customer` status, non-blocking cautions (5.02:1 / 10.69:1) |
| `--color-note-bg` | `#F1F5F9` | `#1E293B` | Internal-only agent note surface (paired with dashed border + lock icon + "Internal note" label) |

---

## 3. Ticket Status & Priority Mapping (`src/lib/ui/status.ts`)

Single source of truth consumed **only by `Badge`**. Every badge MUST render a text label (and optional icon/dot) — never convey status by color alone.

| Status / Priority | Label | Light (`text` / `bg`) | Dark (`text` / `bg`) | Contrast |
| --- | --- | --- | --- | --- |
| `new` | New | `#075985` / `#E0F2FE` | `#7DD3FC` / `#0C4A6E` | 6.59:1 / 5.67:1 |
| `assigned` | Assigned | `#1E293B` / `#E2E8F0` | `#E2E8F0` / `#334155` | 11.87:1 / 8.40:1 |
| `in_progress` | In progress | `#0369A1` / `#F0F9FF` (+ accent border) | `#BAE6FD` / `#075985` | 5.57:1 / 5.70:1 |
| `waiting_on_customer` | Waiting on customer | `#92400E` / `#FEF3C7` | `#FDE68A` / `#78350F` | 6.37:1 / 7.28:1 |
| `resolved` | Resolved | `#166534` / `#DCFCE7` | `#BBF7D0` / `#14532D` | 6.49:1 / 7.52:1 |
| Priority: `urgent` | Urgent | `#991B1B` / `#FEE2E2` | `#FECACA` / `#7F1D1D` | 6.80:1 / 6.93:1 |

---

## 4. Typography

- **UI / Headings & Body:** `Inter` (`'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`)
- **Ticket Refs, Timestamps & Metrics:** `JetBrains Mono` (`'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`) + `font-variant-numeric: tabular-nums` on counts, SLA/resolution durations, and table dates.
- **Loading strategy (mobile-data friendly):** Self-host subsetted WOFF2 or load Google Fonts with `display=swap` and only needed weights (`Inter`: 400, 500, 600, 700; `JetBrains Mono`: 400, 500). Never block first paint.

| Token | Size | Line Height | Weight | Usage |
| --- | --- | --- | --- | --- |
| `--text-xs` | `0.75rem` (12px) | `1rem` (16px) | 500 | Badges, table column headers, meta captions |
| `--text-sm` | `0.875rem` (14px) | `1.25rem` (20px) | 400–500 | Table rows, secondary controls, form errors |
| `--text-base` | `1rem` (16px) | `1.5rem` (24px) | 400 | Body text, ticket descriptions, inputs (prevents iOS zoom) |
| `--text-lg` | `1.125rem` (18px) | `1.75rem` (28px) | 600 | Card/section headings |
| `--text-xl` | `1.25rem` (20px) | `1.75rem` (28px) | 600 | Sub-page titles |
| `--text-2xl` | `1.5rem` (24px) | `2rem` (32px) | 700 | Page headers (`PageHeader`), KPI stat numbers |

---

## 5. Spacing, Radius & Elevation

- **Spacing scale:** 4px base grid (`--space-1: 0.25rem` through `--space-16: 4rem`).
  - Form field gap: `--space-4` (16px); Section gap: `--space-6` (24px); Page padding: `--space-4` mobile / `--space-6` desktop.
- **Radius scale:** Crisp, Swiss, understated:
  - `--radius-sm`: `0.25rem` (4px) — badges, checkboxes
  - `--radius-md`: `0.375rem` (6px) — buttons, inputs, selects
  - `--radius-lg`: `0.5rem` (8px) — cards, panels, modals
  - `--radius-full`: `9999px` — status pills / avatar initials
- **Shadows:** Flat-first (rely on 1px `--color-border` in light mode and surface step `#0B1120` → `#0F172A` → `#1E293B` in dark mode):
  - `--shadow-sm`: `0 1px 2px 0 rgb(15 23 42 / 0.05)` (cards/buttons in light mode)
  - `--shadow-md`: `0 4px 12px -2px rgb(15 23 42 / 0.12)` (modals, dropdowns)

---

## 6. Surface & Component Guidelines

- **Public Request Form (`PublicShell`):**
  - Single-column centered card (`max-w-xl`), generous spacing, clear company header, zero navigation clutter.
  - Visible `<label>` above every control (never placeholder-only); inline error directly below the field + error summary on submit failure.
  - Image upload dropzone shows accepted formats (`JPEG, PNG, WebP · max 5 MB · up to 3 photos`) and thumbnail previews before submit.
  - Primary submit CTA spans full width on mobile (`min-h-[44px]`).
- **Agent Dashboard (`AppShell`):**
  - Responsive layout: compact top bar + slide-over/bottom nav on mobile; narrow left rail (`224px`) on `lg:` desktop.
  - **KPI strip:** 3 crisp stat cards (Open tickets, Avg resolution time, Tickets per agent) using `tabular-nums`.
  - **Ticket list:** Status filter tabs + scannable rows showing monospace ref (`#TK-0142`), customer name, category, status `Badge`, assignee, and relative Manila-time timestamp.
  - **Ticket detail:** Two-column on `lg:` (message timeline left, metadata/status/assignee sidebar right). **Internal notes** MUST use `--color-note-bg`, a dashed `--color-border-strong` border, and an explicit `Internal note — hidden from customer` pill so agents never accidentally leak internal remarks.
- **Motion:** Functional only (`150ms ease-out` for hover/focus/tab switches; `200ms` for modals). Respect `prefers-reduced-motion: reduce`.
- **Icons:** Clean 1.5px–2px stroke SVG icons (e.g., Lucide) — never emoji in UI chrome. Decorative icons carry `aria-hidden="true"`; icon-only buttons carry `aria-label`.

---

## 7. Anti-Patterns to Avoid

- No glassmorphism, neon glows, multi-color gradients, or heavy drop shadows.
- No arbitrary Tailwind hex/pixel values (`bg-[#...]`, `text-[13px]`) in components or pages.
- No body inputs below `16px` (`--text-base`) — avoids Safari/iOS auto-zoom on mobile forms.
- No removing `:focus-visible` outlines.
- No status indicators that rely on color alone without a text label.
