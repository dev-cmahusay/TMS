# skills.md — Recommended agent skills (Antigravity)

Place at `docs/skills.md`. Source catalog: https://github.com/sickn33/agentic-awesome-skills

Rules:
- Install only a small, selected set; the full catalog can overload the agent's context.
- Always preview first: `npx agentic-awesome-skills --antigravity --skills <ids> --dry-run`
- Verify exact IDs against the catalog before installing (descriptions below are paraphrased from the catalog).
- Run `skill-audit` on third-party skills before installing.
- Check each skill's license; the repo is MIT but individual skills carry their own.
- `AGENTS.md` overrides any skill. Flag conflicts instead of following the skill.

## Task-to-skill map

| Task | Use these skills |
| --- | --- |
| Any SvelteKit page, route, form action or loader | `sveltekit` |
| Styling, components, layout | `tailwind-patterns`, `design-token-contrast` |
| Performance of public pages | `frontend-lighthouse` |
| Schema, migrations, queries, RLS | `supabase-postgres-best-practices` |
| Env vars, API keys, Turnstile/Resend/Supabase keys | `secrets-management` |
| Writing or running browser tests | `playwright-skill`, `e2e-testing` |
| Before declaring a feature done or deploying | `pre-release-review` |
| Installing any new skill | `skill-audit` first |

## Ask the human first

- `production-audit`: running it invokes `npx commitshow` and calls an external API (`api.commit.show`). Do not run it on private code without the human's approval.

## Manual-only skills (do NOT apply unless the human asks)

- `caveman`: terse reply style. Only when the human requests it.
- `impeccable`: design direction. Only when the human starts the theme phase. When used, it may change design tokens and UI primitives only, never page files or app logic.

## Candidates (not installed)

The sections below are options reviewed earlier. See "Installed" for what is actually in `.agents/skills/`.

## Frontend / styling

| Skill | Use |
| --- | --- |
| `styleseed` | Mobile-first UI/UX generation, design tokens, accessibility review |
| `ckw-design` | Design direction, design-system guidance, UI polish (candidate for the theme chosen later) |
| `design-token-contrast` | Design-token contrast checks |
| `frontend-lighthouse` | Lighthouse CI Core Web Vitals gates and performance budgets |

## Database / Supabase

| Skill | Use |
| --- | --- |
| `supabase/agent-skills` (official source) | Postgres best practices |
| `production-audit` | Audits RLS, grants, webhooks and secrets exposure |
| `sql-sentinel` | Postgres cost and performance anti-pattern audits |

## Backend / Cloudflare / security

| Skill | Use |
| --- | --- |
| `cloudflare/security-audit-skill` | Cloudflare web security audit |
| `wrsmith108/varlock-claude-skill` | Secure environment-variable management |
| `skill-audit` | Pre-install security audit for third-party skills |
| AAS Secure App Builder (plugin, 9 skills) | Security built into feature work |

## Testing / review

| Skill | Use |
| --- | --- |
| `webapp-uat` | Playwright UAT with console/network error capture and accessibility checks |
| `browser-testing-with-devtools` | Chrome DevTools MCP browser verification and frontend debugging |
| `pre-release-review` | Deploy-readiness audits |

## Gaps (no skill found in the part of the catalog reviewed)

- SvelteKit and Tailwind were found in the full catalog (`sveltekit`, `tailwind-patterns`) and installed below.
- Email (Resend) and Cloudflare Turnstile: no skill found in the catalog; rely on official docs.

## Skipped on purpose

- fp-ts skills: extra complexity for a small app
- Drizzle skills: this project uses Supabase migrations
- SSH skills: no VPS in the stack

## Installed

Installed in workspace `.agents/skills/` (auto-discovered by Antigravity; `AGENTS.md` overrides any conflicting skill guidance):

| Skill | Date | Version/commit | License | Source / notes |
| --- | --- | --- | --- | --- |
| `skill-audit` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT | `sickn33/agentic-awesome-skills` (`aptratcn/skill-audit`) |
| `sveltekit` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT (repo; no per-skill header) | `sickn33/agentic-awesome-skills` (community) |
| `tailwind-patterns` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT (repo; no per-skill header) | `sickn33/agentic-awesome-skills` (community) |
| `design-token-contrast` | 2026-11-24 | `v21.2.0` (`a99b3d3bb6db`) | MIT | `sickn33/agentic-awesome-skills` (`Clagoss/claude-code-para-disenadores`) |
| `frontend-lighthouse` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT | `sickn33/agentic-awesome-skills` (`stareezy-1/frontend-architecture-skill`) |
| `supabase-postgres-best-practices` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT | `sickn33/agentic-awesome-skills` (official `supabase/agent-skills`) |
| `production-audit` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT | `sickn33/agentic-awesome-skills` (`commitshow/production-audit`) — **note:** running it invokes `npx commitshow@0.3.23` and calls `https://api.commit.show`; review before running on private code |
| `secrets-management` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT (repo; no per-skill header) | `sickn33/agentic-awesome-skills` (community) |
| `e2e-testing` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT (repo; no per-skill header) | `sickn33/agentic-awesome-skills` (Playwright workflow; `webapp-uat` was not in catalog) |
| `playwright-skill` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | MIT (repo; no per-skill header) | `sickn33/agentic-awesome-skills` (local Node Playwright automation) |
| `pre-release-review` | 2026-11-24 | `v18.8.0` (`2642ad94794e`) | Apache-2.0 | `sickn33/agentic-awesome-skills` (`chaunsin/agent-skills`) |
| `impeccable` | 2026-11-24 | `4.10.0` (`b49177d32788`) | Apache-2.0 | `pbakaus/impeccable` (fail-closed SHA-256 verified binary launcher; theme rules in `AGENTS.md` still take precedence) |
| `caveman` | 2026-11-24 | `main` (`47c61be2d10a`) | Apache-2.0 | `JuliusBrussee/caveman` (core `skills/caveman` only) |
| `ui-ux-pro-max` | 2026-11-24 | `main` (`f2f7266b0780`) | MIT | `nextlevelbuilder/ui-ux-pro-max-skill` (offline stdlib Python BM25 search + local CSV design database; paths adapted to `.agents/skills/ui-ux-pro-max`; `AGENTS.md` styling/token rules take precedence) |
