export function maskEmail(email: string): string {
	const trimmed = email.trim().toLowerCase();
	const atIndex = trimmed.indexOf('@');
	if (atIndex <= 0) return '***';
	const first = trimmed[0];
	const domain = trimmed.slice(atIndex);
	return `${first}***${domain}`;
}
