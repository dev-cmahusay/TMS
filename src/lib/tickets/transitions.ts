import { getStatusLabel, type TicketStatus } from '$lib/ui/status';

export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
	new: ['assigned', 'in_progress', 'waiting_on_customer', 'resolved'],
	assigned: ['new', 'in_progress', 'waiting_on_customer', 'resolved'],
	in_progress: ['new', 'assigned', 'waiting_on_customer', 'resolved'],
	waiting_on_customer: ['new', 'in_progress', 'resolved'],
	resolved: ['in_progress']
};

export function isTransitionAllowed(from: TicketStatus, to: TicketStatus): boolean {
	if (from === to) return true;
	return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedStatusOptions(current: TicketStatus): TicketStatus[] {
	return [current, ...ALLOWED_TRANSITIONS[current]];
}

export interface ResolveUpdateInput {
	currentStatus: TicketStatus;
	currentAssigneeId: string | null;
	requestedStatus: TicketStatus;
	requestedAssigneeId: string | null;
	actorId: string;
	replyBody: string;
}

export type ResolveUpdateResult =
	| {
			ok: true;
			status: TicketStatus;
			assigneeId: string | null;
	  }
	| {
			ok: false;
			error: string;
	  };

/**
 * Enforces UC-06 and UC-07 rules while preserving DB invariant:
 * (status === 'new') === (assignee_id === null)
 */
export function resolveTicketUpdate(input: ResolveUpdateInput): ResolveUpdateResult {
	const {
		currentStatus,
		currentAssigneeId,
		requestedStatus,
		requestedAssigneeId,
		actorId,
		replyBody
	} = input;

	let status = requestedStatus;
	let assigneeId = requestedAssigneeId;

	// Assignee cannot change while resolved (UC-06)
	if (currentStatus === 'resolved' && status === 'resolved' && assigneeId !== currentAssigneeId) {
		return { ok: false, error: 'Reopen the ticket to change the assignee.' };
	}

	// Assigning a `new` ticket without manually picking a new status moves it to `assigned`
	if (currentStatus === 'new' && status === 'new' && assigneeId !== null) {
		status = 'assigned';
	}

	// Unassigning a non-resolved ticket moves it back to `new`
	if (currentStatus !== 'resolved' && assigneeId === null && status === currentStatus && status !== 'new') {
		status = 'new';
	}

	// Moving to `new` always clears assignee
	if (status === 'new') {
		assigneeId = null;
	}

	// Moving an unassigned ticket to active/resolved status auto-assigns current actor
	if (status !== 'new' && assigneeId === null) {
		assigneeId = actorId;
	}

	if (!isTransitionAllowed(currentStatus, status)) {
		return {
			ok: false,
			error: `You can't move a ticket from ${getStatusLabel(currentStatus)} to ${getStatusLabel(status)}.`
		};
	}

	// Moving into waiting_on_customer requires a customer reply in the same action (UC-07)
	if (status === 'waiting_on_customer' && currentStatus !== 'waiting_on_customer' && !replyBody.trim()) {
		return {
			ok: false,
			error: 'Add a reply telling the customer what you need.'
		};
	}

	return { ok: true, status, assigneeId };
}
