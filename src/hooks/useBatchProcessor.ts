'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BatchItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BatchItem {
  id: string;
  status: BatchItemStatus;
  progress: number;
  stage: string;
  error?: string;
}

/**
 * Process function signature.
 * Receives the item, an AbortSignal for cancellation, and a progress callback.
 * Should return a partial update to merge into the item on success.
 */
export type ProcessFn<T extends BatchItem> = (
  item: T,
  signal: AbortSignal,
  onProgress: (stage: string, percent: number) => void,
) => Promise<Partial<T>>;

interface UseBatchProcessorOptions<T extends BatchItem> {
  /** The async function that processes a single item */
  processFn: ProcessFn<T>;
  /** Max concurrent items (defaults to min(hardwareConcurrency, 4)) */
  maxConcurrency?: number;
  /** Called when an item is removed (for cleanup like revoking URLs) */
  onRemove?: (item: T) => void;
  /** Called when all items are cleared */
  onClear?: (items: T[]) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBatchProcessor<T extends BatchItem>({
  processFn,
  maxConcurrency = Math.min(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4, 4),
  onRemove,
  onClear,
}: UseBatchProcessorOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for stable access in callbacks
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const batchAbortRef = useRef<AbortController | null>(null);

  // ── Add / Remove ────────────────────────────────────────────────────────

  const addItems = useCallback((newItems: T[]) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    const ctrl = abortControllers.current.get(id);
    if (ctrl) {
      ctrl.abort();
      abortControllers.current.delete(id);
    }
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item && onRemove) onRemove(item);
      return prev.filter(i => i.id !== id);
    });
  }, [onRemove]);

  const clearAll = useCallback(() => {
    abortControllers.current.forEach(ctrl => ctrl.abort());
    abortControllers.current.clear();
    batchAbortRef.current?.abort();
    batchAbortRef.current = null;
    if (onClear) onClear(itemsRef.current);
    setItems([]);
    setIsProcessing(false);
  }, [onClear]);

  // ── Process ─────────────────────────────────────────────────────────────

  const processOne = useCallback(async (id: string) => {
    const item = itemsRef.current.find(i => i.id === id);
    if (!item) return;

    const controller = new AbortController();
    abortControllers.current.set(id, controller);

    // Link batch abort to this item
    if (batchAbortRef.current) {
      const batchSignal = batchAbortRef.current.signal;
      if (batchSignal.aborted) {
        controller.abort();
      } else {
        batchSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, status: 'processing' as const, stage: 'Starting', progress: 0, error: undefined }
        : i
    ));

    try {
      if (controller.signal.aborted) {
        throw new DOMException('Cancelled', 'AbortError');
      }

      const updates = await processFn(
        // Read fresh item state
        { ...(itemsRef.current.find(i => i.id === id) || item) },
        controller.signal,
        (stage, percent) => {
          if (controller.signal.aborted) return;
          setItems(prev => prev.map(i =>
            i.id === id ? { ...i, stage, progress: percent } : i
          ));
        },
      );

      if (controller.signal.aborted) {
        throw new DOMException('Cancelled', 'AbortError');
      }

      setItems(prev => prev.map(i =>
        i.id === id
          ? { ...i, ...updates, status: 'done' as const, stage: 'Done', progress: 100 }
          : i
      ));
    } catch (err) {
      const isAbort =
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === 'AbortError');

      setItems(prev => prev.map(i =>
        i.id === id
          ? {
              ...i,
              status: isAbort ? ('pending' as const) : ('error' as const),
              stage: isAbort ? '' : 'Failed',
              progress: 0,
              error: isAbort ? undefined : String(err),
            }
          : i
      ));
    } finally {
      abortControllers.current.delete(id);
    }
  }, [processFn]);

  const processAll = useCallback(async () => {
    setIsProcessing(true);
    batchAbortRef.current = new AbortController();

    const pending = itemsRef.current.filter(i =>
      i.status === 'pending' || i.status === 'error'
    );

    for (let i = 0; i < pending.length; i += maxConcurrency) {
      if (batchAbortRef.current.signal.aborted) break;
      const batch = pending.slice(i, i + maxConcurrency);
      await Promise.all(batch.map(item => {
        if (batchAbortRef.current?.signal.aborted) return Promise.resolve();
        return processOne(item.id);
      }));
    }

    batchAbortRef.current = null;
    setIsProcessing(false);
  }, [processOne, maxConcurrency]);

  // ── Retry ───────────────────────────────────────────────────────────────

  const retryOne = useCallback(async (id: string) => {
    // Reset to pending, then process
    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, status: 'pending' as const, progress: 0, stage: '', error: undefined }
        : i
    ));
    // Small delay so React state flushes
    await new Promise(r => setTimeout(r, 0));
    await processOne(id);
  }, [processOne]);

  const retryAll = useCallback(async () => {
    const retryable = itemsRef.current.filter(i =>
      i.status === 'error' || i.status === 'done'
    );
    if (retryable.length === 0) return;

    // Reset all retryable to pending
    const retryIds = new Set(retryable.map(i => i.id));
    setItems(prev => prev.map(i =>
      retryIds.has(i.id)
        ? { ...i, status: 'pending' as const, progress: 0, stage: '', error: undefined }
        : i
    ));

    setIsProcessing(true);
    batchAbortRef.current = new AbortController();

    // Re-read items after state update
    await new Promise(r => setTimeout(r, 0));
    const toRetry = itemsRef.current.filter(i => retryIds.has(i.id));

    for (let i = 0; i < toRetry.length; i += maxConcurrency) {
      if (batchAbortRef.current.signal.aborted) break;
      const batch = toRetry.slice(i, i + maxConcurrency);
      await Promise.all(batch.map(item => {
        if (batchAbortRef.current?.signal.aborted) return Promise.resolve();
        return processOne(item.id);
      }));
    }

    batchAbortRef.current = null;
    setIsProcessing(false);
  }, [processOne, maxConcurrency]);

  // ── Cancel ──────────────────────────────────────────────────────────────

  const cancelOne = useCallback((id: string) => {
    const ctrl = abortControllers.current.get(id);
    if (ctrl) ctrl.abort();
  }, []);

  const cancelAll = useCallback(() => {
    batchAbortRef.current?.abort();
    abortControllers.current.forEach(ctrl => ctrl.abort());
    setIsProcessing(false);
  }, []);

  // ── Derived counts ─────────────────────────────────────────────────────

  const processingCount = useMemo(() =>
    items.filter(i => i.status === 'processing').length, [items]);

  const pendingCount = useMemo(() =>
    items.filter(i => i.status === 'pending').length, [items]);

  const doneCount = useMemo(() =>
    items.filter(i => i.status === 'done').length, [items]);

  const errorCount = useMemo(() =>
    items.filter(i => i.status === 'error').length, [items]);

  const retryableCount = useMemo(() =>
    items.filter(i => i.status === 'done' || i.status === 'error').length, [items]);

  return {
    items,
    setItems,
    addItems,
    removeItem,
    clearAll,
    processOne,
    processAll,
    retryOne,
    retryAll,
    cancelOne,
    cancelAll,
    isProcessing,
    processingCount,
    pendingCount,
    doneCount,
    errorCount,
    retryableCount,
  };
}
