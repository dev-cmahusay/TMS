/**
 * Returns a safe post-login redirect path inside /app, preventing open redirects.
 */
export function getSafeNextUrl(raw: string | null | undefined): string {
	if (!raw) return '/app';
	const trimmed = raw.trim();
	if (!trimmed.startsWith('/app')) return '/app';
	if (trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes('\r') || trimmed.includes('\n')) {
		return '/app';
	}
	if (trimmed !== '/app' && !trimmed.startsWith('/app/') && !trimmed.startsWith('/app?')) {
		return '/app';
	}
	return trimmed;
}
