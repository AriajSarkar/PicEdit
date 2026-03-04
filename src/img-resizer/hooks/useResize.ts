'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { ResizerConfig, ResizeItem } from '@/img-resizer/types';
import { DEFAULT_RESIZER_CONFIG } from '@/img-resizer/types';
import { calculateOutputDimensions } from '@/img-resizer/lib/resizeUtils';
import {
	initResizeWorkers,
	resizeImageInWorker,
	terminateResizeWorkers,
} from '@/img-resizer/lib/resizeWorkerBridge';
import { formatBytes } from '@/lib/imageUtils';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { createThumbnailItems, cleanupItemUrls, cleanupAllItemUrls } from '@/lib/thumbnailUtils';
import {
	downloadOne as downloadOneItem,
	downloadAll as downloadAllItems,
} from '@/lib/downloadUtils';

// ── Return type ──────────────────────────────────────────────────────────────

/** Per-image dimension overrides (from visual resizer adjustments) */
export type PerImageDims = Map<
	string,
	{ width: number; height: number; cropX?: number; cropY?: number }
>;

export interface UseResizeReturn {
	items: ResizeItem[];
	config: ResizerConfig;
	setConfig: (config: ResizerConfig) => void;
	addFiles: (files: File[]) => void;
	removeItem: (id: string) => void;
	clearAll: () => void;
	resizeAll: () => Promise<void>;
	resizeOne: (id: string) => Promise<void>;
	retryOne: (id: string) => Promise<void>;
	retryAll: () => Promise<void>;
	cancelOne: (id: string) => void;
	cancelAll: () => void;
	downloadOne: (id: string) => void;
	downloadAll: () => Promise<void>;
	isProcessing: boolean;
	processingIds: string[];
	stats: {
		totalOriginal: number;
		totalResized: number;
		doneCount: number;
		formattedOriginal: string;
		formattedResized: string;
	};
	getOutputDimensions: (item: ResizeItem) => { width: number; height: number };
	/** Per-image dimension overrides — set by visual resizer, used at resize/download time */
	perImageDims: PerImageDims;
	setPerImageDims: (
		id: string,
		width: number,
		height: number,
		cropX?: number,
		cropY?: number,
	) => void;
	clearPerImageDims: (id: string) => void;
	clearAllPerImageDims: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useResize(): UseResizeReturn {
	const [config, setConfig] = useState<ResizerConfig>(DEFAULT_RESIZER_CONFIG);
	const idCounter = useRef(0);

	// ── Init resize worker pool on mount, cleanup on unmount ──────────
	useEffect(() => {
		initResizeWorkers();
		return () => terminateResizeWorkers();
	}, []);

	/** Per-image dimension overrides from visual resizer adjustments */
	const [perImageDims, setPerImageDimsState] = useState<PerImageDims>(() => new Map());
	const perImageDimsRef = useRef(perImageDims);
	useEffect(() => {
		perImageDimsRef.current = perImageDims;
	}, [perImageDims]);

	const setPerImageDims = useCallback(
		(id: string, width: number, height: number, cropX?: number, cropY?: number) => {
			setPerImageDimsState((prev) => {
				const next = new Map(prev);
				next.set(id, { width, height, cropX, cropY });
				return next;
			});
		},
		[],
	);

	const clearPerImageDims = useCallback((id: string) => {
		setPerImageDimsState((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
	}, []);

	const clearAllPerImageDims = useCallback(() => {
		setPerImageDimsState((prev) => (prev.size === 0 ? prev : new Map()));
	}, []);

	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// ── Process function ──────────────────────────────────────────────────
	const processFn = useCallback(
		async (
			item: ResizeItem,
			signal: AbortSignal,
			onProgress: (stage: string, percent: number) => void,
		): Promise<Partial<ResizeItem>> => {
			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

			// Build effective config: apply per-image dimension overrides if available
			let effectiveConfig = configRef.current;
			const dims = perImageDimsRef.current.get(item.id);
			let crop: { x: number; y: number; w: number; h: number } | undefined;
			if (dims) {
				// Visual resizer already handles aspect ratio during drag —
				// these ARE the exact desired output dims. Override lockAspectRatio
				// so calculateOutputDimensions doesn't apply contain-fit AGAIN.
				effectiveConfig = {
					...effectiveConfig,
					method: 'dimensions' as const,
					width: dims.width,
					height: dims.height,
					lockAspectRatio: false,
				};
				// If crop coordinates are set, build crop region in original-image pixels
				if (dims.cropX != null && dims.cropY != null) {
					const clampedW = Math.max(
						1,
						Math.min(Math.round(dims.width), item.originalWidth),
					);
					const clampedH = Math.max(
						1,
						Math.min(Math.round(dims.height), item.originalHeight),
					);
					const maxX = Math.max(0, item.originalWidth - clampedW);
					const maxY = Math.max(0, item.originalHeight - clampedH);
					crop = {
						x: Math.max(0, Math.min(Math.round(dims.cropX), maxX)),
						y: Math.max(0, Math.min(Math.round(dims.cropY), maxY)),
						w: clampedW,
						h: clampedH,
					};
				}
			}

			const result = await resizeImageInWorker(
				item.file,
				effectiveConfig,
				(stage, percent) => {
					if (signal.aborted) return;
					onProgress(stage, percent);
				},
				crop,
			);

			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
			return { result };
		},
		[],
	);

	// ── Cleanup callbacks ─────────────────────────────────────────────────
	const handleRemove = useCallback((item: ResizeItem) => {
		cleanupItemUrls(item);
	}, []);

	const handleClear = useCallback((allItems: ResizeItem[]) => {
		cleanupAllItemUrls(allItems);
	}, []);

	// ── Batch processor ───────────────────────────────────────────────────
	const {
		items,
		processOne: resizeOne,
		processAll: resizeAll,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		removeItem,
		clearAll,
		addItems,
		isProcessing,
	} = useBatchProcessor<ResizeItem>({
		processFn,
		onRemove: handleRemove,
		onClear: handleClear,
	});

	const itemsRef = useRef(items);
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);

	// ── Add files ─────────────────────────────────────────────────────────
	const addFiles = useCallback(
		(files: File[]) => {
			createThumbnailItems(
				files,
				'rsz',
				idCounter,
				({ id, file, preview, thumbnail, width, height }) =>
					({
						id,
						file,
						preview,
						thumbnail,
						originalWidth: width,
						originalHeight: height,
						status: 'pending' as const,
						stage: '',
						progress: 0,
					}) as ResizeItem,
			).then((newItems) => {
				if (newItems.length > 0) addItems(newItems);
			});
		},
		[addItems],
	);

	// ── Downloads ─────────────────────────────────────────────────────────
	const downloadOne = useCallback((id: string) => {
		downloadOneItem(itemsRef.current, id, 'resized');
	}, []);

	const downloadAll = useCallback(async () => {
		await downloadAllItems(itemsRef.current, 'resized', 'PicEdit-resized', downloadOne);
	}, [downloadOne]);

	// ── Stats ─────────────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const done = items.filter((i) => i.status === 'done' && i.result);
		const totalOriginal = done.reduce((s, i) => s + i.result!.originalSize, 0);
		const totalResized = done.reduce((s, i) => s + i.result!.newSize, 0);
		return {
			totalOriginal,
			totalResized,
			doneCount: done.length,
			formattedOriginal: formatBytes(totalOriginal),
			formattedResized: formatBytes(totalResized),
		};
	}, [items]);

