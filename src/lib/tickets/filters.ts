import { TICKET_STATUSES, type TicketStatus } from '$lib/ui/status';

export type TicketFilterStatus = 'open' | 'all' | TicketStatus;

export const PAGE_SIZE = 25;

const VALID_FILTERS = new Set<string>(['open', 'all', ...TICKET_STATUSES]);

export interface TicketListFilters {
	status: TicketFilterStatus;
	mine: boolean;
	assignee: string | null;
	page: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseTicketFilters(params: URLSearchParams): TicketListFilters {
	const rawStatus = params.get('status') ?? 'open';
	const status: TicketFilterStatus = VALID_FILTERS.has(rawStatus)
		? (rawStatus as TicketFilterStatus)
		: 'open';

	const mine = params.get('mine') === '1';

	const rawAssignee = (params.get('assignee') ?? '').trim();
	const assignee =
		!mine && (rawAssignee === 'unassigned' || UUID_RE.test(rawAssignee)) ? rawAssignee : null;

	const rawPage = Number.parseInt(params.get('page') ?? '1', 10);
	const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

	return { status, mine, assignee, page };
}
