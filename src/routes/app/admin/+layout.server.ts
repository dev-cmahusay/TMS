import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { profile } = await parent();
	if (profile.role !== 'admin') {
		error(403, "You don't have access to this page.");
	}
	return {};
};
