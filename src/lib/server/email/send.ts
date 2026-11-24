import { env } from '$env/dynamic/private';
import type { EmailStatus } from '$lib/database.types';
import { logError } from '$lib/server/log';
import type { EmailContent } from './templates';

export interface SendEmailParams {
	to: string;
	ref: string;
	content: EmailContent;
	fetchFn?: typeof fetch;
	modeOverride?: string;
	apiKeyOverride?: string;
	fromOverride?: string;
	replyToOverride?: string;
}

export async function sendNotificationEmail(params: SendEmailParams): Promise<EmailStatus> {
	const mode = (params.modeOverride ?? env.EMAIL_MODE ?? 'log').toLowerCase();
	const fromAddress = params.fromOverride ?? env.EMAIL_FROM ?? 'helpdesk@example.local';
	const replyTo = params.replyToOverride ?? env.SUPPORT_INBOX_EMAIL ?? fromAddress;
	const fetchFn = params.fetchFn ?? fetch;

	if (mode === 'fail') {
		return 'failed';
	}

	if (mode === 'log') {
		console.info(
			JSON.stringify({
				level: 'info',
				context: 'email.log',
				ref: params.ref,
				subject: params.content.subject,
				replyTo
			})
		);
		return 'sent';
	}

	const apiKey = params.apiKeyOverride ?? env.RESEND_API_KEY;
	if (!apiKey) {
		logError('email.resend', 'Missing RESEND_API_KEY', { ticketRef: params.ref });
		return 'failed';
	}

	try {
		const res = await fetchFn('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: `IT Help Desk <${fromAddress}>`,
				to: [params.to],
				reply_to: replyTo,
				subject: params.content.subject,
				text: params.content.text,
				html: params.content.html
			}),
			signal: AbortSignal.timeout(5000)
		});

		if (!res.ok) {
			logError('email.resend', 'Resend returned non-2xx', {
				ticketRef: params.ref,
				statusCode: res.status
			});
			return 'failed';
		}

		return 'sent';
	} catch (err) {
		logError('email.resend', err, { ticketRef: params.ref });
		return 'failed';
	}
}
