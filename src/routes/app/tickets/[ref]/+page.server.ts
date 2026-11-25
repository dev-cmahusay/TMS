import { error, fail } from '@sveltejs/kit';
import {
	buildAssignmentAudit,
	buildPriorityAuditSummary,
	buildStatusAuditSummary
} from '$lib/audit/format';
import type { AuditAction, EmailStatus } from '$lib/database.types';
import { noteSchema, replySchema } from '$lib/schemas/message';
import { ticketUpdateSchema } from '$lib/schemas/ticket-update';
import { ATTACHMENTS_BUCKET } from '$lib/server/attachments';
import { recordAuditLogs, type AuditEntryInput } from '$lib/server/audit';
import { sendNotificationEmail } from '$lib/server/email/send';
import {
	buildReplyEmail,
	buildResolvedEmail,
	DEFAULT_RESOLUTION_NOTE
} from '$lib/server/email/templates';
import { logError } from '$lib/server/log';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { canAssignTarget, resolveTicketUpdate } from '$lib/tickets/transitions';
import type { TicketPriority, TicketStatus, UserRole } from '$lib/ui/status';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { profile: viewer } = await parent();
	const ref = params.ref.toUpperCase();

	const { data: ticket, error: ticketErr } = await locals.supabase
		.from('tickets')
		.select(
			'id, ref, customer_name, customer_email, customer_phone, category_id, description, status, priority, assignee_id, created_at, updated_at, resolved_at, categories(name), profiles!tickets_assignee_id_fkey(id, full_name, role, is_active)'
		)
		.eq('ref', ref)
		.single();

	if (ticketErr || !ticket) {
		error(404, 'Ticket not found.');
	}

	const [{ data: messages }, { data: attachmentRows }, { data: staffRows }, { data: auditRows }] =
		await Promise.all([
			locals.supabase
				.from('ticket_messages')
				.select('id, author_id, body, is_internal, email_status, created_at, profiles(full_name)')
				.eq('ticket_id', ticket.id)
				.order('created_at', { ascending: true }),
			locals.supabase
				.from('ticket_attachments')
				.select('id, storage_path, mime_type, size_bytes, created_at')
				.eq('ticket_id', ticket.id)
				.order('created_at', { ascending: true }),
			locals.supabase
				.from('profiles')
				.select('id, full_name, role, is_active')
				.eq('is_active', true)
				.order('full_name', { ascending: true }),
			locals.supabase
				.from('audit_logs')
				.select('id, actor_name, action, summary, created_at')
				.eq('entity_type', 'ticket')
				.eq('entity_id', ticket.id)
				.order('created_at', { ascending: true })
		]);

	const paths = (attachmentRows ?? []).map((a) => a.storage_path);
	const signedUrlMap = new Map<string, string>();

	if (paths.length > 0) {
		const { data: signed, error: signErr } = await locals.supabase.storage
			.from(ATTACHMENTS_BUCKET)
			.createSignedUrls(paths, 600);

		if (signErr) {
			logError('ticket.signed-urls', signErr, { ticketRef: ticket.ref });
		} else {
			for (const entry of signed ?? []) {
				if (entry.path && entry.signedUrl) {
					signedUrlMap.set(entry.path, entry.signedUrl);
				}
			}
		}
	}

	const category = ticket.categories as unknown as { name: string } | null;
	const assignee = ticket.profiles as unknown as {
		id: string;
		full_name: string;
		role: UserRole;
		is_active: boolean;
	} | null;

	const assignableStaff = (staffRows ?? [])
		.filter((s) => viewer.role === 'admin' || s.id === viewer.id)
		.map((s) => ({
			id: s.id,
			full_name: s.full_name,
			role: s.role as UserRole
		}));

	return {
		viewerRole: viewer.role as UserRole,
		ticket: {
			id: ticket.id,
			ref: ticket.ref,
			customer_name: ticket.customer_name,
			customer_email: ticket.customer_email,
			customer_phone: ticket.customer_phone,
			category_name: category?.name ?? 'Unknown',
			description: ticket.description,
			status: ticket.status as TicketStatus,
			priority: ticket.priority as TicketPriority,
			assignee_id: ticket.assignee_id,
			assignee_name: assignee?.full_name ?? null,
			assignee_role: assignee?.role ?? null,
			assignee_inactive: assignee ? !assignee.is_active : false,
			created_at: ticket.created_at,
			updated_at: ticket.updated_at,
			resolved_at: ticket.resolved_at
		},
		messages: (messages ?? []).map((m) => {
			const author = m.profiles as unknown as { full_name: string } | null;
			return {
				id: m.id,
				author_id: m.author_id,
				author_name: author?.full_name ?? null,
				body: m.body,
				is_internal: m.is_internal,
				email_status: m.email_status as EmailStatus | null,
				created_at: m.created_at
			};
		}),
		auditEvents: (auditRows ?? []).map((a) => ({
			id: a.id,
			actor_name: a.actor_name,
			action: a.action as AuditAction,
			summary: a.summary,
			created_at: a.created_at
		})),
		attachments: (attachmentRows ?? []).map((a) => ({
			id: a.id,
			mime_type: a.mime_type,
			size_bytes: a.size_bytes,
			url: signedUrlMap.get(a.storage_path) ?? null
		})),
		activeStaff: assignableStaff
	};
};

