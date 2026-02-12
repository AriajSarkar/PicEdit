/// CLAHE — Contrast Limited Adaptive Histogram Equalization.
///
/// Optimizations:
/// - Single luminance extraction pass (BT.709 fixed-point: 77R+150G+29B >> 8)
/// - Per-tile histogram build with clip & redistribute
/// - CDF stored as u8 LUT (no f32 during apply phase)
/// - Bilinear interpolation between tile CDFs using precomputed reciprocals
/// - Fused RGB rescale via 16.16 fixed-point multiply
#[inline(always)]
fn rgb_to_lum(r: u8, g: u8, b: u8) -> u8 {
    ((r as u32 * 77 + g as u32 * 150 + b as u32 * 29) >> 8) as u8
}

pub fn apply_clahe(rgba: &mut [u8], w: usize, h: usize, clip_limit: f32, grid_size: usize) {
    let grid = grid_size.max(2);
    let tile_w = w.div_ceil(grid);
    let tile_h = h.div_ceil(grid);
    let npx = w * h;
    let ntx = grid;
    let nty = grid;

    // === Pass 1: Extract luminance ===
    let mut lum = vec![0u8; npx];
    #[allow(clippy::needless_range_loop)]
    for i in 0..npx {
        let off = i * 4;
        lum[i] = rgb_to_lum(rgba[off], rgba[off + 1], rgba[off + 2]);
    }

    // === Pass 2: Build per-tile CDF LUTs ===
    let num_tiles = ntx * nty;
    let mut cdf_lut: Vec<[u8; 256]> = vec![[0u8; 256]; num_tiles];

    for ty in 0..nty {
        for tx in 0..ntx {
            let x0 = tx * tile_w;
            let y0 = ty * tile_h;
            let x1 = (x0 + tile_w).min(w);
            let y1 = (y0 + tile_h).min(h);

            let mut hist = [0u32; 256];
            let mut count = 0u32;

            for y in y0..y1 {
                let row_off = y * w;
                for x in x0..x1 {
                    hist[lum[row_off + x] as usize] += 1;
                    count += 1;
                }
            }

            if count == 0 {
                let lut = &mut cdf_lut[ty * ntx + tx];
                #[allow(clippy::needless_range_loop)]
                for i in 0..256 {
                    lut[i] = i as u8;
                }
                continue;
            }

            // Clip & redistribute
            let clip = (clip_limit * count as f32 / 256.0).max(1.0) as u32;
            let mut excess = 0u32;
            for bin in hist.iter_mut() {
                if *bin > clip {
                    excess += *bin - clip;
                    *bin = clip;
                }
            }
            let per_bin = excess / 256;
            let remainder = (excess % 256) as usize;
            for (i, bin) in hist.iter_mut().enumerate() {
                *bin += per_bin;
                if i < remainder {
                    *bin += 1;
                }
            }

            // Build CDF as u8 LUT
            let inv_count = 255.0 / count as f32;
            let mut cumulative = 0u32;
            let tile_idx = ty * ntx + tx;
            for i in 0..256 {
                cumulative += hist[i];
                cdf_lut[tile_idx][i] = (cumulative as f32 * inv_count).min(255.0) as u8;
            }
        }
    }

    // === Pass 3: Apply with bilinear interpolation ===
    let inv_tile_w = 1.0 / tile_w as f32;
    let inv_tile_h = 1.0 / tile_h as f32;

    for y in 0..h {
        let fy = (y as f32 + 0.5) * inv_tile_h - 0.5;
        let ty0 = (fy.floor().max(0.0)) as usize;
        let ty1 = (ty0 + 1).min(nty - 1);
        let wy = (fy - ty0 as f32).clamp(0.0, 1.0);
        let wy_inv = 1.0 - wy;

        let row0 = ty0 * ntx;
        let row1 = ty1 * ntx;

        for x in 0..w {
            let fx = (x as f32 + 0.5) * inv_tile_w - 0.5;
            let tx0 = (fx.floor().max(0.0)) as usize;
            let tx1 = (tx0 + 1).min(ntx - 1);
            let wx = (fx - tx0 as f32).clamp(0.0, 1.0);
            let wx_inv = 1.0 - wx;

            let idx = y * w + x;
            let l = lum[idx] as usize;

            // Bilinear from u8 LUTs
            let c00 = cdf_lut[row0 + tx0][l] as f32;
            let c10 = cdf_lut[row0 + tx1][l] as f32;
            let c01 = cdf_lut[row1 + tx0][l] as f32;
            let c11 = cdf_lut[row1 + tx1][l] as f32;

            let new_lum = (c00 * wx_inv + c10 * wx) * wy_inv + (c01 * wx_inv + c11 * wx) * wy;
            let new_lum_u8 = new_lum as u8;

            let off = idx * 4;
            let old_lum = lum[idx];
            if old_lum > 0 {
                let scale_fp = ((new_lum_u8 as u32) << 16) / old_lum as u32;
                rgba[off] = ((rgba[off] as u32 * scale_fp) >> 16).min(255) as u8;
                rgba[off + 1] = ((rgba[off + 1] as u32 * scale_fp) >> 16).min(255) as u8;
                rgba[off + 2] = ((rgba[off + 2] as u32 * scale_fp) >> 16).min(255) as u8;
            } else if new_lum_u8 > 0 {
                rgba[off] = new_lum_u8;
                rgba[off + 1] = new_lum_u8;
                rgba[off + 2] = new_lum_u8;
            }
        }
    }
}
