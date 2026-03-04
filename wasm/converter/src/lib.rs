// PicEdit — Image Format Converter WASM Module
//
// Production-grade format encoding/decoding algorithms for formats browsers
// can't natively handle: BMP, ICO, TIFF. Also provides gamma-correct alpha
// compositing and color-space utilities that run at near-native speed.
//
// Encoding: zero crates.io deps (beyond wasm-bindgen interface).
// Decoding: uses the `tiff` crate for robust TIFF file support.
//
// Algorithms & references:
//   - Alpha compositing: Porter & Duff, "Compositing Digital Images", SIGGRAPH 1984
//   - sRGB transfer function: IEC 61966-2-1:1999
//   - BMP encoding: Microsoft BMP file format specification (BITMAPINFOHEADER / V4)
//   - ICO encoding: Microsoft ICO file format specification
//   - TIFF encoding: TIFF Revision 6.0, Adobe Systems, June 1992
//   - PackBits compression: Apple Computer Technical Note TN1023
//   - Grayscale conversion: ITU-R Recommendation BT.709-6 (06/2015)
//   - Area-average resampling: optimal box-filter downscaling

mod alpha;
mod avif;
mod bmp;
mod color;
mod ico;
mod resize;
mod svg_trace;
mod tiff;
mod tiff_decode;

pub use tiff_decode::decode_tiff;

use wasm_bindgen::prelude::*;

// ─── Alpha Compositing ──────────────────────────────────────────────────────

/// Composite RGBA pixels onto a solid background color.
///
/// Uses gamma-correct (linear light) blending per the sRGB IEC 61966-2-1
/// transfer function. This prevents the dark fringing artifacts that naive
/// (gamma-ignorant) compositing produces at semi-transparent edges.
///
/// Returns an RGBA buffer with all alpha values set to 255.
#[wasm_bindgen]
pub fn alpha_composite(
    rgba: &[u8],
    width: u32,
    height: u32,
    bg_r: u8,
    bg_g: u8,
    bg_b: u8,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return rgba.to_vec();
    }
    alpha::composite_over(rgba, w, h, bg_r, bg_g, bg_b)
}

// ─── BMP Encoding ───────────────────────────────────────────────────────────

/// Encode RGBA pixel buffer as a complete BMP file.
///
/// `bits_per_pixel`:
///   - 24 → RGB output (alpha stripped, uses BITMAPINFOHEADER)
///   - 32 → BGRA output (alpha preserved, uses BITMAPV4HEADER with BI_BITFIELDS)
///
/// Pixel data is stored bottom-up with proper row padding per the BMP spec.
#[wasm_bindgen]
pub fn encode_bmp(rgba: &[u8], width: u32, height: u32, bits_per_pixel: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return Vec::new();
    }
    match bits_per_pixel {
        24 => bmp::encode_bmp24(rgba, w, h),
        _ => bmp::encode_bmp32(rgba, w, h),
    }
}

// ─── ICO Encoding ───────────────────────────────────────────────────────────

/// Encode RGBA pixel buffer as a multi-resolution ICO file.
///
/// Generates an ICO containing one entry per requested size (1–256 px).
/// Source image is downscaled using area-average resampling, which is the
/// mathematically optimal filter for large reduction ratios as it considers
/// every source pixel's contribution to each destination pixel.
///
/// Each entry is embedded as a 32-bit BMP with XOR + AND masks.
#[wasm_bindgen]
pub fn encode_ico(rgba: &[u8], width: u32, height: u32, sizes_js: &[u32]) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 || sizes_js.is_empty() {
        return Vec::new();
    }
    let sizes: Vec<usize> = sizes_js.iter().map(|&s| s as usize).collect();
    ico::encode_ico_multi(rgba, w, h, &sizes)
}

/// Generate a single ICO BMP entry (DIB data) for a given size.
///
/// Downscales the source RGBA image to `target_size × target_size` using
/// area-average resampling, then produces the BMP-embedded data (no file header,
/// height×2, XOR+AND masks). Returns empty Vec if target_size > 256.
///
/// Used by JavaScript to assemble ICO files mixing BMP (≤256) and PNG (>256) entries.
#[wasm_bindgen]
pub fn encode_ico_entry(rgba: &[u8], width: u32, height: u32, target_size: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let sz = target_size as usize;
    if rgba.len() != w * h * 4 || sz == 0 || sz > 256 {
        return Vec::new();
    }
    let resized = if sz == w && sz == h {
        rgba.to_vec()
    } else {
        resize::area_average(rgba, w, h, sz, sz)
    };
    ico::encode_ico_bmp_entry(&resized, sz, sz)
}

