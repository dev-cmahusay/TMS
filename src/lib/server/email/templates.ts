import { escapeHtml } from './escape';

export interface EmailContent {
	subject: string;
	text: string;
	html: string;
}

export const DEFAULT_RESOLUTION_NOTE =
	'Your request has been marked as resolved. If the problem continues, reply to this email.';

function renderHtmlLayout(paragraphs: string[]): string {
	const body = paragraphs
		.map((p) => `<p style="margin:0 0 12px 0;line-height:1.5;">${p}</p>`)
		.join('');
	return `<!doctype html><html lang="en"><body style="font-family:Inter,system-ui,sans-serif;color:#0f172a;background:#ffffff;padding:16px;">${body}</body></html>`;
}

export function buildConfirmationEmail(params: {
	ref: string;
	customerName: string;
	categoryName: string;
	description: string;
}): EmailContent {
	const { ref, customerName, categoryName, description } = params;
	const subject = `[${ref}] We received your request`;
	const text = [
		`Hi ${customerName},`,
		'',
		`We received your support request (${ref}).`,
		`Category: ${categoryName}`,
		'',
		'Details:',
		description,
		'',
		"We'll email you when there is an update. Reply to this email if you need to add information."
	].join('\n');

	const html = renderHtmlLayout([
		`Hi ${escapeHtml(customerName)},`,
		`We received your support request (<strong>${escapeHtml(ref)}</strong>).`,
		`<strong>Category:</strong> ${escapeHtml(categoryName)}`,
		`<strong>Details:</strong><br/>${escapeHtml(description).replace(/\r?\n/g, '<br/>')}`,
		"We'll email you when there is an update. Reply to this email if you need to add information."
	]);

	return { subject, text, html };
}

export function buildReplyEmail(params: {
	ref: string;
	customerName: string;
	replyBody: string;
}): EmailContent {
	const { ref, customerName, replyBody } = params;
	const subject = `[${ref}] Update on your request`;
	const text = [
		`Hi ${customerName},`,
		'',
		replyBody,
		'',
		`Reference: ${ref}`,
		'Reply to this email if you need to add information.'
	].join('\n');

	const html = renderHtmlLayout([
		`Hi ${escapeHtml(customerName)},`,
		escapeHtml(replyBody).replace(/\r?\n/g, '<br/>'),
		`<strong>Reference:</strong> ${escapeHtml(ref)}<br/>Reply to this email if you need to add information.`
	]);

	return { subject, text, html };
}

export function buildResolvedEmail(params: {
	ref: string;
	customerName: string;
	resolutionNote?: string;
}): EmailContent {
	const { ref, customerName, resolutionNote } = params;
	const note = resolutionNote?.trim() || DEFAULT_RESOLUTION_NOTE;
	const subject = `[${ref}] Your request has been resolved`;
	const text = [
		`Hi ${customerName},`,
		'',
		note,
		'',
		`Reference: ${ref}`
	].join('\n');

	const html = renderHtmlLayout([
		`Hi ${escapeHtml(customerName)},`,
		escapeHtml(note).replace(/\r?\n/g, '<br/>'),
		`<strong>Reference:</strong> ${escapeHtml(ref)}`
	]);

	return { subject, text, html };
}
