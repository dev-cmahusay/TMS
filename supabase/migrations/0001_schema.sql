-- 0001_schema.sql
-- Core schema for Tech Support Ticketing System (TMS)

create sequence if not exists public.ticket_ref_seq start 1 increment 1;

-- Staff profiles linked 1:1 to auth.users
create table public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	full_name text not null check (char_length(trim(full_name)) between 2 and 100),
	role text not null default 'agent' check (role in ('agent', 'admin')),
	is_active boolean not null default true,
	created_at timestamptz not null default now()
);

-- Admin-managed ticket categories (soft-deactivated, never hard-deleted)
create table public.categories (
	id smallint primary key generated always as identity,
	name text not null check (char_length(trim(name)) between 2 and 50),
	is_active boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index categories_name_lower_uq on public.categories (lower(trim(name)));

-- Support tickets
create table public.tickets (
	id uuid primary key default gen_random_uuid(),
	ref text not null unique default ('TK-' || lpad(nextval('public.ticket_ref_seq')::text, 6, '0')),
	customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
	customer_email text not null check (
		char_length(customer_email) <= 254
		and customer_email = lower(customer_email)
		and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
	),
	customer_phone text null check (
		customer_phone is null
		or customer_phone ~ '^[0-9+()\-\s]{7,20}$'
	),
	category_id smallint not null references public.categories(id) on delete restrict,
	description text not null check (char_length(trim(description)) between 10 and 5000),
	status text not null default 'new' check (
		status in ('new', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved')
	),
	priority text not null default 'normal' check (
		priority in ('low', 'normal', 'high', 'urgent')
	),
	assignee_id uuid null references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	resolved_at timestamptz null,
	constraint tickets_status_assignee_ck check ((status = 'new') = (assignee_id is null)),
	constraint tickets_resolved_at_ck check ((status = 'resolved') = (resolved_at is not null))
);

create index tickets_status_created_idx on public.tickets (status, created_at desc);
create index tickets_assignee_status_idx on public.tickets (assignee_id, status);
create index tickets_category_id_idx on public.tickets (category_id);
create index tickets_resolved_at_idx on public.tickets (resolved_at) where resolved_at is not null;

-- Thread messages (system events, internal notes, customer-visible replies)
create table public.ticket_messages (
	id uuid primary key default gen_random_uuid(),
	ticket_id uuid not null references public.tickets(id) on delete cascade,
	author_id uuid null references public.profiles(id) on delete set null,
	body text not null check (char_length(trim(body)) between 1 and 5000),
	is_internal boolean not null default false,
	email_status text null check (
		email_status is null
		or email_status in ('pending', 'sent', 'failed')
	),
	created_at timestamptz not null default now(),
	constraint messages_email_status_ck check (not is_internal or email_status is null)
);

create index ticket_messages_ticket_created_idx on public.ticket_messages (ticket_id, created_at);
create index ticket_messages_author_idx on public.ticket_messages (author_id) where author_id is not null;

-- Private storage attachment metadata (max 3 per ticket enforced by trigger)
create table public.ticket_attachments (
	id uuid primary key default gen_random_uuid(),
	ticket_id uuid not null references public.tickets(id) on delete cascade,
	storage_path text not null unique check (
		storage_path ~ '^tickets/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
	),
	mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
	size_bytes integer not null check (size_bytes between 1 and 5242880),
	created_at timestamptz not null default now()
);

create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

-- Server-only public-form rate-limiting counters (hashed IP/email keys)
create table public.rate_limits (
	key text not null,
	window_start timestamptz not null,
	count integer not null default 0 check (count >= 0),
	primary key (key, window_start)
);
