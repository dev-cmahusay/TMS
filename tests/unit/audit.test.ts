import { describe, expect, it } from 'vitest';
import {
	buildAssignmentAudit,
	buildPriorityAuditSummary,
	buildStatusAuditSummary,
	getAuditActionMeta
} from '../../src/lib/audit/format';

describe('audit log formatting', () => {
	it('formats initial ticket assignment with actor and assignee names', () => {
		expect(
			buildAssignmentAudit({
				actorName: 'ICT Coordinator',
				ticketRef: 'TK-000012',
				fromName: null,
				toName: 'Juan Dela Cruz'
			})
		).toEqual({
			action: 'ticket.assigned',
			summary: 'ICT Coordinator assigned TK-000012 to Juan Dela Cruz'
		});
	});

	it('formats reassignment with actor, previous assignee, and new assignee', () => {
		expect(
			buildAssignmentAudit({
				actorName: 'ICT Coordinator',
				ticketRef: 'TK-000012',
				fromName: 'Ana Reyes',
				toName: 'Juan Dela Cruz'
			})
		).toEqual({
			action: 'ticket.reassigned',
			summary: 'ICT Coordinator reassigned TK-000012 from Ana Reyes to Juan Dela Cruz'
		});
	});

	it('formats unassignment with actor and previous assignee', () => {
		expect(
			buildAssignmentAudit({
				actorName: 'Juan Dela Cruz',
				ticketRef: 'TK-000012',
				fromName: 'Juan Dela Cruz',
				toName: null
			})
		).toEqual({
			action: 'ticket.unassigned',
			summary: 'Juan Dela Cruz unassigned Juan Dela Cruz from TK-000012'
		});
	});

	it('returns null when assignee did not change', () => {
		expect(
			buildAssignmentAudit({
				actorName: 'Juan Dela Cruz',
				ticketRef: 'TK-000012',
				fromName: 'Juan Dela Cruz',
				toName: 'Juan Dela Cruz'
			})
		).toBeNull();
	});

	it('formats status and priority summaries and action metadata', () => {
		expect(
			buildStatusAuditSummary({
				actorName: 'Juan Dela Cruz',
				ticketRef: 'TK-000012',
				fromStatus: 'assigned',
				toStatus: 'in_progress'
			})
		).toBe('Juan Dela Cruz changed TK-000012 status from Assigned to In progress');

		expect(
			buildPriorityAuditSummary({
				actorName: 'ICT Coordinator',
				ticketRef: 'TK-000012',
				fromPriority: 'normal',
				toPriority: 'urgent'
			})
		).toBe('ICT Coordinator changed TK-000012 priority from Normal to Urgent');

		expect(getAuditActionMeta('ticket.reassigned')).toEqual({
			label: 'Reassigned',
			variant: 'info'
		});
	});
});
