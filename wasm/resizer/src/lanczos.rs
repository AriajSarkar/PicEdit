// Lanczos3 and Bilinear separable resize filters.
//
// Lanczos3: sinc(x) · sinc(x/3), support radius = 3
// Bilinear: max(0, 1-|x|),         support radius = 1
//
// Both are separable: resize horizontally first, then vertically.
// This reduces O(N·M·K²) to O(N·M·K) for each pass.

use std::f64::consts::PI;

const LANCZOS_A: f64 = 3.0;

#[inline(always)]
fn sinc(x: f64) -> f64 {
    if x.abs() < 1e-8 {
        1.0
    } else {
        let px = PI * x;
        px.sin() / px
    }
}

#[inline(always)]
fn lanczos3_weight(x: f64) -> f64 {
    let ax = x.abs();
    if ax >= LANCZOS_A {
        0.0
    } else {
        sinc(x) * sinc(x / LANCZOS_A)
    }
}

#[inline(always)]
fn bilinear_weight(x: f64) -> f64 {
    let ax = x.abs();
    if ax >= 1.0 {
        0.0
    } else {
        1.0 - ax
    }
}

// ── Horizontal resize ───────────────────────────────────────────────────────

pub fn resize_horizontal_lanczos3(src: &[u8], sw: usize, sh: usize, dw: usize) -> Vec<u8> {
    resize_horizontal(src, sw, sh, dw, LANCZOS_A, lanczos3_weight)
}

pub fn resize_horizontal_bilinear(src: &[u8], sw: usize, sh: usize, dw: usize) -> Vec<u8> {
    resize_horizontal(src, sw, sh, dw, 1.0, bilinear_weight)
}

fn resize_horizontal(
    src: &[u8],
    sw: usize,
    sh: usize,
    dw: usize,
    support: f64,
    weight_fn: fn(f64) -> f64,
) -> Vec<u8> {
    let mut dst = vec![0u8; dw * sh * 4];
    let ratio = sw as f64 / dw as f64;
    // When downscaling, widen the filter to avoid aliasing
    let filter_scale = ratio.max(1.0);
    let rad = (support * filter_scale).ceil() as isize;

    for y in 0..sh {
        let src_row = y * sw * 4;
        let dst_row = y * dw * 4;

        for x in 0..dw {
            let center = (x as f64 + 0.5) * ratio - 0.5;
            let left = (center - rad as f64).ceil() as isize;
            let right = (center + rad as f64).floor() as isize;

            let mut sum_r = 0.0f64;
            let mut sum_g = 0.0f64;
            let mut sum_b = 0.0f64;
            let mut sum_a = 0.0f64;
            let mut sum_w = 0.0f64;

            for i in left..=right {
                let sx = i.clamp(0, sw as isize - 1) as usize;
                let dist = (i as f64 - center) / filter_scale;
                let w = weight_fn(dist);
                if w == 0.0 {
                    continue;
                }
                let off = src_row + sx * 4;
                sum_r += src[off] as f64 * w;
                sum_g += src[off + 1] as f64 * w;
                sum_b += src[off + 2] as f64 * w;
                sum_a += src[off + 3] as f64 * w;
                sum_w += w;
            }

            if sum_w > 0.0 {
                let inv = 1.0 / sum_w;
                let off = dst_row + x * 4;
                dst[off] = (sum_r * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 1] = (sum_g * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 2] = (sum_b * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 3] = (sum_a * inv + 0.5).clamp(0.0, 255.0) as u8;
            }
        }
    }
    dst
}

// ── Vertical resize ─────────────────────────────────────────────────────────

pub fn resize_vertical_lanczos3(src: &[u8], sw: usize, sh: usize, dh: usize) -> Vec<u8> {
    resize_vertical(src, sw, sh, dh, LANCZOS_A, lanczos3_weight)
}

pub fn resize_vertical_bilinear(src: &[u8], sw: usize, sh: usize, dh: usize) -> Vec<u8> {
    resize_vertical(src, sw, sh, dh, 1.0, bilinear_weight)
}

fn resize_vertical(
    src: &[u8],
    sw: usize,
    sh: usize,
    dh: usize,
    support: f64,
    weight_fn: fn(f64) -> f64,
) -> Vec<u8> {
    let mut dst = vec![0u8; sw * dh * 4];
    let ratio = sh as f64 / dh as f64;
    let filter_scale = ratio.max(1.0);
    let rad = (support * filter_scale).ceil() as isize;

    for y in 0..dh {
        let center = (y as f64 + 0.5) * ratio - 0.5;
        let top = (center - rad as f64).ceil() as isize;
        let bottom = (center + rad as f64).floor() as isize;

        let dst_row = y * sw * 4;

        for x in 0..sw {
            let mut sum_r = 0.0f64;
            let mut sum_g = 0.0f64;
            let mut sum_b = 0.0f64;
            let mut sum_a = 0.0f64;
            let mut sum_w = 0.0f64;

            for j in top..=bottom {
                let sy = j.clamp(0, sh as isize - 1) as usize;
                let dist = (j as f64 - center) / filter_scale;
                let w = weight_fn(dist);
                if w == 0.0 {
                    continue;
                }
                let off = sy * sw * 4 + x * 4;
                sum_r += src[off] as f64 * w;
                sum_g += src[off + 1] as f64 * w;
                sum_b += src[off + 2] as f64 * w;
                sum_a += src[off + 3] as f64 * w;
                sum_w += w;
            }

            if sum_w > 0.0 {
                let inv = 1.0 / sum_w;
                let off = dst_row + x * 4;
                dst[off] = (sum_r * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 1] = (sum_g * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 2] = (sum_b * inv + 0.5).clamp(0.0, 255.0) as u8;
                dst[off + 3] = (sum_a * inv + 0.5).clamp(0.0, 255.0) as u8;
            }
        }
    }
    dst
}
