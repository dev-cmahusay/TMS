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

export const createStaffSchema = z.object({
	full_name: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 2 && v.length <= 100 && /^[^\r\n]*$/.test(v), {
			message: 'Enter a name (2–100 characters).'
		}),
	email: z
		.string()
		.transform((v) => v.trim().toLowerCase())
		.refine((v) => v.length <= 254 && z.string().email().safeParse(v).success, {
			message: 'Enter a valid email address.'
		}),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters.')
		.max(128, 'Password must be 128 characters or fewer.'),
	role: z.enum(['agent', 'admin']).default('agent')
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
