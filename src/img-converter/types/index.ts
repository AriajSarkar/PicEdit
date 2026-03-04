/**
 * Format Converter — Type definitions.
 *
 * Defines the complete type surface for the converter feature:
 * config, item state, worker messages, and format metadata.
 */

import type { BatchItem } from '@/hooks/useBatchProcessor';

// ── Output format ───────────────────────────────────────────────────────────

export type ConvertOutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp' | 'tiff' | 'ico' | 'pdf';

// ── Configuration ───────────────────────────────────────────────────────────

// ── PDF-specific types ──────────────────────────────────────────────────────

/** Standard page dimensions in PDF points (1 pt = 1/72 inch) */
export type PdfPageSize = 'fit' | 'a4' | 'letter' | 'a3' | 'legal';

/** How the image fits within the page when using a standard page size */
export type PdfFitMode = 'contain' | 'fill' | 'stretch';

/** Page orientation */
export type PdfOrientation = 'auto' | 'portrait' | 'landscape';

/** DPI choices for PDF rendering quality */
export type PdfDpi = 72 | 150 | 300 | 600;

/** Standard page sizes in points (width × height, portrait) */
export const PDF_PAGE_SIZES: Record<Exclude<PdfPageSize, 'fit'>, { w: number; h: number }> = {
	a4: { w: 595.28, h: 841.89 },
	letter: { w: 612, h: 792 },
	a3: { w: 841.89, h: 1190.55 },
	legal: { w: 612, h: 1008 },
};

export interface ConverterConfig {
	/** Target output format */
	outputFormat: ConvertOutputFormat;
	/** Encode quality 0.0–1.0 (JPEG / WebP only) */
	quality: number;
	/** Background color hex for alpha compositing (e.g. '#ffffff') */
	backgroundColor: string;
	/** Preserve transparency when the output format supports it */
	preserveTransparency: boolean;
	/** Convert to perceptual grayscale (BT.709 luminance) */
	grayscale: boolean;
	/** Sizes to embed in ICO output (e.g. [16, 32, 48]) */
	icoSizes: number[];
	/** PDF resolution — higher = sharper image, larger file */
	pdfDpi: PdfDpi;
	/** PDF page size — 'fit' sizes the page to the image */
	pdfPageSize: PdfPageSize;
	/** How to fit image within a standard page size */
	pdfFitMode: PdfFitMode;
	/** Page orientation — 'auto' chooses based on image aspect ratio */
	pdfOrientation: PdfOrientation;
}

export const DEFAULT_CONVERTER_CONFIG: ConverterConfig = {
	outputFormat: 'png',
	quality: 0.92,
	backgroundColor: '#ffffff',
	preserveTransparency: true,
	grayscale: false,
	icoSizes: [16, 32, 48, 64, 128, 256],
	pdfDpi: 300,
	pdfPageSize: 'fit',
	pdfFitMode: 'contain',
	pdfOrientation: 'auto',
};

// ── Conversion result ───────────────────────────────────────────────────────

export interface ConvertedResult {
	/** The converted image blob */
	blob: Blob;
	/** Data URL for preview */
	dataUrl: string;
	/** Original file size in bytes */
	originalSize: number;
	/** Converted file size in bytes */
	convertedSize: number;
	/** Detected original format (e.g. 'png', 'jpeg') */
	originalFormat: string;
	/** Target output format */
	outputFormat: string;
	/** Image width (pixels) */
	width: number;
	/** Image height (pixels) */
	height: number;
	/** For downloadUtils compatibility */
	format: string;
	/** Size change % (positive = file got smaller) */
	compressionRatio: number;
}

// ── Format metadata ─────────────────────────────────────────────────────────

export interface FormatInfo {
	/** Display label */
	label: string;
	/** File extension (without dot) */
	ext: string;
	/** Whether the format supports alpha transparency */
	supportsAlpha: boolean;
	/** Whether the format has a quality knob */
	supportsQuality: boolean;
	/** Whether encoding requires Rust WASM (vs Canvas API) */
	needsWasm: boolean;
}

