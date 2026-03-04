// ═══════════════════════════════════════════════════════════════════
// Background Remover Types
// ═══════════════════════════════════════════════════════════════════

import type { OutputFormat } from './image';

export type DeviceType = 'cpu' | 'gpu';
export type ModelType = 'isnet' | 'isnet_fp16' | 'isnet_quint8';
export type BackgroundType = 'transparent' | 'solid' | 'image' | 'blur';

export interface EditorState {
	backgroundType: BackgroundType;
	backgroundColor: string;
	backgroundImage: string | null;
	backgroundBlur: number;
	width: number;
	height: number;
	originalWidth: number;
	originalHeight: number;
	aspectLocked: boolean;
	rotation: number;
	flipH: boolean;
	flipV: boolean;
	cropX: number;
	cropY: number;
	cropWidth: number;
	cropHeight: number;
	outputFormat: OutputFormat;
	outputQuality: number;
	compressionEnabled: boolean;
	compressionScale: number;
}

export interface HistoryItem {
	id: string;
	originalImage: string;
	processedImage: string;
	model: ModelType;
	device: DeviceType;
	timestamp: number;
	editorState: EditorState;
	imageInfo: import('./image').ImageInfo;
}

export type ProcessingStage =
	| 'preprocessing'
	| 'downloading'
	| 'processing'
	| 'postprocessing'
	| 'complete'
	| 'error';

export interface ProcessingProgress {
	stage: ProcessingStage;
	progress: number;
	message: string;
	bytesLoaded?: number;
	bytesTotal?: number;
	speed?: number;
	elapsed?: number;
}

export interface ModelCacheStatus {
	model: ModelType;
	device: DeviceType;
	cached: boolean;
	loading: boolean;
	error: string | null;
	sizeBytes: number | null;
}

export const MODEL_INFO: Record<
	ModelType,
	{ name: string; size: string; sizeBytes: number; precision: string }
> = {
	isnet_quint8: {
		name: 'Fast',
		size: '~20MB',
		sizeBytes: 20 * 1024 * 1024,
		precision: 'Good',
	},
	isnet_fp16: {
		name: 'Balanced',
		size: '~40MB',
		sizeBytes: 40 * 1024 * 1024,
		precision: 'Better',
	},
	isnet: {
		name: 'Precise',
		size: '~80MB',
		sizeBytes: 80 * 1024 * 1024,
		precision: 'Best',
	},
};

export const MODEL_HIERARCHY: ModelType[] = ['isnet_quint8', 'isnet_fp16', 'isnet'];

export const DEFAULT_EDITOR_STATE: EditorState = {
	backgroundType: 'transparent',
	backgroundColor: '#000000',
	backgroundImage: null,
	backgroundBlur: 0,
	width: 0,
	height: 0,
	originalWidth: 0,
	originalHeight: 0,
	aspectLocked: true,
	rotation: 0,
	flipH: false,
	flipV: false,
	cropX: 0,
	cropY: 0,
	cropWidth: 0,
	cropHeight: 0,
	outputFormat: 'image/png',
	outputQuality: 0.9,
	compressionEnabled: false,
	compressionScale: 1.0,
};
