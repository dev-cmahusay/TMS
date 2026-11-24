# Tech Support Ticketing System (TMS)

Small, mobile-first ticketing system for IT support teams (SvelteKit + Tailwind CSS v4 + Supabase + Cloudflare Workers + Resend + Turnstile).

See [AGENTS.md](./AGENTS.md) for stack, security rules, and workflow, and `docs/plan/` for the full specification.

## Commands

```bash
npm install            # install dependencies
npm run dev            # local dev server
npm run check          # type-check (svelte-check)
npm run test           # unit tests (Vitest)
npm run build          # production build
npm run test:e2e       # Playwright E2E tests (requires build)
npx wrangler deploy    # deploy to Cloudflare
supabase start         # local Supabase
supabase db reset      # apply migrations locally
supabase gen types typescript --local > src/lib/database.types.ts
```
