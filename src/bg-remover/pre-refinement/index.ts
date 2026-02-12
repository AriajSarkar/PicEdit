import {
  PreProcessingConfig,
  DEFAULT_PRE_PROCESSING_CONFIG,
  PreProcessResult,
} from "./types";

let worker: Worker | null = null;
let initPromise: Promise<boolean> | null = null;

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Initialize the pre-processing Web Worker and WASM module.
 * Returns true if successfully initialized, false otherwise.
 */
export async function initPreProcessing(): Promise<boolean> {
  if (worker) return true;
  if (initPromise) return initPromise;

  initPromise = new Promise<boolean>((resolve) => {
    try {
      worker = new Worker(
        new URL("./worker.ts", import.meta.url),
        { type: "module" }
      );

      const basePath = getBasePath();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const wasmJsUrl = `${origin}${basePath}/wasm/pre-refinement/pre_refinement.js`;
      const wasmBgUrl = `${origin}${basePath}/wasm/pre-refinement/pre_refinement_bg.wasm`;

      worker.onmessage = (e: MessageEvent<PreProcessResult>) => {
        if (e.data.type === "ready") {
          resolve(true);
        } else if (e.data.type === "error") {
          console.warn("[pre-refinement] Init failed:", e.data.message);
          worker?.terminate();
          worker = null;
          resolve(false);
        }
      };

      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        resolve(false);
      };

      worker.postMessage({ type: "init", wasmJsUrl, wasmBgUrl });
    } catch {
      resolve(false);
    }
  });

  return initPromise;
}

/**
 * Pre-process an image for better AI segmentation.
 * Runs CLAHE, noise reduction, and sharpening via WASM in a Web Worker.
 *
 * Falls back to returning the original data if WASM is unavailable.
 */
export async function preProcess(
  imageData: { data: Uint8Array; width: number; height: number },
  config?: Partial<PreProcessingConfig>
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const fullConfig = { ...DEFAULT_PRE_PROCESSING_CONFIG, ...config };

  if (!fullConfig.enabled) {
    return imageData;
  }

  const ready = await initPreProcessing();
  if (!ready || !worker) {
    console.warn("[pre-refinement] WASM unavailable, skipping pre-processing");
    return imageData;
  }

  const t0 = performance.now();
  console.log("[pre-refinement] Starting WASM processing...");

  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<PreProcessResult>) => {
      worker!.removeEventListener("message", onMessage);

      if (e.data.type === "result") {
        const t1 = performance.now();
        console.log(`[pre-refinement] Finished in ${(t1 - t0).toFixed(1)}ms`);
        resolve({
          data: new Uint8Array(e.data.rgba!),
          width: e.data.width!,
          height: e.data.height!,
        });
      } else if (e.data.type === "error") {
        console.warn("[pre-refinement] Processing failed:", e.data.message);
        // Fallback: return original
        resolve(imageData);
      }
    };

    worker!.addEventListener("message", onMessage);

    // Transfer the buffer for zero-copy
    const buffer = imageData.data.buffer.slice(0);
    worker!.postMessage(
      {
        type: "process",
        rgba: buffer,
        width: imageData.width,
        height: imageData.height,
        config: fullConfig,
      },
      [buffer]
    );
  });
}

/**
 * Terminate the pre-processing worker.
 */
export function terminatePreProcessing(): void {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
