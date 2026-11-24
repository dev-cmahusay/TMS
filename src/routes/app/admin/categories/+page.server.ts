import { error, fail } from '@sveltejs/kit';
import { categoryNameSchema } from '$lib/schemas/category';
import { recordAuditLogs } from '$lib/server/audit';
import { logError } from '$lib/server/log';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: loadErr } = await locals.supabase
		.from('categories')
		.select('id, name, is_active, sort_order')
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true });

	if (loadErr) {
		logError('admin.categories.load', loadErr);
		return { categories: [] };
	}

	return { categories: data ?? [] };
};

async function requireAdmin(locals: App.Locals) {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Sign in required.');
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, full_name, role, is_active')
		.eq('id', user.id)
		.single();
	if (!profile || !profile.is_active || profile.role !== 'admin') {
		error(403, "You don't have access to this page.");
	}
	return profile;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const caller = await requireAdmin(locals);
		const formData = await request.formData();
		const parsed = categoryNameSchema.safeParse({ name: String(formData.get('name') ?? '') });

		if (!parsed.success) {
			return fail(400, {
				createError: parsed.error.issues[0]?.message ?? 'Enter a category name (2–50 characters).'
			});
		}

		const { data: existing } = await locals.supabase
			.from('categories')
			.select('sort_order')
			.order('sort_order', { ascending: false })
			.limit(1);

		const nextOrder = (existing?.[0]?.sort_order ?? 0) + 10;

		const { data: inserted, error: insertErr } = await locals.supabase
			.from('categories')
			.insert({
				name: parsed.data.name,
				sort_order: nextOrder,
				is_active: true
			})
			.select('id, name')
			.single();

		if (insertErr) {
			if (insertErr.code === '23505') {
				return fail(400, { createError: 'A category with this name already exists.' });
			}
			logError('admin.categories.create', insertErr);
			return fail(500, { createError: 'Could not add category. Please try again.' });
		}

		if (inserted) {
			await recordAuditLogs(locals.supabase, [
				{
					actorId: caller.id,
					actorName: caller.full_name,
					action: 'category.created',
					entityType: 'category',
					entityId: String(inserted.id),
					entityLabel: inserted.name,
					summary: `${caller.full_name} created category "${inserted.name}"`,
					metadata: { category_id: inserted.id, name: inserted.name }
				}
			]);
		}

		return { created: true };
	},

	rename: async ({ request, locals }) => {
		const caller = await requireAdmin(locals);
		const formData = await request.formData();
		const id = Number.parseInt(String(formData.get('id') ?? ''), 10);
		const parsed = categoryNameSchema.safeParse({ name: String(formData.get('name') ?? '') });

		if (!Number.isFinite(id)) {
			return fail(400, { actionError: 'Invalid category.' });
		}
		if (!parsed.success) {
			return fail(400, {
				actionError: parsed.error.issues[0]?.message ?? 'Enter a category name (2–50 characters).'
			});
		}

		const { error: updateErr } = await locals.supabase
			.from('categories')
			.update({ name: parsed.data.name })
			.eq('id', id);

		if (updateErr) {
			if (updateErr.code === '23505') {
				return fail(400, { actionError: 'A category with this name already exists.' });
			}
			logError('admin.categories.rename', updateErr);
			return fail(500, { actionError: 'Could not rename category. Please try again.' });
		}

		await recordAuditLogs(locals.supabase, [
			{
				actorId: caller.id,
				actorName: caller.full_name,
				action: 'category.updated',
				entityType: 'category',
				entityId: String(id),
				entityLabel: parsed.data.name,
				summary: `${caller.full_name} renamed category to "${parsed.data.name}"`,
				metadata: { category_id: id, name: parsed.data.name }
			}
		]);

		return { renamed: true };
	},

	move: async ({ request, locals }) => {
		await requireAdmin(locals);
		const formData = await request.formData();
		const id = Number.parseInt(String(formData.get('id') ?? ''), 10);
		const direction = String(formData.get('direction') ?? '');

		if (!Number.isFinite(id) || (direction !== 'up' && direction !== 'down')) {
			return fail(400, { actionError: 'Invalid move request.' });
		}

		const { data: list } = await locals.supabase
			.from('categories')
			.select('id, sort_order')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });

		if (!list || list.length < 2) return { moved: false };

		const idx = list.findIndex((c) => c.id === id);
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) {
			return { moved: false };
		}

		const current = list[idx]!;
		const neighbor = list[swapIdx]!;

		let currentOrder = neighbor.sort_order;
		let neighborOrder = current.sort_order;
		if (currentOrder === neighborOrder) {
			currentOrder = direction === 'up' ? neighbor.sort_order - 1 : neighbor.sort_order + 1;
		}

		await Promise.all([
			locals.supabase.from('categories').update({ sort_order: currentOrder }).eq('id', current.id),
			locals.supabase.from('categories').update({ sort_order: neighborOrder }).eq('id', neighbor.id)
		]);

		return { moved: true };
	},

	toggle: async ({ request, locals }) => {
		const caller = await requireAdmin(locals);
		const formData = await request.formData();
		const id = Number.parseInt(String(formData.get('id') ?? ''), 10);
		const nextActive = String(formData.get('next_active') ?? '') === 'true';

		if (!Number.isFinite(id)) {
			return fail(400, { actionError: 'Invalid category.' });
		}

		if (!nextActive) {
			const { count } = await locals.supabase
				.from('categories')
				.select('id', { count: 'exact', head: true })
				.eq('is_active', true)
				.neq('id', id);

			if ((count ?? 0) < 1) {
				return fail(400, { actionError: 'Keep at least one active category.' });
			}
		}

		const { data: toggled, error: updateErr } = await locals.supabase
			.from('categories')
			.update({ is_active: nextActive })
			.eq('id', id)
			.select('id, name')
			.single();

		if (updateErr) {
			if (updateErr.message.includes('Keep at least one active category')) {
				return fail(400, { actionError: 'Keep at least one active category.' });
			}
			logError('admin.categories.toggle', updateErr);
			return fail(500, { actionError: 'Could not update category. Please try again.' });
		}

		if (toggled) {
			await recordAuditLogs(locals.supabase, [
				{
					actorId: caller.id,
					actorName: caller.full_name,
					action: 'category.updated',
					entityType: 'category',
					entityId: String(toggled.id),
					entityLabel: toggled.name,
					summary: `${caller.full_name} ${nextActive ? 'activated' : 'deactivated'} category "${toggled.name}"`,
					metadata: { category_id: toggled.id, is_active: nextActive }
				}
			]);
		}

		return { toggled: true };
	}
};
