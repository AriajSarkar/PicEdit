export {};
/**
 * Resize Web Worker — offloads ALL heavy image processing off the main thread.
 *
 * Pipeline per image:
 *  1. createImageBitmap (decode)
 *  2. Extract RGBA pixels via OffscreenCanvas
 *  3. WASM Lanczos3 resize (or Canvas fallback)
 *  4. Encode to target format blob
 *  5. Convert blob → dataUrl
 *  6. Transfer result back
 *
 * Messages:
 *  Main → Worker: { type: 'init', wasmJsUrl, wasmBgUrl }
 *  Main → Worker: { type: 'resize', id, file, config, effectiveConfig }
 *  Worker → Main: { type: 'ready' }
 *  Worker → Main: { type: 'init-error', message }
 *  Worker → Main: { id, type: 'progress', stage, percent }
 *  Worker → Main: { id, type: 'result', result }
 *  Worker → Main: { id, type: 'error', message }
 */

// ── Types (duplicated here to avoid import issues in worker context) ────────

interface ResizerConfig {
  method: 'dimensions' | 'percentage' | 'preset';
  width: number;
  height: number;
  lockAspectRatio: boolean;
  percentage: number;
  presetId: string;
  fit: 'contain' | 'cover' | 'stretch';
  outputFormat: 'preserve' | 'jpeg' | 'png' | 'webp';
  quality: number;
}

interface ResizePreset {
  id: string;
  label: string;
  category: string;
  width: number;
  height: number;
}

// Keep this list in sync with src/img-resizer/types/index.ts (canonical source).
// Worker keeps a local copy to avoid runtime import issues in dedicated worker bundles.
// Minimal preset list for dimension calculation in worker
const RESIZE_PRESETS: ResizePreset[] = [
  { id: 'ig-post', label: 'Post', category: 'Instagram', width: 1080, height: 1080 },
  { id: 'ig-story', label: 'Story / Reel', category: 'Instagram', width: 1080, height: 1920 },
  { id: 'ig-landscape', label: 'Landscape', category: 'Instagram', width: 1080, height: 566 },
  { id: 'fb-post', label: 'Post', category: 'Facebook', width: 1200, height: 630 },
  { id: 'fb-cover', label: 'Cover', category: 'Facebook', width: 820, height: 312 },
  { id: 'fb-story', label: 'Story', category: 'Facebook', width: 1080, height: 1920 },
  { id: 'tw-post', label: 'Post', category: 'X / Twitter', width: 1200, height: 675 },
  { id: 'tw-header', label: 'Header', category: 'X / Twitter', width: 1500, height: 500 },
  { id: 'yt-thumb', label: 'Thumbnail', category: 'YouTube', width: 1280, height: 720 },
  { id: 'yt-banner', label: 'Banner', category: 'YouTube', width: 2560, height: 1440 },
  { id: 'li-post', label: 'Post', category: 'LinkedIn', width: 1200, height: 627 },
  { id: 'li-cover', label: 'Cover', category: 'LinkedIn', width: 1584, height: 396 },
  { id: 'pin-pin', label: 'Pin', category: 'Pinterest', width: 1000, height: 1500 },
  { id: 'hd', label: 'HD', category: 'Standard', width: 1280, height: 720 },
  { id: 'fhd', label: 'Full HD', category: 'Standard', width: 1920, height: 1080 },
  { id: '2k', label: '2K', category: 'Standard', width: 2560, height: 1440 },
  { id: '4k', label: '4K UHD', category: 'Standard', width: 3840, height: 2160 },
  { id: 'favicon', label: 'Favicon', category: 'Web', width: 32, height: 32 },
  { id: 'og-image', label: 'OG Image', category: 'Web', width: 1200, height: 630 },
  { id: 'icon-192', label: 'PWA Icon', category: 'Web', width: 192, height: 192 },
  { id: 'icon-512', label: 'PWA Splash', category: 'Web', width: 512, height: 512 },
];

// ── WASM state ──────────────────────────────────────────────────────────────

let wasmResize:
  | ((
      rgba: Uint8Array,
      srcW: number,
      srcH: number,
      dstW: number,
      dstH: number,
      filter: number,
    ) => Uint8Array)
  | null = null;
