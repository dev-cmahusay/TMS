import { describe, expect, it } from 'vitest';
import { computeTargetDimensions } from '../../src/lib/client/resize-image';
import {
	buildAttachmentPath,
	detectImageMime,
	isValidAttachmentPathForTicket
} from '../../src/lib/server/attachments';

describe('attachment magic bytes and paths', () => {
	it('detects JPEG, PNG, and WebP headers and rejects GIF/HTML', () => {
		const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
		const webp = new Uint8Array([
			0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
		]);
		const gif = new TextEncoder().encode('GIF89a0000000000');
		const html = new TextEncoder().encode('<html><body>xss</body></html>');

		expect(detectImageMime(jpeg)).toBe('image/jpeg');
		expect(detectImageMime(png)).toBe('image/png');
		expect(detectImageMime(webp)).toBe('image/webp');
		expect(detectImageMime(gif)).toBeNull();
		expect(detectImageMime(html)).toBeNull();
	});

	it('generates UUID paths matching DB constraint and blocks traversal', () => {
		const ticketId = '11111111-2222-4333-8444-555555555555';
		const otherId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
		const path = buildAttachmentPath(ticketId, 'image/jpeg');

		expect(path).toMatch(/^tickets\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
		expect(isValidAttachmentPathForTicket(path, ticketId)).toBe(true);
		expect(isValidAttachmentPathForTicket(path, otherId)).toBe(false);
		expect(isValidAttachmentPathForTicket(`tickets/${ticketId}/../secret.jpg`, ticketId)).toBe(
			false
		);
	});

	it('computes resized image dimensions preserving aspect ratio', () => {
		expect(computeTargetDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 });
		expect(computeTargetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
		expect(computeTargetDimensions(1200, 3200)).toEqual({ width: 600, height: 1600 });
	});
});
