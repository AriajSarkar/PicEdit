/**
 * PDF Builder — generates single- and multi-page PDFs from JPEG images.
 *
 * Extracted from conversionWorker.ts for modularity.
 * Pure functions — no WASM dependency, no side effects.
 *
 * Structure: PDF 1.4, N pages, each with an embedded JPEG via /DCTDecode.
 * Supports configurable DPI, standard page sizes, fit modes, and orientation.
 *
 * Reference: PDF Reference 1.7 (ISO 32000-1:2008)
 */

import { type ConverterConfig } from './workerTypes';

// ── Constants ───────────────────────────────────────────────────────────────

/** Standard page sizes in points (portrait orientation) */
const PDF_PAGES: Record<string, { w: number; h: number }> = {
	a4: { w: 595.28, h: 841.89 },
	letter: { w: 612, h: 792 },
	a3: { w: 841.89, h: 1190.55 },
	legal: { w: 612, h: 1008 },
};

// ── Types ───────────────────────────────────────────────────────────────────

/** Image-page descriptor for multi-page PDF */
export interface PdfImagePage {
	jpegBytes: Uint8Array;
	pixelW: number;
	pixelH: number;
}

// ── Layout ──────────────────────────────────────────────────────────────────

/**
 * Compute PDF page MediaBox + image transform matrix.
 *
 * -  `fit` → page = image size at the chosen DPI
 *            (e.g. 4000×3000 at 300 DPI → 960×720 pt → 13.3" × 10")
 * -  Standard sizes (A4, Letter, …) → scale image to fit/fill/stretch.
 *
 * Returns [pageW, pageH, imgX, imgY, imgW, imgH] — all in PDF points.
 */
function layoutPage(
	pxW: number,
	pxH: number,
	dpi: number,
	pageSize: string,
	fitMode: string,
	orientation: string,
): [number, number, number, number, number, number] {
	if (pageSize === 'fit') {
		const pw = (pxW * 72) / dpi;
		const ph = (pxH * 72) / dpi;
		return [pw, ph, 0, 0, pw, ph];
	}

	const pageDef = PDF_PAGES[pageSize] || PDF_PAGES.a4;
	let pageW = pageDef.w;
	let pageH = pageDef.h;

	// Decide orientation
	const isLandscape =
		orientation === 'landscape' ||
		(orientation === 'auto' && pxW > pxH);
	if (isLandscape) [pageW, pageH] = [pageH, pageW];

	// Image dimensions in points at chosen DPI
	const imgPtW = (pxW * 72) / dpi;
	const imgPtH = (pxH * 72) / dpi;

	let drawW: number, drawH: number;

	switch (fitMode) {
		case 'fill': {
			const scale = Math.max(pageW / imgPtW, pageH / imgPtH);
			drawW = imgPtW * scale;
			drawH = imgPtH * scale;
			break;
		}
		case 'stretch': {
			drawW = pageW;
			drawH = pageH;
			break;
		}
		default: {
			// contain — fit inside with margins
			const scale = Math.min(pageW / imgPtW, pageH / imgPtH);
			drawW = imgPtW * scale;
			drawH = imgPtH * scale;
			break;
		}
	}

	// Center on page
	const x = (pageW - drawW) / 2;
	const y = (pageH - drawH) / 2;

	return [pageW, pageH, x, y, drawW, drawH];
}

// ── Builders ────────────────────────────────────────────────────────────────

/**
 * Build a high-quality single-page PDF.
 *
 * Wraps buildMultiPagePdf with a single-page array for convenience.
 */
export function buildPdf(
	jpegBuffer: ArrayBuffer,
	width: number,
	height: number,
	config: ConverterConfig,
): ArrayBuffer {
	return buildMultiPagePdf(
		[{ jpegBytes: new Uint8Array(jpegBuffer), pixelW: width, pixelH: height }],
		config,
	);
}

/**
 * Build a multi-page PDF embedding one JPEG image per page.
 *
 * Supports configurable DPI, standard page sizes, fit modes, and orientation.
 */
