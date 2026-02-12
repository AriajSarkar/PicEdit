// ═══════════════════════════════════════════════════════════════════
// PicEdit — Shared Image Utilities
// ═══════════════════════════════════════════════════════════════════

import type { ImageInfo, OutputFormat } from "@/types";

/** Create an offscreen canvas of the given dimensions */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Load an image element from a data URL or src string */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Read a File as a data URL string */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extract metadata from a File object (width/height set to 0 until image loads) */
export function getImageInfo(file: File): ImageInfo {
  const lastDot = file.name.lastIndexOf(".");
  const fileName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
  return {
    fileName,
    fileSize: file.size,
    width: 0,
    height: 0,
    type: file.type,
  };
}

/** Generate a unique string ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Format bytes to human-readable string (e.g. 1.2 MB) */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(abs) / Math.log(k));
  return `${sign}${parseFloat((abs / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Estimate the raw byte size of a base64 data URL */
export function estimateDataUrlSize(dataUrl: string): number {
  const base64Length = dataUrl.split(",")[1]?.length || 0;
  return Math.round((base64Length * 3) / 4);
}

/** Calculate compression percentage between two sizes */
export function calculateCompressionPercent(originalSize: number, newSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round((1 - newSize / originalSize) * 100);
}

/** Convert data URL to Blob */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Get extension string from OutputFormat */
export function formatToExtension(format: OutputFormat): string {
  const map: Record<OutputFormat, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return map[format];
}

/** Download a data URL as a file */
export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
