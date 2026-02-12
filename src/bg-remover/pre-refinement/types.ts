export interface PreProcessingConfig {
  enabled: boolean;
  /** CLAHE contrast clip limit (default 2.0) */
  claheClipLimit: number;
  /** CLAHE grid tile count (default 8) */
  claheGridSize: number;
  /** Bilateral denoise radius (default 3, max 7) */
  noiseKernelSize: number;
  /** Laplacian sharpening strength (default 0.3) */
  sharpenStrength: number;
}

export const DEFAULT_PRE_PROCESSING_CONFIG: PreProcessingConfig = {
  enabled: true,
  claheClipLimit: 2.0,
  claheGridSize: 8,
  noiseKernelSize: 3,
  sharpenStrength: 0.3,
};

export interface PreProcessMessage {
  type: "init" | "process";
  wasmJsUrl?: string;
  wasmBgUrl?: string;
  rgba?: ArrayBuffer;
  width?: number;
  height?: number;
  config?: PreProcessingConfig;
}

export interface PreProcessResult {
  type: "ready" | "result" | "error";
  rgba?: ArrayBuffer;
  width?: number;
  height?: number;
  message?: string;
}
