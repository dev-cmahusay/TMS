import { error, fail } from '@sveltejs/kit';
import { profileUpdateSchema } from '$lib/schemas/profile';
import { logError } from '$lib/server/log';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { UserRole } from '$lib/ui/status';
import type { Actions, PageServerLoad } from './$types';

export interface TeamMember {
	id: string;
	full_name: string;
	email: string | null;
	role: UserRole;
	is_active: boolean;
}

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { profile } = await parent();
	const { data: profiles, error: profErr } = await locals.supabase
		.from('profiles')
		.select('id, full_name, role, is_active')
		.order('full_name', { ascending: true });

	if (profErr) {
		logError('admin.team.load', profErr);
		return { members: [] as TeamMember[], currentUserId: profile.id };
	}

	const emailMap = new Map<string, string>();
	try {
		const admin = getSupabaseAdmin();
		const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 });
		for (const u of usersData?.users ?? []) {
			if (u.id && u.email) emailMap.set(u.id, u.email);
		}
	} catch {
		// Service role optional for listing emails; degrade gracefully.
	}

	const members: TeamMember[] = (profiles ?? []).map((p) => ({
		id: p.id,
		full_name: p.full_name,
		email: emailMap.get(p.id) ?? null,
		role: p.role as UserRole,
		is_active: p.is_active
	}));

	return { members, currentUserId: profile.id };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) error(401, 'Sign in required.');

		const { data: caller } = await locals.supabase
			.from('profiles')
			.select('id, role, is_active')
			.eq('id', user.id)
			.single();

		if (!caller || !caller.is_active || caller.role !== 'admin') {
			error(403, "You don't have access to this page.");
		}

		const formData = await request.formData();
		const targetId = String(formData.get('id') ?? '');
		const isSelf = targetId === caller.id;

		const parsed = profileUpdateSchema.safeParse({
			full_name: String(formData.get('full_name') ?? ''),
			role: isSelf ? caller.role : String(formData.get('role') ?? 'agent'),
			is_active: isSelf ? caller.is_active : String(formData.get('is_active') ?? '') === 'true'
		});

		if (!parsed.success) {
			return fail(400, {
				teamError: parsed.error.issues[0]?.message ?? 'Enter a name (2–100 characters).'
			});
		}

		if (isSelf) {
			const submittedRole = String(formData.get('role') ?? caller.role);
			const submittedActive = String(formData.get('is_active') ?? String(caller.is_active));
			if (submittedRole !== caller.role || submittedActive !== String(caller.is_active)) {
				return fail(400, {
					teamError: "You can't change your own role or deactivate your own account."
				});
			}
		}

		const { error: updateErr } = await locals.supabase
			.from('profiles')
			.update({
				full_name: parsed.data.full_name,
				role: parsed.data.role,
				is_active: parsed.data.is_active
			})
			.eq('id', targetId);

		if (updateErr) {
			if (updateErr.message.includes("can't change your own role")) {
				return fail(400, {
					teamError: "You can't change your own role or deactivate your own account."
				});
			}
			logError('admin.team.update', updateErr);
			return fail(500, { teamError: 'Could not update staff member. Please try again.' });
		}

		return { saved: true };
	}
};
