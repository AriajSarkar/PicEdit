/**
 * Image Resizer — core resize logic.
 *
 * Pipeline (in order of preference):
 *  1. WASM Lanczos3 (high quality, fast) — via wasmBridge
 *  2. Canvas API fallback (browser native resampling)
 *
 * Both paths: decode with createImageBitmap → resize → encode with Canvas.toBlob
 */

import type { ResizerConfig, ResizeResult, ResizePreset, ResizeFit } from '@/img-resizer/types';
import { RESIZE_PRESETS } from '@/img-resizer/types';

// ── WASM bridge (lazy import to avoid bundling if not used) ─────────────────

let wasmResize: ((rgba: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number, filter: number) => Uint8Array) | null = null;
let wasmLoadAttempted = false;

/** Try to load the WASM resizer module (called once). */
async function tryLoadWasm(): Promise<boolean> {
  if (wasmLoadAttempted) return wasmResize !== null;
  wasmLoadAttempted = true;
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mod = await import(/* webpackIgnore: true */ `${origin}${basePath}/wasm/resizer/resizer.js`);
    await mod.default({ module_or_path: `${origin}${basePath}/wasm/resizer/resizer_bg.wasm` });
    wasmResize = mod.resize_rgba;
    console.log('[resizer] WASM loaded — Lanczos3 resize active');
    return true;
  } catch {
    console.log('[resizer] WASM not available — using Canvas fallback');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Calculations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate final output dimensions for a given image and config.
 */
export function calculateOutputDimensions(
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

/**
 * Apply fit mode to constrain image within target box.
 */
function applyFit(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  fit: ResizeFit,
): { width: number; height: number } {
  const srcRatio = srcW / srcH;

  switch (fit) {
    case 'contain': {
      if (targetW / targetH > srcRatio) {
        return { width: Math.round(targetH * srcRatio), height: targetH };
      }
      return { width: targetW, height: Math.round(targetW / srcRatio) };
    }

    case 'cover': {
      if (targetW / targetH > srcRatio) {
        return { width: targetW, height: Math.round(targetW / srcRatio) };
      }
      return { width: Math.round(targetH * srcRatio), height: targetH };
    }

    case 'stretch':
      return { width: targetW, height: targetH };

    default:
      return { width: targetW, height: targetH };
  }
}

/**
 * Get the target dimensions from a preset.
 */
export function getPresetDimensions(presetId: string): ResizePreset | undefined {
  return RESIZE_PRESETS.find((p) => p.id === presetId);
}

// ═══════════════════════════════════════════════════════════════════════════
// Canvas Helpers (robust: OffscreenCanvas → HTMLCanvasElement fallback)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the output MIME type.
 */
function resolveOutputMime(config: ResizerConfig, originalType: string): string {
  if (config.outputFormat === 'preserve') {
    if (originalType === 'image/png') return 'image/png';
    if (originalType === 'image/webp') return 'image/webp';
    return 'image/jpeg';
  }
  const map: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return map[config.outputFormat] || 'image/jpeg';
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/** Create a canvas with the given dimensions — tries OffscreenCanvas first. */
function makeCanvas(w: number, h: number): { canvas: AnyCanvas; ctx: AnyCtx } {
  // Try OffscreenCanvas first (works in workers + modern browsers)
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext('2d');
      if (ctx) return { canvas: c, ctx };
    } catch { /* fall through */ }
  }
  // Fallback: HTMLCanvasElement (always available in browser main thread)
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return { canvas: c, ctx };
}

/** Convert canvas to blob (handles both OffscreenCanvas and HTMLCanvasElement). */
function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  // HTMLCanvasElement — use callback-based toBlob
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      type,
      quality,
    );
  });
}

/** Extract RGBA pixel data from a bitmap at its native size. */
function bitmapToRGBA(bitmap: ImageBitmap): { data: Uint8Array; w: number; h: number } {
  const w = bitmap.width;
  const h = bitmap.height;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(bitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  // Detach canvas to free memory
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = 0;
    canvas.height = 0;
  }
  return { data: new Uint8Array(imgData.data.buffer), w, h };
}

