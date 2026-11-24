import { describe, expect, it } from 'vitest';
import { categoryNameSchema } from '../../src/lib/schemas/category';
import { noteSchema, replySchema } from '../../src/lib/schemas/message';
import { createStaffSchema, profileUpdateSchema } from '../../src/lib/schemas/profile';
import { publicTicketSchema } from '../../src/lib/schemas/ticket';

describe('publicTicketSchema', () => {
	const valid = {
		customer_name: 'Maria Santos',
		customer_email: 'Maria.Santos@School.Edu.PH ',
		customer_phone: '0917-123-4567',
		category_id: '1',
		description: 'The projector in Room 204 has no HDMI signal.',
		privacy_consent: true as const
	};

	it('accepts valid input and normalizes email and phone', () => {
		const res = publicTicketSchema.safeParse(valid);
		expect(res.success).toBe(true);
		if (res.success) {
			expect(res.data.customer_email).toBe('maria.santos@school.edu.ph');
			expect(res.data.category_id).toBe(1);
		}
	});

	it('allows blank phone and maps to null', () => {
		const res = publicTicketSchema.safeParse({ ...valid, customer_phone: '   ' });
		expect(res.success).toBe(true);
		if (res.success) expect(res.data.customer_phone).toBeNull();
	});

	it('rejects CR/LF injection in customer_name', () => {
		const res = publicTicketSchema.safeParse({ ...valid, customer_name: 'Maria\r\nBcc:evil@x.com' });
		expect(res.success).toBe(false);
		if (!res.success) {
			expect(res.error.issues[0]?.message).toBe('Enter your name (2–100 characters).');
		}
	});

	it('returns exact messages for invalid fields', () => {
		const badEmail = publicTicketSchema.safeParse({ ...valid, customer_email: 'not-an-email' });
		expect(badEmail.success).toBe(false);
		if (!badEmail.success) expect(badEmail.error.issues[0]?.message).toBe('Enter a valid email address.');

		const badPhone = publicTicketSchema.safeParse({ ...valid, customer_phone: 'abc' });
		expect(badPhone.success).toBe(false);
		if (!badPhone.success) {
			expect(badPhone.error.issues[0]?.message).toBe('Enter a valid phone number or leave it blank.');
		}

		const badCat = publicTicketSchema.safeParse({ ...valid, category_id: '' });
		expect(badCat.success).toBe(false);
		if (!badCat.success) expect(badCat.error.issues[0]?.message).toBe('Choose a category.');

		const shortDesc = publicTicketSchema.safeParse({ ...valid, description: 'Broken' });
		expect(shortDesc.success).toBe(false);
		if (!shortDesc.success) {
			expect(shortDesc.error.issues[0]?.message).toBe(
				'Describe the problem (at least 10 characters).'
			);
		}

		const longDesc = publicTicketSchema.safeParse({ ...valid, description: 'a'.repeat(5001) });
		expect(longDesc.success).toBe(false);
		if (!longDesc.success) {
			expect(longDesc.error.issues[0]?.message).toBe('Keep the description under 5,000 characters.');
		}

		const noConsent = publicTicketSchema.safeParse({ ...valid, privacy_consent: false });
		expect(noConsent.success).toBe(false);
		if (!noConsent.success) {
			expect(noConsent.error.issues[0]?.message).toBe(
				'Please agree to the privacy notice to continue.'
			);
		}
	});
});

describe('staff schemas', () => {
	it('validates notes, replies, categories, and profiles', () => {
		expect(noteSchema.safeParse({ body: '  ' }).success).toBe(false);
		expect(replySchema.safeParse({ body: 'Fixed cable.' }).success).toBe(true);
		expect(categoryNameSchema.safeParse({ name: 'A' }).success).toBe(false);
		expect(categoryNameSchema.safeParse({ name: 'Printers' }).success).toBe(true);
		expect(
			profileUpdateSchema.safeParse({ full_name: 'Ana Cruz', role: 'admin', is_active: true })
				.success
		).toBe(true);
	});

	it('validates createStaffSchema inputs and normalizes email', () => {
		const ok = createStaffSchema.safeParse({
			full_name: ' Juan Dela Cruz ',
			email: ' Juan.Agent@School.Edu.PH ',
			password: 'TempPassword123',
			role: 'agent'
		});
		expect(ok.success).toBe(true);
		if (ok.success) {
			expect(ok.data.full_name).toBe('Juan Dela Cruz');
			expect(ok.data.email).toBe('juan.agent@school.edu.ph');
			expect(ok.data.role).toBe('agent');
		}

		const defaultRole = createStaffSchema.safeParse({
			full_name: 'Ana Reyes',
			email: 'ana@school.edu.ph',
			password: 'TempPassword123'
		});
		expect(defaultRole.success).toBe(true);
		if (defaultRole.success) expect(defaultRole.data.role).toBe('agent');

		const shortPw = createStaffSchema.safeParse({
			full_name: 'Ana Reyes',
			email: 'ana@school.edu.ph',
			password: 'short',
			role: 'agent'
		});
		expect(shortPw.success).toBe(false);
		if (!shortPw.success) {
			expect(shortPw.error.issues[0]?.message).toBe('Password must be at least 8 characters.');
		}

		const badEmail = createStaffSchema.safeParse({
			full_name: 'Ana Reyes',
			email: 'not-an-email',
			password: 'TempPassword123',
			role: 'agent'
		});
		expect(badEmail.success).toBe(false);

		const badRole = createStaffSchema.safeParse({
			full_name: 'Ana Reyes',
			email: 'ana@school.edu.ph',
			password: 'TempPassword123',
			role: 'superadmin'
		});
		expect(badRole.success).toBe(false);

		const crlfName = createStaffSchema.safeParse({
			full_name: 'Ana\nReyes',
			email: 'ana@school.edu.ph',
			password: 'TempPassword123',
			role: 'agent'
		});
		expect(crlfName.success).toBe(false);
	});
});
