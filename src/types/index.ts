// ═══════════════════════════════════════════════════════════════════
// PicEdit — Shared Type Definitions (Barrel Re-export)
//
// Domain-specific types live in their own files:
//   image.ts      — OutputFormat, ImageInfo, DEFAULT_IMAGE_INFO
//   bgRemover.ts  — DeviceType, ModelType, EditorState, HistoryItem, etc.
//   compressor.ts — CompressionMode, CompressionSettings, CompressedImage, etc.
//   worker.ts     — TaskStatus, WorkerTask, WorkerResult, PoolTaskInfo
// ═══════════════════════════════════════════════════════════════════

export * from './image';
export * from './bgRemover';
export * from './compressor';
export * from './worker';