let initDone: Promise<boolean> | null = null;

// ── Dimension calculation (same logic as resizeUtils.ts) ────────────────────

function applyFit(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  fit: string,
): { width: number; height: number } {
  const srcRatio = srcW / srcH;
  switch (fit) {
    case 'contain':
      if (targetW / targetH > srcRatio) {
        return { width: Math.round(targetH * srcRatio), height: targetH };
      }
      return { width: targetW, height: Math.round(targetW / srcRatio) };
    case 'cover':
      if (targetW / targetH > srcRatio) {
        return { width: targetW, height: Math.round(targetW / srcRatio) };
      }
      return { width: Math.round(targetH * srcRatio), height: targetH };
    case 'stretch':
    default:
      return { width: targetW, height: targetH };
  }
}

function calculateOutputDimensions(
  origWidth: number,
  origHeight: number,
  config: ResizerConfig,
): { width: number; height: number } {
  switch (config.method) {
    case 'percentage': {
      const scale = config.percentage / 100;
      return {
        width: Math.max(1, Math.round(origWidth * scale)),
        height: Math.max(1, Math.round(origHeight * scale)),
      };
    }
    case 'preset': {
      const preset = RESIZE_PRESETS.find((p) => p.id === config.presetId);
      if (!preset) return { width: origWidth, height: origHeight };
      return applyFit(origWidth, origHeight, preset.width, preset.height, config.fit);
    }
    case 'dimensions': {
      const tw = config.width || origWidth;
      const th = config.height || origHeight;
      if (config.lockAspectRatio) {
        return applyFit(origWidth, origHeight, tw, th, config.fit);
      }
      return { width: tw, height: th };
    }
    default:
      return { width: origWidth, height: origHeight };
  }
}

// ── Canvas helpers (OffscreenCanvas — always available in worker) ────────────

