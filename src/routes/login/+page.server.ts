import { fail, redirect } from '@sveltejs/kit';
import { getSafeNextUrl } from '$lib/server/safe-redirect';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (user) {
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('id, is_active')
			.eq('id', user.id)
			.single();

		if (profile?.is_active) {
			redirect(303, getSafeNextUrl(url.searchParams.get('next')));
		}
	}

	return {
		next: getSafeNextUrl(url.searchParams.get('next')),
		disabledNotice: url.searchParams.get('reason') === 'disabled'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim().toLowerCase();
		const password = String(formData.get('password') ?? '');
		const next = getSafeNextUrl(String(formData.get('next') ?? '/app'));

		if (!email || !password) {
			return fail(400, {
				email,
				error: 'Incorrect email or password.'
			});
		}

		const { data, error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error || !data.user) {
			if (error?.status === 429) {
				return fail(429, {
					email,
					error: 'Too many sign-in attempts. Please wait a few minutes and try again.'
				});
			}
			return fail(400, {
				email,
				error: 'Incorrect email or password.'
			});
		}

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('id, is_active')
			.eq('id', data.user.id)
			.single();

		if (!profile || !profile.is_active) {
			await locals.supabase.auth.signOut();
			return fail(403, {
				email,
				error: 'Your account is disabled. Contact your administrator.'
			});
		}

		redirect(303, next);
	}
};
