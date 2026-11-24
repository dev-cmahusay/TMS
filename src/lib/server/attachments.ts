import {
	MAX_ATTACHMENTS,
	MAX_IMAGE_BYTES,
	type AllowedImageMime
} from '$lib/schemas/ticket';
import { getSupabaseAdmin } from './supabase-admin';
import { logError } from './log';

export const ATTACHMENTS_BUCKET = 'ticket-attachments';
export const FINALIZE_WINDOW_MS = 30 * 60 * 1000;

const MIME_TO_EXT: Record<AllowedImageMime, 'jpg' | 'png' | 'webp'> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

export function buildAttachmentPath(ticketId: string, mimeType: AllowedImageMime): string {
	const ext = MIME_TO_EXT[mimeType];
	const id = crypto.randomUUID().toLowerCase();
	return `tickets/${ticketId.toLowerCase()}/${id}.${ext}`;
}

export function isValidAttachmentPathForTicket(path: string, ticketId: string): boolean {
	const safeTicketId = ticketId.toLowerCase();
	const pattern = new RegExp(
		`^tickets/${safeTicketId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`
	);
	return pattern.test(path);
}

/**
 * Inspects file magic bytes to verify actual image format (never trusts extension or client MIME).
 */
export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
	if (bytes.length < 12) return null;

	// JPEG: FF D8 FF
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return 'image/png';
	}

	// WebP: RIFF....WEBP
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'image/webp';
	}

	return null;
}

export interface SignedUploadSlot {
	path: string;
	signedUrl: string;
	token: string;
}

export async function createSignedUploadSlots(
	ticketId: string,
	mimeTypes: AllowedImageMime[]
): Promise<SignedUploadSlot[]> {
	const admin = getSupabaseAdmin();
	const slots: SignedUploadSlot[] = [];

	for (const mime of mimeTypes.slice(0, MAX_ATTACHMENTS)) {
		const path = buildAttachmentPath(ticketId, mime);
		const { data, error } = await admin.storage
			.from(ATTACHMENTS_BUCKET)
			.createSignedUploadUrl(path);

		if (error || !data) {
			logError('attachments.sign-upload', error ?? 'Empty response');
			continue;
		}
		slots.push({
			path: data.path,
			signedUrl: data.signedUrl,
			token: data.token
		});
	}

	return slots;
}

export async function verifyAndRecordAttachments(
	ticketId: string,
	paths: string[]
): Promise<{ recorded: number; failed: number }> {
	const admin = getSupabaseAdmin();

	const { data: ticket, error: ticketErr } = await admin
		.from('tickets')
		.select('id, created_at')
		.eq('id', ticketId)
		.single();

	if (ticketErr || !ticket) {
		return { recorded: 0, failed: paths.length };
	}

	const ageMs = Date.now() - new Date(ticket.created_at).getTime();
	if (ageMs > FINALIZE_WINDOW_MS || ageMs < -60_000) {
		return { recorded: 0, failed: paths.length };
	}

	const { count: existingCount, error: countErr } = await admin
		.from('ticket_attachments')
		.select('id', { count: 'exact', head: true })
		.eq('ticket_id', ticketId);

	if (countErr) {
		return { recorded: 0, failed: paths.length };
	}

	let remainingSlots = Math.max(0, MAX_ATTACHMENTS - (existingCount ?? 0));
	const uniquePaths = [...new Set(paths)];
	let recorded = 0;
	let failed = 0;

	for (const path of uniquePaths) {
		if (remainingSlots <= 0 || !isValidAttachmentPathForTicket(path, ticketId)) {
			failed += 1;
			continue;
		}

		const { data: blob, error: downloadErr } = await admin.storage
			.from(ATTACHMENTS_BUCKET)
			.download(path);

		if (downloadErr || !blob) {
			failed += 1;
			continue;
		}

		const sizeBytes = blob.size;
		const headBytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
		const detectedMime = detectImageMime(headBytes);

		if (!detectedMime || sizeBytes < 1 || sizeBytes > MAX_IMAGE_BYTES) {
			await admin.storage.from(ATTACHMENTS_BUCKET).remove([path]);
			failed += 1;
			continue;
		}

		const { error: insertErr } = await admin.from('ticket_attachments').insert({
			ticket_id: ticketId,
			storage_path: path,
			mime_type: detectedMime,
			size_bytes: sizeBytes
		});

		if (insertErr) {
			await admin.storage.from(ATTACHMENTS_BUCKET).remove([path]);
			logError('attachments.insert', insertErr);
			failed += 1;
			continue;
		}

		recorded += 1;
		remainingSlots -= 1;
	}

	return { recorded, failed };
}
