// relative imports break during `next build` TS checking on the output copy.
// Type safety is provided by IDE checking against the source file.
export {};
/**
 * Format Conversion Web Worker
 *
 * Offloads ALL image format conversion off the main thread.
 * Split into modules for maintainability:
 *   - workerTypes.ts    → ConverterConfig, detectFormat, parseHexColor
 *   - pdfBuilder.ts     → PDF generation (layoutPage, buildPdf, buildMultiPagePdf)
 *   - formatEncoders.ts → encodeToFormat (JPEG/PNG/WebP/BMP/TIFF/ICO/AVIF/PDF)
 *
 * Messages:
 *  Main → Worker: { type: 'init', wasmJsUrl, wasmBgUrl }
 *  Main → Worker: { type: 'convert', id, file, config }
 *  Main → Worker: { type: 'build-multi-pdf', id, files, config }
 *  Main → Worker: { type: 'decode-preview', id, file, maxSize }
 *  Main → Worker: { type: 'trace', id, file, config }
 *  Worker → Main: { type: 'ready' }
 *  Worker → Main: { id, type: 'progress', stage, percent }
 *  Worker → Main: { id, type: 'result', ... }
 *  Worker → Main: { id, type: 'error', message }
 */

import { type ConverterConfig, detectFormat, parseHexColor } from './workerTypes';
import { buildMultiPagePdf } from './pdfBuilder';
import { encodeToFormat } from './formatEncoders';

// ── WASM state ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;
let initResolve: (() => void) | null = null;
let initDone: Promise<void> | null = null;