	const getOutputDimensions = useCallback(
		(item: ResizeItem) => {
			if (item.status === 'done' && item.result) {
				return { width: item.result.width, height: item.result.height };
			}
			if (item.originalWidth === 0) return { width: 0, height: 0 };
			// Check per-image overrides first — visual resizer dims are exact, no re-fitting
			const dims = perImageDimsRef.current.get(item.id);
			if (dims) {
				return calculateOutputDimensions(item.originalWidth, item.originalHeight, {
					...configRef.current,
					method: 'dimensions' as const,
					width: dims.width,
					height: dims.height,
					lockAspectRatio: false,
				});
			}
			return calculateOutputDimensions(
				item.originalWidth,
				item.originalHeight,
				configRef.current,
			);
		},
		[], // stable — reads config from ref
	);

	const processingIds = useMemo(
		() => items.filter((i) => i.status === 'processing').map((i) => i.id),
		[items],
	);

	return {
		items,
		config,
		setConfig,
		addFiles,
		removeItem,
		clearAll,
		resizeAll,
		resizeOne,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		downloadOne,
		downloadAll,
		isProcessing,
		processingIds,
		stats,
		getOutputDimensions,
		perImageDims,
		setPerImageDims,
		clearPerImageDims,
		clearAllPerImageDims,
	};
}
