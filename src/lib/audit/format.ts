import type { AuditAction } from '$lib/database.types';
import { getPriorityLabel, getStatusLabel, type TicketPriority, type TicketStatus } from '$lib/ui/status';

export interface AssignmentAuditSummary {
	action: 'ticket.assigned' | 'ticket.reassigned' | 'ticket.unassigned';
	summary: string;
}

export function buildAssignmentAudit(input: {
	actorName: string;
	ticketRef: string;
	fromName: string | null;
	toName: string | null;
}): AssignmentAuditSummary | null {
	const { actorName, ticketRef, fromName, toName } = input;

	if (fromName === toName) return null;

	if (!fromName && toName) {
		return {
			action: 'ticket.assigned',
			summary: `${actorName} assigned ${ticketRef} to ${toName}`
		};
	}

	if (fromName && toName) {
		return {
			action: 'ticket.reassigned',
			summary: `${actorName} reassigned ${ticketRef} from ${fromName} to ${toName}`
		};
	}

	return {
		action: 'ticket.unassigned',
		summary: `${actorName} unassigned ${fromName} from ${ticketRef}`
	};
}

export function buildStatusAuditSummary(input: {
	actorName: string;
	ticketRef: string;
	fromStatus: TicketStatus;
	toStatus: TicketStatus;
}): string {
	return `${input.actorName} changed ${input.ticketRef} status from ${getStatusLabel(input.fromStatus)} to ${getStatusLabel(input.toStatus)}`;
}

export function buildPriorityAuditSummary(input: {
	actorName: string;
	ticketRef: string;
	fromPriority: TicketPriority;
	toPriority: TicketPriority;
}): string {
	return `${input.actorName} changed ${input.ticketRef} priority from ${getPriorityLabel(input.fromPriority)} to ${getPriorityLabel(input.toPriority)}`;
}

export const AUDIT_ACTION_META: Record<
	AuditAction,
	{ label: string; variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
	'ticket.assigned': { label: 'Assigned', variant: 'info' },
	'ticket.reassigned': { label: 'Reassigned', variant: 'info' },
	'ticket.unassigned': { label: 'Unassigned', variant: 'warning' },
	'ticket.status_changed': { label: 'Status', variant: 'neutral' },
	'ticket.priority_changed': { label: 'Priority', variant: 'warning' },
	'ticket.reopened': { label: 'Reopened', variant: 'warning' },
	'staff.created': { label: 'Staff created', variant: 'success' },
	'staff.updated': { label: 'Staff updated', variant: 'neutral' },
	'category.created': { label: 'Category added', variant: 'success' },
	'category.updated': { label: 'Category updated', variant: 'neutral' }
};

export function getAuditActionMeta(action: AuditAction) {
	return AUDIT_ACTION_META[action] ?? { label: action, variant: 'neutral' as const };
}
