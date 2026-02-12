export interface PostProcessingConfig {
  enabled: boolean;
  /** Guided filter window radius (default 8) */
  guideRadius: number;
  /** Guided filter regularization epsilon (default 0.01) */
  guideEps: number;
  /** Sobel edge strength threshold for refinement (default 10) */
  edgeThreshold: number;
  /** Gaussian feathering radius for edge smoothing (default 2) */
  featherRadius: number;
}

export const DEFAULT_POST_PROCESSING_CONFIG: PostProcessingConfig = {
  enabled: true,
  guideRadius: 8,
  guideEps: 0.01,
  edgeThreshold: 10,
  featherRadius: 2,
};

export interface PostProcessMessage {
  type: "init" | "process";
  wasmJsUrl?: string;
  wasmBgUrl?: string;
  maskRgba?: ArrayBuffer;
  originalRgba?: ArrayBuffer;
  width?: number;
  height?: number;
  config?: PostProcessingConfig;
}

export interface PostProcessResult {
  type: "ready" | "result" | "error";
  rgba?: ArrayBuffer;
  width?: number;
  height?: number;
  message?: string;
}
