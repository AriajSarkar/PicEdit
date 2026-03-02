export {};
/**
 * Compression Web Worker — offloads ALL heavy image processing off the main thread.
 *
 * Pipeline per image:
 *  1. createImageBitmap (decode)
 *  2. Optional resize (maxDimension)
 *  3. Extract RGBA pixels via OffscreenCanvas
 *  4. Optional WASM perceptual optimization
 *  5. Optional WASM color quantization (PNG)
 *  6. Encode to target format (quality or binary-search for target size)
 *  7. Optional SSIM verification
 *  8. Convert blob → dataUrl
 *  9. Transfer result back
 *
 * Messages:
 *  Main → Worker: { type: 'init', wasmJsUrl, wasmBgUrl }
 *  Main → Worker: { type: 'compress', id, file, config }
 *  Worker → Main: { type: 'ready', hasWasm }
 *  Worker → Main: { id, type: 'progress', stage, percent }
 *  Worker → Main: { id, type: 'result', result }
 *  Worker → Main: { id, type: 'error', message }
 */

// ── Types (duplicated to avoid import issues in worker context) ─────────────

interface CompressorConfig {
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  enableWasmOptimize: boolean;
  optimizeStrength: number;
  maxColors: number;
  verifySsim: boolean;
  targetSize: number;
  maxDimension: number;
}

// ── WASM state ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;
let initDone: Promise<boolean> | null = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMimeType(format: string): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'png':
      return 'image/png';
    default:
      return 'image/jpeg';
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Binary search for the quality that produces a file closest to targetSize.
 */
async function binarySearchQuality(
  canvas: OffscreenCanvas,
  mimeType: string,
  targetSize: number,
  maxIterations: number = 8,
): Promise<Blob> {
  let lo = 0.01;
  let hi = 1.0;
  let bestBlob = await canvas.convertToBlob({ type: mimeType, quality: hi });

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvas.convertToBlob({ type: mimeType, quality: mid });

    if (blob.size <= targetSize) {
      bestBlob = blob;
      lo = mid;
    } else {
      hi = mid;
    }

    // Close enough
    if (Math.abs(blob.size - targetSize) / targetSize < 0.05) {
      bestBlob = blob;
      break;
    }
  }

  return bestBlob;
}

// ── Main compression pipeline ───────────────────────────────────────────────

async function processCompress(id: number, file: File, config: CompressorConfig) {
  const postProgress = (stage: string, percent: number) => {
    self.postMessage({ id, type: 'progress', stage, percent });
  };

  let bitmap: ImageBitmap | null = null;
  try {
    // Step 1: Decode image
    postProgress('Loading image', 10);
    bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Step 2: Resize if maxDimension is set
    if (config.maxDimension > 0 && (width > config.maxDimension || height > config.maxDimension)) {
      const scale = config.maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    postProgress('Processing', 30);

    // Step 3: Draw to OffscreenCanvas and extract pixel data
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = null;

    let imageData = ctx.getImageData(0, 0, width, height);

    // Step 4: WASM perceptual optimization (if enabled and WASM available)
    if (config.enableWasmOptimize && wasmModule) {
      try {
        postProgress('Optimizing', 50);
        const input = new Uint8Array(imageData.data.buffer);
        const optimized: Uint8Array = wasmModule.optimize_for_compression(
          input,
          width,
          height,
          config.optimizeStrength,
        );

        // Step 4b: Quantize colors for PNG if requested
        let finalData = optimized;
        if (config.format === 'png' && config.maxColors > 0) {
          postProgress('Quantizing colors', 65);
          finalData = wasmModule.quantize_colors(finalData, width, height, config.maxColors);
        }

        // Put back to canvas
        const copy = new Uint8ClampedArray(finalData.length);
        copy.set(finalData);
        const newImageData = new ImageData(copy, width, height);
        ctx.putImageData(newImageData, 0, 0);
        imageData = newImageData;
      } catch (err) {
        // WASM optimization failed — proceed with canvas-only path
        console.warn('[compression-worker] WASM optimization failed:', err);
      }
    }

    // Step 5: Encode to target format
    postProgress('Encoding', 80);
    const mimeType = getMimeType(config.format);
    const quality = config.format === 'png' ? undefined : config.quality;

    let blob: Blob;
    if (config.targetSize > 0 && config.format !== 'png') {
      blob = await binarySearchQuality(canvas, mimeType, config.targetSize);
    } else {
      blob = await canvas.convertToBlob({ type: mimeType, quality });
    }

    postProgress('Finalizing', 90);

    // Step 6: Optional SSIM verification
    let ssim: number | undefined;
    if (config.verifySsim && wasmModule) {
      try {
        const compressedBitmap = await createImageBitmap(blob);
        const compCanvas = new OffscreenCanvas(width, height);
        const compCtx = compCanvas.getContext('2d')!;
        compCtx.drawImage(compressedBitmap, 0, 0, width, height);
        compressedBitmap.close();
        const compData = compCtx.getImageData(0, 0, width, height);

        ssim = wasmModule.calculate_ssim(
          new Uint8Array(imageData.data.buffer),
          new Uint8Array(compData.data.buffer),
          width,
          height,
        );
      } catch {
        // SSIM is optional — don't block on failure
      }
    }

    // Step 7: Generate dataUrl and transfer result
    const dataUrl = await blobToDataUrl(blob);
    const originalSize = file.size;
    const compressedSize = blob.size;

    const arrayBuf = await blob.arrayBuffer();

    postProgress('Done', 100);

    self.postMessage(
      {
        id,
        type: 'result',
        result: {
          arrayBuf,
          dataUrl,
          width,
          height,
          originalSize,
          compressedSize,
          compressionRatio: originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0,
          format: config.format,
          ssim,
        },
      },
      // @ts-expect-error transferable
      [arrayBuf],
    );
  } catch (err: unknown) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    bitmap?.close();
  }
}

// ── Message handler ─────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  // ── Init WASM ──────────────────────────────────────────────────────
  if (msg.type === 'init') {
    initDone = (async () => {
      try {
        const mod = await import(/* webpackIgnore: true */ msg.wasmJsUrl);
        await mod.default({ module_or_path: msg.wasmBgUrl });
        wasmModule = mod;
        self.postMessage({ type: 'ready', hasWasm: true });
        return true;
      } catch {
        // WASM not available — worker still functional (canvas-only path)
        self.postMessage({ type: 'ready', hasWasm: false });
        return false;
      }
    })();
    return;
  }

  // ── Compress request ──────────────────────────────────────────────
  if (msg.type === 'compress') {
    // Wait for WASM init to complete
    if (initDone) await initDone;
    await processCompress(msg.id, msg.file, msg.config);
    return;
  }
};
