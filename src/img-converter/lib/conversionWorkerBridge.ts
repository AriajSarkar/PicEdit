/**
 * Conversion Worker Bridge — thin wrapper around WorkerPoolBridge.
 *
 * Spawns a pool of Web Workers (2–4) for parallel format conversion.
 * Falls back to main-thread Canvas-based conversion if workers are unavailable
 * (BMP/TIFF/ICO require WASM and will throw in fallback mode).
 */

import type { ConverterConfig, ConvertedResult, TracerConfig, TraceResult } from '@/img-converter/types';
import { WorkerPoolBridge } from '@/lib/workerPoolBridge';
import { blobToDataUrl, workerTimeout } from '@/lib/imageUtils';

// ── Result type from the worker ─────────────────────────────────────────────

interface ConvertedBlobResult {
	blob: Blob;
	/** JPEG preview blob for formats browsers can't display (TIFF, PDF) */
	previewBlob?: Blob;
	mimeType: string;
	originalSize: number;
	convertedSize: number;
	originalFormat: string;
	outputFormat: string;
	width: number;
	height: number;
}

// ── Bridge instance ─────────────────────────────────────────────────────────

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const bridge = new WorkerPoolBridge<ConvertedBlobResult>({
	workerFactory: () =>
		new Worker(new URL('./conversionWorker.ts', import.meta.url), { type: 'module' }),
	wasmJsPath: '/wasm/converter/converter.js',
	wasmBgPath: '/wasm/converter/converter_bg.wasm',
	messageType: 'convert',
	transformResult: (r) => ({
		blob: new Blob([r.buffer as ArrayBuffer], { type: r.mimeType as string }),
		previewBlob: r.previewBuffer
			? new Blob([r.previewBuffer as ArrayBuffer], { type: 'image/jpeg' })
			: undefined,
		mimeType: r.mimeType as string,
		originalSize: r.originalSize as number,
		convertedSize: r.convertedSize as number,
		originalFormat: r.originalFormat as string,
		outputFormat: r.outputFormat as string,
		width: r.width as number,
		height: r.height as number,
	}),
});

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the conversion worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export function initConversionWorkers(): Promise<boolean> {
	return bridge.init();
}

/**
 * Convert a single image file in a background worker.
 * Falls back to main-thread Canvas conversion if workers are unavailable.
 */
export async function convertImageInWorker(
	file: File,
	config: ConverterConfig,
	onProgress?: (stage: string, percent: number) => void,
): Promise<ConvertedResult> {
	const timeout = workerTimeout({ fileSize: file.size });
	const result = await bridge.execute({ file, config }, onProgress, timeout);

	if (result === null) {
		// Workers unavailable — try main-thread Canvas fallback
		console.warn('[converter] No workers available, falling back to main thread');
		return convertImageFallback(file, config, onProgress);
	}

	// Use preview blob for data URL when available (TIFF, PDF — formats browsers can't display)
	const dataUrl = await blobToDataUrl(result.previewBlob || result.blob);
	const originalSize = result.originalSize;
	const convertedSize = result.convertedSize;
	const compressionRatio =
		originalSize > 0 ? ((originalSize - convertedSize) / originalSize) * 100 : 0;

	return {
		blob: result.blob,
		dataUrl,
		originalSize,
		convertedSize,
		originalFormat: result.originalFormat,
		outputFormat: result.outputFormat,
		width: result.width,
		height: result.height,
		format: result.outputFormat,
		compressionRatio,
	};
}

/**
 * Terminate all workers and reset state. Call on unmount / cleanup.
 */
export function terminateConversionWorkers(): void {
	bridge.terminate();
}

// ── SVG Trace Bridge ────────────────────────────────────────────────────────

const traceBridge = new WorkerPoolBridge<TraceResult>({
	workerFactory: () =>
		new Worker(new URL('./conversionWorker.ts', import.meta.url), { type: 'module' }),
	wasmJsPath: '/wasm/converter/converter.js',
	wasmBgPath: '/wasm/converter/converter_bg.wasm',
	messageType: 'trace',
	transformResult: (r) => {
		const svg = r.svg as string;
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		return {
			svg,
			blob,
			url,
			svgSize: r.svgSize as number,
			originalSize: r.originalSize as number,
			durationMs: r.durationMs as number,
		};
	},
});

/**
 * Initialize the tracer worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export function initTracerWorkers(): Promise<boolean> {
	return traceBridge.init();
}

/**
 * Trace a single image file to SVG in a background worker.
 */
export async function traceImageInWorker(
	file: File,
	config: TracerConfig,
	onProgress?: (stage: string, percent: number) => void,
): Promise<TraceResult> {
	const timeout = workerTimeout({ fileSize: file.size });
	const result = await traceBridge.execute({ file, config }, onProgress, timeout);
	if (result === null) {
		throw new Error('SVG tracer workers unavailable. Please reload the page.');
	}
	return result;
}

/**
 * Terminate all tracer workers and reset state. Call on unmount / cleanup.
 */
export function terminateTracerWorkers(): void {
	traceBridge.terminate();
}

// ── TIFF Preview Decode Bridge ──────────────────────────────────────────────

interface TiffPreviewResult {
	previewUrl: string;
	thumbnailUrl: string;
	width: number;
	height: number;
}

