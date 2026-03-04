'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { TracerConfig, TracerItem } from '@/img-converter/types';
import { DEFAULT_TRACER_CONFIG } from '@/img-converter/types';
import {
	initTracerWorkers,
	traceImageInWorker,
	terminateTracerWorkers,
} from '@/img-converter/lib/conversionWorkerBridge';
import { formatBytes } from '@/lib/imageUtils';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { createThumbnailItems, cleanupItemUrls, cleanupAllItemUrls } from '@/lib/thumbnailUtils';
import { createZip, downloadBlob } from '@/lib/zipUtil';

// ── Return type ──────────────────────────────────────────────────────────────

export interface UseTracerReturn {
	items: TracerItem[];
	config: TracerConfig;
	setConfig: (config: TracerConfig) => void;
	addFiles: (files: File[]) => void;
	removeItem: (id: string) => void;
	clearAll: () => void;
	traceAll: () => Promise<void>;
	traceOne: (id: string) => Promise<void>;
	retryOne: (id: string) => Promise<void>;
	retryAll: () => Promise<void>;
	cancelOne: (id: string) => void;
	cancelAll: () => void;
	downloadOne: (id: string) => void;
	downloadAll: () => Promise<void>;
	isProcessing: boolean;
	stats: {
		totalOriginal: number;
		totalSvg: number;
		doneCount: number;
		formattedOriginal: string;
		formattedSvg: string;
	};
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTracer(): UseTracerReturn {
	const [config, setConfig] = useState<TracerConfig>(DEFAULT_TRACER_CONFIG);
	const idCounter = useRef(0);

	// ── Init worker pool on mount, cleanup on unmount ──────────
	useEffect(() => {
		initTracerWorkers();
		return () => terminateTracerWorkers();
	}, []);

	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// ── Process function ──────────────────────────────────────────────────
	const processFn = useCallback(
		async (
			item: TracerItem,
			signal: AbortSignal,
			onProgress: (stage: string, percent: number) => void,
		): Promise<Partial<TracerItem>> => {
			if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

			const result = await traceImageInWorker(
				item.file,
				configRef.current,
				(stage, percent) => {
					if (signal.aborted) return;
					onProgress(stage, percent);
				},
			);

			if (signal.aborted) {
				URL.revokeObjectURL(result.url);
				throw new DOMException('Cancelled', 'AbortError');
			}

			return { result };
		},
		[],
	);

	// ── Cleanup callbacks ─────────────────────────────────────────────────
	const handleRemove = useCallback((item: TracerItem) => {
		cleanupItemUrls(item);
		if (item.result?.url) URL.revokeObjectURL(item.result.url);
	}, []);

	const handleClear = useCallback((allItems: TracerItem[]) => {
		cleanupAllItemUrls(allItems);
		for (const item of allItems) {
			if (item.result?.url) URL.revokeObjectURL(item.result.url);
		}
	}, []);

	// ── Batch processor ───────────────────────────────────────────────────
	const {
		items,
		processOne: traceOne,
		processAll: traceAll,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		removeItem,
		clearAll,
		addItems,
		isProcessing,
	} = useBatchProcessor<TracerItem>({
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
				'svg',
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
					}) as TracerItem,
			).then((newItems) => {
				if (newItems.length > 0) addItems(newItems);
			});
		},
		[addItems],
	);

	// ── Downloads ─────────────────────────────────────────────────────────
	const downloadOne = useCallback((id: string) => {
		const item = itemsRef.current.find((i) => i.id === id);
		if (!item?.result) return;
		const name = item.file.name.replace(/\.[^.]+$/, '') + '-traced.svg';
		const url = URL.createObjectURL(item.result.blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	const downloadAll = useCallback(async () => {
		const done = itemsRef.current.filter((i) => i.status === 'done' && i.result);
		if (done.length === 0) return;

		if (done.length === 1) {
			downloadOne(done[0].id);
			return;
		}

		const entries = await Promise.all(
			done.map(async (item) => {
				const name = item.file.name.replace(/\.[^.]+$/, '') + '-traced.svg';
				const buf = await item.result!.blob.arrayBuffer();
				return { name, data: new Uint8Array(buf) };
			}),
		);

		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const zip = createZip(entries);
		downloadBlob(zip, `PicEdit-traced-${randomSuffix}.zip`);
	}, [downloadOne]);

	// ── Stats ─────────────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const done = items.filter((i) => i.status === 'done' && i.result);
		const totalOriginal = done.reduce((s, i) => s + i.result!.originalSize, 0);
		const totalSvg = done.reduce((s, i) => s + i.result!.svgSize, 0);
		return {
			totalOriginal,
			totalSvg,
			doneCount: done.length,
			formattedOriginal: formatBytes(totalOriginal),
			formattedSvg: formatBytes(totalSvg),
		};
	}, [items]);

	return {
		items,
		config,
		setConfig,
		addFiles,
		removeItem,
		clearAll,
		traceAll,
		traceOne,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		downloadOne,
		downloadAll,
		isProcessing,
		stats,
	};
}
