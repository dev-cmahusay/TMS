import type { DashboardStats } from '$lib/database.types';
import { logError } from '$lib/server/log';
import type { PageServerLoad } from './$types';

const EMPTY_STATS: DashboardStats = {
	open_total: 0,
	by_status: {
		new: 0,
		assigned: 0,
		in_progress: 0,
		waiting_on_customer: 0
	},
	resolved_30d: 0,
	avg_resolution_seconds: null,
	per_agent: []
};

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error } = await locals.supabase.rpc('dashboard_stats');
	if (error || !data) {
		if (error) logError('dashboard.stats', error);
		return { stats: EMPTY_STATS };
	}
	return {
		stats: data as unknown as DashboardStats
	};
};
