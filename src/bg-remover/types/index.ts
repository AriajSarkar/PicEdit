export type DeviceType = "cpu" | "gpu";
export type ModelType = "isnet" | "isnet_fp16" | "isnet_quint8";
export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";
export type BackgroundType = "transparent" | "solid" | "image" | "blur";

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
  // New compression fields
  compressionEnabled: boolean;
  compressionScale: number; // 0.1 to 1.0
}

export interface ImageInfo {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  type: string;
}

export interface HistoryItem {
  id: string;
  originalImage: string;
  processedImage: string;
  model: ModelType;
  device: DeviceType;
  timestamp: number;
  editorState: EditorState;
  imageInfo: ImageInfo;
}

export interface ProcessingProgress {
  stage: "downloading" | "processing" | "complete" | "error";
  progress: number;
  message: string;
}

export interface ModelCacheStatus {
  model: ModelType;
  device: DeviceType;
  cached: boolean;
  loading: boolean;
  error: string | null;
  sizeBytes: number | null;
}

export const MODEL_INFO: Record<ModelType, { name: string; size: string; sizeBytes: number; precision: string }> = {
  isnet_quint8: { name: "Fast", size: "~20MB", sizeBytes: 20 * 1024 * 1024, precision: "Good" },
  isnet_fp16: { name: "Balanced", size: "~40MB", sizeBytes: 40 * 1024 * 1024, precision: "Better" },
  isnet: { name: "Precise", size: "~80MB", sizeBytes: 80 * 1024 * 1024, precision: "Best" },
};

export const MODEL_HIERARCHY: ModelType[] = ["isnet_quint8", "isnet_fp16", "isnet"];

export const DEFAULT_EDITOR_STATE: EditorState = {
  backgroundType: "transparent",
  backgroundColor: "#000000",
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
  outputFormat: "image/png",
  outputQuality: 0.9,
  compressionEnabled: false,
  compressionScale: 1.0,
};

export const DEFAULT_IMAGE_INFO: ImageInfo = {
  fileName: "",
  fileSize: 0,
  width: 0,
  height: 0,
  type: "",
};
