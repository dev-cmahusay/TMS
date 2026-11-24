import { z } from 'zod';

export const noteSchema = z.object({
	body: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 1 && v.length <= 5000, {
			message: 'Write a note (1–5,000 characters).'
		})
});

export const replySchema = z.object({
	body: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 1 && v.length <= 5000, {
			message: 'Write a reply (1–5,000 characters).'
		})
});
