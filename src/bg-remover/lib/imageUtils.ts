import { EditorState, OutputFormat, ImageInfo } from "@/types";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getImageInfo(file: File): ImageInfo {
  // Extract filename without extension
  const lastDot = file.name.lastIndexOf(".");
  const fileName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;

  return {
    fileName,
    fileSize: file.size,
    width: 0, // Will be updated after image loads
    height: 0,
    type: file.type,
  };
}

export async function applyEdits(
  processedImage: string,
  originalImage: string,
  state: EditorState
): Promise<string> {
  const processed = await loadImage(processedImage);
  const original = await loadImage(originalImage);

  // Apply crop first
  const cropW = state.cropWidth || processed.width;
  const cropH = state.cropHeight || processed.height;
  const cropX = state.cropX || 0;
  const cropY = state.cropY || 0;

  // Calculate final dimensions with compression scale
  let finalW = state.width || cropW;
  let finalH = state.height || cropH;

  if (state.compressionEnabled && state.compressionScale < 1) {
    finalW = Math.round(finalW * state.compressionScale);
    finalH = Math.round(finalH * state.compressionScale);
  }

  const canvas = createCanvas(finalW, finalH);
  const ctx = canvas.getContext("2d")!;

  // Apply background
  if (state.backgroundType === "solid") {
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, finalW, finalH);
  } else if (state.backgroundType === "blur" && state.backgroundBlur > 0) {
    // Draw blurred original as background
    ctx.filter = `blur(${state.backgroundBlur}px)`;
    ctx.drawImage(
      original,
      cropX, cropY, cropW, cropH,
      -state.backgroundBlur * 2, -state.backgroundBlur * 2,
      finalW + state.backgroundBlur * 4, finalH + state.backgroundBlur * 4
    );
    ctx.filter = "none";
  } else if (state.backgroundType === "image" && state.backgroundImage) {
    const bgImg = await loadImage(state.backgroundImage);
    ctx.drawImage(bgImg, 0, 0, finalW, finalH);
  }
  // transparent: do nothing, keep canvas transparent

  // Save state for transforms
  ctx.save();
  ctx.translate(finalW / 2, finalH / 2);

  // Apply rotation
  if (state.rotation) {
    ctx.rotate((state.rotation * Math.PI) / 180);
  }

  // Apply flips
  const scaleX = state.flipH ? -1 : 1;
  const scaleY = state.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Draw processed image centered
  ctx.drawImage(
    processed,
    cropX, cropY, cropW, cropH,
    -finalW / 2, -finalH / 2, finalW, finalH
  );

  ctx.restore();

  return canvas.toDataURL(state.outputFormat, state.outputQuality);
}

export function downloadImage(
  dataUrl: string,
  format: OutputFormat,
  originalFileName: string
): void {
  const extensions: Record<OutputFormat, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };

  // Use original filename + -AriajSarkar
  const ext = extensions[format];
  const fileName = originalFileName
    ? `${originalFileName}-AriajSarkar.${ext}`
    : `bg-removed-${Date.now()}-AriajSarkar.${ext}`;

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Estimate output file size from data URL
export function estimateDataUrlSize(dataUrl: string): number {
  // Data URL format: data:image/png;base64,XXXX
  // Base64 is ~33% larger than raw, so estimate actual size
  const base64Length = dataUrl.split(",")[1]?.length || 0;
  return Math.round((base64Length * 3) / 4);
}

// Calculate compression percentage
export function calculateCompressionPercent(originalSize: number, newSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round((1 - newSize / originalSize) * 100);
}
