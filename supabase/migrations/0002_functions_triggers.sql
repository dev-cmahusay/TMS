-- 0002_functions_triggers.sql
-- Role helpers, integrity triggers, rate limiting, and dashboard aggregation

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles
		where id = auth.uid()
			and is_active = true
	);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles
		where id = auth.uid()
			and is_active = true
			and role = 'admin'
	);
$$;

-- Automatically create a profile row when a staff user is added in Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_name text;
begin
	v_name := trim(coalesce(
		new.raw_user_meta_data ->> 'full_name',
		split_part(coalesce(new.email, 'Staff'), '@', 1)
	));
	if char_length(v_name) < 2 then
		v_name := 'Staff User';
	end if;

	insert into public.profiles (id, full_name, role, is_active)
	values (new.id, left(v_name, 100), 'agent', true)
	on conflict (id) do nothing;

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

-- Prevent an admin from changing their own role or deactivating themselves
create or replace function public.profiles_protect_self()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if auth.uid() is not null and new.id = auth.uid() then
		if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
			raise exception 'You can''t change your own role or deactivate your own account.';
		end if;
	end if;
	return new;
end;
$$;

create trigger profiles_protect_self_trg
	before update on public.profiles
	for each row execute function public.profiles_protect_self();

-- Ensure at least one active category always exists & keep updated_at fresh
create or replace function public.categories_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if old.is_active = true and new.is_active = false then
		if not exists (
			select 1 from public.categories where is_active = true and id <> old.id
		) then
			raise exception 'Keep at least one active category.';
		end if;
	end if;
	new.updated_at := now();
	return new;
end;
$$;

create trigger categories_before_update_trg
	before update on public.categories
	for each row execute function public.categories_before_update();

-- Enforce ticket status transition table, resolved_at, updated_at, and assignee lock when resolved
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

create trigger tickets_before_update_trg
	before update on public.tickets
	for each row execute function public.tickets_before_update();

-- Enforce max 3 attachments per ticket
create or replace function public.enforce_max_attachments()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	v_count integer;
begin
	select count(*) into v_count
	from public.ticket_attachments
	where ticket_id = new.ticket_id;

	if v_count >= 3 then
		raise exception 'You can attach up to 3 images.';
	end if;

	return new;
end;
$$;

create trigger enforce_max_attachments_trg
	before insert on public.ticket_attachments
	for each row execute function public.enforce_max_attachments();

-- Atomic hourly rate limit check (service_role only)
create or replace function public.check_rate_limit(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_window timestamptz := date_trunc('hour', now());
	v_count integer;
begin
	delete from public.rate_limits
	where window_start < now() - interval '1 day';

	insert into public.rate_limits (key, window_start, count)
	values (p_key, v_window, 1)
	on conflict (key, window_start)
	do update set count = public.rate_limits.count + 1
	returning count into v_count;

	return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer) to service_role;

-- Dashboard stats (SECURITY INVOKER so RLS applies for calling staff user)
create or replace function public.dashboard_stats()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
	with status_counts as (
		select
			count(*) filter (where status <> 'resolved')::integer as open_total,
			count(*) filter (where status = 'new')::integer as new_count,
			count(*) filter (where status = 'assigned')::integer as assigned_count,
			count(*) filter (where status = 'in_progress')::integer as in_progress_count,
			count(*) filter (where status = 'waiting_on_customer')::integer as waiting_count,
			count(*) filter (where status = 'resolved' and resolved_at >= now() - interval '30 days')::integer as resolved_30d,
			avg(extract(epoch from (resolved_at - created_at))) filter (
				where status = 'resolved' and resolved_at >= now() - interval '30 days'
			) as avg_resolution_seconds
		from public.tickets
	),
	agent_rows as (
		select
			p.id::text as agent_id,
			p.full_name as agent_name,
			count(t.id) filter (where t.status <> 'resolved')::integer as open_count,
			count(t.id) filter (where t.status = 'resolved' and t.resolved_at >= now() - interval '30 days')::integer as resolved_30d_count
		from public.profiles p
		left join public.tickets t on t.assignee_id = p.id
		where p.is_active = true
		group by p.id, p.full_name

		union all

		select
			null as agent_id,
			'Unassigned' as agent_name,
			count(*) filter (where status <> 'resolved' and assignee_id is null)::integer as open_count,
			0::integer as resolved_30d_count
		from public.tickets
	)
	select jsonb_build_object(
		'open_total', coalesce((select open_total from status_counts), 0),
		'by_status', jsonb_build_object(
			'new', coalesce((select new_count from status_counts), 0),
			'assigned', coalesce((select assigned_count from status_counts), 0),
			'in_progress', coalesce((select in_progress_count from status_counts), 0),
			'waiting_on_customer', coalesce((select waiting_count from status_counts), 0)
		),
		'resolved_30d', coalesce((select resolved_30d from status_counts), 0),
		'avg_resolution_seconds', (select round(avg_resolution_seconds)::integer from status_counts),
		'per_agent', coalesce(
			(
				select jsonb_agg(
					jsonb_build_object(
						'agent_id', agent_id,
						'agent_name', agent_name,
						'open_count', open_count,
						'resolved_30d_count', resolved_30d_count
					)
					order by (agent_id is null), open_count desc, agent_name asc
				)
				from agent_rows
			),
			'[]'::jsonb
		)
	);
$$;