export const FORMAT_INFO: Record<ConvertOutputFormat, FormatInfo> = {
	jpeg: {
		label: 'JPEG',
		ext: 'jpg',
		supportsAlpha: false,
		supportsQuality: true,
		needsWasm: false,
	},
	png: {
		label: 'PNG',
		ext: 'png',
		supportsAlpha: true,
		supportsQuality: false,
		needsWasm: false,
	},
	webp: {
		label: 'WebP',
		ext: 'webp',
		supportsAlpha: true,
		supportsQuality: true,
		needsWasm: false,
	},
	bmp: {
		label: 'BMP',
		ext: 'bmp',
		supportsAlpha: true,
		supportsQuality: false,
		needsWasm: true,
	},
	tiff: {
		label: 'TIFF',
		ext: 'tiff',
		supportsAlpha: true,
		supportsQuality: false,
		needsWasm: true,
	},
	ico: {
		label: 'ICO',
		ext: 'ico',
		supportsAlpha: true,
		supportsQuality: false,
		needsWasm: true,
	},
	avif: {
		label: 'AVIF',
		ext: 'avif',
		supportsAlpha: true,
		supportsQuality: true,
		needsWasm: false,
	},
	pdf: {
		label: 'PDF',
		ext: 'pdf',
		supportsAlpha: false,
		supportsQuality: true,
		needsWasm: false,
	},
};

export const ICO_SIZES = [16, 32, 48, 64, 128, 256, 512] as const;

// ── SVG Tracer Types ────────────────────────────────────────────────────────

/** Color mode for vectorization */
export type ColorMode = 'color' | 'binary';

/** How SVG layers are stacked */
export type Hierarchical = 'stacked' | 'cutout';

/** Named presets matching vtracer's built-in presets */
export type TracerPreset = 'photo' | 'poster' | 'bw' | 'custom';

/** Full tracer configuration */
export interface TracerConfig {
	preset: TracerPreset;
	/** Color or black-and-white mode */
	colorMode: ColorMode;
	/** How SVG layers overlap */
	hierarchical: Hierarchical;
	/** Discard areas smaller than X px² */
	filterSpeckle: number;
	/** Color quantization precision 1-8 */
	colorPrecision: number;
	/** Minimum color difference between layers 0-128 */
	layerDifference: number;
	/** Corner detection threshold 0-180° */
	cornerThreshold: number;
	/** Minimum path segment length */
	lengthThreshold: number;
	/** Path splice angle threshold 0-180° */
	spliceThreshold: number;
	/** Max optimization iterations */
	maxIterations: number;
	/** SVG coordinate decimal places 0-8 */
	pathPrecision: number;
}

/** Preset parameter sets */
export const TRACER_PRESETS: Record<Exclude<TracerPreset, 'custom'>, TracerConfig> = {
	photo: {
		preset: 'photo',
		colorMode: 'color',
		hierarchical: 'stacked',
		filterSpeckle: 4,
		colorPrecision: 6,
		layerDifference: 16,
		cornerThreshold: 60,
		lengthThreshold: 4.0,
		spliceThreshold: 45,
		maxIterations: 10,
		pathPrecision: 2,
	},
	poster: {
		preset: 'poster',
		colorMode: 'color',
		hierarchical: 'stacked',
		filterSpeckle: 8,
		colorPrecision: 4,
		layerDifference: 32,
		cornerThreshold: 60,
		lengthThreshold: 4.0,
		spliceThreshold: 45,
		maxIterations: 10,
		pathPrecision: 2,
	},
	bw: {
		preset: 'bw',
		colorMode: 'binary',
		hierarchical: 'stacked',
		filterSpeckle: 4,
		colorPrecision: 6,
		layerDifference: 16,
		cornerThreshold: 60,
		lengthThreshold: 4.0,
		spliceThreshold: 45,
		maxIterations: 10,
		pathPrecision: 2,
	},
};

export const DEFAULT_TRACER_CONFIG: TracerConfig = { ...TRACER_PRESETS.photo };

/** Result of a single trace operation */
export interface TraceResult {
	/** The SVG markup string */
	svg: string;
	/** SVG as a Blob */
	blob: Blob;
	/** Object URL for preview / download */
	url: string;
	/** SVG file size in bytes */
	svgSize: number;
	/** Original image size in bytes */
	originalSize: number;
	/** Trace duration in ms */
	durationMs: number;
}

/** An item in the trace batch */
export interface TracerItem extends BatchItem {
	file: File;
	/** Thumbnail for the file strip (~88px) */
	thumbnail: string;
	/** Full-resolution preview URL */
	preview: string;
	/** Original image dimensions */
	originalWidth: number;
	originalHeight: number;
	/** Trace result (set after success) */
	result?: TraceResult;
}
