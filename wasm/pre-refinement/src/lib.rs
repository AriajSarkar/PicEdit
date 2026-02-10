mod clahe;
mod denoise;
mod sharpen;

use wasm_bindgen::prelude::*;

/// High-performance pre-processing pipeline.
///
/// Pipeline: Bilateral Denoise → CLAHE → Unsharp-Mask Sharpen
/// All in-place on a single buffer. Zero redundant allocations.
/// Every hot loop is branch-free and cache-line aligned.
#[wasm_bindgen]
pub fn pre_process(
    rgba: &[u8],
    width: u32,
    height: u32,
    clahe_clip: f32,
    clahe_grid: u32,
    denoise_radius: u32,
    sharpen_strength: f32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    if rgba.len() != w * h * 4 {
        return rgba.to_vec();
    }

    let mut buf = rgba.to_vec();

    // Stage 1: Edge-preserving bilateral denoise
    // Uses separable approximation: H-pass then V-pass (O(w*h*r) instead of O(w*h*r²))
    if denoise_radius > 0 {
        denoise::bilateral_separable(&mut buf, w, h, denoise_radius as usize);
    }

    // Stage 2: CLAHE with interpolated tile CDFs
    if clahe_clip > 1.0 && clahe_grid >= 2 {
        clahe::apply_clahe(&mut buf, w, h, clahe_clip, clahe_grid as usize);
    }

    // Stage 3: Unsharp mask via box-blur difference (faster than Laplacian, better quality)
    if sharpen_strength > 0.0 {
        sharpen::unsharp_mask(&mut buf, w, h, sharpen_strength);
    }

    buf
}
