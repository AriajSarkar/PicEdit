/**
 * Shared types and helpers for the conversion worker modules.
 *
 * Extracted from conversionWorker.ts to keep each file ≤ 300 lines.
 * These are duplicated (not imported from src/types/) because Web Workers
 * need self-contained type definitions to avoid bundler issues.
 */

// ── Config ──────────────────────────────────────────────────────────────────

export interface ConverterConfig {
	outputFormat: string;
	quality: number;
	backgroundColor: string;
	preserveTransparency: boolean;
	grayscale: boolean;
	icoSizes: number[];
	pdfDpi: number;
	pdfPageSize: string;
	pdfFitMode: string;
	pdfOrientation: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
	'image/jpeg': 'jpeg',
	'image/jpg': 'jpeg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/bmp': 'bmp',
	'image/tiff': 'tiff',
	'image/svg+xml': 'svg',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
	'image/avif': 'avif',
};

const EXT_MAP: Record<string, string> = {
	jpg: 'jpeg',
	jpeg: 'jpeg',
	png: 'png',
	webp: 'webp',
	gif: 'gif',
	bmp: 'bmp',
	tif: 'tiff',
	tiff: 'tiff',
	svg: 'svg',
	ico: 'ico',
	avif: 'avif',
};

export function detectFormat(file: File): string {
	if (file.type && MIME_MAP[file.type]) return MIME_MAP[file.type];
	const ext = file.name.split('.').pop()?.toLowerCase() || '';
	return EXT_MAP[ext] || 'unknown';
}

export function parseHexColor(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const r = parseInt(h.substring(0, 2), 16) || 255;
	const g = parseInt(h.substring(2, 4), 16) || 255;
	const b = parseInt(h.substring(4, 6), 16) || 255;
	return [r, g, b];
}
