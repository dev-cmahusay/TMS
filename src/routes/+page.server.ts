import { env as publicEnv } from '$env/dynamic/public';
import { fail } from '@sveltejs/kit';
import {
	declaredUploadsSchema,
	finalizeAttachmentsSchema,
	publicTicketSchema
} from '$lib/schemas/ticket';
import {
	createSignedUploadSlots,
	verifyAndRecordAttachments
} from '$lib/server/attachments';
import { sendNotificationEmail } from '$lib/server/email/send';
import { buildConfirmationEmail } from '$lib/server/email/templates';
import { logError } from '$lib/server/log';
import { checkPublicRateLimits } from '$lib/server/rate-limit';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import { verifyTurnstile } from '$lib/server/turnstile';
import { maskEmail } from '$lib/utils/mask-email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const { data, error } = await locals.supabase
			.from('categories')
			.select('id, name, sort_order')
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });

		if (error) {
			logError('public.load-categories', error);
			return {
				categories: [],
				turnstileSiteKey: publicEnv.PUBLIC_TURNSTILE_SITE_KEY ?? ''
			};
		}

		return {
			categories: data ?? [],
			turnstileSiteKey: publicEnv.PUBLIC_TURNSTILE_SITE_KEY ?? ''
		};
	} catch (err) {
		logError('public.load-categories', err);
		return {
			categories: [],
			turnstileSiteKey: publicEnv.PUBLIC_TURNSTILE_SITE_KEY ?? ''
		};
	}
};

export const actions: Actions = {
	create: async ({ request, getClientAddress }) => {
		const formData = await request.formData();

		const values = {
			customer_name: String(formData.get('customer_name') ?? ''),
			customer_email: String(formData.get('customer_email') ?? ''),
			customer_phone: String(formData.get('customer_phone') ?? ''),
			category_id: String(formData.get('category_id') ?? ''),
			description: String(formData.get('description') ?? ''),
			privacy_consent: formData.get('privacy_consent') === 'on' || formData.get('privacy_consent') === 'true'
		};

		const turnstileToken = String(formData.get('cf-turnstile-response') ?? '');
		const clientIp = request.headers.get('cf-connecting-ip') ?? getClientAddress() ?? 'unknown';

		// 1. Verify Turnstile
		const turnstile = await verifyTurnstile(turnstileToken, clientIp);
		if (!turnstile.success) {
			return fail(400, {
				error: "We couldn't verify you're human. Please try again.",
				values
			});
		}

		// 2. Check rate limits (per IP and per email)
		try {
			const rateCheck = await checkPublicRateLimits(clientIp, values.customer_email);
			if (!rateCheck.allowed) {
				return fail(429, {
					error:
						'Too many requests from your network. Please try again in an hour, or contact the IT office directly.',
					values
				});
			}
		} catch (err) {
			logError('public.rate-limit', err);
			return fail(500, {
				error: 'Something went wrong on our side. Please try again in a few minutes.',
				values
			});
		}

		// 3. Validate fields with shared schema (authoritative)
		const parsed = publicTicketSchema.safeParse(values);
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = String(issue.path[0] ?? 'form');
				if (!fieldErrors[key]) {
					fieldErrors[key] = issue.message;
				}
			}
			return fail(400, { fieldErrors, values });
		}

		// Parse optional declared upload mime types
		let declaredMimes: Array<'image/jpeg' | 'image/png' | 'image/webp'> = [];
		const rawUploads = String(formData.get('declared_uploads') ?? '').trim();
		if (rawUploads) {
			try {
				const parsedUploads = declaredUploadsSchema.safeParse(JSON.parse(rawUploads));
				if (!parsedUploads.success) {
					return fail(400, {
						fieldErrors: {
							images: parsedUploads.error.issues[0]?.message ?? 'Only JPEG, PNG or WebP images are allowed.'
						},
						values
					});
				}
				declaredMimes = parsedUploads.data.map((u) => u.mime_type);
			} catch {
				return fail(400, {
					fieldErrors: { images: 'Only JPEG, PNG or WebP images are allowed.' },
					values
				});
			}
		}

		try {
			const admin = getSupabaseAdmin();

			// Verify category is active
			const { data: category, error: catErr } = await admin
				.from('categories')
				.select('id, name, is_active')
				.eq('id', parsed.data.category_id)
				.single();

			if (catErr || !category || !category.is_active) {
				return fail(400, {
					fieldErrors: { category_id: 'Choose a category.' },
					values
				});
			}

			// 4. Insert ticket
			const { data: ticket, error: insertErr } = await admin
				.from('tickets')
				.insert({
					customer_name: parsed.data.customer_name,
					customer_email: parsed.data.customer_email,
					customer_phone: parsed.data.customer_phone,
					category_id: category.id,
					description: parsed.data.description,
					status: 'new',
					priority: 'normal'
				})
				.select('id, ref')
				.single();

			if (insertErr || !ticket) {
				logError('public.insert-ticket', insertErr ?? 'Empty ticket response');
				return fail(500, {
					error: 'Something went wrong on our side. Please try again in a few minutes.',
					values
				});
			}

			// 5. Insert system message ("Request received.")
			const { data: msg } = await admin
				.from('ticket_messages')
				.insert({
					ticket_id: ticket.id,
					author_id: null,
					body: 'Request received.',
					is_internal: false,
					email_status: 'pending'
				})
				.select('id')
				.single();

			// 6. Issue signed upload URLs for declared images
			const uploads =
				declaredMimes.length > 0 ? await createSignedUploadSlots(ticket.id, declaredMimes) : [];

			// 7. Send confirmation email (never blocks ticket creation)
			const emailContent = buildConfirmationEmail({
				ref: ticket.ref,
				customerName: parsed.data.customer_name,
				categoryName: category.name,
				description: parsed.data.description
			});

			const emailStatus = await sendNotificationEmail({
				to: parsed.data.customer_email,
				ref: ticket.ref,
				content: emailContent
			});

			if (msg?.id) {
				await admin
					.from('ticket_messages')
					.update({ email_status: emailStatus })
					.eq('id', msg.id);
			}

			return {
				created: true as const,
				ref: ticket.ref,
				ticketId: ticket.id,
				maskedEmail: maskEmail(parsed.data.customer_email),
				uploads
			};
		} catch (err) {
			logError('public.create-ticket', err);
			return fail(500, {
				error: 'Something went wrong on our side. Please try again in a few minutes.',
				values
			});
		}
	},

	finalize: async ({ request }) => {
		const formData = await request.formData();
		const ticketId = String(formData.get('ticket_id') ?? '');
		const rawPaths = String(formData.get('paths') ?? '[]');

		let parsedPaths: unknown;
		try {
			parsedPaths = JSON.parse(rawPaths);
		} catch {
			return fail(400, { finalized: true as const, recorded: 0, failed: 1 });
		}

		const parsed = finalizeAttachmentsSchema.safeParse({
			ticket_id: ticketId,
			paths: parsedPaths
		});

		if (!parsed.success) {
			return fail(400, { finalized: true as const, recorded: 0, failed: 1 });
		}

		const result = await verifyAndRecordAttachments(parsed.data.ticket_id, parsed.data.paths);
		return {
			finalized: true as const,
			recorded: result.recorded,
			failed: result.failed
		};
	}
};
