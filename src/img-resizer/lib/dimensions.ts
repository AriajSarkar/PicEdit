/**
 * Pure dimension calculation functions for image resizing.
 *
 * These functions have zero browser/worker dependencies and can be
 * imported by both the main-thread resizeUtils and the resizeWorker.
 */

import type { ResizerConfig, ResizePreset, ResizeFit } from '@/img-resizer/types';
import { RESIZE_PRESETS } from '@/img-resizer/types';

/**
 * Apply fit mode to constrain image within target box.
 */
export function applyFit(
	srcW: number,
	srcH: number,
	targetW: number,
	targetH: number,
	fit: ResizeFit,
): { width: number; height: number } {
	const srcRatio = srcW / srcH;

	switch (fit) {
		case 'contain': {
			if (targetW / targetH > srcRatio) {
				return { width: Math.round(targetH * srcRatio), height: targetH };
			}
			return { width: targetW, height: Math.round(targetW / srcRatio) };
		}

		case 'cover': {
			if (targetW / targetH > srcRatio) {
				return { width: targetW, height: Math.round(targetW / srcRatio) };
			}
			return { width: Math.round(targetH * srcRatio), height: targetH };
		}

		case 'stretch':
			return { width: targetW, height: targetH };

		default:
			return { width: targetW, height: targetH };
	}
}

/**
 * Calculate final output dimensions for a given image and config.
 */
export function calculateOutputDimensions(
	origWidth: number,
	origHeight: number,
	config: ResizerConfig,
): { width: number; height: number } {
	switch (config.method) {
		case 'percentage': {
			const scale = config.percentage / 100;
			return {
				width: Math.max(1, Math.round(origWidth * scale)),
				height: Math.max(1, Math.round(origHeight * scale)),
			};
		}

		case 'preset': {
			const preset = RESIZE_PRESETS.find((p) => p.id === config.presetId);
			if (!preset) return { width: origWidth, height: origHeight };
			return applyFit(origWidth, origHeight, preset.width, preset.height, config.fit);
		}

		case 'dimensions': {
			const tw = config.width || origWidth;
			const th = config.height || origHeight;

			if (config.lockAspectRatio) {
				return applyFit(origWidth, origHeight, tw, th, config.fit);
			}
			return { width: tw, height: th };
		}

		default:
			return { width: origWidth, height: origHeight };
	}
}

/**
 * Get the target dimensions from a preset.
 */
export function getPresetDimensions(presetId: string): ResizePreset | undefined {
	return RESIZE_PRESETS.find((p) => p.id === presetId);
}

/**
 * Resolve explicit target dimensions used for cover-mode rendering.
 */
export function getCoverTargetDimensions(
	config: ResizerConfig,
	fallbackW: number,
	fallbackH: number,
): { targetW: number; targetH: number } {
	if (config.method === 'preset') {
		const preset = RESIZE_PRESETS.find((p) => p.id === config.presetId);
		return {
			targetW: preset?.width || fallbackW,
			targetH: preset?.height || fallbackH,
		};
	}
	return {
		targetW: config.width || fallbackW,
		targetH: config.height || fallbackH,
	};
}