/** Put RGBA pixels onto a canvas and encode to blob. */
function rgbaToBlob(
  rgba: Uint8Array,
  w: number,
  h: number,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  const { canvas, ctx } = makeCanvas(w, h);
  // Copy into a plain ArrayBuffer to satisfy strict TS (SharedArrayBuffer compat)
  const copy = new Uint8ClampedArray(rgba.length);
  copy.set(rgba);
  const imgData = new ImageData(copy, w, h);
  ctx.putImageData(imgData, 0, 0);
  return canvasToBlob(canvas, mimeType, quality);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Resize Implementations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * WASM path: decode → extract RGBA → WASM Lanczos3 → encode.
 */
async function resizeWithWasm(
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
  mimeType: string,
  quality: number | undefined,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  onProgress?.('Extracting pixels', 30);
  const { data, w: srcW, h: srcH } = bitmapToRGBA(bitmap);

  onProgress?.('WASM Lanczos3 resize', 50);
  // filter=0 is Lanczos3 in our crate
  const resized = wasmResize!(data, srcW, srcH, outW, outH, 0);

  onProgress?.('Encoding', 80);
  const blob = await rgbaToBlob(resized, outW, outH, mimeType, quality);

  return { blob, width: outW, height: outH };
}

/**
 * Canvas path: draw bitmap at target size → encode.
 */
async function resizeWithCanvas(
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
  mimeType: string,
  quality: number | undefined,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  onProgress?.('Resizing (Canvas)', 40);
  const { canvas, ctx } = makeCanvas(outW, outH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, outW, outH);

  onProgress?.('Encoding', 80);
  const blob = await canvasToBlob(canvas, mimeType, quality);

  return { blob, width: outW, height: outH };
}

/**
 * Canvas cover-mode: scale to cover + center crop.
 */
async function resizeCoverWithCanvas(
  bitmap: ImageBitmap,
  targetW: number,
  targetH: number,
  mimeType: string,
  quality: number | undefined,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ blob: Blob; width: number; height: number }> {
  onProgress?.('Resizing (cover)', 40);
  const { canvas, ctx } = makeCanvas(targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
  const scaledW = bitmap.width * scale;
  const scaledH = bitmap.height * scale;
  const offsetX = (targetW - scaledW) / 2;
  const offsetY = (targetH - scaledH) / 2;

  ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);

  onProgress?.('Encoding', 80);
  const blob = await canvasToBlob(canvas, mimeType, quality);

  return { blob, width: targetW, height: targetH };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Resize Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resize a single image file.
 * Attempts WASM Lanczos3 first, falls back to Canvas API.
 */
export async function resizeImage(
  file: File,
  config: ResizerConfig,
  onProgress?: (stage: string, percent: number) => void,
  crop?: { x: number; y: number; w: number; h: number },
): Promise<ResizeResult> {
  onProgress?.('Loading image', 10);

  // Load image — works for all browser-supported formats
  let bitmap: ImageBitmap;
  if (crop && crop.w > 0 && crop.h > 0) {
    // Crop: decode full image, then extract crop region
    const fullBitmap = await createImageBitmap(file);
    const cx = Math.max(0, Math.min(crop.x, fullBitmap.width));
    const cy = Math.max(0, Math.min(crop.y, fullBitmap.height));
    const cw = Math.min(crop.w, fullBitmap.width - cx);
    const ch = Math.min(crop.h, fullBitmap.height - cy);
    bitmap = await createImageBitmap(fullBitmap, cx, cy, cw, ch);
    fullBitmap.close();
  } else {
    bitmap = await createImageBitmap(file);
  }
  const origWidth = bitmap.width;
  const origHeight = bitmap.height;

  onProgress?.('Calculating dimensions', 20);

  // Calculate target dimensions
  const { width: outW, height: outH } = calculateOutputDimensions(origWidth, origHeight, config);
  const mimeType = resolveOutputMime(config, file.type);
  const quality = mimeType === 'image/png' ? undefined : config.quality;

  // Try loading WASM (first call initializes, subsequent calls are instant)
  const hasWasm = await tryLoadWasm();

  let result: { blob: Blob; width: number; height: number };

  // Cover mode needs separate handling
  if (config.fit === 'cover' && config.method !== 'percentage') {
    const targetW =
      config.method === 'preset'
        ? RESIZE_PRESETS.find((p) => p.id === config.presetId)?.width || outW
        : config.width || outW;
    const targetH =
      config.method === 'preset'
        ? RESIZE_PRESETS.find((p) => p.id === config.presetId)?.height || outH
        : config.height || outH;

    if (hasWasm) {
      try {
        result = await resizeWithWasm(bitmap, targetW, targetH, mimeType, quality, onProgress);
      } catch {
        // WASM failed at runtime — fall back to Canvas
        result = await resizeCoverWithCanvas(bitmap, targetW, targetH, mimeType, quality, onProgress);
      }
    } else {
      result = await resizeCoverWithCanvas(bitmap, targetW, targetH, mimeType, quality, onProgress);
    }
  } else {
    // Standard resize (contain / stretch / percentage / dimensions)
    if (hasWasm) {
      try {
        result = await resizeWithWasm(bitmap, outW, outH, mimeType, quality, onProgress);
      } catch {
        result = await resizeWithCanvas(bitmap, outW, outH, mimeType, quality, onProgress);
      }
    } else {
      result = await resizeWithCanvas(bitmap, outW, outH, mimeType, quality, onProgress);
    }
  }

  bitmap.close();
  onProgress?.('Finalizing', 90);

  const dataUrl = await blobToDataUrl(result.blob);

  onProgress?.('Done', 100);

  return {
    blob: result.blob,
    dataUrl,
    width: result.width,
    height: result.height,
    originalSize: file.size,
    newSize: result.blob.size,
    format: mimeType.replace('image/', ''),
  };
}
