import { describe, expect, it } from 'vitest';
import {
	canAssignTarget,
	isTransitionAllowed,
	resolveTicketUpdate
} from '../../src/lib/tickets/transitions';
import { TICKET_STATUSES, type TicketStatus } from '../../src/lib/ui/status';

describe('ticket status transition matrix', () => {
	const expected: Record<TicketStatus, TicketStatus[]> = {
		new: ['new', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved'],
		assigned: ['new', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved'],
		in_progress: ['new', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved'],
		waiting_on_customer: ['new', 'in_progress', 'waiting_on_customer', 'resolved'],
		resolved: ['in_progress', 'resolved']
	};

	it('matches every cell of the transition table', () => {
		for (const from of TICKET_STATUSES) {
			for (const to of TICKET_STATUSES) {
				expect(isTransitionAllowed(from, to), `${from} -> ${to}`).toBe(expected[from].includes(to));
			}
		}
	});

	it('auto-moves new -> assigned when an assignee is chosen', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'new',
			currentAssigneeId: null,
			requestedStatus: 'new',
			requestedAssigneeId: 'agent-1',
			actorId: 'agent-2',
			replyBody: ''
		});
		expect(res).toEqual({ ok: true, status: 'assigned', assigneeId: 'agent-1' });
	});

	it('auto-assigns actor when moving new -> in_progress without assignee', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'new',
			currentAssigneeId: null,
			requestedStatus: 'in_progress',
			requestedAssigneeId: null,
			actorId: 'agent-2',
			replyBody: ''
		});
		expect(res).toEqual({ ok: true, status: 'in_progress', assigneeId: 'agent-2' });
	});

	it('moves ticket to new when unassigned', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'in_progress',
			currentAssigneeId: 'agent-1',
			requestedStatus: 'in_progress',
			requestedAssigneeId: null,
			actorId: 'agent-1',
			replyBody: ''
		});
		expect(res).toEqual({ ok: true, status: 'new', assigneeId: null });
	});

	it('requires a reply when entering waiting_on_customer', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'in_progress',
			currentAssigneeId: 'agent-1',
			requestedStatus: 'waiting_on_customer',
			requestedAssigneeId: 'agent-1',
			actorId: 'agent-1',
			replyBody: '   '
		});
		expect(res).toEqual({
			ok: false,
			error: 'Add a reply telling the customer what you need.'
		});
	});

	it('rejects changing assignee while resolved', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'resolved',
			currentAssigneeId: 'agent-1',
			requestedStatus: 'resolved',
			requestedAssigneeId: 'agent-2',
			actorId: 'agent-2',
			replyBody: ''
		});
		expect(res).toEqual({
			ok: false,
			error: 'Reopen the ticket to change the assignee.'
		});
	});

	it('rejects resolved -> waiting_on_customer with friendly message', () => {
		const res = resolveTicketUpdate({
			currentStatus: 'resolved',
			currentAssigneeId: 'agent-1',
			requestedStatus: 'waiting_on_customer',
			requestedAssigneeId: 'agent-1',
			actorId: 'agent-1',
			replyBody: 'Need info'
		});
		expect(res).toEqual({
			ok: false,
			error: "You can't move a ticket from Resolved to Waiting on customer."
		});
	});
});

describe('canAssignTarget role guard', () => {
	it('blocks an agent from assigning an unassigned ticket to an admin or another agent', () => {
		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: null,
				targetAssigneeId: 'admin-1'
			})
		).toEqual({
			ok: false,
			error: 'Only administrators can assign tickets to other staff.'
		});

		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: null,
				targetAssigneeId: 'agent-2'
			})
		).toEqual({
			ok: false,
			error: 'Only administrators can assign tickets to other staff.'
		});
	});

	it('blocks an agent from reassigning or unassigning an already-assigned ticket', () => {
		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: 'agent-1',
				targetAssigneeId: null
			})
		).toEqual({
			ok: false,
			error: 'Only administrators can reassign or unassign a ticket.'
		});

		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: 'agent-2',
				targetAssigneeId: 'agent-1'
			})
		).toEqual({
			ok: false,
			error: 'Only administrators can reassign or unassign a ticket.'
		});
	});

	it('allows an agent to claim an unassigned ticket for themselves', () => {
		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: null,
				targetAssigneeId: 'agent-1'
			})
		).toEqual({ ok: true });
	});

	it('allows an agent to keep an already-assigned owner untouched when editing status/priority', () => {
		expect(
			canAssignTarget({
				actorId: 'agent-1',
				actorRole: 'agent',
				currentAssigneeId: 'admin-1',
				targetAssigneeId: 'admin-1'
			})
		).toEqual({ ok: true });
	});

	it('allows an admin to assign, reassign, or unassign any ticket', () => {
		expect(
			canAssignTarget({
				actorId: 'admin-1',
				actorRole: 'admin',
				currentAssigneeId: null,
				targetAssigneeId: 'agent-2'
			})
		).toEqual({ ok: true });

		expect(
			canAssignTarget({
				actorId: 'admin-1',
				actorRole: 'admin',
				currentAssigneeId: 'agent-1',
				targetAssigneeId: 'admin-2'
			})
		).toEqual({ ok: true });

		expect(
			canAssignTarget({
				actorId: 'admin-1',
				actorRole: 'admin',
				currentAssigneeId: 'agent-1',
				targetAssigneeId: null
			})
		).toEqual({ ok: true });
	});
});
