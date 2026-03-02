/**
 * Compression Worker Bridge — message-ID based concurrency-safe interface.
 *
 * Spawns a pool of Web Workers (1 per hardware core, max 4) so multiple
 * images compress in parallel without blocking the main thread.
 *
 * Each compress call gets a numeric ID; progress and results are routed back
 * to the correct caller via a pending-operations Map.
 *
 * Architecture mirrors resizeWorkerBridge.ts for consistency.
 */

import type { CompressorConfig } from '@/imgcompressor/types';
import type { CompressedResult } from '@/imgcompressor/lib/compressionUtils';

// ── Types ───────────────────────────────────────────────────────────────────

interface PendingOp {
  resolve: (result: CompressedResult) => void;
  reject: (err: Error) => void;
  onProgress?: (stage: string, percent: number) => void;
  slot: WorkerSlot;
}

interface WorkerSlot {
  worker: Worker;
  busy: number; // count of in-flight operations
}

// ── State ───────────────────────────────────────────────────────────────────

let pool: WorkerSlot[] = [];
let initPromise: Promise<boolean> | null = null;
let nextId = 0;
const pending = new Map<number, PendingOp>();

function getPoolSize(): number {
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
  return Math.min(Math.max(cores, 2), 4); // 2–4 workers
}

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/** Reject all pending ops (used on catastrophic failure). */
function rejectAllPending(reason: string) {
  for (const [id, op] of pending) {
    op.reject(new Error(reason));
    pending.delete(id);
  }
}

function rejectPendingForSlot(slot: WorkerSlot, reason: string) {
  for (const [id, op] of pending) {
    if (op.slot === slot) {
      op.reject(new Error(reason));
      pending.delete(id);
    }
  }
}

// ── Message handler factory ─────────────────────────────────────────────────

function createHandler(slot: WorkerSlot) {
  return (e: MessageEvent) => {
    const data = e.data;

    // Init responses (no ID)
    if (data.type === 'ready') return; // handled by initWorker
    if (data.type === 'init-error') return; // handled by initWorker

    // Progress — route to caller
    if (data.type === 'progress' && data.id !== undefined) {
      const op = pending.get(data.id);
      op?.onProgress?.(data.stage, data.percent);
      return;
    }

    // Result — resolve and free slot
    if (data.type === 'result' && data.id !== undefined) {
      const op = pending.get(data.id);
      if (op) {
        pending.delete(data.id);
        slot.busy--;
        const r = data.result;
        // Reconstruct Blob from transferred ArrayBuffer
        const blob = new Blob([r.arrayBuf], { type: `image/${r.format}` });
        op.resolve({
          blob,
          dataUrl: r.dataUrl,
          width: r.width,
          height: r.height,
          originalSize: r.originalSize,
          compressedSize: r.compressedSize,
          compressionRatio: r.compressionRatio,
          format: r.format,
          ssim: r.ssim,
        });
      }
      return;
    }

    // Error — reject and free slot
    if (data.type === 'error' && data.id !== undefined) {
      const op = pending.get(data.id);
      if (op) {
        pending.delete(data.id);
        slot.busy--;
        op.reject(new Error(data.message || 'Worker compression failed'));
      }
      return;
    }
  };
}

// ── Init ────────────────────────────────────────────────────────────────────

function initWorker(): Promise<WorkerSlot> {
  return new Promise<WorkerSlot>((resolve, reject) => {
    try {
      const w = new Worker(new URL('./compressionWorker.ts', import.meta.url), { type: 'module' });
      const slot: WorkerSlot = { worker: w, busy: 0 };

      const basePath = getBasePath();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const wasmJsUrl = `${origin}${basePath}/wasm/compressor/compressor.js`;
      const wasmBgUrl = `${origin}${basePath}/wasm/compressor/compressor_bg.wasm`;

      let settled = false;
      const cleanupInitListeners = () => {
        w.removeEventListener('message', onInit);
        clearTimeout(initTimeout);
      };

      const onInit = (e: MessageEvent) => {
        if (e.data.type !== 'ready' || settled) return;
        settled = true;
        cleanupInitListeners();
        w.onmessage = createHandler(slot);
        w.onerror = () => {
          w.terminate();
          const idx = pool.indexOf(slot);
          if (idx >= 0) pool.splice(idx, 1);
          rejectPendingForSlot(slot, 'Worker crashed');
        };
        resolve(slot);
      };

      const initTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanupInitListeners();
        w.terminate();
        rejectPendingForSlot(slot, 'Worker init timed out');
        reject(new Error('Worker init timed out'));
      }, 10000);

      w.onerror = () => {
        if (settled) return;
        settled = true;
        cleanupInitListeners();
        w.terminate();
        rejectPendingForSlot(slot, 'Worker init failed');
        reject(new Error('Worker init failed'));
      };

      w.addEventListener('message', onInit);
      w.postMessage({ type: 'init', wasmJsUrl, wasmBgUrl });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Initialize the compression worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export async function initCompressionWorkers(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const size = getPoolSize();
      const slots = await Promise.all(Array.from({ length: size }, () => initWorker()));
      pool = slots;
      console.log(`[compressor] Worker pool ready — ${pool.length} workers`);
      return true;
    } catch (err) {
      console.warn('[compressor] Worker pool init failed:', err);
      return false;
    }
  })();

  return initPromise;
}

// ── Pick least-busy worker ──────────────────────────────────────────────────

function pickWorker(): WorkerSlot | null {
  if (pool.length === 0) return null;
  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (pool[i].busy < best.busy) best = pool[i];
  }
  return best;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Compress a single image file in a background worker.
 * Awaits worker pool init if needed, falls back to main-thread compress on failure.
 */
export async function compressImageInWorker(
  file: File,
  config: CompressorConfig,
  onProgress?: (stage: string, percent: number) => void,
): Promise<CompressedResult> {
  // Ensure workers are initialized before trying to use them
  if (initPromise) {
    await initPromise;
  } else {
    await initCompressionWorkers();
  }

  const slot = pickWorker();
  if (!slot) {
    // Workers unavailable — fall back to main-thread compression
    console.warn('[compressor] No workers available, falling back to main thread');
    const { compressImage } = await import('./compressionUtils');
    return compressImage(file, config, onProgress);
  }

  return new Promise<CompressedResult>((resolve, reject) => {
    const id = ++nextId;
    slot.busy++;
    pending.set(id, { resolve, reject, onProgress, slot });
    slot.worker.postMessage({ type: 'compress', id, file, config });
  });
}

/**
 * Terminate all workers and reset state. Call on unmount / cleanup.
 */
export function terminateCompressionWorkers() {
  pool.forEach((s) => {
    s.worker.terminate();
  });
  pool = [];
  initPromise = null;
  rejectAllPending('Workers terminated');
}
