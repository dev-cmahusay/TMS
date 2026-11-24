import { env } from '$env/dynamic/private';
import { getSupabaseAdmin } from './supabase-admin';
import { logError } from './log';

export async function sha256Hex(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function checkPublicRateLimits(
	ip: string,
	email: string
): Promise<{ allowed: boolean }> {
	const ipLimit = parsePositiveInt(env.RATE_LIMIT_IP_PER_HOUR, 20);
	const emailLimit = parsePositiveInt(env.RATE_LIMIT_EMAIL_PER_HOUR, 5);

	const [ipHash, emailHash] = await Promise.all([
		sha256Hex(`ip:${ip}`),
		sha256Hex(`email:${email.trim().toLowerCase()}`)
	]);

	const admin = getSupabaseAdmin();

	const ipCheck = await admin.rpc('check_rate_limit', {
		p_key: ipHash,
		p_limit: ipLimit
	});

	if (ipCheck.error) {
		logError('rate-limit.ip', ipCheck.error);
		throw ipCheck.error;
	}
	if (!ipCheck.data) {
		return { allowed: false };
	}

	const emailCheck = await admin.rpc('check_rate_limit', {
		p_key: emailHash,
		p_limit: emailLimit
	});

	if (emailCheck.error) {
		logError('rate-limit.email', emailCheck.error);
		throw emailCheck.error;
	}

	return { allowed: emailCheck.data === true };
}
