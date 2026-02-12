/* tslint:disable */
/* eslint-disable */

/**
 * Calculate Structural Similarity Index (SSIM) between two images.
 * Returns value in [0, 1] where 1 = identical.
 * Uses luminance channel for fast computation.
 */
export function calculate_ssim(img_a: Uint8Array, img_b: Uint8Array, width: number, height: number): number;

/**
 * Pre-process image for maximum compression efficiency.
 * Applies adaptive denoising to remove high-frequency noise that wastes bits.
 * Returns pre-processed RGBA buffer.
 */
export function optimize_for_compression(rgba: Uint8Array, width: number, height: number, strength: number): Uint8Array;

/**
 * Quantize colors using median-cut algorithm with Floyd-Steinberg dithering.
 * Reduces unique color count for better compression.
 * `max_colors`: target palette size (2-256)
 */
export function quantize_colors(rgba: Uint8Array, width: number, height: number, max_colors: number): Uint8Array;

/**
 * Select optimal PNG row filters for each scanline.
 * Returns a byte array where byte[i] = optimal filter type for row i.
 * Filter types: 0=None, 1=Sub, 2=Up, 3=Average, 4=Paeth
 */
export function select_png_filters(rgba: Uint8Array, width: number, height: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_ssim: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly optimize_for_compression: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly quantize_colors: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly select_png_filters: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
