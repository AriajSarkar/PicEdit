'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { CompressorConfig } from '@/img-compressor/types';
import { DEFAULT_COMPRESSOR_CONFIG } from '@/img-compressor/types';
import type { CompressedResult } from '@/img-compressor/lib/compressionUtils';
import {
	initCompressionWorkers,
	compressImageInWorker,
	terminateCompressionWorkers,
} from '@/img-compressor/lib/compressionWorkerBridge';
import { formatBytes } from '@/lib/imageUtils';
import { useBatchProcessor, type BatchItem } from '@/hooks/useBatchProcessor';
import { createThumbnailItems, cleanupItemUrls, cleanupAllItemUrls } from '@/lib/thumbnailUtils';
import {
	downloadOne as downloadOneItem,
	downloadAll as downloadAllItems,
} from '@/lib/downloadUtils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompressionItem extends BatchItem {
	file: File;
	preview: string;
	/** Tiny ~88px JPEG thumbnail for list rendering (saves GPU memory vs full-res preview) */
	thumbnail: string;
	result?: CompressedResult;
}

// ── Estimate helper ──────────────────────────────────────────────────────────

function estimateCompressedSize(originalSize: number, config: CompressorConfig): number {
	const FORMAT_RATIO: Record<string, number> = { jpeg: 0.3, webp: 0.25, png: 0.85 };
	const baseRatio = FORMAT_RATIO[config.format] ?? 0.5;

	if (config.format === 'png') {
		const quantRatio = config.maxColors > 0 ? Math.max(0.3, config.maxColors / 256) : 1;
		return Math.round(originalSize * baseRatio * quantRatio);
	}

	const qualityFactor = 0.15 + config.quality * 0.85;
	let estimated = originalSize * baseRatio * qualityFactor;

	if (config.enableWasmOptimize) {
		estimated *= 1 - config.optimizeStrength * 0.15;
	}
	if (config.maxDimension > 0) {
		const assumedDim = Math.sqrt(originalSize / 3);
		if (assumedDim > config.maxDimension) {
			const scale = config.maxDimension / assumedDim;
			estimated *= scale * scale;
		}
	}
	if (config.targetSize > 0) {
		estimated = Math.min(estimated, config.targetSize);
	}
	return Math.max(Math.round(estimated), 1024);
}

// ── Return type ──────────────────────────────────────────────────────────────

export interface UseCompressionReturn {
	items: CompressionItem[];
	config: CompressorConfig;
	setConfig: (config: CompressorConfig) => void;
	addFiles: (files: File[]) => void;
	removeItem: (id: string) => void;
	clearAll: () => void;
	compressAll: () => Promise<void>;
	compressOne: (id: string) => Promise<void>;
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
		totalCompressed: number;
		totalSaved: number;
		savedPercent: number;
		formattedOriginal: string;
		formattedCompressed: string;
		formattedSaved: string;
		increased: boolean;
	};
	getEstimate: (item: CompressionItem) => number;
	estimatedStats: {
		totalEstimated: number;
		estimatedSavedPercent: number;
		formattedEstimated: string;
	};
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCompression(): UseCompressionReturn {
	const [config, setConfig] = useState<CompressorConfig>(DEFAULT_COMPRESSOR_CONFIG);
	const idCounter = useRef(0);

	// ── Init compression worker pool on mount, cleanup on unmount ─────
	useEffect(() => {
		initCompressionWorkers();
		return () => terminateCompressionWorkers();
	}, []);

	// Always read latest config inside processFn without changing its reference
	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// ── Process function fed to the global batch processor ────────────────
	const processFn = useCallback(
		async (
			item: CompressionItem,
			signal: AbortSignal,
			onProgress: (stage: string, percent: number) => void,
		): Promise<Partial<CompressionItem>> => {
			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

			const result = await compressImageInWorker(
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
	const handleRemove = useCallback((item: CompressionItem) => {
		cleanupItemUrls(item);
	}, []);

	const handleClear = useCallback((allItems: CompressionItem[]) => {
		cleanupAllItemUrls(allItems);
	}, []);

	// ── Delegate to global batch processor ───────────────────────────────
	const {
		items,
		processOne: compressOne,
		processAll: compressAll,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		removeItem,
		clearAll,
		addItems,
		isProcessing,
	} = useBatchProcessor<CompressionItem>({
		processFn,
		onRemove: handleRemove,
		onClear: handleClear,
	});

	// Stable ref to items for download helpers
	const itemsRef = useRef(items);
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);

	// ── Add files (wraps addItems with File → CompressionItem mapping) ───
	// Generates tiny 88px JPEG thumbnails at add-time so the list never renders
	// full-resolution multi-MB images in 48×48 slots (major GPU/scroll perf win).
	const addFiles = useCallback(
		(files: File[]) => {
			createThumbnailItems(
				files,
				'img',
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
					}) as CompressionItem,
			).then((newItems) => {
				if (newItems.length > 0) addItems(newItems);
			});
		},
		[addItems],
	);

	// ── Downloads ────────────────────────────────────────────────────────
	const downloadOne = useCallback((id: string) => {
		downloadOneItem(itemsRef.current, id, 'compressed');
	}, []);

	const downloadAll = useCallback(async () => {
		await downloadAllItems(itemsRef.current, 'compressed', 'PicEdit', downloadOne);
	}, [downloadOne]);

	// ── Stats & estimates ────────────────────────────────────────────────
	const stats = useMemo(() => {
		const done = items.filter((i) => i.status === 'done' && i.result);
		const totalOriginal = done.reduce((s, i) => s + i.result!.originalSize, 0);
		const totalCompressed = done.reduce((s, i) => s + i.result!.compressedSize, 0);
		const totalSaved = totalOriginal - totalCompressed;
		return {
			totalOriginal,
			totalCompressed,
			totalSaved,
			savedPercent: totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0,
			formattedOriginal: formatBytes(totalOriginal),
			formattedCompressed: formatBytes(totalCompressed),
			formattedSaved: formatBytes(Math.abs(totalSaved)),
			increased: totalSaved < 0,
		};
	}, [items]);

	const getEstimate = useCallback(
		(item: CompressionItem) => {
			if (item.status === 'done' && item.result) return item.result.compressedSize;
			return estimateCompressedSize(item.file.size, config);
		},
		[config],
	);

	const estimatedStats = useMemo(() => {
		const totalOriginal = items.reduce((s, i) => s + i.file.size, 0);
		const totalEstimated = items.reduce((s, i) => {
			if (i.status === 'done' && i.result) return s + i.result.compressedSize;
			return s + estimateCompressedSize(i.file.size, config);
		}, 0);
		const saved = totalOriginal - totalEstimated;
		return {
			totalEstimated,
			estimatedSavedPercent: totalOriginal > 0 ? (saved / totalOriginal) * 100 : 0,
			formattedEstimated: formatBytes(totalEstimated),
		};
	}, [items, config]);

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
		compressAll,
		compressOne,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		downloadOne,
		downloadAll,
		isProcessing,
		processingIds,
		stats,
		getEstimate,
		estimatedStats,
	};
}
