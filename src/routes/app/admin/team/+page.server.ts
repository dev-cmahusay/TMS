import { error, fail } from '@sveltejs/kit';
import { createStaffSchema, profileUpdateSchema } from '$lib/schemas/profile';
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

async function requireAdmin(locals: App.Locals) {
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

	return caller;
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
	create: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();
		const rawFullName = String(formData.get('full_name') ?? '');
		const rawEmail = String(formData.get('email') ?? '');
		const rawPassword = String(formData.get('password') ?? '');
		const rawRole = String(formData.get('role') ?? 'agent');

		const createValues = {
			full_name: rawFullName,
			email: rawEmail,
			role: rawRole === 'admin' ? 'admin' : 'agent'
		};

		const parsed = createStaffSchema.safeParse({
			full_name: rawFullName,
			email: rawEmail,
			password: rawPassword,
			role: rawRole
		});

		if (!parsed.success) {
			return fail(400, {
				createError: parsed.error.issues[0]?.message ?? 'Please check the staff details.',
				createValues
			});
		}

		try {
			const admin = getSupabaseAdmin();
			const { data: created, error: createErr } = await admin.auth.admin.createUser({
				email: parsed.data.email,
				password: parsed.data.password,
				email_confirm: true,
				user_metadata: {
					full_name: parsed.data.full_name
				}
			});

			if (createErr || !created.user) {
				const msg = createErr?.message?.toLowerCase() ?? '';
				if (msg.includes('already') || msg.includes('registered') || createErr?.status === 422) {
					return fail(409, {
						createError: 'An account with this email already exists.',
						createValues
					});
				}
				logError('admin.team.create', createErr ?? new Error('Missing created user'));
				return fail(500, {
					createError: 'Could not create staff account. Please try again.',
					createValues
				});
			}

			const { error: profileErr } = await admin
				.from('profiles')
				.upsert(
					{
						id: created.user.id,
						full_name: parsed.data.full_name,
						role: parsed.data.role,
						is_active: true
					},
					{ onConflict: 'id' }
				);

			if (profileErr) {
				logError('admin.team.create-profile', profileErr);
				return fail(500, {
					createError:
						'Account was created, but setting the staff profile failed. Refresh and update their details below.'
				});
			}

			return {
				created: true,
				createdEmail: parsed.data.email,
				createdName: parsed.data.full_name
			};
		} catch (err) {
			logError('admin.team.create', err);
			return fail(500, {
				createError: 'Could not create staff account. Please try again.',
				createValues
			});
		}
	},

	update: async ({ request, locals }) => {
		const caller = await requireAdmin(locals);

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
