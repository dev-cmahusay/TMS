# Operations Runbook — IT Help Desk (TMS)

Free-tier deployment, staff administration, monitoring, and backup procedures for a Philippine public high school pilot.

---

## 1. Initial Setup & Deployment

### 1.1 Supabase (Free Tier, Singapore)
1. Create a new Supabase project in the **Singapore (`ap-southeast-1`)** region.
2. Disable public sign-ups: **Authentication → Providers → Email → Allow new users to sign up = OFF**.
3. Push migrations from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --remote
   ```
4. Seed initial school categories by running `supabase/seed.sql` in the SQL Editor (idempotent).

### 1.2 Create the First Admin Account
1. In Supabase Dashboard: **Authentication → Users → Add user → Create new user** (check **Auto Confirm User**).
2. Promote that user to `admin` in SQL Editor (replace the email):
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'ICT Coordinator'
   where id = (select id from auth.users where email = 'ict@school.edu.ph');
   ```
3. Recommend creating a **second admin** account so no single person is a bottleneck.

### 1.3 Cloudflare Turnstile
1. Create a Turnstile widget in Cloudflare Dashboard for your production hostname (Managed mode).
2. Record the Site Key (`PUBLIC_TURNSTILE_SITE_KEY`) and Secret Key (`TURNSTILE_SECRET_KEY`).

### 1.4 Resend Email
1. Create a free Resend account (100 emails/day, 3,000/month).
2. Add and verify a sending domain (DNS SPF/DKIM records).
   - If the school does not yet have a domain, deploy temporarily with `EMAIL_MODE=log` and have staff email customers manually from `SUPPORT_INBOX_EMAIL`.
3. Create an API key (`RESEND_API_KEY`) and set `EMAIL_FROM` (e.g., `helpdesk@yourdomain.com`) and `SUPPORT_INBOX_EMAIL` (the school IT inbox where replies go).

### 1.5 Cloudflare Workers Deploy
1. Set public vars in `wrangler.toml` or Cloudflare Dashboard (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`, `EMAIL_FROM`, `SUPPORT_INBOX_EMAIL`, `EMAIL_MODE`, `RATE_LIMIT_IP_PER_HOUR`, `RATE_LIMIT_EMAIL_PER_HOUR`, `SENTRY_DSN`).
2. Set secrets via Wrangler (never commit `.env`):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put RESEND_API_KEY
   ```
3. Build and deploy:
   ```bash
   npm run check && npm run test && npm run build
   npx wrangler deploy
   ```

---

## 2. Monitoring (Free Tier)

- **UptimeRobot (Free):** Create an HTTP(S) monitor on `https://<your-host>/health` every **5 minutes**. Expect status `200` and keyword `ok`.
  - This also sends a lightweight DB query every 5 minutes to help prevent Supabase Free from pausing due to inactivity. Confirm in the Supabase dashboard after 10 days.
- **Sentry (Developer Free):** Add `SENTRY_DSN` in Cloudflare env vars. Do not log customer descriptions, email bodies, or secrets.

---

## 3. Day-to-Day Staff Admin

- **Add a new staff member:** Sign in as an admin → `/app/admin/team` → **Add staff member** (creates a confirmed login immediately as `agent` or `admin`).
- **Reset a forgotten password:** Supabase Dashboard → Authentication → Users → select user → Send password recovery or set temporary password.
- **Disable a departed staff member:** `/app/admin/team` → set Access to **Disabled** → Save. Their next request immediately ends their session. Never delete the auth user (preserves ticket history).

---

## 4. Weekly Backup & Restore Drill

Supabase Free does not include automatic daily backups. Run weekly:

```bash
npx supabase db dump --linked --file backup-$(date +%Y-%m-%d).sql
```

Upload the `.sql` file to a restricted school Google Drive folder (accessible only to admins). Keep at least the last 4 weekly dumps. Photo attachments in Storage are treated as operational evidence and not backed up in the free tier.

**Restore test (before go-live and once per quarter):**
Restore the latest dump into a local Postgres / staging Supabase project and verify tickets, messages, and categories load cleanly.

## 5. If Supabase Free Pauses
1. Open Supabase Dashboard → select the project → click **Restore project** (takes 1–3 minutes).
2. Verify `https://<your-host>/health` returns `200 ok`.
