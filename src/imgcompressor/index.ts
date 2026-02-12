/**
 * Compressor WASM interface — message-ID based concurrency-safe worker bridge.
 *
 * Fixes vs previous version:
 *  1. initCompressor() checks initPromise FIRST (not `worker`) to prevent
 *     concurrent callers from seeing a half-initialized worker.
 *  2. Single onmessage handler routes responses by numeric message ID.
 *  3. Init-specific and operation-specific messages use different `type` values
 *     so the init handler can't accidentally terminate the worker on a
 *     runtime error from an unrelated operation.
 */

let worker: Worker | null = null;
let initPromise: Promise<boolean> | null = null;
let nextId = 0;

/** Map of in-flight operation IDs → their resolve/reject callbacks */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/** Reject all pending operations (used on worker crash). */
function rejectAllPending(reason: string) {
  for (const [id, op] of pending) {
    op.reject(new Error(reason));
    pending.delete(id);
  }
}

/**
 * Initialize the compressor Web Worker and WASM module.
 */
export async function initCompressor(): Promise<boolean> {
  // Always return existing promise — prevents the race where concurrent
  // callers see a non-null `worker` before init has actually resolved.
  if (initPromise) return initPromise;

  initPromise = new Promise<boolean>((resolve) => {
    try {
      const w = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' },
      );

      const basePath = getBasePath();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const wasmJsUrl = `${origin}${basePath}/wasm/compressor/compressor.js`;
      const wasmBgUrl = `${origin}${basePath}/wasm/compressor/compressor_bg.wasm`;

      // ── Unified message handler (routes by message ID) ────────────
      w.onmessage = (e: MessageEvent) => {
        const data = e.data;

        // Init responses (no ID — only fired once)
        if (data.type === 'ready') {
          worker = w;
          resolve(true);
          return;
        }
        if (data.type === 'init-error') {
          console.warn('[compressor] WASM init failed:', data.message);
          w.terminate();
          resolve(false);
          return;
        }

        // Operation responses (routed by numeric ID)
        if (data.id !== undefined) {
          const op = pending.get(data.id);
          if (op) {
            pending.delete(data.id);
            if (data.type === 'error') {
              op.reject(new Error(data.message || 'Worker operation failed'));
            } else {
              op.resolve(data);
            }
          }
        }
      };

      w.onerror = () => {
        w.terminate();
        worker = null;
        rejectAllPending('Worker crashed');
        resolve(false);
      };

      w.postMessage({ type: 'init', wasmJsUrl, wasmBgUrl });
    } catch {
      resolve(false);
    }
  });

  return initPromise;
}

// ── Helper: send a message and await its ID-correlated response ───────────

function sendMsg(
  msg: Record<string, unknown>,
  transfer?: Transferable[],
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not available'));
      return;
    }
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...msg, id }, transfer ?? []);
  });
}

/**
 * Run WASM perceptual optimization on RGBA buffer.
 */
export async function wasmOptimize(
  imageData: { data: Uint8Array; width: number; height: number },
  strength: number = 0.5,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const ready = await initCompressor();
  if (!ready || !worker) return imageData;

  try {
    const buffer = imageData.data.buffer.slice(0);
    const res = await sendMsg(
      { type: 'optimize', rgba: buffer, width: imageData.width, height: imageData.height, strength },
      [buffer],
    );
    return {
      data: new Uint8Array(res.rgba),
      width: res.width,
      height: res.height,
    };
  } catch (err) {
    console.warn('[compressor] Optimization failed:', err);
    return imageData;
  }
}

/**
 * Quantize colors using WASM median-cut algorithm.
 */
export async function wasmQuantize(
  imageData: { data: Uint8Array; width: number; height: number },
  maxColors: number = 256,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const ready = await initCompressor();
  if (!ready || !worker) return imageData;

  try {
    const buffer = imageData.data.buffer.slice(0);
    const res = await sendMsg(
      { type: 'quantize', rgba: buffer, width: imageData.width, height: imageData.height, maxColors },
      [buffer],
    );
    return {
      data: new Uint8Array(res.rgba),
      width: res.width,
      height: res.height,
    };
  } catch (err) {
    console.warn('[compressor] Quantization failed:', err);
    return imageData;
  }
}

/**
 * Calculate SSIM between two images using WASM.
 */
export async function wasmSsim(
  imgA: { data: Uint8Array; width: number; height: number },
  imgB: { data: Uint8Array; width: number; height: number },
): Promise<number> {
  const ready = await initCompressor();
  if (!ready || !worker) return 0;

  try {
    const bufA = imgA.data.buffer.slice(0);
    const bufB = imgB.data.buffer.slice(0);
    const res = await sendMsg(
      { type: 'ssim', imgA: bufA, imgB: bufB, width: imgA.width, height: imgA.height },
      [bufA, bufB],
    );
    return res.ssim ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Terminate the compressor worker.
 */
export function terminateCompressor(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    initPromise = null;
    rejectAllPending('Worker terminated');
  }
}
