import {
  PostProcessingConfig,
  DEFAULT_POST_PROCESSING_CONFIG,
  PostProcessResult,
} from "./types";

let worker: Worker | null = null;
let initPromise: Promise<boolean> | null = null;

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Initialize the post-processing Web Worker and WASM module.
 */
export async function initPostProcessing(): Promise<boolean> {
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
      const wasmJsUrl = `${origin}${basePath}/wasm/post-refinement/post_refinement.js`;
      const wasmBgUrl = `${origin}${basePath}/wasm/post-refinement/post_refinement_bg.wasm`;

      worker.onmessage = (e: MessageEvent<PostProcessResult>) => {
        if (e.data.type === "ready") {
          resolve(true);
        } else if (e.data.type === "error") {
          console.warn("[post-refinement] Init failed:", e.data.message);
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
 * Post-process an AI mask using the original high-res image.
 * Runs guided filter, edge refinement, and alpha matting via WASM in a Web Worker.
 *
 * Falls back to returning the mask data if WASM is unavailable.
 */
export async function postProcess(
  maskData: { data: Uint8Array; width: number; height: number },
  originalData: { data: Uint8Array; width: number; height: number },
  config?: Partial<PostProcessingConfig>
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const fullConfig = { ...DEFAULT_POST_PROCESSING_CONFIG, ...config };

  if (!fullConfig.enabled) {
    return maskData;
  }

  // Dimensions must match
  if (maskData.width !== originalData.width || maskData.height !== originalData.height) {
    console.warn("[post-refinement] Dimension mismatch, skipping");
    return maskData;
  }

  const ready = await initPostProcessing();
  if (!ready || !worker) {
    console.warn("[post-refinement] WASM unavailable, skipping post-processing");
    return maskData;
  }

  const t0 = performance.now();
  console.log("[post-refinement] Starting WASM processing...");

  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent<PostProcessResult>) => {
      worker!.removeEventListener("message", onMessage);

      if (e.data.type === "result") {
        const t1 = performance.now();
        console.log(`[post-refinement] Finished in ${(t1 - t0).toFixed(1)}ms`);
        resolve({
          data: new Uint8Array(e.data.rgba!),
          width: e.data.width!,
          height: e.data.height!,
        });
      } else if (e.data.type === "error") {
        console.warn("[post-refinement] Processing failed:", e.data.message);
        resolve(maskData);
      }
    };

    worker!.addEventListener("message", onMessage);

    const maskBuffer = maskData.data.buffer.slice(0);
    const origBuffer = originalData.data.buffer.slice(0);

    worker!.postMessage(
      {
        type: "process",
        maskRgba: maskBuffer,
        originalRgba: origBuffer,
        width: maskData.width,
        height: maskData.height,
        config: fullConfig,
      },
      [maskBuffer, origBuffer]
    );
  });
}

/**
 * Terminate the post-processing worker.
 */
export function terminatePostProcessing(): void {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
