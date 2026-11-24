import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		const next = encodeURIComponent(url.pathname + url.search);
		redirect(303, `/login?next=${next}`);
	}

	const { data: profile, error } = await locals.supabase
		.from('profiles')
		.select('id, full_name, role, is_active')
		.eq('id', user.id)
		.single();

	if (error || !profile || !profile.is_active) {
		await locals.supabase.auth.signOut();
		redirect(303, '/login?reason=disabled');
	}

	locals.user = user;
	locals.profile = profile;

	return {
		profile: {
			id: profile.id,
			full_name: profile.full_name,
			role: profile.role
		}
	};
};
