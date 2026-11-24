import { env } from '$env/dynamic/private';
import { logError } from './log';

export interface TurnstileResult {
	success: boolean;
}

export async function verifyTurnstile(
	token: string,
	remoteIp: string | null,
	fetchFn: typeof fetch = fetch
): Promise<TurnstileResult> {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret || !token.trim()) {
		return { success: false };
	}

	try {
		const body = new URLSearchParams({
			secret,
			response: token.trim()
		});
		if (remoteIp) {
			body.set('remoteip', remoteIp);
		}

		const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
			signal: AbortSignal.timeout(5000)
		});

		if (!res.ok) {
			logError('turnstile.siteverify', 'Non-2xx from Turnstile', { statusCode: res.status });
			return { success: false };
		}

		const data = (await res.json()) as { success?: boolean };
		return { success: data.success === true };
	} catch (err) {
		logError('turnstile.siteverify', err);
		return { success: false };
	}
}