// ── Worker message handler ──────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
	const msg = e.data;

	if (msg.type === 'init') {
		initDone = new Promise<void>((resolve) => {
			initResolve = resolve;
		});

		try {
			// Ensure absolute URLs — workers with opaque origins can't resolve relative fetch
			const origin = self.location?.origin || '';
			const jsUrl = msg.wasmJsUrl.startsWith('http') ? msg.wasmJsUrl : `${origin}${msg.wasmJsUrl}`;
			const bgUrl = msg.wasmBgUrl.startsWith('http') ? msg.wasmBgUrl : `${origin}${msg.wasmBgUrl}`;

			const wasmJs = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ jsUrl);
			await wasmJs.default({ module_or_path: bgUrl });
			wasmModule = wasmJs;
			self.postMessage({ type: 'ready' });
		} catch (err) {
			// Non-fatal: Canvas-based formats still work without WASM
			console.warn('[converter-worker] WASM init failed:', err);
			self.postMessage({ type: 'ready' });
		}

		initResolve!();
		return;
	}

	if (msg.type === 'convert') {
		if (initDone) await initDone;

		const { id, file, config } = msg;
		try {
			await processConvert(id, file, config);
		} catch (err) {
			self.postMessage({
				id,
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
		return;
	}

	// ── Multi-page PDF merge ────────────────────────────────────────────
	if (msg.type === 'build-multi-pdf') {
		if (initDone) await initDone;

		const { id, files, config } = msg as {
			id: number;
			files: File[];
			config: ConverterConfig;
		};

		try {
			self.postMessage({ id, type: 'progress', stage: 'Preparing PDF', percent: 5 });

			const pdfQuality = Math.max(config.quality, 0.92);
			const imagePages: { jpegBytes: Uint8Array; pixelW: number; pixelH: number }[] = [];

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const pct = 5 + Math.round((i / files.length) * 80);
				self.postMessage({
					id,
					type: 'progress',
					stage: `Encoding page ${i + 1}/${files.length}`,
					percent: pct,
				});

				let width: number;
				let height: number;
				let canvas: OffscreenCanvas;
				let ctx: OffscreenCanvasRenderingContext2D;

				const fileFmt = detectFormat(file);
				if (fileFmt === 'tiff' && wasmModule?.decode_tiff) {
					// Decode TIFF via WASM
					const fileBuffer = await file.arrayBuffer();
					const packed: Uint8Array = wasmModule.decode_tiff(new Uint8Array(fileBuffer));
					const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
					width = view.getUint32(0, true);
					height = view.getUint32(4, true);
					const rgba = new Uint8Array(packed.buffer, packed.byteOffset + 8, width * height * 4);
					canvas = new OffscreenCanvas(width, height);
					ctx = canvas.getContext('2d')!;
					ctx.fillStyle = config.backgroundColor || '#ffffff';
					ctx.fillRect(0, 0, width, height);
					const clampedRgba = new Uint8ClampedArray(rgba.length);
					clampedRgba.set(rgba);
					ctx.putImageData(new ImageData(clampedRgba, width, height), 0, 0);
				} else {
					const bitmap = await createImageBitmap(file);
					width = bitmap.width;
					height = bitmap.height;
					canvas = new OffscreenCanvas(width, height);
					ctx = canvas.getContext('2d')!;
					ctx.fillStyle = config.backgroundColor || '#ffffff';
					ctx.fillRect(0, 0, width, height);
					ctx.drawImage(bitmap, 0, 0);
					bitmap.close();
				}

				const blob = await canvas.convertToBlob({
					type: 'image/jpeg',
					quality: pdfQuality,
				});
				const buf = await blob.arrayBuffer();
				imagePages.push({
					jpegBytes: new Uint8Array(buf),
					pixelW: width,
					pixelH: height,
				});
			}

			self.postMessage({ id, type: 'progress', stage: 'Building PDF', percent: 90 });

			const pdfBuffer = buildMultiPagePdf(imagePages, config);

			self.postMessage({ id, type: 'progress', stage: 'Done', percent: 100 });

			self.postMessage(
				{
					id,
					type: 'result',
					result: {
						buffer: pdfBuffer,
						mimeType: 'application/pdf',
						originalSize: files.reduce((s, f) => s + f.size, 0),
						convertedSize: pdfBuffer.byteLength,
						originalFormat: 'multi',
						outputFormat: 'pdf',
						width: 0,
						height: 0,
						pageCount: files.length,
					},
				},
				// @ts-expect-error transferable
				[pdfBuffer],
			);
		} catch (err) {
			self.postMessage({
				id,
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
		return;
	}

	// ── TIFF Preview Decode ─────────────────────────────────────────
	if (msg.type === 'decode-preview') {
		if (initDone) await initDone;

		const { id, file, maxSize } = msg as {
			id: number;
			file: File;
			maxSize: number;
		};

		try {
			if (!wasmModule?.decode_tiff) {
				throw new Error('TIFF decoding requires WASM module');
			}

			const fileBuffer = await file.arrayBuffer();
			const packed: Uint8Array = wasmModule.decode_tiff(new Uint8Array(fileBuffer));
			const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
			const width = view.getUint32(0, true);
			const height = view.getUint32(4, true);
			const rgbaSlice = packed.slice(8, 8 + width * height * 4);
			const rgba = new Uint8ClampedArray(rgbaSlice.buffer);

			// Create a full-size preview (PNG)
			const previewCanvas = new OffscreenCanvas(width, height);
			const previewCtx = previewCanvas.getContext('2d')!;
			previewCtx.putImageData(new ImageData(rgba, width, height), 0, 0);
			const previewBlob = await previewCanvas.convertToBlob({ type: 'image/png' });
			const previewBuffer = await previewBlob.arrayBuffer();

			// Create a small thumbnail (JPEG)
			const scale = Math.min(maxSize / width, maxSize / height, 1);
			const tw = Math.round(width * scale) || 1;
			const th = Math.round(height * scale) || 1;
			const thumbCanvas = new OffscreenCanvas(tw, th);
			const thumbCtx = thumbCanvas.getContext('2d')!;
			thumbCtx.drawImage(previewCanvas, 0, 0, tw, th);
			const thumbBlob = await thumbCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
			const thumbBuffer = await thumbBlob.arrayBuffer();

			(self as unknown as Worker).postMessage(
				{
					id,
					type: 'result',
					result: {
						previewBuffer,
						thumbBuffer,
						width,
						height,
					},
				},
				[previewBuffer, thumbBuffer],
			);
		} catch (err) {
			self.postMessage({
				id,
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
		return;
	}

	// ── SVG Trace ───────────────────────────────────────────────────
	if (msg.type === 'trace') {
		if (initDone) await initDone;

		const { id, file, config: traceConfig } = msg as {
			id: number;
			file: File;
			config: {
				colorMode: string;
				hierarchical: string;
				filterSpeckle: number;
				colorPrecision: number;
				layerDifference: number;
				cornerThreshold: number;
				lengthThreshold: number;
				spliceThreshold: number;
				maxIterations: number;
				pathPrecision: number;
			};
		};

		try {
			if (!wasmModule?.trace_to_svg) {
				throw new Error('SVG tracing requires WASM module. Please reload the page.');
			}

			// 1. Decode image
			self.postMessage({ id, type: 'progress', stage: 'Decoding', percent: 10 });

			let width: number;
			let height: number;
			let rgba: Uint8Array;

			const fileFmt = detectFormat(file);
			if (fileFmt === 'tiff' && wasmModule?.decode_tiff) {
				const fileBuffer = await file.arrayBuffer();
				const packed: Uint8Array = wasmModule.decode_tiff(new Uint8Array(fileBuffer));
				const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
				width = view.getUint32(0, true);
				height = view.getUint32(4, true);
				rgba = new Uint8Array(packed.buffer, packed.byteOffset + 8, width * height * 4);
			} else {
				const bitmap = await createImageBitmap(file);
				width = bitmap.width;
				height = bitmap.height;
				const canvas = new OffscreenCanvas(width, height);
				const ctx = canvas.getContext('2d')!;
				ctx.drawImage(bitmap, 0, 0);
				bitmap.close();
				const imageData = ctx.getImageData(0, 0, width, height);
				rgba = new Uint8Array(imageData.data.buffer);
			}

			// 2. Trace to SVG
			self.postMessage({ id, type: 'progress', stage: 'Tracing', percent: 40 });
			const t0 = performance.now();

			const svg: string = wasmModule.trace_to_svg(
				rgba,
				width,
				height,
				traceConfig.colorMode,
				traceConfig.hierarchical,
				traceConfig.filterSpeckle,
				traceConfig.colorPrecision,
				traceConfig.layerDifference,
				traceConfig.cornerThreshold,
				traceConfig.lengthThreshold,
				traceConfig.spliceThreshold,
				traceConfig.maxIterations,
				traceConfig.pathPrecision,
			);

			const durationMs = Math.round(performance.now() - t0);

			self.postMessage({ id, type: 'progress', stage: 'Done', percent: 100 });

			const svgSize = new Blob([svg]).size;
			self.postMessage({
				id,
				type: 'result',
				result: {
					svg,
					svgSize,
					originalSize: file.size,
					width,
					height,
					durationMs,
				},
			});
		} catch (err) {
			self.postMessage({
				id,
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			});
		}
		return;
	}
};

// ── Main conversion pipeline ────────────────────────────────────────────────

async function processConvert(id: number, file: File, config: ConverterConfig) {
	const postProgress = (stage: string, percent: number) => {
		self.postMessage({ id, type: 'progress', stage, percent });
	};

	let bitmap: ImageBitmap | null = null;

	try {
		// ── Step 1: Decode image ────────────────────────────────────────
		postProgress('Decoding', 10);

		let width: number;
		let height: number;
		let rgba: Uint8Array;

		const inputFormat = detectFormat(file);
		const isTiff = inputFormat === 'tiff';

		if (isTiff && wasmModule?.decode_tiff) {
			// TIFF files can't be decoded by createImageBitmap — use WASM decoder
			const fileBuffer = await file.arrayBuffer();
			const packed: Uint8Array = wasmModule.decode_tiff(new Uint8Array(fileBuffer));
			// Packed format: [width_le_u32, height_le_u32, ...rgba_pixels]
			const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
			width = view.getUint32(0, true);
			height = view.getUint32(4, true);
			rgba = new Uint8Array(packed.buffer, packed.byteOffset + 8, width * height * 4);
		} else {
			bitmap = await createImageBitmap(file);
			width = bitmap.width;
			height = bitmap.height;

			// ── Step 2: Extract RGBA pixels via OffscreenCanvas ─────────────
			postProgress('Processing', 25);
			const canvas = new OffscreenCanvas(width, height);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0);
			bitmap.close();
			bitmap = null;

			const imageData = ctx.getImageData(0, 0, width, height);
			rgba = new Uint8Array(imageData.data.buffer);
		}

		// ── Step 3: Optional grayscale conversion ───────────────────────
		if (config.grayscale) {
			postProgress('Grayscale', 35);
			if (wasmModule?.to_grayscale) {
				rgba = new Uint8Array(wasmModule.to_grayscale(rgba, width, height));
			} else {
				// JS fallback: BT.709 fixed-point
				for (let i = 0; i < rgba.length; i += 4) {
					const y = (54 * rgba[i] + 183 * rgba[i + 1] + 19 * rgba[i + 2] + 128) >> 8;
					rgba[i] = y;
					rgba[i + 1] = y;
					rgba[i + 2] = y;
				}
			}
		}

		// ── Step 4: Alpha handling ──────────────────────────────────────
		// Remove alpha for formats that don't support it, or if user opted out
		const formatSupportsAlpha =
			config.outputFormat !== 'jpeg' &&
			config.outputFormat !== 'pdf' &&
			(config.outputFormat === 'png' ||
				config.outputFormat === 'webp' ||
				config.outputFormat === 'avif' ||
				config.outputFormat === 'bmp' ||
				config.outputFormat === 'tiff' ||
				config.outputFormat === 'ico');

		const shouldRemoveAlpha = !formatSupportsAlpha || !config.preserveTransparency;

		if (shouldRemoveAlpha) {
			postProgress('Compositing', 45);
			const [bgR, bgG, bgB] = parseHexColor(config.backgroundColor);

			if (wasmModule?.alpha_composite) {
				rgba = new Uint8Array(
					wasmModule.alpha_composite(rgba, width, height, bgR, bgG, bgB),
				);
			} else {
				// JS fallback: naive (non-gamma-correct) compositing
				for (let i = 0; i < rgba.length; i += 4) {
					const a = rgba[i + 3] / 255;
					const invA = 1 - a;
					rgba[i] = Math.round(rgba[i] * a + bgR * invA);
					rgba[i + 1] = Math.round(rgba[i + 1] * a + bgG * invA);
					rgba[i + 2] = Math.round(rgba[i + 2] * a + bgB * invA);
					rgba[i + 3] = 255;
				}
			}
		}

		// ── Step 5: Put processed pixels back for Canvas encoding ───────
		postProgress('Encoding', 60);
		const outCanvas = new OffscreenCanvas(width, height);
		const outCtx = outCanvas.getContext('2d')!;
		const clampedPixels = new Uint8ClampedArray(rgba.length);
		clampedPixels.set(rgba);
		outCtx.putImageData(new ImageData(clampedPixels, width, height), 0, 0);

		// ── Step 6: Encode to target format ─────────────────────────────
		const { outputBuffer, mimeType, previewBuffer } = await encodeToFormat(
			config,
			outCanvas,
			rgba,
			width,
			height,
			wasmModule,
			postProgress,
			shouldRemoveAlpha,
		);

		postProgress('Done', 100);

		// ── Step 7: Transfer result ─────────────────────────────────────
		const originalFormat = detectFormat(file);

		const transferBuffers = [outputBuffer];
		if (previewBuffer) transferBuffers.push(previewBuffer);

		self.postMessage(
			{
				id,
				type: 'result',
				result: {
					buffer: outputBuffer,
					previewBuffer,
					mimeType,
					originalSize: file.size,
					convertedSize: outputBuffer.byteLength,
					originalFormat,
					outputFormat: config.outputFormat,
					width,
					height,
				},
			},
			// @ts-expect-error transferable
			transferBuffers,
		);
	} finally {
		bitmap?.close();
	}
}
