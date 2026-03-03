// ═══════════════════════════════════════════════════════════════════
// PicEdit — Shared Thumbnail Utilities
//
// Provides thumbnail generation and URL cleanup helpers used by
// both the compressor and resizer hooks.
// ═══════════════════════════════════════════════════════════════════

import type { BatchItem } from '@/hooks/useBatchProcessor';

/** Maximum dimension for thumbnail generation (2× display size for retina) */
export const THUMB_MAX_SIZE = 88;

/**
 * Generate thumbnail items from a list of image files.
 *
 * For each file:
 *  1. Creates an object URL for full-res preview
 *  2. Loads the image to get natural dimensions
 *  3. Generates a tiny ~88px JPEG thumbnail on a canvas
 *  4. Calls `buildItem` factory to create the final item
 *
 * @param files - Image files to process
 * @param idPrefix - Prefix for generated IDs (e.g. 'img', 'rsz')
 * @param idCounter - Mutable ref counter for unique IDs
 * @param buildItem - Factory that receives file, preview, thumbnail, and dimensions
 */
export async function createThumbnailItems<T extends BatchItem>(
	files: File[],
	idPrefix: string,
	idCounter: { current: number },
	buildItem: (params: {
		id: string;
		file: File;
		preview: string;
		thumbnail: string;
		width: number;
		height: number;
	}) => T,
): Promise<T[]> {
	const imageFiles = files.filter((f) => f.type.startsWith('image/'));
	if (imageFiles.length === 0) return [];

	return Promise.all(
		imageFiles.map(
			(file) =>
				new Promise<T>((resolve) => {
					const id = `${idPrefix}-${++idCounter.current}-${Date.now()}`;
					const preview = URL.createObjectURL(file);

					const img = new Image();
					img.onload = () => {
						const { naturalWidth: w, naturalHeight: h } = img;
						const scale = Math.min(THUMB_MAX_SIZE / w, THUMB_MAX_SIZE / h, 1);
						const tw = Math.round(w * scale) || 1;
						const th = Math.round(h * scale) || 1;
						const canvas = document.createElement('canvas');
						canvas.width = tw;
						canvas.height = th;
						const ctx = canvas.getContext('2d');
						if (!ctx) {
							resolve(
								buildItem({
									id,
									file,
									preview,
									thumbnail: preview,
									width: w,
									height: h,
								}),
							);
							return;
						}
						ctx.drawImage(img, 0, 0, tw, th);
						canvas.toBlob(
							(blob) => {
								const thumbnail = blob ? URL.createObjectURL(blob) : preview;
								resolve(
									buildItem({
										id,
										file,
										preview,
										thumbnail,
										width: w,
										height: h,
									}),
								);
							},
							'image/jpeg',
							0.7,
						);
					};
					img.onerror = () => {
						resolve(
							buildItem({
								id,
								file,
								preview,
								thumbnail: preview,
								width: 0,
								height: 0,
							}),
						);
					};
					img.src = preview;
				}),
		),
	);
}

/** Revoke object URLs for a single item's preview and thumbnail. */
export function cleanupItemUrls<T extends { preview: string; thumbnail?: string }>(item: T): void {
	URL.revokeObjectURL(item.preview);
	if (item.thumbnail && item.thumbnail !== item.preview) {
		URL.revokeObjectURL(item.thumbnail);
	}
}

/** Revoke object URLs for all items. */
export function cleanupAllItemUrls<T extends { preview: string; thumbnail?: string }>(
	items: T[],
): void {
	items.forEach(cleanupItemUrls);
}
