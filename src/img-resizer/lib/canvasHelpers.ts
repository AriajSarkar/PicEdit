/**
 * Canvas helpers for image resizing.
 *
 * Provides cross-context canvas creation (OffscreenCanvas → HTMLCanvasElement fallback),
 * blob encoding, and pixel data extraction/injection.
 */

import type { ResizerConfig } from '@/img-resizer/types';

// ── Types ───────────────────────────────────────────────────────────────────

export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

// ── Output MIME resolution ──────────────────────────────────────────────────

/**
 * Resolve the output MIME type based on config and original file type.
 */
export function resolveOutputMime(config: ResizerConfig, originalType: string): string {
	if (config.outputFormat === 'preserve') {
		if (originalType === 'image/png') return 'image/png';
		if (originalType === 'image/webp') return 'image/webp';
		return 'image/jpeg';
	}
	const map: Record<string, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
	};
	return map[config.outputFormat] || 'image/jpeg';
}

// ── Canvas creation ─────────────────────────────────────────────────────────

/** Create a canvas with the given dimensions — tries OffscreenCanvas first. */
export function makeCanvas(w: number, h: number): { canvas: AnyCanvas; ctx: AnyCtx } {
	// Try OffscreenCanvas first (works in workers + modern browsers)
	if (typeof OffscreenCanvas !== 'undefined') {
		try {
			const c = new OffscreenCanvas(w, h);
			const ctx = c.getContext('2d');
			if (ctx) return { canvas: c, ctx };
		} catch {
			/* fall through */
		}
	}
	// Fallback: HTMLCanvasElement (always available in browser main thread)
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const ctx = c.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable');
	return { canvas: c, ctx };
}

// ── Canvas encoding ─────────────────────────────────────────────────────────

/** Convert canvas to blob (handles both OffscreenCanvas and HTMLCanvasElement). */
export function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
	if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({ type, quality });
	}
	// HTMLCanvasElement — use callback-based toBlob
	return new Promise<Blob>((resolve, reject) => {
		(canvas as HTMLCanvasElement).toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error('Canvas toBlob returned null'));
			},
			type,
			quality,
		);
	});
}

// ── Pixel data helpers ──────────────────────────────────────────────────────

/** Extract RGBA pixel data from a bitmap at its native size. */
export function bitmapToRGBA(bitmap: ImageBitmap): { data: Uint8Array; w: number; h: number } {
	const w = bitmap.width;
	const h = bitmap.height;
	const { canvas, ctx } = makeCanvas(w, h);
	ctx.drawImage(bitmap, 0, 0);
	const imgData = ctx.getImageData(0, 0, w, h);
	// Detach canvas to free memory
	if (canvas instanceof HTMLCanvasElement) {
		canvas.width = 0;
		canvas.height = 0;
	}
	return { data: new Uint8Array(imgData.data.buffer), w, h };
}

/** Put RGBA pixels onto a canvas and encode to blob. */
export function rgbaToBlob(
	rgba: Uint8Array,
	w: number,
	h: number,
	mimeType: string,
	quality?: number,
): Promise<Blob> {
	const { canvas, ctx } = makeCanvas(w, h);
	// Copy into a plain ArrayBuffer to satisfy strict TS (SharedArrayBuffer compat)
	const copy = new Uint8ClampedArray(rgba.length);
	copy.set(rgba);
	const imgData = new ImageData(copy, w, h);
	ctx.putImageData(imgData, 0, 0);
	return canvasToBlob(canvas, mimeType, quality);
}
