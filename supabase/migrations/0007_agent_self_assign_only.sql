-- 0007_agent_self_assign_only.sql
-- Tightens tickets_before_update() so agents can only assign tickets to themselves
-- (admins can assign to any active staff member).

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
		and new.assignee_id is distinct from auth.uid()
		and not public.is_admin()
	then
		raise exception 'Agents can only assign tickets to themselves.';
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