export function buildMultiPagePdf(pages: PdfImagePage[], config: ConverterConfig): ArrayBuffer {
	const enc = new TextEncoder();
	const dpi = config.pdfDpi || 300;
	const pageSize = config.pdfPageSize || 'fit';
	const fitMode = config.pdfFitMode || 'contain';
	const orientation = config.pdfOrientation || 'auto';

	const n = pages.length;

	// Object table: text chunks + binary image data
	const parts: (Uint8Array | string)[] = [];
	const offsets: number[] = [];

	parts.push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'); // header + binary marker

	// Object 1: Catalog
	offsets.push(-1);
	const pageRefs = Array.from({ length: n }, (_, i) => `${3 + i * 3} 0 R`).join(' ');
	const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
	parts.push(obj1);

	// Object 2: Pages
	offsets.push(-1);
	const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${n} >>\nendobj\n`;
	parts.push(obj2);

	// Per-page objects (3 objects per page: Page, Contents stream, Image XObject)
	for (let i = 0; i < n; i++) {
		const page = pages[i];
		const base = 3 + i * 3;
		const contentsObj = base + 1;
		const imageObj = base + 2;

		const [pageW, pageH, imgX, imgY, imgW, imgH] = layoutPage(
			page.pixelW, page.pixelH, dpi, pageSize, fitMode, orientation,
		);

		// Page object
		offsets.push(-1);
		parts.push(
			`${base} 0 obj\n<< /Type /Page /Parent 2 0 R ` +
			`/MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] ` +
			`/Contents ${contentsObj} 0 R ` +
			`/Resources << /XObject << /Im0 ${imageObj} 0 R >> >> ` +
			`>>\nendobj\n`,
		);

		// Content stream
		const cs = `q ${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm /Im0 Do Q`;
		offsets.push(-1);
		parts.push(`${contentsObj} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`);

		// Image XObject: header + JPEG binary + trailer
		offsets.push(-1);
		parts.push(
			`${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image ` +
			`/Width ${page.pixelW} /Height ${page.pixelH} ` +
			`/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
			`/Filter /DCTDecode /Length ${page.jpegBytes.length} ` +
			`>>\nstream\n`,
		);
		parts.push(page.jpegBytes);
		parts.push('\nendstream\nendobj\n');
	}

	// Convert string parts to Uint8Array
	const encoded: Uint8Array[] = parts.map((p) =>
		typeof p === 'string' ? enc.encode(p) : p,
	);

	// Calculate byte offsets for each object
	let bytePos = 0;
	const actualOffsets: number[] = [0]; // index 0 unused (1-indexed)

	// header
	bytePos = encoded[0].length;
	// obj1
	actualOffsets.push(bytePos);
	bytePos += encoded[1].length;
	// obj2
	actualOffsets.push(bytePos);
	bytePos += encoded[2].length;

	// Per page: 5 encoded parts each (page, contents, imgHeader, imgBinary, imgTrailer)
	for (let i = 0; i < n; i++) {
		const base = 3 + i * 5;
		actualOffsets.push(bytePos);
		bytePos += encoded[base].length;
		actualOffsets.push(bytePos);
		bytePos += encoded[base + 1].length;
		actualOffsets.push(bytePos);
		bytePos += encoded[base + 2].length + encoded[base + 3].length + encoded[base + 4].length;
	}

	const xrefOff = bytePos;
	const totalObjects = 2 + n * 3;
	const pad = (v: number) => v.toString().padStart(10, '0');

	let xrefStr = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
	for (let o = 1; o <= totalObjects; o++) {
		xrefStr += `${pad(actualOffsets[o])} 00000 n \n`;
	}

	const trailer = `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;

	const xrefBytes = enc.encode(xrefStr);
	const trailerBytes = enc.encode(trailer);

	// Assemble final PDF
	const totalSize = bytePos + xrefBytes.length + trailerBytes.length;
	const final = new Uint8Array(totalSize);
	let pos = 0;
	for (const chunk of encoded) {
		final.set(chunk, pos);
		pos += chunk.length;
	}
	final.set(xrefBytes, pos);
	pos += xrefBytes.length;
	final.set(trailerBytes, pos);

	return final.buffer;
}
