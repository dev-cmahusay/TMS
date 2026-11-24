import {
	ALLOWED_IMAGE_MIMES,
	MAX_IMAGE_BYTES,
	type AllowedImageMime
} from '$lib/schemas/ticket';

export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_LONGEST_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
	return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function computeTargetDimensions(
	width: number,
	height: number,
	maxSide: number = MAX_LONGEST_SIDE
): { width: number; height: number } {
	if (width <= 0 || height <= 0) {
		return { width: 1, height: 1 };
	}
	const longest = Math.max(width, height);
	if (longest <= maxSide) {
		return { width, height };
	}
	const scale = maxSide / longest;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

export interface PreparedImage {
	blob: Blob;
	mimeType: AllowedImageMime;
	previewUrl: string;
	sizeBytes: number;
}

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
	if (!isAllowedImageMime(file.type)) {
		throw new Error('Only JPEG, PNG or WebP images are allowed.');
	}
	if (file.size > MAX_ORIGINAL_BYTES) {
		throw new Error('This image is too large. Please choose a smaller photo.');
	}

	let bitmap: ImageBitmap | null = null;
	try {
		bitmap = await createImageBitmap(file);
		const target = computeTargetDimensions(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = target.width;
		canvas.height = target.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('This image could not be prepared. Try another photo or submit without it.');
		}
		ctx.drawImage(bitmap, 0, 0, target.width, target.height);

		const outMime: AllowedImageMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, outMime, outMime === 'image/jpeg' ? JPEG_QUALITY : undefined)
		);

		if (!blob) {
			throw new Error('This image could not be prepared. Try another photo or submit without it.');
		}

		// If PNG stayed larger than 5 MB, retry as JPEG
		let finalBlob = blob;
		let finalMime: AllowedImageMime = outMime;
		if (finalBlob.size > MAX_IMAGE_BYTES && outMime !== 'image/jpeg') {
			const jpegBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
			);
			if (jpegBlob) {
				finalBlob = jpegBlob;
				finalMime = 'image/jpeg';
			}
		}

		if (finalBlob.size > MAX_IMAGE_BYTES) {
			throw new Error('Each image must be 5 MB or smaller.');
		}

		return {
			blob: finalBlob,
			mimeType: finalMime,
			previewUrl: URL.createObjectURL(finalBlob),
			sizeBytes: finalBlob.size
		};
	} catch (err) {
		if (
			err instanceof Error &&
			(err.message.startsWith('Only JPEG') ||
				err.message.startsWith('This image is too large') ||
				err.message.startsWith('Each image must be'))
		) {
			throw err;
		}
		throw new Error('This image could not be prepared. Try another photo or submit without it.');
	} finally {
		bitmap?.close();
	}
}
