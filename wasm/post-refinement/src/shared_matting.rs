/// Shared Matting — sub-pixel alpha recovery for hair strands.
///
/// For each unknown pixel in the trimap:
/// 1. Spiral search for nearest definite FG and BG samples
/// 2. Collect up to K samples per class for robustness
/// 3. Use matting equation: α = (C - B)·(F - B) / |F - B|²
/// 4. Weight by color confidence and distance
///
/// Optimizations vs naive:
/// - Precomputed spiral sorted by distance (search closest first)
/// - Multi-sample averaging (K=3) for robustness
/// - Early termination once both FG and BG found
/// - Squared distance comparison (avoid sqrt in inner loop)

const MAX_SAMPLES: usize = 3; // Number of FG/BG samples to collect

struct ColorSample {
    r: f32,
    g: f32,
    b: f32,
    dist_sq: i32,
}

pub fn shared_matting(
    alpha: &mut [f32],
    rgba: &[u8],
    trimap: &[u8],
    w: usize,
    h: usize,
) {
    let max_search = 25isize;

    // Precompute spiral search order (sorted by squared distance — no sqrt needed)
    let mut spiral: Vec<(isize, isize, i32)> = Vec::with_capacity(((2 * max_search + 1) * (2 * max_search + 1)) as usize);
    for dy in -max_search..=max_search {
        for dx in -max_search..=max_search {
            if dx == 0 && dy == 0 { continue; }
            let d2 = dx * dx + dy * dy;
            spiral.push((dx, dy, d2 as i32));
        }
    }
    spiral.sort_unstable_by_key(|s| s.2);

    // Pre-allocate sample buffers (reused per pixel)
    let mut fg_samples: Vec<ColorSample> = Vec::with_capacity(MAX_SAMPLES);
    let mut bg_samples: Vec<ColorSample> = Vec::with_capacity(MAX_SAMPLES);

    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            if trimap[idx] != 128 {
                continue;
            }

            fg_samples.clear();
            bg_samples.clear();

            // Spiral search: collect up to MAX_SAMPLES of each class
            for &(dx, dy, d2) in &spiral {
                if fg_samples.len() >= MAX_SAMPLES && bg_samples.len() >= MAX_SAMPLES {
                    break;
                }

                let sx = x as isize + dx;
                let sy = y as isize + dy;
                if sx < 0 || sx >= w as isize || sy < 0 || sy >= h as isize {
                    continue;
                }

                let si = sy as usize * w + sx as usize;
                let off = si * 4;

                if fg_samples.len() < MAX_SAMPLES && trimap[si] == 255 {
                    fg_samples.push(ColorSample {
                        r: rgba[off] as f32,
                        g: rgba[off + 1] as f32,
                        b: rgba[off + 2] as f32,
                        dist_sq: d2,
                    });
                } else if bg_samples.len() < MAX_SAMPLES && trimap[si] == 0 {
                    bg_samples.push(ColorSample {
                        r: rgba[off] as f32,
                        g: rgba[off + 1] as f32,
                        b: rgba[off + 2] as f32,
                        dist_sq: d2,
                    });
                }
            }

            if fg_samples.is_empty() || bg_samples.is_empty() {
                continue;
            }

            // Current pixel color
            let off = idx * 4;
            let cr = rgba[off] as f32;
            let cg = rgba[off + 1] as f32;
            let cb = rgba[off + 2] as f32;

            // Compute weighted alpha from all sample pairs
            let mut best_alpha = 0.0f32;
            let mut best_cost = f32::MAX;

            for fg in &fg_samples {
                for bg in &bg_samples {
                    let dr = fg.r - bg.r;
                    let dg = fg.g - bg.g;
                    let db = fg.b - bg.b;
                    let denom = dr * dr + dg * dg + db * db;

                    if denom < 4.0 {
                        continue; // FG/BG too similar
                    }

                    let numer = (cr - bg.r) * dr + (cg - bg.g) * dg + (cb - bg.b) * db;
                    let a = (numer / denom).clamp(0.0, 1.0);

                    // Reconstruction error: how well does this (F, B, α) explain pixel C?
                    let recon_r = a * fg.r + (1.0 - a) * bg.r;
                    let recon_g = a * fg.g + (1.0 - a) * bg.g;
                    let recon_b = a * fg.b + (1.0 - a) * bg.b;
                    let err = (cr - recon_r) * (cr - recon_r)
                        + (cg - recon_g) * (cg - recon_g)
                        + (cb - recon_b) * (cb - recon_b);

                    // Distance penalty (favor closer samples)
                    let dist_penalty = (fg.dist_sq + bg.dist_sq) as f32 * 0.01;
                    let cost = err + dist_penalty;

                    if cost < best_cost {
                        best_cost = cost;
                        best_alpha = a;
                    }
                }
            }

            if best_cost < f32::MAX {
                // Confidence: lower cost = higher confidence
                let confidence = 1.0 / (1.0 + best_cost * 0.001);
                let blend = 0.3 + 0.6 * confidence.min(1.0);
                alpha[idx] = alpha[idx] * (1.0 - blend) + best_alpha * blend;
            }
        }
    }
}
