import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const { error } = await locals.supabase.from('categories').select('id').limit(1);
		if (error) {
			return new Response('degraded', {
				status: 503,
				headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
			});
		}
		return new Response('ok', {
			status: 200,
			headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
		});
	} catch {
		return new Response('degraded', {
			status: 503,
			headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
		});
	}
};
