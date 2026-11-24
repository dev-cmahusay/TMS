-- 0003_rls.sql
-- Row-Level Security (default deny on every table)

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.rate_limits enable row level security;

-- profiles
create policy profiles_staff_select
	on public.profiles for select
	to authenticated
	using ((select public.is_staff()));

create policy profiles_admin_update
	on public.profiles for update
	to authenticated
	using ((select public.is_admin()))
	with check ((select public.is_admin()));

-- categories
create policy categories_public_select
	on public.categories for select
	to anon
	using (is_active = true);

create policy categories_staff_select
	on public.categories for select
	to authenticated
	using ((select public.is_staff()));

create policy categories_admin_insert
	on public.categories for insert
	to authenticated
	with check ((select public.is_admin()));

create policy categories_admin_update
	on public.categories for update
	to authenticated
	using ((select public.is_admin()))
	with check ((select public.is_admin()));

-- tickets (no anon policies; public creation uses service_role server action only)
create policy tickets_staff_select
	on public.tickets for select
	to authenticated
	using ((select public.is_staff()));

create policy tickets_staff_update
	on public.tickets for update
	to authenticated
	using ((select public.is_staff()))
	with check ((select public.is_staff()));

-- ticket_messages (append-only for staff; immutable)
create policy ticket_messages_staff_select
	on public.ticket_messages for select
	to authenticated
	using ((select public.is_staff()));

create policy ticket_messages_staff_insert
	on public.ticket_messages for insert
	to authenticated
	with check (
		(select public.is_staff())
		and author_id = (select auth.uid())
	);

-- ticket_attachments (read-only for staff; inserts/deletes via service_role finalize action)
create policy ticket_attachments_staff_select
	on public.ticket_attachments for select
	to authenticated
	using ((select public.is_staff()));

-- rate_limits: no policies for anon or authenticated (service_role RPC only)
