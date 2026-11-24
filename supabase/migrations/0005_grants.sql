-- 0005_grants.sql
-- Explicit least-privilege SQL grants matching 0003_rls.sql policies
-- (Required on Supabase projects where default public-table grants are restricted)

grant usage on schema public to anon, authenticated, service_role;

-- Public (anon): read active categories only (row access enforced by RLS)
grant select on table public.categories to anon;

-- Staff (authenticated): least-privilege table grants matching RLS policies
grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.categories to authenticated;
grant select, update on table public.tickets to authenticated;
grant select, insert on table public.ticket_messages to authenticated;
grant select on table public.ticket_attachments to authenticated;
grant usage, select on sequence public.categories_id_seq to authenticated;

-- Server-only admin client (service_role)
grant all on table
	public.profiles,
	public.categories,
	public.tickets,
	public.ticket_messages,
	public.ticket_attachments,
	public.rate_limits
	to service_role;

grant usage, select on all sequences in schema public to service_role;

-- Functions (least-privilege execute grants)
revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated, service_role;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
