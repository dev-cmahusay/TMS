export const TICKET_STATUSES = [
	'new',
	'assigned',
	'in_progress',
	'waiting_on_customer',
	'resolved'
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type UserRole = 'agent' | 'admin';

export interface BadgeStyle {
	label: string;
	classes: string;
}

export const STATUS_BADGE_MAP: Record<TicketStatus, BadgeStyle> = {
	new: {
		label: 'New',
		classes: 'bg-badge-new-bg text-badge-new-fg'
	},
	assigned: {
		label: 'Assigned',
		classes: 'bg-badge-assigned-bg text-badge-assigned-fg'
	},
	in_progress: {
		label: 'In progress',
		classes: 'bg-badge-progress-bg text-badge-progress-fg ring-1 ring-inset ring-primary/30'
	},
	waiting_on_customer: {
		label: 'Waiting on customer',
		classes: 'bg-badge-waiting-bg text-badge-waiting-fg'
	},
	resolved: {
		label: 'Resolved',
		classes: 'bg-badge-resolved-bg text-badge-resolved-fg'
	}
};

export const PRIORITY_BADGE_MAP: Record<TicketPriority, BadgeStyle> = {
	low: {
		label: 'Low',
		classes: 'bg-surface-subtle text-muted'
	},
	normal: {
		label: 'Normal',
		classes: 'bg-surface-subtle text-text'
	},
	high: {
		label: 'High',
		classes: 'bg-badge-waiting-bg text-badge-waiting-fg'
	},
	urgent: {
		label: 'Urgent',
		classes: 'bg-badge-urgent-bg text-badge-urgent-fg'
	}
};

export function getStatusLabel(status: TicketStatus): string {
	return STATUS_BADGE_MAP[status].label;
}

export function getPriorityLabel(priority: TicketPriority): string {
	return PRIORITY_BADGE_MAP[priority].label;
}
