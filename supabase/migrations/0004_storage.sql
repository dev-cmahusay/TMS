-- 0004_storage.sql
-- Private storage bucket and staff-only read policy for ticket attachments

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'ticket-attachments',
	'ticket-attachments',
	false,
	5242880,
	array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ticket_attachments_storage_staff_select on storage.objects;
create policy ticket_attachments_storage_staff_select
	on storage.objects for select
	to authenticated
	using (
		bucket_id = 'ticket-attachments'
		and (select public.is_staff())
	);
