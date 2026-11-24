-- Seed default categories for a Philippine public high school IT help desk
insert into public.categories (name, sort_order, is_active)
values
	('Computer / Laptop', 10, true),
	('Projector / TV', 20, true),
	('Internet / Wi-Fi', 30, true),
	('Printer / Scanner', 40, true),
	('Account / Password', 50, true),
	('Software / Installation', 60, true),
	('CCTV / Bell / PA System', 70, true),
	('Other', 80, true)
on conflict do nothing;
