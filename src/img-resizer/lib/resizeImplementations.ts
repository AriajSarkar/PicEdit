/**
 * Resize implementation strategies: WASM Lanczos3 and Canvas fallbacks.
 *
 * Each function takes a decoded ImageBitmap and returns a resized Blob
 * with dimensions.
 */

import { bitmapToRGBA, makeCanvas, canvasToBlob, rgbaToBlob } from './canvasHelpers';

// ── WASM bridge (lazy import to avoid bundling if not used) ─────────────────

let wasmResize:
	| ((
			rgba: Uint8Array,
			srcW: number,
			srcH: number,
			dstW: number,
			dstH: number,
			filter: number,
	  ) => Uint8Array)
	| null = null;
let wasmLoadAttempted = false;
let wasmLoadPromise: Promise<boolean> | null = null;

/** Try to load the WASM resizer module (called once, serialized). */
export async function tryLoadWasm(): Promise<boolean> {
	if (wasmLoadAttempted) return wasmResize !== null;
	if (wasmLoadPromise) return wasmLoadPromise;

	wasmLoadPromise = (async () => {
		try {
			const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const mod = await import(
				/* webpackIgnore: true */ `${origin}${basePath}/wasm/resizer/resizer.js`
			);
			await mod.default({
				module_or_path: `${origin}${basePath}/wasm/resizer/resizer_bg.wasm`,
			});
			wasmResize = mod.resize_rgba;
			wasmLoadAttempted = true;
			console.log('[resizer] WASM loaded — Lanczos3 resize active');
			return true;
		} catch {
			wasmLoadAttempted = true;
			wasmLoadPromise = null;
			console.log('[resizer] WASM not available — using Canvas fallback');
			return false;
		}
	})();

	return wasmLoadPromise;
}

// ── Resize strategies ───────────────────────────────────────────────────────

/**
 * WASM path: decode → extract RGBA → WASM Lanczos3 → encode.
 */
export async function resizeWithWasm(
	bitmap: ImageBitmap,
	outW: number,
	outH: number,
	mimeType: string,
	quality: number | undefined,
	onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
	onProgress?.('Extracting pixels', 30);
	const { data, w: srcW, h: srcH } = bitmapToRGBA(bitmap);

	onProgress?.('WASM Lanczos3 resize', 50);
	// filter=0 is Lanczos3 in our crate
	const resized = wasmResize!(data, srcW, srcH, outW, outH, 0);

	onProgress?.('Encoding', 80);
	const blob = await rgbaToBlob(resized, outW, outH, mimeType, quality);

	return { blob, width: outW, height: outH };
}

/**
 * Canvas path: draw bitmap at target size → encode.
 */
export async function resizeWithCanvas(
	bitmap: ImageBitmap,
	outW: number,
	outH: number,
	mimeType: string,
	quality: number | undefined,
	onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
	onProgress?.('Resizing (Canvas)', 40);
	const { canvas, ctx } = makeCanvas(outW, outH);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, 0, 0, outW, outH);

	onProgress?.('Encoding', 80);
	const blob = await canvasToBlob(canvas, mimeType, quality);

	return { blob, width: outW, height: outH };
}

/**
 * Canvas cover-mode: scale to cover + center crop.
 */
export async function resizeCoverWithCanvas(
	bitmap: ImageBitmap,
	targetW: number,
	targetH: number,
	mimeType: string,
	quality: number | undefined,
	onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
	onProgress?.('Resizing (cover)', 40);
	const { canvas, ctx } = makeCanvas(targetW, targetH);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
	const scaledW = bitmap.width * scale;
	const scaledH = bitmap.height * scale;
	const offsetX = (targetW - scaledW) / 2;
	const offsetY = (targetH - scaledH) / 2;

	ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);

	onProgress?.('Encoding', 80);
	const blob = await canvasToBlob(canvas, mimeType, quality);

	return { blob, width: targetW, height: targetH };
}