const previewBridge = new WorkerPoolBridge<TiffPreviewResult>({
	workerFactory: () =>
		new Worker(new URL('./conversionWorker.ts', import.meta.url), { type: 'module' }),
	wasmJsPath: '/wasm/converter/converter.js',
	wasmBgPath: '/wasm/converter/converter_bg.wasm',
	messageType: 'decode-preview',
	transformResult: (r) => {
		const previewBlob = new Blob([r.previewBuffer as ArrayBuffer], { type: 'image/png' });
		const thumbBlob = new Blob([r.thumbBuffer as ArrayBuffer], { type: 'image/jpeg' });
		return {
			previewUrl: URL.createObjectURL(previewBlob),
			thumbnailUrl: URL.createObjectURL(thumbBlob),
			width: r.width as number,
			height: r.height as number,
		};
	},
});

/**
 * Decode a TIFF file to generate preview and thumbnail URLs.
 * Used for files that browsers can't natively display.
 */
export async function decodeTiffPreview(
	file: File,
	maxSize = 88,
): Promise<TiffPreviewResult | null> {
	await previewBridge.init();
	return previewBridge.execute({ file, maxSize });
}

/**
 * Terminate preview workers.
 */
export function terminatePreviewWorkers(): void {
	previewBridge.terminate();
}

/**
 * Build a multi-page PDF from an array of image files.
 * Uses a single worker — the PDF is assembled server-side in the worker.
 *
 * Returns { blob, pageCount, originalSize, convertedSize }.
 */
export async function buildMultiPagePdfInWorker(
	files: File[],
	config: ConverterConfig,
	onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; pageCount: number; originalSize: number; convertedSize: number }> {
	// Ensure workers are initialized
	await bridge.init();

	// We need direct access to a worker for this custom message type.
	// Use bridge.execute with a virtual payload and intercept via a
	// temporary worker message. Instead, let's use a simpler approach:
	// post directly to the first available worker.
	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL('./conversionWorker.ts', import.meta.url),
			{ type: 'module' },
		);

		const id = Date.now();
		let initDone = false;

		worker.onmessage = (e: MessageEvent) => {
			const msg = e.data;

			if (msg.type === 'ready') {
				initDone = true;
				worker.postMessage({ type: 'build-multi-pdf', id, files, config });
				return;
			}

			if (msg.id !== id) return;

			if (msg.type === 'progress') {
				onProgress?.(msg.stage, msg.percent);
				return;
			}

			if (msg.type === 'result') {
				const r = msg.result;
				const blob = new Blob([r.buffer as ArrayBuffer], { type: 'application/pdf' });
				worker.terminate();
				resolve({
					blob,
					pageCount: r.pageCount as number,
					originalSize: r.originalSize as number,
					convertedSize: r.convertedSize as number,
				});
				return;
			}

			if (msg.type === 'error') {
				worker.terminate();
				reject(new Error(msg.message));
				return;
			}
		};

		worker.onerror = (err) => {
			worker.terminate();
			reject(new Error(err.message || 'Worker error'));
		};

		// Init WASM — use absolute URLs (workers may not resolve relative paths)
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		worker.postMessage({
			type: 'init',
			wasmJsUrl: `${origin}${basePath}/wasm/converter/converter.js`,
			wasmBgUrl: `${origin}${basePath}/wasm/converter/converter_bg.wasm`,
		});

		// If init was already done synchronously (unlikely), send merge
		if (initDone) {
			worker.postMessage({ type: 'build-multi-pdf', id, files, config });
		}
	});
}

// ── Main-thread Canvas fallback ─────────────────────────────────────────────

const CANVAS_MIME: Record<string, string> = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	avif: 'image/avif',
};

async function convertImageFallback(
	file: File,
	config: ConverterConfig,
	onProgress?: (stage: string, percent: number) => void,
): Promise<ConvertedResult> {
	// WASM-only formats cannot fall back to Canvas
	if (['bmp', 'tiff', 'ico', 'pdf'].includes(config.outputFormat)) {
		throw new Error(
			`${config.outputFormat.toUpperCase()} encoding requires WASM. Please reload the page and try again.`,
		);
	}

	onProgress?.('Decoding', 10);
	const img = await createImageBitmap(file);
	const { width, height } = img;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	// Fill background for formats without alpha
	if (config.outputFormat === 'jpeg' || !config.preserveTransparency) {
		ctx.fillStyle = config.backgroundColor;
		ctx.fillRect(0, 0, width, height);
	}

	ctx.drawImage(img, 0, 0);
	img.close();

	onProgress?.('Encoding', 60);

	const mimeType = CANVAS_MIME[config.outputFormat] || 'image/png';
	const quality = ['jpeg', 'webp'].includes(config.outputFormat) ? config.quality : undefined;

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('Canvas encoding failed'))),
			mimeType,
			quality,
		);
	});

	onProgress?.('Done', 100);

	const dataUrl = await blobToDataUrl(blob);
	const originalSize = file.size;
	const convertedSize = blob.size;

	// Detect original format from MIME type
	const origType = file.type || 'image/unknown';
	const origFmt = origType.replace('image/', '').replace('x-icon', 'ico');

	return {
		blob,
		dataUrl,
		originalSize,
		convertedSize,
		originalFormat: origFmt,
		outputFormat: config.outputFormat,
		width,
		height,
		format: config.outputFormat,
		compressionRatio: originalSize > 0 ? ((originalSize - convertedSize) / originalSize) * 100 : 0,
	};
}
