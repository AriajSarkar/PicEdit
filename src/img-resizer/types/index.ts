// ═══════════════════════════════════════════════════════════════════
// PicEdit — Image Resizer Types
// ═══════════════════════════════════════════════════════════════════

import type { BatchItem } from '@/hooks/useBatchProcessor';

/** Resize method — how the target dimensions are determined */
export type ResizeMethod = 'dimensions' | 'percentage' | 'preset';

/** How the image fits within the target dimensions */
export type ResizeFit = 'contain' | 'cover' | 'stretch';

/** Social media / common presets */
export interface ResizePreset {
	id: string;
	label: string;
	category: string;
	width: number;
	height: number;
	icon?: string;
}

/** Resizer configuration */
export interface ResizerConfig {
	method: ResizeMethod;
	/** Target width (px) — used when method is 'dimensions' */
	width: number;
	/** Target height (px) — used when method is 'dimensions' */
	height: number;
	/** Lock aspect ratio */
	lockAspectRatio: boolean;
	/** Scale percentage 1-500 — used when method is 'percentage' */
	percentage: number;
	/** Preset ID — used when method is 'preset' */
	presetId: string;
	/** Fit mode */
	fit: ResizeFit;
	/** Output format (preserve = keep original) */
	outputFormat: 'preserve' | 'jpeg' | 'png' | 'webp';
	/** JPEG/WebP quality 0.1–1.0 */
	quality: number;
}

export const DEFAULT_RESIZER_CONFIG: ResizerConfig = {
	method: 'dimensions',
	width: 1920,
	height: 1080,
	lockAspectRatio: true,
	percentage: 50,
	presetId: '',
	fit: 'contain',
	outputFormat: 'preserve',
	quality: 0.9,
};

/** An item in the resize batch */
export interface ResizeItem extends BatchItem {
	file: File;
	preview: string;
	/** Tiny ~88px JPEG thumbnail for strips/lists (saves GPU memory vs full-res preview) */
	thumbnail: string;
	originalWidth: number;
	originalHeight: number;
	result?: ResizeResult;
}

export interface ResizeResult {
	blob: Blob;
	dataUrl: string;
	width: number;
	height: number;
	originalSize: number;
	newSize: number;
	format: string;
}

// ── Presets ───────────────────────────────────────────────────────────────

export const RESIZE_PRESETS: ResizePreset[] = [
	// Social Media
	{ id: 'ig-post', label: 'Post', category: 'Instagram', width: 1080, height: 1080 },
	{ id: 'ig-story', label: 'Story / Reel', category: 'Instagram', width: 1080, height: 1920 },
	{ id: 'ig-landscape', label: 'Landscape', category: 'Instagram', width: 1080, height: 566 },
	{ id: 'fb-post', label: 'Post', category: 'Facebook', width: 1200, height: 630 },
	{ id: 'fb-cover', label: 'Cover', category: 'Facebook', width: 820, height: 312 },
	{ id: 'fb-story', label: 'Story', category: 'Facebook', width: 1080, height: 1920 },
	{ id: 'tw-post', label: 'Post', category: 'X / Twitter', width: 1200, height: 675 },
	{ id: 'tw-header', label: 'Header', category: 'X / Twitter', width: 1500, height: 500 },
	{ id: 'yt-thumb', label: 'Thumbnail', category: 'YouTube', width: 1280, height: 720 },
	{ id: 'yt-banner', label: 'Banner', category: 'YouTube', width: 2560, height: 1440 },
	{ id: 'li-post', label: 'Post', category: 'LinkedIn', width: 1200, height: 627 },
	{ id: 'li-cover', label: 'Cover', category: 'LinkedIn', width: 1584, height: 396 },
	{ id: 'pin-pin', label: 'Pin', category: 'Pinterest', width: 1000, height: 1500 },

	// Common sizes
	{ id: 'hd', label: 'HD', category: 'Standard', width: 1280, height: 720 },
	{ id: 'fhd', label: 'Full HD', category: 'Standard', width: 1920, height: 1080 },
	{ id: '2k', label: '2K', category: 'Standard', width: 2560, height: 1440 },
	{ id: '4k', label: '4K UHD', category: 'Standard', width: 3840, height: 2160 },
	{ id: 'favicon', label: 'Favicon', category: 'Web', width: 32, height: 32 },
	{ id: 'og-image', label: 'OG Image', category: 'Web', width: 1200, height: 630 },
	{ id: 'icon-192', label: 'PWA Icon', category: 'Web', width: 192, height: 192 },
	{ id: 'icon-512', label: 'PWA Splash', category: 'Web', width: 512, height: 512 },
];
