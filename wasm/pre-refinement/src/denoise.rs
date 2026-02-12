/// Separable Bilateral Filter — O(w*h*r) instead of O(w*h*r²).
///
/// Key insight from Paris & Durand: a bilateral filter can be approximated
/// by two 1D passes (horizontal then vertical) with range-weighted kernels.
/// This gives 2*r work per pixel instead of (2r+1)² — up to 10x faster for r=5.
///
/// Optimizations:
/// - Precomputed spatial weight LUT (no exp() in hot loop)
/// - Precomputed range weight LUT (256 entries, covers all u8 diffs)
/// - Two-pass separable: horizontal then vertical
/// - Process R,G,B together per neighbor (cache-friendly)
/// - Reciprocal multiply for normalization
pub fn bilateral_separable(rgba: &mut [u8], w: usize, h: usize, radius: usize) {
    let r = radius.min(7); // Cap for WASM perf
    let sigma_s = r as f32;
    let sigma_r = 30.0f32;

    // Precompute spatial weights for 1D kernel: exp(-d²/(2σ²))
    let kernel_len = 2 * r + 1;
    let inv_2ss = -0.5 / (sigma_s * sigma_s);
    let mut spatial_w = vec![0.0f32; kernel_len];
    #[allow(clippy::needless_range_loop)]
    for i in 0..kernel_len {
        let d = i as f32 - r as f32;
        spatial_w[i] = (inv_2ss * d * d).exp();
    }

    // Precompute range weights: exp(-diff²/(2σr²)) for diff in 0..256
    let inv_2sr = -0.5 / (sigma_r * sigma_r);
    let mut range_w = [0.0f32; 256];
    for d in 0..256u32 {
        range_w[d as usize] = (inv_2sr * (d * d) as f32).exp();
    }

    // --- Pass 1: Horizontal ---
    let mut tmp = rgba.to_vec();
    let ri = r as isize;

    for y in 0..h {
        let row = y * w;
        for x in 0..w {
            let ci = (row + x) * 4;
            let cr = rgba[ci] as i32;
            let cg = rgba[ci + 1] as i32;
            let cb = rgba[ci + 2] as i32;

            let mut sr = 0.0f32;
            let mut sg = 0.0f32;
            let mut sb = 0.0f32;
            let mut sw = 0.0f32;

            #[allow(clippy::needless_range_loop)]
            for ki in 0..kernel_len {
                let sx = x as isize + ki as isize - ri;
                if sx < 0 || sx >= w as isize {
                    continue;
                }
                let ni = (row + sx as usize) * 4;
                let nr = rgba[ni] as i32;
                let ng = rgba[ni + 1] as i32;
                let nb = rgba[ni + 2] as i32;

                let diff = (cr - nr).unsigned_abs()
                    .max((cg - ng).unsigned_abs())
                    .max((cb - nb).unsigned_abs()) as usize;

                let wt = spatial_w[ki] * range_w[diff.min(255)];
                sr += nr as f32 * wt;
                sg += ng as f32 * wt;
                sb += nb as f32 * wt;
                sw += wt;
            }

            if sw > 0.0 {
                let inv = 1.0 / sw;
                tmp[ci] = (sr * inv) as u8;
                tmp[ci + 1] = (sg * inv) as u8;
                tmp[ci + 2] = (sb * inv) as u8;
            }
        }
    }

    // --- Pass 2: Vertical (read from tmp, write to rgba) ---
    for y in 0..h {
        for x in 0..w {
            let ci = (y * w + x) * 4;
            let cr = tmp[ci] as i32;
            let cg = tmp[ci + 1] as i32;
            let cb = tmp[ci + 2] as i32;

            let mut sr = 0.0f32;
            let mut sg = 0.0f32;
            let mut sb = 0.0f32;
            let mut sw = 0.0f32;

            #[allow(clippy::needless_range_loop)]
            for ki in 0..kernel_len {
                let sy = y as isize + ki as isize - ri;
                if sy < 0 || sy >= h as isize {
                    continue;
                }
                let ni = (sy as usize * w + x) * 4;
                let nr = tmp[ni] as i32;
                let ng = tmp[ni + 1] as i32;
                let nb = tmp[ni + 2] as i32;

                let diff = (cr - nr).unsigned_abs()
                    .max((cg - ng).unsigned_abs())
                    .max((cb - nb).unsigned_abs()) as usize;

                let wt = spatial_w[ki] * range_w[diff.min(255)];
                sr += nr as f32 * wt;
                sg += ng as f32 * wt;
                sb += nb as f32 * wt;
                sw += wt;
            }

            if sw > 0.0 {
                let inv = 1.0 / sw;
                rgba[ci] = (sr * inv) as u8;
                rgba[ci + 1] = (sg * inv) as u8;
                rgba[ci + 2] = (sb * inv) as u8;
            }
        }
    }
}
