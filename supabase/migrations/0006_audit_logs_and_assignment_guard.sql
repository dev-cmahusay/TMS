-- 0006_audit_logs_and_assignment_guard.sql
-- 1. Append-only audit_logs table with RLS and explicit grants
-- 2. Database-level guard preventing agents from assigning tickets to admins

create table public.audit_logs (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid null references public.profiles(id) on delete set null,
	actor_name text not null check (char_length(trim(actor_name)) between 1 and 100),
	action text not null check (
		action in (
			'ticket.assigned',
			'ticket.reassigned',
			'ticket.unassigned',
			'ticket.status_changed',
			'ticket.priority_changed',
			'ticket.reopened',
			'staff.created',
			'staff.updated',
			'category.created',
			'category.updated'
		)
	),
	entity_type text not null check (entity_type in ('ticket', 'profile', 'category')),
	entity_id text not null check (char_length(trim(entity_id)) between 1 and 100),
	entity_label text not null check (char_length(trim(entity_label)) between 1 and 150),
	summary text not null check (char_length(trim(summary)) between 1 and 500),
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- Row-Level Security (default deny, append-only)
alter table public.audit_logs enable row level security;

create policy audit_logs_admin_select
	on public.audit_logs for select
	to authenticated
	using ((select public.is_admin()));

create policy audit_logs_ticket_staff_select
	on public.audit_logs for select
	to authenticated
	using ((select public.is_staff()) and entity_type = 'ticket');

create policy audit_logs_staff_insert
	on public.audit_logs for insert
	to authenticated
	with check (
		(select public.is_staff())
		and actor_id = (select auth.uid())
	);

-- Explicit least-privilege SQL grants (no update/delete for authenticated; none for anon)
grant select, insert on table public.audit_logs to authenticated;
grant all on table public.audit_logs to service_role;

-- Update tickets_before_update() to also block agents from assigning tickets to admins
create or replace function public.tickets_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	v_allowed boolean := false;
begin
	if old.status = 'resolved' and new.status = 'resolved' and new.assignee_id is distinct from old.assignee_id then
		raise exception 'Reopen the ticket to change the assignee.';
	end if;

	if auth.uid() is not null
		and new.assignee_id is not null
		and new.assignee_id is distinct from old.assignee_id
		and not public.is_admin()
	then
		if exists (
			select 1
			from public.profiles
			where id = new.assignee_id
				and role = 'admin'
		) then
			raise exception 'Agents cannot assign tickets to administrators.';
		end if;
	end if;

	if new.status is distinct from old.status then
		v_allowed := case old.status
			when 'new' then new.status in ('assigned', 'in_progress', 'waiting_on_customer', 'resolved')
			when 'assigned' then new.status in ('new', 'in_progress', 'waiting_on_customer', 'resolved')
			when 'in_progress' then new.status in ('new', 'assigned', 'waiting_on_customer', 'resolved')
			when 'waiting_on_customer' then new.status in ('new', 'in_progress', 'resolved')
			when 'resolved' then new.status in ('in_progress')
			else false
		end;

		if not v_allowed then
			raise exception 'Disallowed status transition from % to %.', old.status, new.status;
		end if;

		if new.status = 'resolved' then
			new.resolved_at := now();
		elsif old.status = 'resolved' then
			new.resolved_at := null;
		end if;
	end if;

	new.updated_at := now();
	return new;
end;
$$;
