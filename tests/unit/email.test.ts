import { describe, expect, it, vi } from 'vitest';
import { escapeHtml } from '../../src/lib/server/email/escape';
import { sendNotificationEmail } from '../../src/lib/server/email/send';
import {
	buildConfirmationEmail,
	buildReplyEmail,
	buildResolvedEmail
} from '../../src/lib/server/email/templates';

describe('email templates and escaping', () => {
	it('escapes HTML characters', () => {
		expect(escapeHtml(`<script>"&'</script>`)).toBe('&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
	});

	it('formats confirmation subject and escapes description in HTML', () => {
		const email = buildConfirmationEmail({
			ref: 'TK-000042',
			customerName: '<b>Ana</b>',
			categoryName: 'Printer',
			description: '<script>alert(1)</script>'
		});
		expect(email.subject).toMatch(/^\[TK-\d{6}\] /);
		expect(email.html).not.toContain('<script>');
		expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('formats reply and resolved subjects', () => {
		expect(
			buildReplyEmail({ ref: 'TK-000001', customerName: 'Juan', replyBody: 'Checked cable.' })
				.subject
		).toBe('[TK-000001] Update on your request');
		expect(buildResolvedEmail({ ref: 'TK-000001', customerName: 'Juan' }).subject).toBe(
			'[TK-000001] Your request has been resolved'
		);
	});
});

describe('sendNotificationEmail', () => {
	const content = buildReplyEmail({ ref: 'TK-000001', customerName: 'Juan', replyBody: 'Hi' });

	it('returns sent in log mode and failed in fail mode without calling fetch', async () => {
		const mockFetch = vi.fn();
		expect(
			await sendNotificationEmail({
				to: 'a@b.com',
				ref: 'TK-000001',
				content,
				modeOverride: 'log',
				fetchFn: mockFetch as unknown as typeof fetch
			})
		).toBe('sent');
		expect(
			await sendNotificationEmail({
				to: 'a@b.com',
				ref: 'TK-000001',
				content,
				modeOverride: 'fail',
				fetchFn: mockFetch as unknown as typeof fetch
			})
		).toBe('failed');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('sends once in live mode with Reply-To and maps non-2xx to failed without retrying', async () => {
		const okFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		const statusOk = await sendNotificationEmail({
			to: 'teacher@school.edu.ph',
			ref: 'TK-000001',
			content,
			modeOverride: 'live',
			apiKeyOverride: 're_test_key',
			fromOverride: 'helpdesk@school.edu.ph',
			replyToOverride: 'ict@school.edu.ph',
			fetchFn: okFetch as unknown as typeof fetch
		});
		expect(statusOk).toBe('sent');
		expect(okFetch).toHaveBeenCalledTimes(1);
		const sentBody = JSON.parse(String(okFetch.mock.calls[0]?.[1]?.body));
		expect(sentBody.reply_to).toBe('ict@school.edu.ph');

		const failFetch = vi.fn().mockResolvedValue(new Response('err', { status: 502 }));
		const statusFail = await sendNotificationEmail({
			to: 'teacher@school.edu.ph',
			ref: 'TK-000001',
			content,
			modeOverride: 'live',
			apiKeyOverride: 're_test_key',
			fetchFn: failFetch as unknown as typeof fetch
		});
		expect(statusFail).toBe('failed');
		expect(failFetch).toHaveBeenCalledTimes(1);
	});
});
