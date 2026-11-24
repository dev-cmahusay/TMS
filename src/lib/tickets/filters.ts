import { TICKET_STATUSES, type TicketStatus } from '$lib/ui/status';

export type TicketFilterStatus = 'open' | 'all' | TicketStatus;

export const PAGE_SIZE = 25;

const VALID_FILTERS = new Set<string>(['open', 'all', ...TICKET_STATUSES]);

export interface TicketListFilters {
	status: TicketFilterStatus;
	mine: boolean;
	page: number;
}

export function parseTicketFilters(params: URLSearchParams): TicketListFilters {
	const rawStatus = params.get('status') ?? 'open';
	const status: TicketFilterStatus = VALID_FILTERS.has(rawStatus)
		? (rawStatus as TicketFilterStatus)
		: 'open';

	const mine = params.get('mine') === '1';

	const rawPage = Number.parseInt(params.get('page') ?? '1', 10);
	const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

	return { status, mine, page };
}
