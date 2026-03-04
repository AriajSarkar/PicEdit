/**
 * Resize Worker Bridge — thin wrapper around WorkerPoolBridge.
 *
 * Spawns a pool of Web Workers (2–4) for parallel image resizing.
 * Falls back to main-thread resize if workers are unavailable.
 */

import type { ResizerConfig, ResizeResult } from '@/img-resizer/types';
import { WorkerPoolBridge } from '@/lib/workerPoolBridge';

// ── Bridge instance ─────────────────────────────────────────────────────────

const bridge = new WorkerPoolBridge<ResizeResult>({
	workerFactory: () =>
		new Worker(new URL('./resizeWorker.ts', import.meta.url), { type: 'module' }),
	wasmJsPath: '/wasm/resizer/resizer.js',
	wasmBgPath: '/wasm/resizer/resizer_bg.wasm',
	messageType: 'resize',
	transformResult: (r) => {
		// Reconstruct Blob from transferred ArrayBuffer
		const blob = new Blob([r.arrayBuf as ArrayBuffer], {
			type: `image/${r.format}`,
		});
		return {
			blob,
			dataUrl: r.dataUrl as string,
			width: r.width as number,
			height: r.height as number,
			originalSize: r.originalSize as number,
			newSize: r.newSize as number,
			format: r.format as string,
		};
	},
});

// ── Types ───────────────────────────────────────────────────────────────────

/** Crop region in original-image pixels (optional). */
export interface CropRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the resize worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export function initResizeWorkers(): Promise<boolean> {
	return bridge.init();
}

/**
 * Resize a single image file in a background worker.
 * Falls back to main-thread resize if workers are unavailable.
 */
export async function resizeImageInWorker(
	file: File,
	config: ResizerConfig,
	onProgress?: (stage: string, percent: number) => void,
	crop?: CropRect,
): Promise<ResizeResult> {
	const result = await bridge.execute({ file, config, crop }, onProgress);
	if (result === null) {
		// Workers unavailable — fall back to main-thread resize
		console.warn('[resizer] No workers available, falling back to main thread');
		const { resizeImage } = await import('./resizeUtils');
		return resizeImage(file, config, onProgress, crop);
	}
	return result;
}

/**
 * Terminate all workers and reset state. Call on unmount / cleanup.
 */
export function terminateResizeWorkers(): void {
	bridge.terminate();
}
