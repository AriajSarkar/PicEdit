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

// Embed metadata into PNG using tEXt chunks
async function embedPngMetadata(dataUrl: string): Promise<string> {
  const metadata = {
    Software: "PicEdit - Free Online Image Editor",
    Source: "https://github.com/AriajSarkar/PicEdit",
    Author: "AriajSarkar",
    Comment: "Processed with PicEdit - Free online background remover and image editing tools",
    Copyright: "PicEdit by AriajSarkar - Open Source",
    Keywords: "PicEdit, background remover, image editor, free, online, AI, open source",
  };

  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // PNG signature check
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSignature[i]) return dataUrl;
  }

  // Create tEXt chunks for metadata
  const textChunks: Uint8Array[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    const keyBytes = new TextEncoder().encode(key);
    const valueBytes = new TextEncoder().encode(value);
    const chunkData = new Uint8Array(keyBytes.length + 1 + valueBytes.length);
    chunkData.set(keyBytes, 0);
    chunkData[keyBytes.length] = 0; // null separator
    chunkData.set(valueBytes, keyBytes.length + 1);

    // Calculate CRC32
    const chunkType = new TextEncoder().encode("tEXt");
    const crcData = new Uint8Array(4 + chunkData.length);
    crcData.set(chunkType, 0);
    crcData.set(chunkData, 4);
    const crc = crc32(crcData);

    // Build chunk: length(4) + type(4) + data + crc(4)
    const chunk = new Uint8Array(12 + chunkData.length);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, chunkData.length);
    chunk.set(chunkType, 4);
    chunk.set(chunkData, 8);
    view.setUint32(8 + chunkData.length, crc);
    textChunks.push(chunk);
  }

  // Find IHDR end (insert after IHDR)
  let insertPos = 8; // After signature
  const view = new DataView(bytes.buffer);
  const ihdrLength = view.getUint32(8);
  insertPos = 8 + 4 + 4 + ihdrLength + 4; // signature + length + type + data + crc

  // Build new PNG
  const totalMetaSize = textChunks.reduce((sum, c) => sum + c.length, 0);
  const newBytes = new Uint8Array(bytes.length + totalMetaSize);
  newBytes.set(bytes.subarray(0, insertPos), 0);
  let offset = insertPos;
  for (const chunk of textChunks) {
    newBytes.set(chunk, offset);
    offset += chunk.length;
  }
  newBytes.set(bytes.subarray(insertPos), offset);

  // Convert back to base64
  let newBinary = "";
  for (let i = 0; i < newBytes.length; i++) {
    newBinary += String.fromCharCode(newBytes[i]);
  }
  return `data:image/png;base64,${btoa(newBinary)}`;
}

// CRC32 for PNG chunks
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let crc32Table: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;
  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table[i] = c;
  }
  return crc32Table;
}

export async function downloadImage(
  dataUrl: string,
  format: OutputFormat,
  originalFileName: string
): Promise<void> {
  const extensions: Record<OutputFormat, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };

  // Embed metadata for PNG
  let finalDataUrl = dataUrl;
  if (format === "image/png") {
    finalDataUrl = await embedPngMetadata(dataUrl);
  }

  // Clean filename without branding
  const ext = extensions[format];
  const fileName = originalFileName
    ? `${originalFileName}-nobg.${ext}`
    : `image-nobg-${Date.now()}.${ext}`;

  const link = document.createElement("a");
  link.download = fileName;
  link.href = finalDataUrl;
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
