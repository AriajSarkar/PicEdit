'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { ConverterConfig, ConvertedResult } from '@/img-converter/types';
import { DEFAULT_CONVERTER_CONFIG } from '@/img-converter/types';
import {
	initConversionWorkers,
	convertImageInWorker,
	terminateConversionWorkers,
	buildMultiPagePdfInWorker,
	decodeTiffPreview,
	terminatePreviewWorkers,
} from '@/img-converter/lib/conversionWorkerBridge';
import { formatBytes } from '@/lib/imageUtils';
import { useBatchProcessor, type BatchItem } from '@/hooks/useBatchProcessor';
import { createThumbnailItems, cleanupItemUrls, cleanupAllItemUrls } from '@/lib/thumbnailUtils';
import {
	downloadOne as downloadOneItem,
	downloadAll as downloadAllItems,
} from '@/lib/downloadUtils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConversionItem extends BatchItem {
	file: File;
	preview: string;
	/** Tiny ~88px JPEG thumbnail for list rendering */
	thumbnail: string;
	result?: ConvertedResult;
}

// ── Return type ──────────────────────────────────────────────────────────────

export interface UseConversionReturn {
	items: ConversionItem[];
	config: ConverterConfig;
	setConfig: (config: ConverterConfig) => void;
	addFiles: (files: File[]) => void;
	removeItem: (id: string) => void;
	clearAll: () => void;
	convertAll: () => Promise<void>;
	convertOne: (id: string) => Promise<void>;
	retryOne: (id: string) => Promise<void>;
	retryAll: () => Promise<void>;
	cancelOne: (id: string) => void;
	cancelAll: () => void;
	downloadOne: (id: string) => void;
	downloadAll: () => Promise<void>;
	downloadAsPdf: (selectedIds?: string[]) => Promise<void>;
	isProcessing: boolean;
	isBuildingPdf: boolean;
	pdfProgress: { stage: string; percent: number } | null;
	processingIds: string[];
	stats: {
		totalOriginal: number;
		totalConverted: number;
		totalDiff: number;
		diffPercent: number;
		formattedOriginal: string;
		formattedConverted: string;
		formattedDiff: string;
		increased: boolean;
	};
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useConversion(): UseConversionReturn {
	const [config, setConfig] = useState<ConverterConfig>(DEFAULT_CONVERTER_CONFIG);
	const [isBuildingPdf, setIsBuildingPdf] = useState(false);
	const [pdfProgress, setPdfProgress] = useState<{ stage: string; percent: number } | null>(null);
	const idCounter = useRef(0);

	// ── Init worker pool on mount, cleanup on unmount ─────────────────
	useEffect(() => {
		initConversionWorkers();
		return () => {
			terminateConversionWorkers();
			terminatePreviewWorkers();
		};
	}, []);

	// Always read latest config inside processFn without changing its reference
	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// ── Process function fed to the global batch processor ────────────
	const processFn = useCallback(
		async (
			item: ConversionItem,
			signal: AbortSignal,
			onProgress: (stage: string, percent: number) => void,
		): Promise<Partial<ConversionItem>> => {
			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

			const result = await convertImageInWorker(
				item.file,
				configRef.current,
				(stage, percent) => {
					if (signal.aborted) return;
					onProgress(stage, percent);
				},
			);

			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
			return { result };
		},
		[],
	);

	// ── URL cleanup callbacks ────────────────────────────────────────────
	const handleRemove = useCallback((item: ConversionItem) => {
		cleanupItemUrls(item);
	}, []);

	const handleClear = useCallback((allItems: ConversionItem[]) => {
		cleanupAllItemUrls(allItems);
	}, []);

	// ── Delegate to global batch processor ───────────────────────────────
	const {
		items,
		processOne: convertOne,
		processAll: convertAll,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		removeItem,
		clearAll,
		addItems,
		setItems,
		isProcessing,
	} = useBatchProcessor<ConversionItem>({
		processFn,
		onRemove: handleRemove,
		onClear: handleClear,
	});

	// Stable ref to items for download helpers
	const itemsRef = useRef(items);
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);

