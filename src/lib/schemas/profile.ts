import { z } from 'zod';

export const profileUpdateSchema = z.object({
	full_name: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 2 && v.length <= 100 && /^[^\r\n]*$/.test(v), {
			message: 'Enter a name (2–100 characters).'
		}),
	role: z.enum(['agent', 'admin']),
	is_active: z.boolean()
});
