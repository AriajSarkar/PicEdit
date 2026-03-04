/* tslint:disable */
/* eslint-disable */

/**
 * Chroma subsampling format
 */
export enum ChromaSampling {
    /**
     * Both vertically and horizontally subsampled.
     */
    Cs420 = 0,
    /**
     * Horizontally subsampled.
     */
    Cs422 = 1,
    /**
     * Not subsampled.
     */
    Cs444 = 2,
    /**
     * Monochrome.
     */
    Cs400 = 3,
}

/**
 * Composite RGBA pixels onto a solid background color.
 *
 * Uses gamma-correct (linear light) blending per the sRGB IEC 61966-2-1
 * transfer function. This prevents the dark fringing artifacts that naive
 * (gamma-ignorant) compositing produces at semi-transparent edges.
 *
 * Returns an RGBA buffer with all alpha values set to 255.
 */
export function alpha_composite(rgba: Uint8Array, width: number, height: number, bg_r: number, bg_g: number, bg_b: number): Uint8Array;

export function decode_tiff(data: Uint8Array): Uint8Array;

/**
 * Encode raw RGBA pixels to AVIF format.
 *
 * - `rgba`: flat RGBA pixel buffer (length = width × height × 4)
 * - `width`, `height`: image dimensions
 * - `quality`: 0.0–100.0 (higher = better quality, larger file)
 * - `speed`: 1–10 (1 = slowest/best compression, 10 = fastest)
 *
 * Returns the AVIF file bytes.
 */
export function encode_avif(rgba: Uint8Array, width: number, height: number, quality: number, speed: number): Uint8Array;

/**
 * Encode RGBA pixel buffer as a complete BMP file.
 *
 * `bits_per_pixel`:
 *   - 24 → RGB output (alpha stripped, uses BITMAPINFOHEADER)
 *   - 32 → BGRA output (alpha preserved, uses BITMAPV4HEADER with BI_BITFIELDS)
 *
 * Pixel data is stored bottom-up with proper row padding per the BMP spec.
 */
export function encode_bmp(rgba: Uint8Array, width: number, height: number, bits_per_pixel: number): Uint8Array;

/**
 * Encode RGBA pixel buffer as a multi-resolution ICO file.
 *
 * Generates an ICO containing one entry per requested size (1–256 px).
 * Source image is downscaled using area-average resampling, which is the
 * mathematically optimal filter for large reduction ratios as it considers
 * every source pixel's contribution to each destination pixel.
 *
 * Each entry is embedded as a 32-bit BMP with XOR + AND masks.
 */
export function encode_ico(rgba: Uint8Array, width: number, height: number, sizes_js: Uint32Array): Uint8Array;

/**
 * Generate a single ICO BMP entry (DIB data) for a given size.
 *
 * Downscales the source RGBA image to `target_size × target_size` using
 * area-average resampling, then produces the BMP-embedded data (no file header,
 * height×2, XOR+AND masks). Returns empty Vec if target_size > 256.
 *
 * Used by JavaScript to assemble ICO files mixing BMP (≤256) and PNG (>256) entries.
 */
export function encode_ico_entry(rgba: Uint8Array, width: number, height: number, target_size: number): Uint8Array;

/**
 * Encode RGBA pixel buffer as a TIFF file (uncompressed).
 *
 * Produces a baseline TIFF 6.0 compliant file:
 *   - Little-endian byte order
 *   - 8 bits per sample, 72 DPI
 *   - Uncompressed (Compression=1) for maximum viewer compatibility
 *
 * When `has_alpha` is true:
 *   - RGBA, 4 samples per pixel, ExtraSamples = 2 (unassociated alpha)
 * When `has_alpha` is false:
 *   - RGB, 3 samples per pixel (alpha stripped)
 *   - Compatible with Windows 11 Photos, macOS Preview, etc.
 */
export function encode_tiff(rgba: Uint8Array, width: number, height: number, has_alpha: boolean): Uint8Array;

/**
 * Downscale RGBA to a given square size via area-average resampling.
 *
 * Returns the resized RGBA pixel data (target_size × target_size × 4 bytes).
 * Used to generate PNG data for large ICO entries (>256px).
 */
export function resize_for_ico(rgba: Uint8Array, width: number, height: number, target_size: number): Uint8Array;

/**
 * Strip alpha channel: RGBA (4 bytes/pixel) → RGB (3 bytes/pixel).
 */
export function strip_alpha(rgba: Uint8Array, width: number, height: number): Uint8Array;

/**
 * Convert RGBA to grayscale using ITU-R BT.709 luminance coefficients.
 *
 * `Y = 0.2126 × R + 0.7152 × G + 0.0722 × B`
 *
 * Returns RGBA with R = G = B = luminance, alpha channel preserved.
 * Uses fixed-point integer arithmetic for speed (±1 LSB accuracy).
 */
export function to_grayscale(rgba: Uint8Array, width: number, height: number): Uint8Array;

/**
 * Trace RGBA pixels to SVG string.
 *
 * # Parameters
 * - `rgba`: flat RGBA pixel buffer (length = width × height × 4)
 * - `width`, `height`: image dimensions
 * - `color_mode`: "color" or "binary"
 * - `hierarchical`: "stacked" or "cutout"
 * - `filter_speckle`: remove patches smaller than this (area = value²)
 * - `color_precision`: color quantization 1-8
 * - `layer_difference`: color difference between layers 0-128
 * - `corner_threshold`: corner detection threshold in degrees 0-180
 * - `length_threshold`: minimum path segment length
 * - `splice_threshold`: angle threshold for splicing splines in degrees
 * - `max_iterations`: max curve fitting iterations
 * - `path_precision`: decimal precision for path coordinates, 0 = auto
 *
 * Returns SVG string on success.
 */
export function trace_to_svg(rgba: Uint8Array, width: number, height: number, color_mode: string, hierarchical: string, filter_speckle: number, color_precision: number, layer_difference: number, corner_threshold: number, length_threshold: number, splice_threshold: number, max_iterations: number, path_precision: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly alpha_composite: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly decode_tiff: (a: number, b: number, c: number) => void;
    readonly encode_avif: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly encode_bmp: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly encode_ico: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly encode_ico_entry: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly encode_tiff: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly resize_for_ico: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly strip_alpha: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly to_grayscale: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly trace_to_svg: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
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
