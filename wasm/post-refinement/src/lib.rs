mod fast_guided_filter;
mod trimap;
mod shared_matting;
mod edge_refine;
mod poisson;
mod blur;

use wasm_bindgen::prelude::*;

/// High-performance post-refinement pipeline.
///
/// Pipeline: Trimap → Fast Guided Filter (s=4) → Shared Matting → Edge Refine → Poisson Smooth → Feather
///
/// Algorithmic choices for maximum speed:
/// - Trimap: O(n) BFS distance transform (not O(n*r²) brute-force)
/// - Guided Filter: Subsampled (s=4) with integral images (O(1) box mean)
/// - Shared Matting: Spiral search with early termination + multi-sample confidence
/// - Edge Refine: Scharr operator (better isotropy than Sobel, same cost)
/// - Poisson: SOR with ω=1.5 (2x faster convergence than Gauss-Seidel)
/// - Feather: Separable running-sum box blur
#[wasm_bindgen]
pub fn post_process(
    mask_rgba: &[u8],
    original_rgba: &[u8],
    width: u32,
    height: u32,
    guide_radius: u32,
    guide_eps: f32,
    edge_threshold: u32,
    feather_radius: u32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let npx = w * h;
    let expected = npx * 4;

    if mask_rgba.len() != expected || original_rgba.len() != expected {
        return mask_rgba.to_vec();
    }

    // === Fused extraction: alpha + guidance in one pass ===
    let mut alpha = vec![0.0f32; npx];
    let mut guide = vec![0.0f32; npx];
    let inv255 = 1.0 / 255.0;
    for i in 0..npx {
        let off = i * 4;
        alpha[i] = mask_rgba[off + 3] as f32 * inv255;
        guide[i] = (original_rgba[off] as f32 * 0.2126
            + original_rgba[off + 1] as f32 * 0.7152
            + original_rgba[off + 2] as f32 * 0.0722) * inv255;
    }

    // === Step 1: Trimap via BFS distance transform (O(n)) ===
    let trimap = trimap::generate_trimap_bfs(&alpha, w, h, 5);

    // === Step 2: Fast Guided Filter (subsampled) ===
    let subsample = 4usize.min(w.min(h) / 8).max(1);
    let mut refined = fast_guided_filter::fast_guided_filter(
        &guide,
        &alpha,
        w,
        h,
        guide_radius as usize,
        guide_eps,
        subsample,
    );

    // === Step 3: Shared Matting (unknown zone only) ===
    shared_matting::shared_matting(
        &mut refined,
        original_rgba,
        &trimap,
        w,
        h,
    );

    // === Step 4: Edge refinement with Scharr operator ===
    let edge_thresh = edge_threshold as f32 / 255.0;
    edge_refine::refine_edges_scharr(&mut refined, &guide, w, h, edge_thresh);

    // === Step 5: Poisson gradient smoothing (SOR) ===
    poisson::poisson_sor(&mut refined, &guide, w, h, 3);

    // === Step 6: Feathering ===
    if feather_radius > 0 {
        refined = blur::box_blur_separable(&refined, w, h, feather_radius as usize);
    }

    // === Compose output ===
    let mut output = mask_rgba.to_vec();
    for i in 0..npx {
        output[i * 4 + 3] = (refined[i] * 255.0).clamp(0.0, 255.0) as u8;
    }

    output
}
