/**
 * Resize Worker Bridge — message-ID based concurrency-safe interface.
 *
 * Spawns a pool of Web Workers (1 per hardware core, max 4) so multiple
 * images resize in parallel without blocking the main thread.
 *
 * Each resize call gets a numeric ID; progress and results are routed back
 * to the correct caller via a pending-operations Map.
 */

import type { ResizerConfig, ResizeResult } from '@/img-resizer/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface PendingOp {
  resolve: (result: ResizeResult) => void;
  reject: (err: Error) => void;
  onProgress?: (stage: string, percent: number) => void;
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
          newSize: r.newSize,
          format: r.format,
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
        op.reject(new Error(data.message || 'Worker resize failed'));
      }
      return;
    }
  };
}

// ── Init ────────────────────────────────────────────────────────────────────

function initWorker(): Promise<WorkerSlot> {
  return new Promise<WorkerSlot>((resolve, reject) => {
    try {
      const w = new Worker(new URL('./resizeWorker.ts', import.meta.url), { type: 'module' });
      const slot: WorkerSlot = { worker: w, busy: 0 };

      const basePath = getBasePath();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const wasmJsUrl = `${origin}${basePath}/wasm/resizer/resizer.js`;
      const wasmBgUrl = `${origin}${basePath}/wasm/resizer/resizer_bg.wasm`;

      const onInit = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          w.removeEventListener('message', onInit);
          w.onmessage = createHandler(slot);
          w.onerror = () => {
            w.terminate();
            const idx = pool.indexOf(slot);
            if (idx >= 0) pool.splice(idx, 1);
            // Reject ops that were on this worker
            for (const [id, op] of pending) {
              op.reject(new Error('Worker crashed'));
              pending.delete(id);
            }
          };
          resolve(slot);
        }
      };
      w.addEventListener('message', onInit);

      w.postMessage({ type: 'init', wasmJsUrl, wasmBgUrl });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Initialize the resize worker pool.
 * Safe to call multiple times — returns cached promise.
 */
export async function initResizeWorkers(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const size = getPoolSize();
      const slots = await Promise.all(Array.from({ length: size }, () => initWorker()));
      pool = slots;
      console.log(`[resizer] Worker pool ready — ${pool.length} workers`);
      return true;
    } catch (err) {
      console.warn('[resizer] Worker pool init failed:', err);
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

/** Crop region in original-image pixels (optional). */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Resize a single image file in a background worker.
 * Awaits worker pool init if needed, falls back to main-thread resize on failure.
 */
export async function resizeImageInWorker(
  file: File,
  config: ResizerConfig,
  onProgress?: (stage: string, percent: number) => void,
  crop?: CropRect,
): Promise<ResizeResult> {
  // Ensure workers are initialized before trying to use them
  if (initPromise) {
    await initPromise;
  } else {
    await initResizeWorkers();
  }

  const slot = pickWorker();
  if (!slot) {
    // Workers unavailable — fall back to main-thread resize
    console.warn('[resizer] No workers available, falling back to main thread');
    const { resizeImage } = await import('./resizeUtils');
    return resizeImage(file, config, onProgress, crop);
  }

  return new Promise<ResizeResult>((resolve, reject) => {
    const id = ++nextId;
    slot.busy++;
    pending.set(id, { resolve, reject, onProgress });
    slot.worker.postMessage({ type: 'resize', id, file, config, crop });
  });
}

/**
 * Terminate all workers and reset state. Call on unmount / cleanup.
 */
export function terminateResizeWorkers() {
  pool.forEach((s) => s.worker.terminate());
  pool = [];
  initPromise = null;
  rejectAllPending('Workers terminated');
}
