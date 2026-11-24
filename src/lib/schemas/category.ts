import { z } from 'zod';

export const categoryNameSchema = z.object({
	name: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 2 && v.length <= 50 && /^[^\r\n]*$/.test(v), {
			message: 'Enter a category name (2–50 characters).'
		})
});
