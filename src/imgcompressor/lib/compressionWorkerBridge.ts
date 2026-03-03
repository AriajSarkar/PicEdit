/**
 * Compression Worker Bridge — thin wrapper around WorkerPoolBridge.
 *
 * Spawns a pool of Web Workers (2–4) for parallel image compression.
 * Falls back to main-thread compression if workers are unavailable.
 */

import type { CompressorConfig } from '@/imgcompressor/types';
import type { CompressedResult } from '@/imgcompressor/lib/compressionUtils';
import { WorkerPoolBridge } from '@/lib/workerPoolBridge';
import { workerTimeout } from '@/lib/imageUtils';

// ── Bridge instance ─────────────────────────────────────────────────────────

const bridge = new WorkerPoolBridge<CompressedResult>({
	workerFactory: () =>
		new Worker(new URL('./compressionWorker.ts', import.meta.url), { type: 'module' }),
	wasmJsPath: '/wasm/compressor/compressor.js',
	wasmBgPath: '/wasm/compressor/compressor_bg.wasm',
	messageType: 'compress',
	// No static timeout — computed per-request based on file size
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
			compressedSize: r.compressedSize as number,
			compressionRatio: r.compressionRatio as number,
			format: r.format as string,
			ssim: r.ssim as number | undefined,
		};
	},
});

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the compression worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export function initCompressionWorkers(): Promise<boolean> {
	return bridge.init();
}

/**
 * Compress a single image file in a background worker.
 * Falls back to main-thread compression if workers are unavailable.
 */
export async function compressImageInWorker(
	file: File,
	config: CompressorConfig,
	onProgress?: (stage: string, percent: number) => void,
): Promise<CompressedResult> {
	const timeout = workerTimeout({ fileSize: file.size });
	const result = await bridge.execute({ file, config }, onProgress, timeout);
	if (result === null) {
		// Workers unavailable — fall back to main-thread compression
		console.warn('[compressor] No workers available, falling back to main thread');
		const { compressImage } = await import('./compressionUtils');
		return compressImage(file, config, onProgress);
	}
	return result;
}

/**
 * Terminate all workers and reset state. Call on unmount / cleanup.
 */
export function terminateCompressionWorkers(): void {
	bridge.terminate();
}
