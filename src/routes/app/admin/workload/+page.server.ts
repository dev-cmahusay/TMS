import { error, fail } from '@sveltejs/kit';
import { buildAssignmentAudit, buildStatusAuditSummary } from '$lib/audit/format';
import { recordAuditLogs, type AuditEntryInput } from '$lib/server/audit';
import { logError } from '$lib/server/log';
import type { TicketPriority, TicketStatus, UserRole } from '$lib/ui/status';
import type { Actions, PageServerLoad } from './$types';

export interface WorkloadTicket {
	id: string;
	ref: string;
	customer_name: string;
	category_name: string;
	status: TicketStatus;
	priority: TicketPriority;
	updated_at: string;
	created_at: string;
}

export interface StaffWorkload {
	id: string;
	full_name: string;
	role: UserRole;
	openCount: number;
	resolved30dCount: number;
	assignedCount: number;
	inProgressCount: number;
	waitingCount: number;
	tickets: WorkloadTicket[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(locals: App.Locals) {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Sign in required.');
	const { data: caller } = await locals.supabase
		.from('profiles')
		.select('id, full_name, role, is_active')
		.eq('id', user.id)
		.single();
	if (!caller || !caller.is_active || caller.role !== 'admin') {
		error(403, "You don't have access to this page.");
	}
	return caller;
}

export const load: PageServerLoad = async ({ locals }) => {
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

	const [{ data: staffRows, error: staffErr }, { data: openRows, error: openErr }, { data: resolvedRows }] =
		await Promise.all([
			locals.supabase
				.from('profiles')
				.select('id, full_name, role, is_active')
				.eq('is_active', true)
				.order('full_name', { ascending: true }),
			locals.supabase
				.from('tickets')
				.select(
					'id, ref, customer_name, status, priority, assignee_id, created_at, updated_at, categories(name)'
				)
				.neq('status', 'resolved')
				.order('created_at', { ascending: true }),
			locals.supabase
				.from('tickets')
				.select('assignee_id')
				.eq('status', 'resolved')
				.gte('resolved_at', thirtyDaysAgo)
		]);

	if (staffErr) logError('admin.workload.staff', staffErr);
	if (openErr) logError('admin.workload.tickets', openErr);

	const resolvedCounts = new Map<string, number>();
	for (const r of resolvedRows ?? []) {
		if (r.assignee_id) {
			resolvedCounts.set(r.assignee_id, (resolvedCounts.get(r.assignee_id) ?? 0) + 1);
		}
	}

	const workloadMap = new Map<string, StaffWorkload>();
	for (const s of staffRows ?? []) {
		workloadMap.set(s.id, {
			id: s.id,
			full_name: s.full_name,
			role: s.role as UserRole,
			openCount: 0,
			resolved30dCount: resolvedCounts.get(s.id) ?? 0,
			assignedCount: 0,
			inProgressCount: 0,
			waitingCount: 0,
			tickets: []
		});
	}

	const unassigned: WorkloadTicket[] = [];
	const inactiveAssigned: WorkloadTicket[] = [];

	for (const row of openRows ?? []) {
		const cat = row.categories as unknown as { name: string } | null;
		const item: WorkloadTicket = {
			id: row.id,
			ref: row.ref,
			customer_name: row.customer_name,
			category_name: cat?.name ?? 'Unknown',
			status: row.status as TicketStatus,
			priority: row.priority as TicketPriority,
			created_at: row.created_at,
			updated_at: row.updated_at
		};

		if (!row.assignee_id) {
			unassigned.push(item);
			continue;
		}

		const bucket = workloadMap.get(row.assignee_id);
		if (!bucket) {
			inactiveAssigned.push(item);
			continue;
		}

		bucket.openCount += 1;
		if (item.status === 'assigned') bucket.assignedCount += 1;
		else if (item.status === 'in_progress') bucket.inProgressCount += 1;
		else if (item.status === 'waiting_on_customer') bucket.waitingCount += 1;
		bucket.tickets.push(item);
	}

	// Sort least-busy first so admins immediately see who has capacity
	const staffWorkloads = Array.from(workloadMap.values()).sort(
		(a, b) => a.openCount - b.openCount || a.full_name.localeCompare(b.full_name)
	);

	const totalAssignedOpen = staffWorkloads.reduce((sum, s) => sum + s.openCount, 0);
	const maxOpen = staffWorkloads.reduce((max, s) => Math.max(max, s.openCount), 0);

	return {
		unassigned,
		inactiveAssigned,
		staffWorkloads,
		summary: {
			unassignedCount: unassigned.length,
			assignedOpenCount: totalAssignedOpen + inactiveAssigned.length,
			activeStaffCount: staffWorkloads.length,
			maxOpen
		}
	};
};

export const actions: Actions = {
	assign: async ({ request, locals }) => {
		const caller = await requireAdmin(locals);
		const formData = await request.formData();

		const ticketId = String(formData.get('ticket_id') ?? '').trim();
		const targetAssigneeId = String(formData.get('assignee_id') ?? '').trim();
		const expectedUpdatedAt = String(formData.get('expected_updated_at') ?? '').trim();

		if (!UUID_RE.test(ticketId) || !UUID_RE.test(targetAssigneeId)) {
			return fail(400, { workloadError: 'Choose a valid staff member to assign.' });
		}

		const [{ data: current }, { data: target }] = await Promise.all([
			locals.supabase
				.from('tickets')
				.select('id, ref, status, assignee_id, updated_at, profiles!tickets_assignee_id_fkey(full_name)')
				.eq('id', ticketId)
				.single(),
			locals.supabase
				.from('profiles')
				.select('id, full_name, is_active')
				.eq('id', targetAssigneeId)
				.single()
		]);

		if (!current) return fail(404, { workloadError: 'Ticket not found.' });
		if (current.status === 'resolved') {
			return fail(400, { workloadError: 'Reopen the ticket to change its assignee.' });
		}
		if (!target || !target.is_active) {
			return fail(400, { workloadError: 'Selected staff member is not active.' });
		}
		if (current.assignee_id === target.id) {
			return { assigned: true, assignedRef: current.ref, assignedTo: target.full_name };
		}

		const nextStatus: TicketStatus =
			current.status === 'new' ? 'assigned' : (current.status as TicketStatus);

		const { data: updated, error: updateErr } = await locals.supabase
			.from('tickets')
			.update({
				assignee_id: target.id,
				status: nextStatus
			})
			.eq('id', current.id)
			.eq('updated_at', expectedUpdatedAt)
			.select('id')
			.maybeSingle();

		if (updateErr) {
			logError('admin.workload.assign', updateErr, { ticketRef: current.ref });
			return fail(400, { workloadError: updateErr.message });
		}
		if (!updated) {
			return fail(409, {
				workloadError: `${current.ref} was updated by someone else. Refresh the page and try again.`
			});
		}

		const prevAssignee = current.profiles as unknown as { full_name: string } | null;
		const auditEntries: AuditEntryInput[] = [];

		const assignmentAudit = buildAssignmentAudit({
			actorName: caller.full_name,
			ticketRef: current.ref,
			fromName: prevAssignee?.full_name ?? null,
			toName: target.full_name
		});
		if (assignmentAudit) {
			auditEntries.push({
				actorId: caller.id,
				actorName: caller.full_name,
				action: assignmentAudit.action,
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: assignmentAudit.summary,
				metadata: {
					ticket_ref: current.ref,
					from_assignee_id: current.assignee_id,
					from_assignee_name: prevAssignee?.full_name ?? null,
					to_assignee_id: target.id,
					to_assignee_name: target.full_name
				}
			});
		}

		if (nextStatus !== current.status) {
			auditEntries.push({
				actorId: caller.id,
				actorName: caller.full_name,
				action: 'ticket.status_changed',
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: buildStatusAuditSummary({
					actorName: caller.full_name,
					ticketRef: current.ref,
					fromStatus: current.status as TicketStatus,
					toStatus: nextStatus
				}),
				metadata: {
					ticket_ref: current.ref,
					from_status: current.status,
					to_status: nextStatus
				}
			});
		}

		await recordAuditLogs(locals.supabase, auditEntries);

		return { assigned: true, assignedRef: current.ref, assignedTo: target.full_name };
	}
};
