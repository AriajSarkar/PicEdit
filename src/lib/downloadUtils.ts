// ═══════════════════════════════════════════════════════════════════
// PicEdit — Shared Download Utilities
//
// Common download helpers used by compressor and resizer hooks.
// ═══════════════════════════════════════════════════════════════════

import { createZip, downloadBlob } from '@/lib/zipUtil';

interface DownloadableItem {
	id: string;
	file: File;
	status: string;
	result?: {
		blob: Blob;
		format: string;
	};
}

/**
 * Download a single processed item.
 *
 * @param items - All items (searched by ID)
 * @param id - Item ID to download
 * @param suffix - Filename suffix (e.g. 'compressed', 'resized')
 */
export function downloadOne<T extends DownloadableItem>(
	items: T[],
	id: string,
	suffix: string,
): void {
	const item = items.find((i) => i.id === id);
	if (!item?.result) return;
	const ext = item.result.format === 'jpeg' ? 'jpg' : item.result.format;
	const name = item.file.name.replace(/\.[^.]+$/, '') + `-${suffix}.${ext}`;
	const url = URL.createObjectURL(item.result.blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Download all completed items — single file directly, or ZIP for multiple.
 *
 * @param items - All items
 * @param suffix - Filename suffix (e.g. 'compressed', 'resized')
 * @param zipPrefix - ZIP filename prefix (e.g. 'PicEdit', 'PicEdit-resized')
 * @param downloadOneFn - Function to download a single item by ID
 */
export async function downloadAll<T extends DownloadableItem>(
	items: T[],
	suffix: string,
	zipPrefix: string,
	downloadOneFn: (id: string) => void,
): Promise<void> {
	const done = items.filter((i) => i.status === 'done' && i.result);
	if (done.length === 0) return;

	if (done.length === 1) {
		downloadOneFn(done[0].id);
		return;
	}

	const entries = await Promise.all(
		done.map(async (item) => {
			const ext = item.result!.format === 'jpeg' ? 'jpg' : item.result!.format;
			const name = item.file.name.replace(/\.[^.]+$/, '') + `-${suffix}.${ext}`;
			const buf = await item.result!.blob.arrayBuffer();
			return { name, data: new Uint8Array(buf) };
		}),
	);

	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const zip = createZip(entries);
	downloadBlob(zip, `${zipPrefix}-${randomSuffix}.zip`);
}
