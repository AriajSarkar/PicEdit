'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { ResizerConfig, ResizeItem } from '@/img-resizer/types';
import { DEFAULT_RESIZER_CONFIG } from '@/img-resizer/types';
import { calculateOutputDimensions } from '@/img-resizer/lib/resizeUtils';
import { initResizeWorkers, resizeImageInWorker, terminateResizeWorkers } from '@/img-resizer/lib/resizeWorkerBridge';
import { formatBytes } from '@/lib/imageUtils';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { createZip, downloadBlob } from '@/lib/zipUtil';

// ── Return type ──────────────────────────────────────────────────────────────

/** Per-image dimension overrides (from visual resizer adjustments) */
export type PerImageDims = Map<string, { width: number; height: number; cropX?: number; cropY?: number }>;

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
  setPerImageDims: (id: string, width: number, height: number, cropX?: number, cropY?: number) => void;
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

  const setPerImageDims = useCallback((id: string, width: number, height: number, cropX?: number, cropY?: number) => {
    setPerImageDimsState((prev) => {
      const next = new Map(prev);
      next.set(id, { width, height, cropX, cropY });
      return next;
    });
  }, []);

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
          crop = {
            x: Math.max(0, Math.round(dims.cropX)),
            y: Math.max(0, Math.round(dims.cropY)),
            w: dims.width,
            h: dims.height,
          };
          // Clamp crop to image bounds
          if (crop.x + crop.w > item.originalWidth) crop.x = Math.max(0, item.originalWidth - crop.w);
          if (crop.y + crop.h > item.originalHeight) crop.y = Math.max(0, item.originalHeight - crop.h);
          crop.w = Math.min(crop.w, item.originalWidth - crop.x);
          crop.h = Math.min(crop.h, item.originalHeight - crop.y);
        }
      }

      const result = await resizeImageInWorker(item.file, effectiveConfig, (stage, percent) => {
        if (signal.aborted) return;
        onProgress(stage, percent);
      }, crop);

      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      return { result };
    },
    [],
  );

  // ── Cleanup callbacks ─────────────────────────────────────────────────
  const handleRemove = useCallback((item: ResizeItem) => {
    URL.revokeObjectURL(item.preview);
    if (item.thumbnail && item.thumbnail !== item.preview) {
      URL.revokeObjectURL(item.thumbnail);
    }
  }, []);

  const handleClear = useCallback((allItems: ResizeItem[]) => {
    allItems.forEach((i) => {
      URL.revokeObjectURL(i.preview);
      if (i.thumbnail && i.thumbnail !== i.preview) {
        URL.revokeObjectURL(i.thumbnail);
      }
    });
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
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      // Load dimensions for each file
      Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<ResizeItem>((resolve) => {
              const id = `rsz-${++idCounter.current}-${Date.now()}`;
              const preview = URL.createObjectURL(file);

              // Get original dimensions
              const img = new Image();
              img.onload = () => {
                const { naturalWidth: w, naturalHeight: h } = img;
                // Generate tiny thumbnail while image is still decoded — zero extra loads
                const THUMB_MAX = 88; // 2× display size for retina
                const scale = Math.min(THUMB_MAX / w, THUMB_MAX / h, 1);
                const tw = Math.round(w * scale) || 1;
                const th = Math.round(h * scale) || 1;
                const canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                canvas.getContext('2d')!.drawImage(img, 0, 0, tw, th);
                canvas.toBlob(
                  (blob) => {
                    const thumbnail = blob ? URL.createObjectURL(blob) : preview;
                    resolve({
                      id,
                      file,
                      preview,
                      thumbnail,
                      originalWidth: w,
                      originalHeight: h,
                      status: 'pending' as const,
                      stage: '',
                      progress: 0,
                    });
                  },
                  'image/jpeg',
                  0.7,
                );
              };
              img.onerror = () => {
                resolve({
                  id,
                  file,
                  preview,
                  thumbnail: preview,
                  originalWidth: 0,
                  originalHeight: 0,
                  status: 'pending' as const,
                  stage: '',
                  progress: 0,
                });
              };
              img.src = preview;
            }),
        ),
      ).then((newItems) => {
        addItems(newItems);
      });
    },
    [addItems],
  );

  // ── Downloads ─────────────────────────────────────────────────────────
  const downloadOne = useCallback((id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item?.result) return;
    const ext = item.result.format === 'jpeg' ? 'jpg' : item.result.format;
    const name = item.file.name.replace(/\.[^.]+$/, '') + `-resized.${ext}`;
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
        const ext = item.result!.format === 'jpeg' ? 'jpg' : item.result!.format;
        const name = item.file.name.replace(/\.[^.]+$/, '') + `-resized.${ext}`;
        const buf = await item.result!.blob.arrayBuffer();
        return { name, data: new Uint8Array(buf) };
      }),
    );

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const zip = createZip(entries);
    downloadBlob(zip, `PicEdit-resized-${randomSuffix}.zip`);
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
        return calculateOutputDimensions(
          item.originalWidth,
          item.originalHeight,
          { ...configRef.current, method: 'dimensions' as const, width: dims.width, height: dims.height, lockAspectRatio: false },
        );
      }
      return calculateOutputDimensions(item.originalWidth, item.originalHeight, configRef.current);
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
