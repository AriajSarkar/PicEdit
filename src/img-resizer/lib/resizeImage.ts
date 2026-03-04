/**
 * Main resizeImage entry point — orchestrates the full resize pipeline.
 *
 * Attempts WASM Lanczos3 first, falls back to Canvas API.
 */

import type { ResizerConfig, ResizeResult } from '@/img-resizer/types';
import { blobToDataUrl } from '@/lib/imageUtils';
import { calculateOutputDimensions, getCoverTargetDimensions } from './dimensions';
import { resolveOutputMime } from './canvasHelpers';
import {
	tryLoadWasm,
	resizeWithWasm,
	resizeWithCanvas,
	resizeCoverWithCanvas,
} from './resizeImplementations';

/**
 * Resize a single image file.
 * Attempts WASM Lanczos3 first, falls back to Canvas API.
 */
export async function resizeImage(
	file: File,
	config: ResizerConfig,
	onProgress?: (stage: string, percent: number) => void,
	crop?: { x: number; y: number; w: number; h: number },
): Promise<ResizeResult> {
	onProgress?.('Loading image', 10);

	let bitmap: ImageBitmap | null = null;
	let fullBitmap: ImageBitmap | null = null;
	try {
		// Load image — works for all browser-supported formats
		if (crop && crop.w > 0 && crop.h > 0) {
			// Crop: decode full image, then extract crop region
			fullBitmap = await createImageBitmap(file);
			const cx = Math.max(0, Math.min(crop.x, fullBitmap.width));
			const cy = Math.max(0, Math.min(crop.y, fullBitmap.height));
			const cw = Math.min(crop.w, fullBitmap.width - cx);
			const ch = Math.min(crop.h, fullBitmap.height - cy);
			if (cw > 0 && ch > 0) {
				bitmap = await createImageBitmap(fullBitmap, cx, cy, cw, ch);
			} else {
				// Clamped crop region is empty — fall back to uncropped image
				bitmap = fullBitmap;
				fullBitmap = null;
			}
			if (fullBitmap) {
				fullBitmap.close();
				fullBitmap = null;
			}
		} else {
			bitmap = await createImageBitmap(file);
		}

		if (!bitmap) {
			throw new Error('Failed to decode image');
		}

		const origWidth = bitmap.width;
		const origHeight = bitmap.height;

		onProgress?.('Calculating dimensions', 20);

		// Calculate target dimensions
		const { width: outW, height: outH } = calculateOutputDimensions(
			origWidth,
			origHeight,
			config,
		);
		const mimeType = resolveOutputMime(config, file.type);
		const quality = mimeType === 'image/png' ? undefined : config.quality;

		// Try loading WASM (first call initializes, subsequent calls are instant)
		const hasWasm = await tryLoadWasm();

		let result: { blob: Blob; width: number; height: number };

		// Cover mode needs separate handling
		if (config.fit === 'cover' && config.method !== 'percentage') {
			const { targetW, targetH } = getCoverTargetDimensions(config, outW, outH);
			// Cover requires scale-and-crop behavior, so always use the dedicated cover path.
			result = await resizeCoverWithCanvas(
				bitmap,
				targetW,
				targetH,
				mimeType,
				quality,
				onProgress,
			);
		} else {
			// Standard resize (contain / stretch / percentage / dimensions)
			if (hasWasm) {
				try {
					result = await resizeWithWasm(
						bitmap,
						outW,
						outH,
						mimeType,
						quality,
						onProgress,
					);
				} catch (wasmErr) {
					console.warn('[resizer] WASM resize failed, falling back to Canvas:', wasmErr);
					result = await resizeWithCanvas(
						bitmap,
						outW,
						outH,
						mimeType,
						quality,
						onProgress,
					);
				}
			} else {
				result = await resizeWithCanvas(bitmap, outW, outH, mimeType, quality, onProgress);
			}
		}

		onProgress?.('Finalizing', 90);
		const dataUrl = await blobToDataUrl(result.blob);
		onProgress?.('Done', 100);

		return {
			blob: result.blob,
			dataUrl,
			width: result.width,
			height: result.height,
			originalSize: file.size,
			newSize: result.blob.size,
			format: mimeType.replace('image/', ''),
		};
	} finally {
		bitmap?.close();
		fullBitmap?.close();
	}
}
