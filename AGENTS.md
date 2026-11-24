# AGENTS.md — Tech Support Ticketing System (Philippine SMEs)

Instructions for AI coding agents working in this repository. Read fully before making changes.

## Project

A small ticketing system for IT support and repair businesses. Customers submit requests through a public form; agents manage tickets in a private dashboard. MVP serves ONE client company. Keep it small.

## Stack (do not substitute without asking)

- Language: TypeScript (strict mode)
- App: SvelteKit (server-side form actions, no separate API layer)
- Hosting: Cloudflare Workers/Pages via `@sveltejs/adapter-cloudflare`
- Database, auth, files: Supabase (Postgres, Auth, Storage), Singapore region
- Validation: Zod (or Valibot) — one schema shared by client and server
- Styling: Tailwind CSS with design tokens (see "Styling"), no component library
- Email: Resend
- Spam protection: Cloudflare Turnstile on the public form
- Monitoring: Sentry, UptimeRobot

Runtime constraints (Cloudflare free plan): 10 ms CPU per request, no local disk, no Node-only APIs. Do not add heavy server-side processing (image resizing, PDF generation) — do it in the browser or defer it.

## MVP scope

In scope:
1. Public request form (name, contact, category, description, up to 3 images) with Turnstile
2. Ticket statuses: new, assigned, in_progress, waiting_on_customer, resolved
3. Agent dashboard: list, filter by status, ticket detail, assign, internal notes, reply
4. Image attachments (private storage)
5. Email notification to customer on each customer-visible update
6. Basic dashboard: open tickets, average resolution time, tickets per agent

Out of scope until a paying client asks: multi-client portals, SLA timers, job-order PDFs, billable time/parts, customer status page, Viber/SMS notifications, realtime updates.

## Data model (outline)

- `profiles` (id → auth.users, name, role: `agent` | `admin`)
- `tickets` (id, ref, customer_name, customer_email, customer_phone, category, description, status, priority, assignee_id, created_at, updated_at, resolved_at)
- `ticket_messages` (id, ticket_id, author_id nullable, body, is_internal bool, created_at)
- `ticket_attachments` (id, ticket_id, storage_path, mime_type, size_bytes, created_at)

Migrations live in `supabase/migrations/` and are committed. After schema changes run `supabase gen types typescript` and commit the generated types. Never edit the production schema by hand.

## Security rules (non-negotiable)

- Row-level security ON for every table, default deny. Write explicit policies; agents see only what their role allows.
- The Supabase `service_role` key is server-only. Never import it in client code or expose it via `PUBLIC_` env vars.
- Anonymous ticket creation happens ONLY through the SvelteKit server action, after Turnstile verification and rate limiting. No direct anonymous inserts from the browser.
- Validate every input on the server with the shared schema, even if the client validated it.
- Never render user-provided content as raw HTML.
- Secrets live in environment variables / Cloudflare secrets. Never commit `.env`.

## Image uploads

- Private storage bucket only. Serve via short-lived signed URLs.
- Path format: `tickets/{ticket_id}/{uuid}.{ext}`. Never use the original filename.
- Allow JPEG, PNG, WebP only; max 5 MB each, max 3 per ticket. Verify type on the server, not just by extension.
- Resize in the browser before upload (longest side ~1600 px).
- Anonymous uploads use a signed upload URL issued by the server action for that single file.

## Styling (reusable and uniform)

Visual theme: **Swiss Ops** — 2 colors (Slate Navy `#0F172A` + Cool Paper `#F8FAFC`) + 1 accent (Cerulean `#0369A1` light / `#38BDF8` dark), Light + Dark mode from day one, `Inter` + `JetBrains Mono` (for ticket refs/metrics). Full spec and WCAG 2.2 AA tokens live in `design-system/tms/MASTER.md` and `design-system/tms/tokens.css`. Keep the theme swappable by editing tokens in one place.

- Define all design tokens as CSS variables in `src/app.css` (from `design-system/tms/tokens.css`) and map them in the Tailwind `@theme inline` block: colors (`--color-bg`, `--color-surface`, `--color-surface-subtle`, `--color-text`, `--color-muted`, `--color-primary`, `--color-primary-hover`, `--color-primary-fg`, `--color-danger`, `--color-success`, `--color-warning`, `--color-border`, `--color-border-strong`, `--color-ring`, `--color-note-bg`), radius, spacing scale, font families, font sizes, shadows.
- Support Light + Dark mode via `prefers-color-scheme: dark` with optional `data-theme="light" | "dark"` override on `<html>`.
- Never hard-code colors, font sizes or pixel spacing in components. Use token-based Tailwind classes only (e.g. `bg-surface`, `text-muted`, `rounded-md`), no arbitrary values like `bg-[#123456]`.
- Build reusable UI primitives in `src/lib/components/ui/` and use them everywhere instead of re-styling elements: `Button`, `Input`, `Textarea`, `Select`, `Field` (label + control + error), `Card`, `Badge` (ticket status/priority), `Table`, `Modal`, `Alert`, `PageHeader`.
- Page layouts live in `src/lib/components/layout/` (`AppShell`, `PublicShell`). Pages compose primitives; they do not define their own look.
- Ticket status and priority colors come from one mapping in `src/lib/ui/status.ts`, used by `Badge` only.
- Mobile-first, one breakpoint strategy, consistent spacing between sections.
- Accessibility baseline: visible focus states, labels on all inputs, sufficient color contrast, no information conveyed by color alone.
- If a theme skill is installed later, it should only change tokens and primitives, never page files.

## Conventions

- Prefer small, readable files; no premature abstractions.
- Use SvelteKit form actions and `+page.server.ts` loaders; avoid client-side fetching where a loader works.
- Keep dependencies minimal. Ask before adding any new package.
- Errors: return user-friendly messages; log details to Sentry, never to the user.
- Copy and UI text in English; currency in PHP (₱); dates in Asia/Manila timezone for display, UTC in storage.

## Commands

```bash
npm install            # install dependencies
npm run dev            # local dev server
npm run check          # type-check (svelte-check)
npm run test           # unit tests (Vitest)
npm run build          # production build
npx wrangler deploy    # deploy to Cloudflare (or via Git integration)
supabase start         # local Supabase
supabase db reset      # apply migrations locally
supabase gen types typescript --local > src/lib/database.types.ts
```

## Definition of done

- Type-check and tests pass.
- New tables have RLS policies and are covered by a migration.
- No secrets or `service_role` usage in client code.
- Public form still works with Turnstile enabled.
- One Playwright smoke test covers: submit ticket → agent sees it → agent replies.

## Change workflow (every task)

1. Read the relevant code and `docs/` first. State assumptions.
2. Make the smallest change that meets the task; reuse existing code and primitives; add no new dependency without asking.
3. Add or update a test for the change.
4. Run type-check and tests (and the Playwright E2E test for user-facing changes). Report results honestly, including failures.

## Agent skills

Skills are installed in `.agents/skills/`. Which skill to use for which task, the manual-only skills and the install rules are in `docs/skills.md`. Skills never override this file; if one conflicts with the stack, scope, styling or security rules here, follow this file and flag the conflict.

## Open decisions (ask the human before assuming)

- Supabase plan for production data (Pro is about $25/month; Free pauses after a week of inactivity and has no automatic backups).
- Cloudflare terms for commercial use on the free plan — confirm before onboarding a paying client.
- Whether to add SMS/Viber notifications after the MVP.