function bitmapToRGBA(bitmap: ImageBitmap): { data: Uint8Array; w: number; h: number } {
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.drawImage(bitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  return { data: new Uint8Array(imgData.data.buffer), w, h };
}

function getCoverTargetDimensions(
  config: ResizerConfig,
  fallbackW: number,
  fallbackH: number,
): { targetW: number; targetH: number } {
  if (config.method === 'preset') {
    const preset = RESIZE_PRESETS.find((p) => p.id === config.presetId);
    return {
      targetW: preset?.width || fallbackW,
      targetH: preset?.height || fallbackH,
    };
  }
  return {
    targetW: config.width || fallbackW,
    targetH: config.height || fallbackH,
  };
}

function rgbaToBlob(
  rgba: Uint8Array,
  w: number,
  h: number,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  const copy = new Uint8ClampedArray(rgba.length);
  copy.set(rgba);
  ctx.putImageData(new ImageData(copy, w, h), 0, 0);
  return canvas.convertToBlob({ type: mimeType, quality });
}

function resolveOutputMime(config: ResizerConfig, originalType: string): string {
  if (config.outputFormat === 'preserve') {
    if (originalType === 'image/png') return 'image/png';
    if (originalType === 'image/webp') return 'image/webp';
    return 'image/jpeg';
  }
  const map: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  return map[config.outputFormat] || 'image/jpeg';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

// ── Resize implementations ──────────────────────────────────────────────────

async function resizeWithWasm(
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
  mimeType: string,
  quality: number | undefined,
  postProgress: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  postProgress('Extracting pixels', 30);
  const { data, w: srcW, h: srcH } = bitmapToRGBA(bitmap);
  postProgress('WASM Lanczos3 resize', 50);
  const resized = wasmResize!(data, srcW, srcH, outW, outH, 0);
  postProgress('Encoding', 80);
  const blob = await rgbaToBlob(resized, outW, outH, mimeType, quality);
  return { blob, width: outW, height: outH };
}

async function resizeWithCanvas(
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
  mimeType: string,
  quality: number | undefined,
  postProgress: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  postProgress('Resizing (Canvas)', 40);
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  postProgress('Encoding', 80);
  const blob = await canvas.convertToBlob({ type: mimeType, quality });
  return { blob, width: outW, height: outH };
}

async function resizeCoverWithCanvas(
  bitmap: ImageBitmap,
  targetW: number,
  targetH: number,
  mimeType: string,
  quality: number | undefined,
  postProgress: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  postProgress('Resizing (cover)', 40);
  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
  const scaledW = bitmap.width * scale;
  const scaledH = bitmap.height * scale;
  ctx.drawImage(bitmap, (targetW - scaledW) / 2, (targetH - scaledH) / 2, scaledW, scaledH);
  postProgress('Encoding', 80);
  const blob = await canvas.convertToBlob({ type: mimeType, quality });
  return { blob, width: targetW, height: targetH };
}

// ── Main resize orchestrator ────────────────────────────────────────────────

async function processResize(
  id: number,
  file: File,
  config: ResizerConfig,
  crop?: { x: number; y: number; w: number; h: number },
) {
  const postProgress = (stage: string, percent: number) => {
    self.postMessage({ id, type: 'progress', stage, percent });
  };

  try {
    postProgress('Loading image', 10);
    // If crop is specified, extract only the crop region from the source image
    let bitmap: ImageBitmap;
    let origWidth: number;
    let origHeight: number;

    if (crop && crop.w > 0 && crop.h > 0) {
      // First decode full image to get dimensions
      const fullBitmap = await createImageBitmap(file);
      // Clamp crop to image bounds
      const cx = Math.max(0, Math.min(crop.x, fullBitmap.width));
      const cy = Math.max(0, Math.min(crop.y, fullBitmap.height));
      const cw = Math.min(crop.w, fullBitmap.width - cx);
      const ch = Math.min(crop.h, fullBitmap.height - cy);
      // Extract cropped region
      bitmap = await createImageBitmap(fullBitmap, cx, cy, cw, ch);
      fullBitmap.close();
      origWidth = bitmap.width;
      origHeight = bitmap.height;
    } else {
      bitmap = await createImageBitmap(file);
      origWidth = bitmap.width;
      origHeight = bitmap.height;
    }

    postProgress('Calculating dimensions', 20);
    const { width: outW, height: outH } = calculateOutputDimensions(origWidth, origHeight, config);
    const mimeType = resolveOutputMime(config, file.type);
    const quality = mimeType === 'image/png' ? undefined : config.quality;

    let result: { blob: Blob; width: number; height: number };

    // Cover mode needs separate handling
    if (config.fit === 'cover' && config.method !== 'percentage') {
      const { targetW, targetH } = getCoverTargetDimensions(config, outW, outH);
      // Cover requires scale-and-crop semantics. Use the dedicated cover path.
      result = await resizeCoverWithCanvas(
        bitmap,
        targetW,
        targetH,
        mimeType,
        quality,
        postProgress,
      );
    } else {
      if (wasmResize) {
        try {
          result = await resizeWithWasm(bitmap, outW, outH, mimeType, quality, postProgress);
        } catch {
          result = await resizeWithCanvas(bitmap, outW, outH, mimeType, quality, postProgress);
        }
      } else {
        result = await resizeWithCanvas(bitmap, outW, outH, mimeType, quality, postProgress);
      }
    }

    bitmap.close();
    postProgress('Finalizing', 90);

    const dataUrl = await blobToDataUrl(result.blob);

    postProgress('Done', 100);

    // Transfer the blob's array buffer for zero-copy
    const arrayBuf = await result.blob.arrayBuffer();

    self.postMessage(
      {
        id,
        type: 'result',
        result: {
          arrayBuf,
          dataUrl,
          width: result.width,
          height: result.height,
          originalSize: file.size,
          newSize: result.blob.size,
          format: mimeType.replace('image/', ''),
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
        wasmResize = mod.resize_rgba;
        self.postMessage({ type: 'ready', hasWasm: true });
        return true;
      } catch {
        // WASM not available — will use Canvas fallback
        self.postMessage({ type: 'ready', hasWasm: false });
        return false;
      }
    })();
    return;
  }

  // ── Resize request ─────────────────────────────────────────────────
  if (msg.type === 'resize') {
    // Wait for init to complete
    if (initDone) await initDone;
    await processResize(msg.id, msg.file, msg.config, msg.crop);
    return;
  }
};
