/**
 * Format Encoders — encodes RGBA pixel data to the requested output format.
 *
 * Extracted from conversionWorker.ts to keep each module focused.
 * Handles JPEG, PNG, WebP, BMP, TIFF, ICO, AVIF, and PDF encoding.
 */

import { type ConverterConfig } from './workerTypes';
import { buildPdf } from './pdfBuilder';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EncodeResult {
	outputBuffer: ArrayBuffer;
	mimeType: string;
	previewBuffer: ArrayBuffer | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WasmModule = any;

// ── Main encoder ────────────────────────────────────────────────────────────

/**
 * Encode RGBA pixels + OffscreenCanvas to the target format.
 *
 * @param config        - Conversion settings (format, quality, etc.)
 * @param outCanvas     - OffscreenCanvas with processed pixels drawn
 * @param rgba          - Raw RGBA pixel data (Uint8Array)
 * @param width         - Image width
 * @param height        - Image height
 * @param wasmModule    - Loaded WASM module (may be null for Canvas-only formats)
 * @param postProgress  - Progress callback
 * @param shouldRemoveAlpha - Whether alpha was already composited out
 */
export async function encodeToFormat(
	config: ConverterConfig,
	outCanvas: OffscreenCanvas,
	rgba: Uint8Array,
	width: number,
	height: number,
	wasmModule: WasmModule,
	postProgress: (stage: string, percent: number) => void,
	shouldRemoveAlpha: boolean,
): Promise<EncodeResult> {
	let outputBuffer: ArrayBuffer = new ArrayBuffer(0);
	let mimeType = 'application/octet-stream';
	let previewBuffer: ArrayBuffer | null = null;

	switch (config.outputFormat) {
		case 'jpeg': {
			const blob = await outCanvas.convertToBlob({
				type: 'image/jpeg',
				quality: config.quality,
			});
			outputBuffer = await blob.arrayBuffer();
			mimeType = 'image/jpeg';
			break;
		}

		case 'png': {
			const blob = await outCanvas.convertToBlob({ type: 'image/png' });
			outputBuffer = await blob.arrayBuffer();
			mimeType = 'image/png';
			break;
		}

		case 'webp': {
			const blob = await outCanvas.convertToBlob({
				type: 'image/webp',
				quality: config.quality,
			});
			outputBuffer = await blob.arrayBuffer();
			mimeType = 'image/webp';
			break;
		}

		case 'bmp': {
			if (!wasmModule?.encode_bmp) {
				throw new Error('BMP encoding requires WASM module. Please reload the page.');
			}
			const bpp = config.preserveTransparency ? 32 : 24;
			const bmpData: Uint8Array = wasmModule.encode_bmp(rgba, width, height, bpp);
			outputBuffer = (bmpData.buffer as ArrayBuffer).slice(
				bmpData.byteOffset,
				bmpData.byteOffset + bmpData.byteLength,
			);
			mimeType = 'image/bmp';
			break;
		}

		case 'tiff': {
			if (!wasmModule?.encode_tiff) {
				throw new Error('TIFF encoding requires WASM module. Please reload the page.');
			}
			const tiffAlpha = config.preserveTransparency && !shouldRemoveAlpha;
			const tiffData: Uint8Array = wasmModule.encode_tiff(rgba, width, height, tiffAlpha);
			outputBuffer = (tiffData.buffer as ArrayBuffer).slice(
				tiffData.byteOffset,
				tiffData.byteOffset + tiffData.byteLength,
			);
			mimeType = 'image/tiff';
			// Browsers can't display TIFF — generate JPEG preview from canvas
			const tiffPreviewBlob = await outCanvas.convertToBlob({
				type: 'image/jpeg',
				quality: 0.85,
			});
			previewBuffer = await tiffPreviewBlob.arrayBuffer();
			break;
		}

		case 'ico': {
			if (!wasmModule?.encode_ico) {
				throw new Error('ICO encoding requires WASM module. Please reload the page.');
			}
			outputBuffer = await encodeIco(config, rgba, width, height, wasmModule);
			mimeType = 'image/x-icon';
			break;
		}

		case 'avif': {
			const result = await encodeAvif(config, outCanvas, rgba, width, height, wasmModule, postProgress);
			outputBuffer = result.outputBuffer;
			mimeType = result.mimeType;
			break;
		}

		case 'pdf': {
			const pdfQuality = Math.max(config.quality, 0.92);
			const jpegBlob = await outCanvas.convertToBlob({
				type: 'image/jpeg',
				quality: pdfQuality,
			});
			const jpegBuffer = await jpegBlob.arrayBuffer();
			outputBuffer = buildPdf(jpegBuffer, width, height, config);
			mimeType = 'application/pdf';
			break;
		}

		default: {
			const blob = await outCanvas.convertToBlob({ type: 'image/png' });
			outputBuffer = await blob.arrayBuffer();
			mimeType = 'image/png';
		}
	}

	return { outputBuffer, mimeType, previewBuffer };
}

// ── ICO encoder ─────────────────────────────────────────────────────────────

async function encodeIco(
	config: ConverterConfig,
	rgba: Uint8Array,
	width: number,
	height: number,
	wasmModule: WasmModule,
): Promise<ArrayBuffer> {
	const smallSizes = config.icoSizes.filter((s) => s <= 256);
	const largeSizes = config.icoSizes.filter((s) => s > 256);

	if (largeSizes.length === 0) {
		// All sizes ≤ 256: use the WASM encoder directly
		const sizes = new Uint32Array(smallSizes);
		const icoData: Uint8Array = wasmModule.encode_ico(rgba, width, height, sizes);
		return (icoData.buffer as ArrayBuffer).slice(
			icoData.byteOffset,
			icoData.byteOffset + icoData.byteLength,
		);
	}

	// Mix BMP entries (≤256) and PNG entries (>256)
	const entries: { size: number; data: Uint8Array; isPng: boolean }[] = [];

	// BMP entries via WASM
	for (const sz of smallSizes) {
		const bmpData: Uint8Array = wasmModule.encode_ico_entry(rgba, width, height, sz);
		entries.push({ size: sz, data: bmpData, isPng: false });
	}

	// PNG entries via Canvas for sizes > 256
	for (const sz of largeSizes) {
		const resized: Uint8Array = wasmModule.resize_for_ico(rgba, width, height, sz);
		const pngCanvas = new OffscreenCanvas(sz, sz);
		const pngCtx = pngCanvas.getContext('2d')!;
		const clamped = new Uint8ClampedArray(resized.length);
		clamped.set(resized);
		pngCtx.putImageData(new ImageData(clamped, sz, sz), 0, 0);
		const blob = await pngCanvas.convertToBlob({ type: 'image/png' });
		const pngBuf = new Uint8Array(await blob.arrayBuffer());
		entries.push({ size: sz, data: pngBuf, isPng: true });
	}

	// Sort entries by size ascending
	entries.sort((a, b) => a.size - b.size);

	// Assemble ICO file
	const count = entries.length;
	const dirSize = 6 + count * 16;
	let offset = dirSize;
	const offsets: number[] = [];
	for (const e of entries) {
		offsets.push(offset);
		offset += e.data.length;
	}

	const icoBuf = new Uint8Array(offset);
	const view = new DataView(icoBuf.buffer);

	// ICONDIR header
	view.setUint16(0, 0, true); // Reserved
	view.setUint16(2, 1, true); // Type: ICO
	view.setUint16(4, count, true); // Count

	// ICONDIRENTRY for each entry
	for (let i = 0; i < count; i++) {
		const e = entries[i];
		const off = 6 + i * 16;
		const dim = e.size >= 256 ? 0 : e.size;
		icoBuf[off] = dim; // Width
		icoBuf[off + 1] = dim; // Height
		icoBuf[off + 2] = 0; // Color count
		icoBuf[off + 3] = 0; // Reserved
		view.setUint16(off + 4, 1, true); // Planes
		view.setUint16(off + 6, 32, true); // BPP
		view.setUint32(off + 8, e.data.length, true); // Size
		view.setUint32(off + 12, offsets[i], true); // Offset
	}

	// Image data
	for (let i = 0; i < count; i++) {
		icoBuf.set(entries[i].data, offsets[i]);
	}

	return icoBuf.buffer as ArrayBuffer;
}

// ── AVIF encoder ────────────────────────────────────────────────────────────

async function encodeAvif(
	config: ConverterConfig,
	outCanvas: OffscreenCanvas,
	rgba: Uint8Array,
	width: number,
	height: number,
	wasmModule: WasmModule,
	postProgress: (stage: string, percent: number) => void,
): Promise<{ outputBuffer: ArrayBuffer; mimeType: string }> {
	// Try Canvas API first (fast, hardware-accelerated)
	try {
		const blob = await outCanvas.convertToBlob({
			type: 'image/avif',
			quality: config.quality,
		});
		if (blob.type === 'image/avif') {
			return {
				outputBuffer: await blob.arrayBuffer(),
				mimeType: 'image/avif',
			};
		}
	} catch {
		// Canvas AVIF not supported — will try WASM
	}

	// Fall back to WASM AVIF encoder
	if (!wasmModule?.encode_avif) {
		throw new Error(
			'AVIF encoding unavailable. Your browser does not support Canvas AVIF and the WASM encoder could not load.',
		);
	}

	postProgress('Encoding AVIF', 65);
	const avifQuality = Math.round(config.quality * 100);
	const avifSpeed = 6; // reasonable default (1=slow/best, 10=fast)
	const avifBytes: Uint8Array = wasmModule.encode_avif(rgba, width, height, avifQuality, avifSpeed);
	return {
		outputBuffer: (avifBytes.buffer as ArrayBuffer).slice(
			avifBytes.byteOffset,
			avifBytes.byteOffset + avifBytes.byteLength,
		),
		mimeType: 'image/avif',
	};
}
