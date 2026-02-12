mod quantize;
mod ssim;
mod denoise;
mod png_filter;

use wasm_bindgen::prelude::*;

// PicEdit — Production-Grade Image Compression Pipeline (WASM)
//
// Pipeline: Adaptive Denoise → Perceptual Quantization → Filter Select
//
// Algorithms:
// - Bilateral denoise: Edge-preserving noise removal (noise compresses poorly)
// - Median-cut color quantization: Optimal palette with perceptual distance
// - Floyd-Steinberg dithering: Eliminate banding in quantized images
// - Per-row PNG filter selection: Minimize entropy for deflate compression
// - SSIM computation: Structural similarity for quality verification

/// Pre-process image for maximum compression efficiency.
/// Applies adaptive denoising to remove high-frequency noise that wastes bits.
/// Returns pre-processed RGBA buffer.
#[wasm_bindgen]
pub fn optimize_for_compression(
    rgba: &[u8],
    width: u32,
    height: u32,
    strength: f32,  // 0.0-1.0: compression aggressiveness
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return rgba.to_vec();
    }

    let mut buf = rgba.to_vec();

    // Stage 1: Edge-preserving denoise (removes noise that inflates file size)
    // Stronger compression = more aggressive denoising
    let denoise_radius = if strength > 0.3 { 2 } else { 1 };
    let denoise_strength = (strength * 0.5).clamp(0.05, 0.4);
    denoise::bilateral_denoise(&mut buf, w, h, denoise_radius, denoise_strength);

    // Stage 2: Chroma smoothing for areas with low luminance contrast
    // Human eyes are less sensitive to color than brightness
    if strength > 0.5 {
        denoise::chroma_smooth(&mut buf, w, h, strength);
    }

    buf
}

/// Quantize colors using median-cut algorithm with Floyd-Steinberg dithering.
/// Reduces unique color count for better compression.
/// `max_colors`: target palette size (2-256)
#[wasm_bindgen]
pub fn quantize_colors(
    rgba: &[u8],
    width: u32,
    height: u32,
    max_colors: u32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 || max_colors < 2 {
        return rgba.to_vec();
    }

    quantize::median_cut_quantize(rgba, w, h, max_colors as usize)
}

/// Calculate Structural Similarity Index (SSIM) between two images.
/// Returns value in [0, 1] where 1 = identical.
/// Uses luminance channel for fast computation.
#[wasm_bindgen]
pub fn calculate_ssim(
    img_a: &[u8],
    img_b: &[u8],
    width: u32,
    height: u32,
) -> f32 {
    let w = width as usize;
    let h = height as usize;
    let npx = w * h;
    if img_a.len() != npx * 4 || img_b.len() != npx * 4 {
        return 0.0;
    }

    ssim::compute_ssim(img_a, img_b, w, h)
}

/// Select optimal PNG row filters for each scanline.
/// Returns a byte array where byte[i] = optimal filter type for row i.
/// Filter types: 0=None, 1=Sub, 2=Up, 3=Average, 4=Paeth
#[wasm_bindgen]
pub fn select_png_filters(
    rgba: &[u8],
    width: u32,
    height: u32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return vec![0u8; h];
    }

    png_filter::select_optimal_filters(rgba, w, h)
}
