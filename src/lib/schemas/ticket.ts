import { z } from 'zod';

export const MAX_ATTACHMENTS = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export const publicTicketSchema = z.object({
	customer_name: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 2 && v.length <= 100 && /^[^\r\n]*$/.test(v), {
			message: 'Enter your name (2–100 characters).'
		}),
	customer_email: z
		.string()
		.transform((v) => v.trim().toLowerCase())
		.refine((v) => v.length <= 254 && z.string().email().safeParse(v).success, {
			message: 'Enter a valid email address.'
		}),
	customer_phone: z
		.string()
		.optional()
		.default('')
		.transform((v) => v.trim())
		.refine((v) => v === '' || /^[0-9+()\-\s]{7,20}$/.test(v), {
			message: 'Enter a valid phone number or leave it blank.'
		})
		.transform((v) => (v === '' ? null : v)),
	category_id: z.coerce
		.number({ invalid_type_error: 'Choose a category.' })
		.int('Choose a category.')
		.positive('Choose a category.'),
	description: z
		.string()
		.transform((v) => v.trim())
		.refine((v) => v.length >= 10, {
			message: 'Describe the problem (at least 10 characters).'
		})
		.refine((v) => v.length <= 5000, {
			message: 'Keep the description under 5,000 characters.'
		}),
	privacy_consent: z.literal(true, {
		errorMap: () => ({ message: 'Please agree to the privacy notice to continue.' })
	})
});

export type PublicTicketInput = z.infer<typeof publicTicketSchema>;

export const declaredUploadSchema = z.object({
	mime_type: z.enum(ALLOWED_IMAGE_MIMES, {
		errorMap: () => ({ message: 'Only JPEG, PNG or WebP images are allowed.' })
	})
});

export const declaredUploadsSchema = z
	.array(declaredUploadSchema)
	.max(MAX_ATTACHMENTS, 'You can attach up to 3 images.');

export const finalizeAttachmentsSchema = z.object({
	ticket_id: z.string().uuid(),
	paths: z
		.array(z.string().min(1))
		.min(1)
		.max(MAX_ATTACHMENTS, 'You can attach up to 3 images.')
});