	// ── Add files (wraps addItems with File → ConversionItem mapping) ─
	const addFiles = useCallback(
		(files: File[]) => {
			createThumbnailItems(
				files,
				'conv',
				idCounter,
				({ id, file, preview, thumbnail }) =>
					({
						id,
						file,
						preview,
						thumbnail,
						status: 'pending' as const,
						stage: '',
						progress: 0,
					}) as ConversionItem,
			).then((newItems) => {
				if (newItems.length === 0) return;
				addItems(newItems);

				// Decode TIFF previews — browsers can't natively display TIFF
				const tiffItems = newItems.filter((item) => {
					const name = item.file.name.toLowerCase();
					const type = item.file.type.toLowerCase();
					return (
						type === 'image/tiff' ||
						type === 'image/x-tiff' ||
						name.endsWith('.tiff') ||
						name.endsWith('.tif')
					);
				});

				if (tiffItems.length > 0) {
					for (const item of tiffItems) {
						decodeTiffPreview(item.file).then((decoded) => {
							if (!decoded) return;
							// Revoke the broken object URLs
							URL.revokeObjectURL(item.preview);
							if (item.thumbnail !== item.preview) {
								URL.revokeObjectURL(item.thumbnail);
							}
							// Update the item with decoded preview
							setItems((prev) =>
								prev.map((i) =>
									i.id === item.id
										? {
												...i,
												preview: decoded.previewUrl,
												thumbnail: decoded.thumbnailUrl,
											}
										: i,
								),
							);
						});
					}
				}
			});
		},
		[addItems, setItems],
	);

	// ── Downloads ────────────────────────────────────────────────────────
	const downloadOne = useCallback((id: string) => {
		downloadOneItem(itemsRef.current, id, 'converted');
	}, []);

	const downloadAll = useCallback(async () => {
		await downloadAllItems(itemsRef.current, 'converted', 'PicEdit', downloadOne);
	}, [downloadOne]);

	// ── Multi-page PDF download ─────────────────────────────────────────
	const downloadAsPdf = useCallback(
		async (selectedIds?: string[]) => {
			const allItems = itemsRef.current;
			// Use selected IDs, or fall back to all items with uploaded files
			const targetItems = selectedIds
				? allItems.filter((i) => selectedIds.includes(i.id))
				: allItems;

			if (targetItems.length === 0) return;

			setIsBuildingPdf(true);
			setPdfProgress({ stage: 'Starting...', percent: 0 });

			try {
				const files = targetItems.map((i) => i.file);
				const result = await buildMultiPagePdfInWorker(
					files,
					configRef.current,
					(stage, percent) => setPdfProgress({ stage, percent }),
				);

				// Download the PDF
				const url = URL.createObjectURL(result.blob);
				const a = document.createElement('a');
				const randomSuffix = Math.random().toString(36).substring(2, 8);
				a.href = url;
				a.download = `PicEdit-${result.pageCount}pages-${randomSuffix}.pdf`;
				a.click();
				URL.revokeObjectURL(url);
			} catch (err) {
				console.error('[converter] Multi-page PDF failed:', err);
			} finally {
				setIsBuildingPdf(false);
				setPdfProgress(null);
			}
		},
		[],
	);

	// ── Stats ────────────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const done = items.filter((i) => i.status === 'done' && i.result);
		const totalOriginal = done.reduce((s, i) => s + i.result!.originalSize, 0);
		const totalConverted = done.reduce((s, i) => s + i.result!.convertedSize, 0);
		const totalDiff = totalOriginal - totalConverted;
		return {
			totalOriginal,
			totalConverted,
			totalDiff,
			diffPercent: totalOriginal > 0 ? (totalDiff / totalOriginal) * 100 : 0,
			formattedOriginal: formatBytes(totalOriginal),
			formattedConverted: formatBytes(totalConverted),
			formattedDiff: formatBytes(Math.abs(totalDiff)),
			increased: totalDiff < 0,
		};
	}, [items]);

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
		convertAll,
		convertOne,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		downloadOne,
		downloadAll,
		downloadAsPdf,
		isProcessing,
		isBuildingPdf,
		pdfProgress,
		processingIds,
		stats,
	};
}