async function requireStaff(locals: App.Locals) {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Sign in required.');
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, full_name, role, is_active')
		.eq('id', user.id)
		.single();
	if (!profile || !profile.is_active) error(403, 'Account disabled.');
	return profile;
}

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const profile = await requireStaff(locals);
		const ref = params.ref.toUpperCase();
		const formData = await request.formData();

		const parsed = ticketUpdateSchema.safeParse({
			status: String(formData.get('status') ?? ''),
			priority: String(formData.get('priority') ?? ''),
			assignee_id: String(formData.get('assignee_id') ?? ''),
			expected_updated_at: String(formData.get('expected_updated_at') ?? ''),
			reply_body: String(formData.get('reply_body') ?? ''),
			resolution_note: String(formData.get('resolution_note') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				updateError: parsed.error.issues[0]?.message ?? 'Invalid update.'
			});
		}

		const { data: current, error: fetchErr } = await locals.supabase
			.from('tickets')
			.select(
				'id, ref, customer_name, customer_email, status, priority, assignee_id, updated_at, profiles!tickets_assignee_id_fkey(id, full_name, role)'
			)
			.eq('ref', ref)
			.single();

		if (fetchErr || !current) {
			error(404, 'Ticket not found.');
		}

		const resolution = resolveTicketUpdate({
			currentStatus: current.status as TicketStatus,
			currentAssigneeId: current.assignee_id,
			requestedStatus: parsed.data.status,
			requestedAssigneeId: parsed.data.assignee_id,
			actorId: profile.id,
			replyBody: parsed.data.reply_body
		});

		if (!resolution.ok) {
			return fail(400, { updateError: resolution.error });
		}

		const prevAssignee = current.profiles as unknown as {
			id: string;
			full_name: string;
			role: UserRole;
		} | null;

		let nextAssigneeName: string | null = prevAssignee?.full_name ?? null;

		if (resolution.assigneeId !== current.assignee_id) {
			const assignGuard = canAssignTarget({
				actorId: profile.id,
				actorRole: profile.role as UserRole,
				currentAssigneeId: current.assignee_id,
				targetAssigneeId: resolution.assigneeId
			});

			if (!assignGuard.ok) {
				return fail(403, { updateError: assignGuard.error });
			}

			if (resolution.assigneeId === null) {
				nextAssigneeName = null;
			} else {
				const { data: targetProfile } = await locals.supabase
					.from('profiles')
					.select('id, full_name, role, is_active')
					.eq('id', resolution.assigneeId)
					.single();

				if (!targetProfile || !targetProfile.is_active) {
					return fail(400, { updateError: 'Selected assignee is not an active staff member.' });
				}

				nextAssigneeName = targetProfile.full_name;
			}
		}

		const { data: updated, error: updateErr } = await locals.supabase
			.from('tickets')
			.update({
				status: resolution.status,
				priority: parsed.data.priority,
				assignee_id: resolution.assigneeId
			})
			.eq('id', current.id)
			.eq('updated_at', parsed.data.expected_updated_at)
			.select('id, status, updated_at')
			.maybeSingle();

		if (updateErr) {
			logError('ticket.update', updateErr, { ticketRef: current.ref });
			return fail(400, { updateError: updateErr.message });
		}

		if (!updated) {
			return fail(409, {
				conflict: true,
				updateError: 'This ticket was changed by someone else. Reload to see the latest version.'
			});
		}

		// Record immutable audit trail entries
		const auditEntries: AuditEntryInput[] = [];

		if (resolution.assigneeId !== current.assignee_id) {
			const assignmentAudit = buildAssignmentAudit({
				actorName: profile.full_name,
				ticketRef: current.ref,
				fromName: prevAssignee?.full_name ?? null,
				toName: nextAssigneeName
			});
			if (assignmentAudit) {
				auditEntries.push({
					actorId: profile.id,
					actorName: profile.full_name,
					action: assignmentAudit.action,
					entityType: 'ticket',
					entityId: current.id,
					entityLabel: current.ref,
					summary: assignmentAudit.summary,
					metadata: {
						ticket_ref: current.ref,
						from_assignee_id: current.assignee_id,
						from_assignee_name: prevAssignee?.full_name ?? null,
						to_assignee_id: resolution.assigneeId,
						to_assignee_name: nextAssigneeName
					}
				});
			}
		}

		if (resolution.status !== current.status) {
			auditEntries.push({
				actorId: profile.id,
				actorName: profile.full_name,
				action: 'ticket.status_changed',
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: buildStatusAuditSummary({
					actorName: profile.full_name,
					ticketRef: current.ref,
					fromStatus: current.status as TicketStatus,
					toStatus: resolution.status
				}),
				metadata: {
					ticket_ref: current.ref,
					from_status: current.status,
					to_status: resolution.status
				}
			});
		}

		if (parsed.data.priority !== current.priority) {
			auditEntries.push({
				actorId: profile.id,
				actorName: profile.full_name,
				action: 'ticket.priority_changed',
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: buildPriorityAuditSummary({
					actorName: profile.full_name,
					ticketRef: current.ref,
					fromPriority: current.priority as TicketPriority,
					toPriority: parsed.data.priority
				}),
				metadata: {
					ticket_ref: current.ref,
					from_priority: current.priority,
					to_priority: parsed.data.priority
				}
			});
		}

		await recordAuditLogs(locals.supabase, auditEntries);

		const enteringWaiting =
			resolution.status === 'waiting_on_customer' && current.status !== 'waiting_on_customer';
		const enteringResolved = resolution.status === 'resolved' && current.status !== 'resolved';

		if (enteringWaiting || enteringResolved) {
			const messageBody = enteringWaiting
				? parsed.data.reply_body
				: parsed.data.resolution_note || DEFAULT_RESOLUTION_NOTE;

			const { data: insertedMsg, error: msgErr } = await locals.supabase
				.from('ticket_messages')
				.insert({
					ticket_id: current.id,
					author_id: profile.id,
					body: messageBody,
					is_internal: false,
					email_status: 'pending'
				})
				.select('id')
				.single();

			if (msgErr || !insertedMsg) {
				logError('ticket.update-message', msgErr ?? 'Insert failed', { ticketRef: current.ref });
				return fail(500, {
					updateError: 'Status saved, but the reply was not saved. Please send it again.'
				});
			}

			const emailContent = enteringResolved
				? buildResolvedEmail({
						ref: current.ref,
						customerName: current.customer_name,
						resolutionNote: messageBody
					})
				: buildReplyEmail({
						ref: current.ref,
						customerName: current.customer_name,
						replyBody: messageBody
					});

			const status = await sendNotificationEmail({
				to: current.customer_email,
				ref: current.ref,
				content: emailContent
			});

			try {
				const admin = getSupabaseAdmin();
				await admin
					.from('ticket_messages')
					.update({ email_status: status })
					.eq('id', insertedMsg.id);
			} catch (err) {
				logError('ticket.update-email-status', err, { ticketRef: current.ref });
			}
		}

		return { updated: true };
	},

	reopen: async ({ request, locals, params }) => {
		const profile = await requireStaff(locals);
		const ref = params.ref.toUpperCase();
		const formData = await request.formData();
		const expectedUpdatedAt = String(formData.get('expected_updated_at') ?? '');

		const { data: current } = await locals.supabase
			.from('tickets')
			.select('id, ref, status, assignee_id')
			.eq('ref', ref)
			.single();

		if (!current) error(404, 'Ticket not found.');
		if (current.status !== 'resolved') {
			return fail(400, { updateError: 'Only resolved tickets can be reopened.' });
		}

		const { data: updated, error: updateErr } = await locals.supabase
			.from('tickets')
			.update({
				status: 'in_progress',
				assignee_id: current.assignee_id ?? profile.id
			})
			.eq('id', current.id)
			.eq('updated_at', expectedUpdatedAt)
			.select('id')
			.maybeSingle();

		if (updateErr) {
			logError('ticket.reopen', updateErr, { ticketRef: current.ref });
			return fail(400, { updateError: updateErr.message });
		}
		if (!updated) {
			return fail(409, {
				conflict: true,
				updateError: 'This ticket was changed by someone else. Reload to see the latest version.'
			});
		}

		const reopenEntries: AuditEntryInput[] = [
			{
				actorId: profile.id,
				actorName: profile.full_name,
				action: 'ticket.reopened',
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: `${profile.full_name} reopened ${current.ref}`,
				metadata: { ticket_ref: current.ref }
			}
		];

		if (current.assignee_id === null) {
			reopenEntries.push({
				actorId: profile.id,
				actorName: profile.full_name,
				action: 'ticket.assigned',
				entityType: 'ticket',
				entityId: current.id,
				entityLabel: current.ref,
				summary: `${profile.full_name} assigned ${current.ref} to ${profile.full_name}`,
				metadata: {
					ticket_ref: current.ref,
					from_assignee_id: null,
					from_assignee_name: null,
					to_assignee_id: profile.id,
					to_assignee_name: profile.full_name
				}
			});
		}

		await recordAuditLogs(locals.supabase, reopenEntries);

		return { reopened: true };
	},

	note: async ({ request, locals, params }) => {
		const profile = await requireStaff(locals);
		const ref = params.ref.toUpperCase();
		const formData = await request.formData();

		const parsed = noteSchema.safeParse({ body: String(formData.get('body') ?? '') });
		if (!parsed.success) {
			return fail(400, {
				composerError: parsed.error.issues[0]?.message ?? 'Write a note (1–5,000 characters).',
				composerMode: 'note' as const
			});
		}

		const { data: ticket } = await locals.supabase
			.from('tickets')
			.select('id')
			.eq('ref', ref)
			.single();
		if (!ticket) error(404, 'Ticket not found.');

		const { error: insertErr } = await locals.supabase.from('ticket_messages').insert({
			ticket_id: ticket.id,
			author_id: profile.id,
			body: parsed.data.body,
			is_internal: true,
			email_status: null
		});

		if (insertErr) {
			logError('ticket.add-note', insertErr, { ticketRef: ref });
			return fail(500, {
				composerError: 'Could not save note. Please try again.',
				composerMode: 'note' as const
			});
		}

		return { noteAdded: true };
	},

	reply: async ({ request, locals, params }) => {
		const profile = await requireStaff(locals);
		const ref = params.ref.toUpperCase();
		const formData = await request.formData();

		const parsed = replySchema.safeParse({ body: String(formData.get('body') ?? '') });
		if (!parsed.success) {
			return fail(400, {
				composerError: parsed.error.issues[0]?.message ?? 'Write a reply (1–5,000 characters).',
				composerMode: 'reply' as const
			});
		}

		const { data: ticket } = await locals.supabase
			.from('tickets')
			.select('id, ref, customer_name, customer_email')
			.eq('ref', ref)
			.single();
		if (!ticket) error(404, 'Ticket not found.');

		const { data: insertedMsg, error: insertErr } = await locals.supabase
			.from('ticket_messages')
			.insert({
				ticket_id: ticket.id,
				author_id: profile.id,
				body: parsed.data.body,
				is_internal: false,
				email_status: 'pending'
			})
			.select('id')
			.single();

		if (insertErr || !insertedMsg) {
			logError('ticket.reply', insertErr ?? 'Insert failed', { ticketRef: ref });
			return fail(500, {
				composerError: 'Could not save reply. Please try again.',
				composerMode: 'reply' as const
			});
		}

		const emailContent = buildReplyEmail({
			ref: ticket.ref,
			customerName: ticket.customer_name,
			replyBody: parsed.data.body
		});

		const status = await sendNotificationEmail({
			to: ticket.customer_email,
			ref: ticket.ref,
			content: emailContent
		});

		try {
			const admin = getSupabaseAdmin();
			await admin
				.from('ticket_messages')
				.update({ email_status: status })
				.eq('id', insertedMsg.id);
		} catch (err) {
			logError('ticket.reply-email-status', err, { ticketRef: ticket.ref });
		}

		return { replySent: true };
	}
};
