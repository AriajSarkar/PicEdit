// ═══════════════════════════════════════════════════════════════════
// PicEdit — Area-Average Image Downscaler
//
// Optimal resampling algorithm for large downscale ratios (e.g. 1024→16).
// For each destination pixel, computes the weighted average of ALL source
// pixels that contribute to it, with weights proportional to overlap area.
//
// This is mathematically equivalent to a box filter with support equal to
// the downscale ratio (src_size / dst_size), which is the ideal
// anti-aliasing filter for integer and fractional downsampling.
//
// Why area-average instead of Lanczos/bilinear:
//   - Lanczos-3 has a 6-pixel support window, which is far too small for
//     large reductions like 1024→16 (64:1 ratio). It would alias badly.
//   - Bilinear only interpolates between 4 nearest pixels — it misses
//     most of the source information at high reduction ratios.
//   - Area-average considers ALL source pixels in the mapped rectangle,
//     producing the most faithful downscaled representation.
//
// Algorithm:
//   For destination pixel (dx, dy), the corresponding source rectangle is:
//     x0 = dx × (src_w / dst_w)
//     x1 = (dx + 1) × (src_w / dst_w)
//     y0 = dy × (src_h / dst_h)
//     y1 = (dy + 1) × (src_h / dst_h)
//
//   The output color is the weighted sum of all source pixels overlapping
//   this rectangle, where each weight equals the fractional overlap area.
//
// Reference:
//   - Smith, A.R. "A Pixel Is Not A Little Square", Microsoft Technical
//     Memo 6, July 1995 — defines proper pixel reconstruction theory
//   - Wolberg, G. "Digital Image Warping", IEEE Computer Society Press,
//     1990, §3.4 — box filter analysis for arbitrary resampling
// ═══════════════════════════════════════════════════════════════════

/// Downscale an RGBA image using area-average resampling.
///
/// Each destination pixel's value is the area-weighted average of all
/// source pixels that map to it. Handles fractional pixel boundaries
/// correctly for non-integer scale ratios.
pub fn area_average(rgba: &[u8], sw: usize, sh: usize, dw: usize, dh: usize) -> Vec<u8> {
    if dw == 0 || dh == 0 {
        return Vec::new();
    }
    if dw == sw && dh == sh {
        return rgba.to_vec();
    }

    let mut out = vec![0u8; dw * dh * 4];

    let x_ratio = sw as f64 / dw as f64;
    let y_ratio = sh as f64 / dh as f64;

    for dy in 0..dh {
        let src_y0 = dy as f64 * y_ratio;
        let src_y1 = (dy + 1) as f64 * y_ratio;

        for dx in 0..dw {
            let src_x0 = dx as f64 * x_ratio;
            let src_x1 = (dx + 1) as f64 * x_ratio;

            let mut r_sum = 0.0_f64;
            let mut g_sum = 0.0_f64;
            let mut b_sum = 0.0_f64;
            let mut a_sum = 0.0_f64;
            let mut weight_sum = 0.0_f64;

            // Iterate over all source pixels that overlap the mapped rectangle
            let sy_start = src_y0.floor() as usize;
            let sy_end = (src_y1.ceil() as usize).min(sh);
            let sx_start = src_x0.floor() as usize;
            let sx_end = (src_x1.ceil() as usize).min(sw);

            for sy in sy_start..sy_end {
                // Fractional vertical overlap with this source row
                let y_overlap = f64_min(src_y1, (sy + 1) as f64) - f64_max(src_y0, sy as f64);
                if y_overlap <= 0.0 {
                    continue;
                }

                for sx in sx_start..sx_end {
                    // Fractional horizontal overlap with this source column
                    let x_overlap =
                        f64_min(src_x1, (sx + 1) as f64) - f64_max(src_x0, sx as f64);
                    if x_overlap <= 0.0 {
                        continue;
                    }

                    // Weight = overlap area (product of fractional overlaps)
                    let weight = x_overlap * y_overlap;
                    let idx = (sy * sw + sx) * 4;

                    r_sum += rgba[idx] as f64 * weight;
                    g_sum += rgba[idx + 1] as f64 * weight;
                    b_sum += rgba[idx + 2] as f64 * weight;
                    a_sum += rgba[idx + 3] as f64 * weight;
                    weight_sum += weight;
                }
            }

            let dst_idx = (dy * dw + dx) * 4;
            if weight_sum > 0.0 {
                let inv = 1.0 / weight_sum;
                out[dst_idx] = clamp_u8(r_sum * inv + 0.5);
                out[dst_idx + 1] = clamp_u8(g_sum * inv + 0.5);
                out[dst_idx + 2] = clamp_u8(b_sum * inv + 0.5);
                out[dst_idx + 3] = clamp_u8(a_sum * inv + 0.5);
            }
        }
    }

    out
}

#[inline(always)]
fn f64_min(a: f64, b: f64) -> f64 {
    if a < b {
        a
    } else {
        b
    }
}

#[inline(always)]
fn f64_max(a: f64, b: f64) -> f64 {
    if a > b {
        a
    } else {
        b
    }
}

#[inline(always)]
fn clamp_u8(v: f64) -> u8 {
    if v < 0.0 {
        0
    } else if v > 255.0 {
        255
    } else {
        v as u8
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity() {
        let rgba = vec![100, 150, 200, 255, 50, 60, 70, 128];
        let out = area_average(&rgba, 2, 1, 2, 1);
        assert_eq!(out, rgba);
    }

    #[test]
    fn test_2x2_to_1x1() {
        // 2×2 image: all red pixels with varying alpha
        // Average should be red with average alpha
        let rgba = vec![
            255, 0, 0, 255, // top-left
            255, 0, 0, 255, // top-right
            255, 0, 0, 255, // bottom-left
            255, 0, 0, 255, // bottom-right
        ];
        let out = area_average(&rgba, 2, 2, 1, 1);
        assert_eq!(out.len(), 4);
        assert_eq!(out[0], 255); // R
        assert_eq!(out[1], 0); // G
        assert_eq!(out[2], 0); // B
        assert_eq!(out[3], 255); // A
    }

    #[test]
    fn test_4x4_to_2x2_averaging() {
        // 4×4 with alternating black/white checkerboard
        let mut rgba = vec![0u8; 4 * 4 * 4];
        for y in 0..4 {
            for x in 0..4 {
                let idx = (y * 4 + x) * 4;
                let val = if (x + y) % 2 == 0 { 255 } else { 0 };
                rgba[idx] = val;
                rgba[idx + 1] = val;
                rgba[idx + 2] = val;
                rgba[idx + 3] = 255;
            }
        }
        let out = area_average(&rgba, 4, 4, 2, 2);
        // Each 2×2 block has 2 white + 2 black pixels = average ≈ 128
        for i in 0..4 {
            let idx = i * 4;
            assert!((out[idx] as i32 - 128).abs() <= 1);
            assert_eq!(out[idx + 3], 255);
        }
    }

    #[test]
    fn test_empty() {
        let out = area_average(&[], 0, 0, 0, 0);
        assert!(out.is_empty());
    }
}