/// Downscale RGBA to a given square size via area-average resampling.
///
/// Returns the resized RGBA pixel data (target_size × target_size × 4 bytes).
/// Used to generate PNG data for large ICO entries (>256px).
#[wasm_bindgen]
pub fn resize_for_ico(rgba: &[u8], width: u32, height: u32, target_size: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let sz = target_size as usize;
    if rgba.len() != w * h * 4 || sz == 0 {
        return Vec::new();
    }
    if sz == w && sz == h {
        return rgba.to_vec();
    }
    resize::area_average(rgba, w, h, sz, sz)
}

// ─── TIFF Encoding ──────────────────────────────────────────────────────────

/// Encode RGBA pixel buffer as a TIFF file (uncompressed).
///
/// Produces a baseline TIFF 6.0 compliant file:
///   - Little-endian byte order
///   - 8 bits per sample, 72 DPI
///   - Uncompressed (Compression=1) for maximum viewer compatibility
///
/// When `has_alpha` is true:
///   - RGBA, 4 samples per pixel, ExtraSamples = 2 (unassociated alpha)
/// When `has_alpha` is false:
///   - RGB, 3 samples per pixel (alpha stripped)
///   - Compatible with Windows 11 Photos, macOS Preview, etc.
#[wasm_bindgen]
pub fn encode_tiff(rgba: &[u8], width: u32, height: u32, has_alpha: bool) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return Vec::new();
    }
    tiff::encode_tiff(rgba, w, h, has_alpha)
}

// ─── Color Utilities ────────────────────────────────────────────────────────

/// Convert RGBA to grayscale using ITU-R BT.709 luminance coefficients.
///
/// `Y = 0.2126 × R + 0.7152 × G + 0.0722 × B`
///
/// Returns RGBA with R = G = B = luminance, alpha channel preserved.
/// Uses fixed-point integer arithmetic for speed (±1 LSB accuracy).
#[wasm_bindgen]
pub fn to_grayscale(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return rgba.to_vec();
    }
    color::rgba_to_grayscale(rgba)
}

/// Strip alpha channel: RGBA (4 bytes/pixel) → RGB (3 bytes/pixel).
#[wasm_bindgen]
pub fn strip_alpha(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return Vec::new();
    }
    color::rgba_to_rgb(rgba)
}

// ─── AVIF Encoding ──────────────────────────────────────────────────────────

/// Encode raw RGBA pixels to AVIF format.
///
/// - `rgba`: flat RGBA pixel buffer (length = width × height × 4)
/// - `width`, `height`: image dimensions
/// - `quality`: 0.0–100.0 (higher = better quality, larger file)
/// - `speed`: 1–10 (1 = slowest/best compression, 10 = fastest)
///
/// Returns the AVIF file bytes.
#[wasm_bindgen]
pub fn encode_avif(
    rgba: &[u8],
    width: u32,
    height: u32,
    quality: f32,
    speed: u8,
) -> Result<Vec<u8>, JsError> {
    avif::encode(rgba, width as usize, height as usize, quality, speed)
        .map_err(|e| JsError::new(&e))
}

// ─── SVG Vectorization ──────────────────────────────────────────────────────

/// Trace RGBA pixels to SVG string.
///
/// # Parameters
/// - `rgba`: flat RGBA pixel buffer (length = width × height × 4)
/// - `width`, `height`: image dimensions
/// - `color_mode`: "color" or "binary"
/// - `hierarchical`: "stacked" or "cutout"
/// - `filter_speckle`: remove patches smaller than this (area = value²)
/// - `color_precision`: color quantization 1-8
/// - `layer_difference`: color difference between layers 0-128
/// - `corner_threshold`: corner detection threshold in degrees 0-180
/// - `length_threshold`: minimum path segment length
/// - `splice_threshold`: angle threshold for splicing splines in degrees
/// - `max_iterations`: max curve fitting iterations
/// - `path_precision`: decimal precision for path coordinates, 0 = auto
///
/// Returns SVG string on success.
#[wasm_bindgen]
pub fn trace_to_svg(
    rgba: &[u8],
    width: u32,
    height: u32,
    color_mode: &str,
    hierarchical: &str,
    filter_speckle: u32,
    color_precision: i32,
    layer_difference: i32,
    corner_threshold: i32,
    length_threshold: f64,
    splice_threshold: i32,
    max_iterations: u32,
    path_precision: u32,
) -> Result<String, JsError> {
    svg_trace::trace(
        rgba,
        width as usize,
        height as usize,
        color_mode,
        hierarchical,
        filter_speckle as usize,
        color_precision,
        layer_difference,
        corner_threshold,
        length_threshold,
        splice_threshold,
        max_iterations as usize,
        path_precision,
    )
    .map_err(|e| JsError::new(&e))
}
