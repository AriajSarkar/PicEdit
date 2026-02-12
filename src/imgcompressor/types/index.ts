// Compressor-specific worker message types

export interface CompressorConfig {
  /** Compression quality 0.0-1.0 (1.0 = best quality, larger file) */
  quality: number;
  /** Target output format */
  format: 'jpeg' | 'png' | 'webp';
  /** Enable WASM-based perceptual optimization */
  enableWasmOptimize: boolean;
  /** Strength of pre-compression optimization 0.0-1.0 */
  optimizeStrength: number;
  /** Max colors for PNG quantization (0 = disabled, 2-256) */
  maxColors: number;
  /** Enable SSIM quality verification */
  verifySsim: boolean;
  /** Target file size in bytes (0 = disabled, use quality slider instead) */
  targetSize: number;
  /** Max width/height for resize (0 = no resize) */
  maxDimension: number;
}

export const DEFAULT_COMPRESSOR_CONFIG: CompressorConfig = {
  quality: 0.8,
  format: 'jpeg',
  enableWasmOptimize: true,
  optimizeStrength: 0.5,
  maxColors: 0,
  verifySsim: false,
  targetSize: 0,
  maxDimension: 0,
};

export interface CompressWorkerMessage {
  type: 'init' | 'optimize' | 'quantize' | 'ssim' | 'png-filters';
  wasmJsUrl?: string;
  wasmBgUrl?: string;
  // optimize
  rgba?: ArrayBuffer;
  width?: number;
  height?: number;
  strength?: number;
  // quantize
  maxColors?: number;
  // ssim
  imgA?: ArrayBuffer;
  imgB?: ArrayBuffer;
}

export interface CompressWorkerResult {
  type: 'ready' | 'optimized' | 'quantized' | 'ssim-result' | 'png-filters-result' | 'error';
  rgba?: ArrayBuffer;
  width?: number;
  height?: number;
  ssim?: number;
  filters?: Uint8Array;
  message?: string;
}
