// ═══════════════════════════════════════════════════════════════════
// Image Compressor Types
// ═══════════════════════════════════════════════════════════════════

import type { OutputFormat } from './image';

export type CompressionMode = 'quality' | 'size';

export interface CompressionSettings {
	quality: number; // 0-100, target quality percentage
	targetSizeKB: number; // Target size in KB (for size mode)
	mode: CompressionMode;
	format: OutputFormat;
	preserveExif: boolean;
	useWasmOptimize: boolean;
}

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
	quality: 80,
	targetSizeKB: 500,
	mode: 'quality',
	format: 'image/webp',
	preserveExif: false,
	useWasmOptimize: true,
};

export interface CompressedImage {
	id: string;
	originalFile: File;
	originalDataUrl: string;
	compressedDataUrl: string;
	originalSize: number;
	compressedSize: number;
	width: number;
	height: number;
	format: OutputFormat;
	quality: number;
	ssim: number; // Structural similarity 0-1
	status: 'queued' | 'processing' | 'complete' | 'error';
	error?: string;
	progress: number;
}

export interface CompressorProgress {
	totalImages: number;
	completedImages: number;
	currentImage: string;
	overallProgress: number;
	currentProgress: number;
	stage: 'optimizing' | 'compressing' | 'analyzing' | 'complete' | 'error';
	message: string;
}
