// PicEdit — High-Quality Image Resizer (WASM)
//
// Separable Lanczos3 resampling with proper alpha handling.
// Pipeline: premultiply alpha → resize width → resize height → unpremultiply
//
// Filter types:
//   0 = Lanczos3 (best quality, default)
//   1 = Bilinear (fast, acceptable quality)

mod lanczos;

use wasm_bindgen::prelude::*;

/// Resize RGBA pixel buffer from (src_w × src_h) to (dst_w × dst_h).
///
/// `filter`: 0 = Lanczos3, 1 = Bilinear
///
/// Returns resized RGBA buffer (dst_w × dst_h × 4 bytes).
#[wasm_bindgen]
pub fn resize_rgba(
    rgba: &[u8],
    src_w: u32,
    src_h: u32,
    dst_w: u32,
    dst_h: u32,
    filter: u32,
) -> Vec<u8> {
    let sw = src_w as usize;
    let sh = src_h as usize;
    let dw = dst_w as usize;
    let dh = dst_h as usize;

    // Validate input
    if rgba.len() != sw * sh * 4 || dw == 0 || dh == 0 {
        return vec![0u8; dw * dh * 4];
    }

    // No-op if dimensions match
    if sw == dw && sh == dh {
        return rgba.to_vec();
    }

    // Premultiply alpha for correct filtering
    let mut premul = premultiply_alpha(rgba);

    // Separable resize: horizontal, then vertical
    let intermediate = match filter {
        1 => lanczos::resize_horizontal_bilinear(&premul, sw, sh, dw),
        _ => lanczos::resize_horizontal_lanczos3(&premul, sw, sh, dw),
    };
    let resized = match filter {
        1 => lanczos::resize_vertical_bilinear(&intermediate, dw, sh, dh),
        _ => lanczos::resize_vertical_lanczos3(&intermediate, dw, sh, dh),
    };

    // Reuse premul buffer for output (avoids extra allocation if same size)
    premul = resized;
    unpremultiply_alpha(&mut premul);

    premul
}

// ── Alpha handling ──────────────────────────────────────────────────────────

fn premultiply_alpha(rgba: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(rgba.len());
    for chunk in rgba.chunks_exact(4) {
        let a = chunk[3] as f32 / 255.0;
        out.push((chunk[0] as f32 * a + 0.5) as u8);
        out.push((chunk[1] as f32 * a + 0.5) as u8);
        out.push((chunk[2] as f32 * a + 0.5) as u8);
        out.push(chunk[3]);
    }
    out
}

fn unpremultiply_alpha(rgba: &mut [u8]) {
    for chunk in rgba.chunks_exact_mut(4) {
        let a = chunk[3];
        if a == 0 {
            chunk[0] = 0;
            chunk[1] = 0;
            chunk[2] = 0;
        } else if a < 255 {
            let inv = 255.0 / a as f32;
            chunk[0] = (chunk[0] as f32 * inv + 0.5).min(255.0) as u8;
            chunk[1] = (chunk[1] as f32 * inv + 0.5).min(255.0) as u8;
            chunk[2] = (chunk[2] as f32 * inv + 0.5).min(255.0) as u8;
        }
    }
}
