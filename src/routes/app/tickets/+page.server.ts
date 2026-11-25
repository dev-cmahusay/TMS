import { PAGE_SIZE, parseTicketFilters } from '$lib/tickets/filters';
import { TICKET_STATUSES, type TicketPriority, type TicketStatus } from '$lib/ui/status';
import type { PageServerLoad } from './$types';

export interface TicketListItem {
	id: string;
	ref: string;
	customer_name: string;
	category_name: string;
	status: TicketStatus;
	priority: TicketPriority;
	assignee_name: string | null;
	created_at: string;
}

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { profile } = await parent();
	const filters = parseTicketFilters(url.searchParams);

	const from = (filters.page - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	// Build filtered ticket list query
	let query = locals.supabase
		.from('tickets')
		.select(
			'id, ref, customer_name, status, priority, created_at, categories(name), profiles!tickets_assignee_id_fkey(full_name)',
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false })
		.range(from, to);

	if (filters.status === 'open') {
		query = query.neq('status', 'resolved');
	} else if (filters.status !== 'all') {
		query = query.eq('status', filters.status);
	}

	if (filters.mine) {
		query = query.eq('assignee_id', profile.id);
	} else if (filters.assignee === 'unassigned') {
		query = query.is('assignee_id', null);
	} else if (filters.assignee) {
		query = query.eq('assignee_id', filters.assignee);
	}

	// Count query per status (respects mine / assignee filter when active)
	let countQuery = locals.supabase.from('tickets').select('status');
	if (filters.mine) {
		countQuery = countQuery.eq('assignee_id', profile.id);
	} else if (filters.assignee === 'unassigned') {
		countQuery = countQuery.is('assignee_id', null);
	} else if (filters.assignee) {
		countQuery = countQuery.eq('assignee_id', filters.assignee);
	}

	const [{ data: rows, count: totalFiltered }, { data: allStatuses }, assigneeRow] =
		await Promise.all([
			query,
			countQuery,
			filters.assignee && filters.assignee !== 'unassigned'
				? locals.supabase.from('profiles').select('full_name').eq('id', filters.assignee).single()
				: Promise.resolve({ data: null })
		]);

	const assigneeFilterLabel =
		filters.assignee === 'unassigned'
			? 'Unassigned'
			: (assigneeRow.data?.full_name ?? null);

	const counts: Record<'open' | 'all' | TicketStatus, number> = {
		open: 0,
		all: 0,
		new: 0,
		assigned: 0,
		in_progress: 0,
		waiting_on_customer: 0,
		resolved: 0
	};

	for (const r of allStatuses ?? []) {
		const s = r.status as TicketStatus;
		if ((TICKET_STATUSES as readonly string[]).includes(s)) {
			counts[s] += 1;
			counts.all += 1;
			if (s !== 'resolved') counts.open += 1;
		}
	}

	const tickets: TicketListItem[] = (rows ?? []).map((row) => {
		const cat = row.categories as unknown as { name: string } | null;
		const prof = row.profiles as unknown as { full_name: string } | null;
		return {
			id: row.id,
			ref: row.ref,
			customer_name: row.customer_name,
			category_name: cat?.name ?? 'Unknown',
			status: row.status as TicketStatus,
			priority: row.priority as TicketPriority,
			assignee_name: prof?.full_name ?? null,
			created_at: row.created_at
		};
	});

	const total = totalFiltered ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return {
		tickets,
		counts,
		filters,
		assigneeFilterLabel,
		pagination: {
			total,
			page: filters.page,
			pageSize: PAGE_SIZE,
			totalPages
		}
	};
};
