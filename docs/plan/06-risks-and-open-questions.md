# 06 — Risks and Open Questions

## Top risks

| # | Risk | What could go wrong | Fallback |
| --- | --- | --- | --- |
| **R1** | **Sending email for free needs a domain** | Resend Free sends to arbitrary recipients only from a **verified domain** (DNS records). Many public schools have no domain they control (DepEd domains are managed centrally). Without it, no customer emails go out. | (a) Buy a cheap domain (~₱100–700/year; the only non-free item) and verify it in Resend. (b) Use a domain/subdomain the school already controls, if any. (c) Temporary: run with `EMAIL_MODE=log`; agents email customers manually from the IT inbox. A different provider (e.g., single-sender verification without a domain) would be a stack change and needs your approval; deliverability from Gmail-style senders is poor. |
| **R2** | **Supabase Free pauses and has no backups** | Free projects pause after ~1 week with no activity (school breaks: April–June, December). A paused project means the form and dashboard fail. Free tier has no automatic backups. | UptimeRobot hits `/health` every 5 min, which queries the database (**assumption: this counts as activity — verify after deploy**). If paused, unpause in the dashboard (runbook). Weekly manual `supabase db dump` to school Drive; images are not backed up (accepted: evidence only). Upgrade to Pro (~$25/month) is the real fix if data becomes important. |
| **R3** | **Data Privacy Act (RA 10173) and minors** | Collecting names/emails of students (minors) and storing them on a foreign cloud (Singapore) may need the school's Data Protection Officer approval. | Form intended for staff only (D6), stated on the form. Privacy notice + consent checkbox. Get school/DPO sign-off on the privacy notice before go-live (S12). Define a retention period (open question Q4). |
| R4 | Shared school IP vs rate limits and Turnstile | Everyone at school appears as one IP; strict limits or Turnstile challenges could block real users. | IP limit 20/h, configurable via env without a deploy of code changes (secret update + redeploy). Per-email limit 5/h. Monitor Sentry for rate-limit hits in the first week. |
| R5 | Local development needs Docker | `supabase start` requires Docker Desktop; may not run well on a low-spec Windows laptop. | Use a second free Supabase project as "dev" (Free allows 2 projects) and run tests against it; never use the production project for tests. |
| R6 | Browser resize fails on old phones | Large 12–48 MP photos can crash canvas on low-memory Android phones. | 25 MB input cap; per-file error "This image could not be prepared…"; ticket can still be submitted without images. |
| R7 | Two-step writes are not atomic | Ticket update succeeds but the reply insert fails (no transaction in supabase-js). | Clear message "Status saved, but the reply was not saved. Please send it again." If this proves annoying, move update + message into one Postgres RPC (small change, no new dependency). |
| R8 | Agent sends an internal remark to the customer by mistake | Wrong composer mode. | Composer defaults to Internal note on every load; distinct button text ("Add note" vs "Send reply"); thread labels. |
| R9 | Range download not supported for magic-byte check | Finalize can't read only 16 bytes. | Download the whole object (≤ 5 MB; network I/O, not CPU) and read the first bytes. |
| R10 | Single admin (bus factor) | Only the ICT coordinator can add staff or restore backups. | Runbook in `docs/runbook.md`; recommend at least two admin accounts. |
| R11 | Cloudflare Free plan commercial terms | Unclear for paid customers later (AGENTS.md open decision). | Not an issue for a free school pilot; re-check before charging any client. |

## Open questions for you

| # | Question | My default if you don't answer |
| --- | --- | --- |
| Q1 | Your answer to question 3 was "2". I read it as "two roles, `agent` and `admin`, with the permissions I proposed." Correct? | Yes, as written in D3. |
| Q2 | Your answer to question 5 was "can make and edit". I applied it to **categories** (admin-editable). Should **priorities** also be editable? | No, priorities stay fixed (`low`, `normal`, `high`, `urgent`). |
| Q3 | Email sending domain: does the school have a domain it controls, or is ~₱100–700/year for a domain acceptable? | Build with `EMAIL_MODE=log` and decide before S12. |
| Q4 | Retention: how long should tickets and images be kept? | Keep everything during the pilot; decide before the end of the school year. Automated deletion is "Later". |
| Q5 | Who may submit tickets: staff only, or students too? | Staff only (stated on the form, not enforced technically). |
| Q6 | Add a **Room / location** field? Very useful for a school, but it changes the form fields defined in AGENTS.md. | Not added; description placeholder says "Include the room or building." |
| Q7 | The IT inbox address for `Reply-To` (`SUPPORT_INBOX_EMAIL`)? | Placeholder until S12. |
| Q8 | Move `docs/AGENTS.md` to the repo root so agents load it automatically? | Yes, in S0, if you approve. |
| Q9 | Approve the data-model deviations in 04 (`categories` table, `email_status`, `is_active`, `rate_limits`)? | Yes. |
| Q10 | Approve the dependency list in 05? | Yes. |
| Q11 | Production smoke test: run against production with a test category, or use a separate free staging Supabase project? | Use the dev/staging free project; on production, only a manual check. |

## Later

Not part of the MVP. Build only when asked:

- Inbound email-to-ticket (customer replies threaded automatically)
- In-app password reset, user invitations, self-service profile edits
- Ticket search, CSV export, bulk actions, saved filters
- Attachments on agent replies; agent-uploaded files
- Room/location field (needs AGENTS.md change)
- Filipino-language UI
- Automated backups (e.g., scheduled job) and image backups
- Data-retention automation and ticket/attachment deletion
- Priorities editable by admin
- From AGENTS.md: multi-client portals, SLA timers, job-order PDFs, billable time/parts, customer status page, Viber/SMS notifications, realtime updates
