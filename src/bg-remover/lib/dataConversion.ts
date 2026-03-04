/// Data conversion utilities between browser image formats and raw RGBA buffers.
/// These functions bridge the gap between JS/Canvas image representations
/// and the Uint8Array format that WASM modules consume.

import { loadImage } from '@/lib/imageUtils';

/**
 * Convert a data URL to raw RGBA pixel data via Canvas.
 */
export async function dataUrlToImageData(
	dataUrl: string,
): Promise<{ data: Uint8Array; width: number; height: number }> {
	const img = await loadImage(dataUrl);
	return imageElementToRgba(img);
}

/**
 * Convert a Blob to raw RGBA pixel data via Canvas.
 */
export async function blobToImageData(
	blob: Blob,
): Promise<{ data: Uint8Array; width: number; height: number }> {
	const url = URL.createObjectURL(blob);
	try {
		const img = await loadImage(url);
		return imageElementToRgba(img);
	} finally {
		URL.revokeObjectURL(url);
	}
}

/**
 * Convert raw RGBA pixel data back to a Blob (PNG format).
 */
export async function imageDataToBlob(
	rgba: Uint8Array,
	width: number,
	height: number,
): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas 2D context unavailable');
	}
	const imgData = new ImageData(
		new Uint8ClampedArray(rgba.buffer as ArrayBuffer, rgba.byteOffset, rgba.byteLength),
		width,
		height,
	);
	ctx.putImageData(imgData, 0, 0);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error('Failed to convert canvas to blob'));
			},
			'image/png',
			1.0,
		);
	});
}

// loadImageElement replaced by shared loadImage from @/lib/imageUtils

/**
 * Extract RGBA pixel data from an HTMLImageElement via Canvas.
 */
function imageElementToRgba(img: HTMLImageElement): {
	data: Uint8Array;
	width: number;
	height: number;
} {
	const { naturalWidth: w, naturalHeight: h } = img;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas 2D context unavailable');
	}
	ctx.drawImage(img, 0, 0);
	const imgData = ctx.getImageData(0, 0, w, h);
	return {
		data: new Uint8Array(imgData.data.buffer),
		width: w,
		height: h,
	};
}
