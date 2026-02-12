/// Median-Cut Color Quantization with Floyd-Steinberg Dithering
///
/// Algorithm:
/// 1. Build a histogram of unique colors in a k-d space (R, G, B)
/// 2. Recursively split the color space along the axis with greatest range
/// 3. Find the centroid of each resulting bucket → palette colors
/// 4. Map each pixel to nearest palette color
/// 5. Apply Floyd-Steinberg error diffusion for smooth gradients

#[derive(Clone)]
struct ColorBucket {
    pixels: Vec<(u8, u8, u8, usize)>, // r, g, b, original_index
}

impl ColorBucket {
    fn longest_axis(&self) -> u8 {
        let (mut min_r, mut min_g, mut min_b) = (255u8, 255u8, 255u8);
        let (mut max_r, mut max_g, mut max_b) = (0u8, 0u8, 0u8);

        for &(r, g, b, _) in &self.pixels {
            min_r = min_r.min(r); max_r = max_r.max(r);
            min_g = min_g.min(g); max_g = max_g.max(g);
            min_b = min_b.min(b); max_b = max_b.max(b);
        }

        let range_r = max_r - min_r;
        let range_g = max_g - min_g;
        let range_b = max_b - min_b;

        if range_r >= range_g && range_r >= range_b { 0 }
        else if range_g >= range_b { 1 }
        else { 2 }
    }

    fn split(mut self) -> (Self, Self) {
        let axis = self.longest_axis();
        self.pixels.sort_unstable_by_key(|&(r, g, b, _)| match axis {
            0 => r, 1 => g, _ => b,
        });
        let mid = self.pixels.len() / 2;
        let right = self.pixels.split_off(mid);
        (self, ColorBucket { pixels: right })
    }

    fn centroid(&self) -> (u8, u8, u8) {
        let (mut sr, mut sg, mut sb) = (0u64, 0u64, 0u64);
        for &(r, g, b, _) in &self.pixels {
            sr += r as u64;
            sg += g as u64;
            sb += b as u64;
        }
        let n = self.pixels.len().max(1) as u64;
        ((sr / n) as u8, (sg / n) as u8, (sb / n) as u8)
    }
}

pub fn median_cut_quantize(rgba: &[u8], w: usize, h: usize, max_colors: usize) -> Vec<u8> {
    let npx = w * h;
    let max_colors = max_colors.clamp(2, 256);

    // Build initial bucket of all opaque pixels
    let mut pixels = Vec::with_capacity(npx);
    for i in 0..npx {
        let off = i * 4;
        pixels.push((rgba[off], rgba[off + 1], rgba[off + 2], i));
    }

    let mut buckets = vec![ColorBucket { pixels }];

    // Recursively split until we have max_colors buckets
    while buckets.len() < max_colors {
        // Find bucket with most pixels to split
        let max_idx = buckets.iter()
            .enumerate()
            .filter(|(_, b)| b.pixels.len() > 1)
            .max_by_key(|(_, b)| b.pixels.len())
            .map(|(i, _)| i);

        match max_idx {
            Some(idx) => {
                let bucket = buckets.swap_remove(idx);
                let (left, right) = bucket.split();
                if !left.pixels.is_empty() { buckets.push(left); }
                if !right.pixels.is_empty() { buckets.push(right); }
            },
            None => break,
        }
    }

    // Build palette from centroids
    let palette: Vec<(u8, u8, u8)> = buckets.iter().map(|b| b.centroid()).collect();

    // Map pixels to nearest palette color + Floyd-Steinberg dithering
    let mut result = rgba.to_vec();
    let mut errors_r = vec![0.0f32; npx];
    let mut errors_g = vec![0.0f32; npx];
    let mut errors_b = vec![0.0f32; npx];

    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            let off = i * 4;

            // Apply accumulated error
            let or = (result[off] as f32 + errors_r[i]).clamp(0.0, 255.0);
            let og = (result[off + 1] as f32 + errors_g[i]).clamp(0.0, 255.0);
            let ob = (result[off + 2] as f32 + errors_b[i]).clamp(0.0, 255.0);

            // Find nearest palette color
            let (pr, pg, pb) = nearest_color(&palette, or as u8, og as u8, ob as u8);

            result[off] = pr;
            result[off + 1] = pg;
            result[off + 2] = pb;
            // Keep original alpha

            // Compute quantization error
            let er = or - pr as f32;
            let eg = og - pg as f32;
            let eb = ob - pb as f32;

            // Distribute error (Floyd-Steinberg diffusion matrix)
            // Right: 7/16, Bottom-left: 3/16, Bottom: 5/16, Bottom-right: 1/16
            if x + 1 < w {
                let ni = i + 1;
                errors_r[ni] += er * (7.0 / 16.0);
                errors_g[ni] += eg * (7.0 / 16.0);
                errors_b[ni] += eb * (7.0 / 16.0);
            }
            if y + 1 < h {
                if x > 0 {
                    let ni = (y + 1) * w + x - 1;
                    errors_r[ni] += er * (3.0 / 16.0);
                    errors_g[ni] += eg * (3.0 / 16.0);
                    errors_b[ni] += eb * (3.0 / 16.0);
                }
                {
                    let ni = (y + 1) * w + x;
                    errors_r[ni] += er * (5.0 / 16.0);
                    errors_g[ni] += eg * (5.0 / 16.0);
                    errors_b[ni] += eb * (5.0 / 16.0);
                }
                if x + 1 < w {
                    let ni = (y + 1) * w + x + 1;
                    errors_r[ni] += er * (1.0 / 16.0);
                    errors_g[ni] += eg * (1.0 / 16.0);
                    errors_b[ni] += eb * (1.0 / 16.0);
                }
            }
        }
    }

    result
}

#[inline]
fn nearest_color(palette: &[(u8, u8, u8)], r: u8, g: u8, b: u8) -> (u8, u8, u8) {
    let mut best = palette[0];
    let mut best_dist = u32::MAX;

    for &(pr, pg, pb) in palette {
        // Weighted distance (human eye is more sensitive to green)
        let dr = r as i32 - pr as i32;
        let dg = g as i32 - pg as i32;
        let db = b as i32 - pb as i32;
        let dist = ((2 * dr * dr) + (4 * dg * dg) + (3 * db * db)) as u32;

        if dist < best_dist {
            best_dist = dist;
            best = (pr, pg, pb);
        }
    }

    best
}
