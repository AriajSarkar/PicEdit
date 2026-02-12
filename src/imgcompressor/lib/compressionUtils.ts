/**
 * Compression-specific utility functions.
 * Uses Canvas API for final encoding (JPEG/WebP/PNG) and
 * WASM pipeline for perceptual optimization.
 */

import type { CompressorConfig } from '@/imgcompressor/types';

export interface CompressedResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  ssim?: number;
}

/**
 * Compress an image file using Canvas encoding.
 * Optionally applies WASM-based pre-optimization pipeline.
 */
export async function compressImage(
  file: File,
  config: CompressorConfig,
  onProgress?: (stage: string, percent: number) => void,
): Promise<CompressedResult> {
  onProgress?.('Loading image', 10);

  // Step 1: Load image to canvas
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Step 2: Resize if needed
  if (config.maxDimension > 0 && (width > config.maxDimension || height > config.maxDimension)) {
    const scale = config.maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  onProgress?.('Processing', 30);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let imageData = ctx.getImageData(0, 0, width, height);

  // Step 3: WASM perceptual optimization (if enabled)
  if (config.enableWasmOptimize) {
    try {
      onProgress?.('Optimizing', 50);
      const { wasmOptimize, wasmQuantize } = await import('@/imgcompressor/index');

      const optimized = await wasmOptimize(
        { data: new Uint8Array(imageData.data.buffer), width, height },
        config.optimizeStrength
      );

      // Apply quantization for PNG if requested
      let finalData = optimized;
      if (config.format === 'png' && config.maxColors > 0) {
        onProgress?.('Quantizing colors', 65);
        finalData = await wasmQuantize(optimized, config.maxColors);
      }

      // Put back to canvas
      const newImageData = new ImageData(
        new Uint8ClampedArray(finalData.data),
        width,
        height
      );
      ctx.putImageData(newImageData, 0, 0);
      imageData = newImageData;
    } catch (err) {
      console.warn('[compressor] WASM optimization failed, using canvas-only:', err);
    }
  }

  onProgress?.('Encoding', 80);

  // Step 4: Encode to target format using Canvas
  const mimeType = getMimeType(config.format);
  const quality = config.format === 'png' ? undefined : config.quality;

  let blob: Blob;

  // If target size is set, binary search for optimal quality
  if (config.targetSize > 0 && config.format !== 'png') {
    blob = await binarySearchQuality(canvas, mimeType, config.targetSize);
  } else {
    blob = await canvas.convertToBlob({ type: mimeType, quality });
  }

  onProgress?.('Finalizing', 95);

  // Step 5: Generate result
  const dataUrl = await blobToDataUrl(blob);
  const originalSize = file.size;
  const compressedSize = blob.size;

  // Step 6: Optional SSIM verification
  let ssim: number | undefined;
  if (config.verifySsim && config.enableWasmOptimize) {
    try {
      const { wasmSsim } = await import('@/imgcompressor/index');
      // Decode compressed output back
      const compressedBitmap = await createImageBitmap(blob);
      const compCanvas = new OffscreenCanvas(width, height);
      const compCtx = compCanvas.getContext('2d')!;
      compCtx.drawImage(compressedBitmap, 0, 0, width, height);
      compressedBitmap.close();
      const compData = compCtx.getImageData(0, 0, width, height);

      ssim = await wasmSsim(
        { data: new Uint8Array(imageData.data.buffer), width, height },
        { data: new Uint8Array(compData.data.buffer), width, height }
      );
    } catch {
      // SSIM is optional, don't block on failure
    }
  }

  onProgress?.('Done', 100);

  return {
    blob,
    dataUrl,
    width,
    height,
    originalSize,
    compressedSize,
    compressionRatio: originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0,
    format: config.format,
    ssim,
  };
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

function getMimeType(format: string): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'png': return 'image/png';
    default: return 'image/jpeg';
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
