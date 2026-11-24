import type { AuditAction, AuditEntityType } from '$lib/database.types';
import { logError } from '$lib/server/log';
import type { PageServerLoad } from './$types';

export type AuditFilter = 'all' | 'assignments' | 'tickets' | 'team' | 'categories';

const FILTER_ACTIONS: Record<Exclude<AuditFilter, 'all'>, AuditAction[]> = {
	assignments: ['ticket.assigned', 'ticket.reassigned', 'ticket.unassigned'],
	tickets: [
		'ticket.assigned',
		'ticket.reassigned',
		'ticket.unassigned',
		'ticket.status_changed',
		'ticket.priority_changed',
		'ticket.reopened'
	],
	team: ['staff.created', 'staff.updated'],
	categories: ['category.created', 'category.updated']
};

export interface AuditLogRow {
	id: string;
	actor_name: string;
	action: AuditAction;
	entity_type: AuditEntityType;
	entity_id: string;
	entity_label: string;
	summary: string;
	created_at: string;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const rawFilter = url.searchParams.get('filter') ?? 'all';
	const filter: AuditFilter =
		rawFilter === 'assignments' ||
		rawFilter === 'tickets' ||
		rawFilter === 'team' ||
		rawFilter === 'categories'
			? rawFilter
			: 'all';

	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);

	let query = locals.supabase
		.from('audit_logs')
		.select('id, actor_name, action, entity_type, entity_id, entity_label, summary, created_at')
		.order('created_at', { ascending: false })
		.limit(200);

	if (filter !== 'all') {
		query = query.in('action', FILTER_ACTIONS[filter]);
	}

	if (q) {
		const escaped = q.replace(/[%_,()]/g, ' ').trim();
		if (escaped) {
			query = query.or(
				`summary.ilike.%${escaped}%,actor_name.ilike.%${escaped}%,entity_label.ilike.%${escaped}%`
			);
		}
	}

	const { data, error: loadErr } = await query;

	if (loadErr) {
		logError('admin.audit.load', loadErr);
		return { logs: [] as AuditLogRow[], filter, q };
	}

	const logs: AuditLogRow[] = (data ?? []).map((row) => ({
		id: row.id,
		actor_name: row.actor_name,
		action: row.action as AuditAction,
		entity_type: row.entity_type as AuditEntityType,
		entity_id: row.entity_id,
		entity_label: row.entity_label,
		summary: row.summary,
		created_at: row.created_at
	}));

	return { logs, filter, q };
};
