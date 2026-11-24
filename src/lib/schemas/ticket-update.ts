import { z } from 'zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '$lib/ui/status';

export const ticketUpdateSchema = z.object({
	status: z.enum(TICKET_STATUSES),
	priority: z.enum(TICKET_PRIORITIES),
	assignee_id: z
		.string()
		.optional()
		.default('')
		.transform((v) => v.trim())
		.refine((v) => v === '' || z.string().uuid().safeParse(v).success, {
			message: 'Choose a valid assignee.'
		})
		.transform((v) => (v === '' ? null : v)),
	expected_updated_at: z.string().min(1, 'Missing ticket version.'),
	reply_body: z
		.string()
		.optional()
		.default('')
		.transform((v) => v.trim())
		.refine((v) => v.length <= 5000, {
			message: 'Write a reply (1–5,000 characters).'
		}),
	resolution_note: z
		.string()
		.optional()
		.default('')
		.transform((v) => v.trim())
		.refine((v) => v.length <= 5000, {
			message: 'Keep the resolution note under 5,000 characters.'
		})
});

export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
