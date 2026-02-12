// Edge-preserving bilateral denoising for compression optimization.
// Removes high-frequency noise that inflates file sizes without
// affecting perceptible image detail.

/// Bilateral denoise — separable approximation for O(n*r) complexity.
/// Uses spatial + range kernels to preserve edges while smoothing noise.
pub fn bilateral_denoise(buf: &mut [u8], w: usize, h: usize, radius: usize, strength: f32) {
    let npx = w * h;
    let mut tmp = buf.to_vec();
    let sigma_s = radius as f32;
    let sigma_r = (strength * 255.0).max(1.0);
    let inv_2_sigma_s_sq = 0.5 / (sigma_s * sigma_s);
    let inv_2_sigma_r_sq = 0.5 / (sigma_r * sigma_r);
    let r = radius as isize;

    // Horizontal pass
    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let cr = buf[idx] as f32;
            let cg = buf[idx + 1] as f32;
            let cb = buf[idx + 2] as f32;

            let mut sum_r = 0.0f32;
            let mut sum_g = 0.0f32;
            let mut sum_b = 0.0f32;
            let mut sum_w = 0.0f32;

            for dx in -r..=r {
                let nx = (x as isize + dx).clamp(0, w as isize - 1) as usize;
                let nidx = (y * w + nx) * 4;
                let nr = buf[nidx] as f32;
                let ng = buf[nidx + 1] as f32;
                let nb = buf[nidx + 2] as f32;

                let dist_sq = (dx * dx) as f32;
                let range_sq = (nr - cr).powi(2) + (ng - cg).powi(2) + (nb - cb).powi(2);

                let weight = (-dist_sq * inv_2_sigma_s_sq - range_sq * inv_2_sigma_r_sq).exp();
                sum_r += nr * weight;
                sum_g += ng * weight;
                sum_b += nb * weight;
                sum_w += weight;
            }

            let inv_w = 1.0 / sum_w;
            tmp[idx] = (sum_r * inv_w).clamp(0.0, 255.0) as u8;
            tmp[idx + 1] = (sum_g * inv_w).clamp(0.0, 255.0) as u8;
            tmp[idx + 2] = (sum_b * inv_w).clamp(0.0, 255.0) as u8;
            tmp[idx + 3] = buf[idx + 3]; // preserve alpha
        }
    }

    // Vertical pass
    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let cr = tmp[idx] as f32;
            let cg = tmp[idx + 1] as f32;
            let cb = tmp[idx + 2] as f32;

            let mut sum_r = 0.0f32;
            let mut sum_g = 0.0f32;
            let mut sum_b = 0.0f32;
            let mut sum_w = 0.0f32;

            for dy in -r..=r {
                let ny = (y as isize + dy).clamp(0, h as isize - 1) as usize;
                let nidx = (ny * w + x) * 4;
                let nr = tmp[nidx] as f32;
                let ng = tmp[nidx + 1] as f32;
                let nb = tmp[nidx + 2] as f32;

                let dist_sq = (dy * dy) as f32;
                let range_sq = (nr - cr).powi(2) + (ng - cg).powi(2) + (nb - cb).powi(2);

                let weight = (-dist_sq * inv_2_sigma_s_sq - range_sq * inv_2_sigma_r_sq).exp();
                sum_r += nr * weight;
                sum_g += ng * weight;
                sum_b += nb * weight;
                sum_w += weight;
            }

            let inv_w = 1.0 / sum_w;
            buf[idx] = (sum_r * inv_w).clamp(0.0, 255.0) as u8;
            buf[idx + 1] = (sum_g * inv_w).clamp(0.0, 255.0) as u8;
            buf[idx + 2] = (sum_b * inv_w).clamp(0.0, 255.0) as u8;
        }
    }

    // Suppress unused variable warning
    let _ = npx;
}

/// Chroma smoothing — reduce chrominance detail in areas where
/// luminance contrast is low. Human eyes are far more sensitive to
/// brightness changes than color changes (YCbCr principle).
pub fn chroma_smooth(buf: &mut [u8], w: usize, h: usize, strength: f32) {
    let blend = (strength * 0.3).clamp(0.0, 0.5);

    for y in 1..h.saturating_sub(1) {
        for x in 1..w.saturating_sub(1) {
            let idx = (y * w + x) * 4;

            // Compute local luminance contrast
            let lum_center = luminance(buf[idx], buf[idx + 1], buf[idx + 2]);
            let mut max_diff = 0.0f32;

            for (dy, dx) in [(-1isize, 0isize), (1, 0), (0, -1), (0, 1)] {
                let ni = ((y as isize + dy) as usize * w + (x as isize + dx) as usize) * 4;
                let lum_n = luminance(buf[ni], buf[ni + 1], buf[ni + 2]);
                max_diff = max_diff.max((lum_center - lum_n).abs());
            }

            // Only smooth color in low-contrast areas
            if max_diff < 30.0 {
                // Average chrominance from neighbors
                let mut avg_r = 0.0f32;
                let mut avg_g = 0.0f32;
                let mut avg_b = 0.0f32;
                let mut count = 0.0f32;

                for dy in -1isize..=1 {
                    for dx in -1isize..=1 {
                        let ni = ((y as isize + dy) as usize * w + (x as isize + dx) as usize) * 4;
                        avg_r += buf[ni] as f32;
                        avg_g += buf[ni + 1] as f32;
                        avg_b += buf[ni + 2] as f32;
                        count += 1.0;
                    }
                }

                avg_r /= count;
                avg_g /= count;
                avg_b /= count;

                // Blend current color toward neighborhood average
                buf[idx] = lerp_u8(buf[idx], avg_r, blend);
                buf[idx + 1] = lerp_u8(buf[idx + 1], avg_g, blend);
                buf[idx + 2] = lerp_u8(buf[idx + 2], avg_b, blend);
            }
        }
    }
}

#[inline(always)]
fn luminance(r: u8, g: u8, b: u8) -> f32 {
    r as f32 * 0.2126 + g as f32 * 0.7152 + b as f32 * 0.0722
}

#[inline(always)]
fn lerp_u8(current: u8, target: f32, t: f32) -> u8 {
    ((current as f32) * (1.0 - t) + target * t).clamp(0.0, 255.0) as u8
}
