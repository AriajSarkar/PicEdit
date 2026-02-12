/// Unsharp Mask — faster and better quality than Laplacian sharpening.
///
/// Strategy: sharp = original + strength * (original - blur(original))
/// Uses separable box blur (running sum, O(1) per pixel) for the blur component.
///
/// Advantages over Laplacian:
/// - No ring artifacts at edges
/// - Tunable radius via box blur
/// - Same or faster speed (running sum vs 3x3 convolution)
///
/// Uses luminance-proportional scaling to preserve color ratios.
#[inline(always)]
fn rgb_to_lum_f32(r: u8, g: u8, b: u8) -> f32 {
    r as f32 * 0.299 + g as f32 * 0.587 + b as f32 * 0.114
}

pub fn unsharp_mask(rgba: &mut [u8], w: usize, h: usize, strength: f32) {
    if h < 3 || w < 3 {
        return;
    }

    let npx = w * h;
    let radius = 1usize; // Small radius for detail sharpening

    // Step 1: Extract luminance
    let mut lum = vec![0.0f32; npx];
    #[allow(clippy::needless_range_loop)]
    for i in 0..npx {
        let off = i * 4;
        lum[i] = rgb_to_lum_f32(rgba[off], rgba[off + 1], rgba[off + 2]);
    }

    // Step 2: Box blur luminance (separable, running sum)
    // Horizontal pass
    let mut blur_h = vec![0.0f32; npx];
    let r = radius as isize;
    for y in 0..h {
        let row = y * w;
        let mut sum = 0.0f32;
        let mut count = 0i32;

        // Init window
        for x in 0..=(radius.min(w - 1)) {
            sum += lum[row + x];
            count += 1;
        }
        blur_h[row] = sum / count as f32;

        for x in 1..w {
            let add_x = x + radius;
            if add_x < w {
                sum += lum[row + add_x];
                count += 1;
            }
            let rem_x = x as isize - r - 1;
            if rem_x >= 0 {
                sum -= lum[row + rem_x as usize];
                count -= 1;
            }
            blur_h[row + x] = sum / count as f32;
        }
    }

    // Vertical pass
    let mut blurred = vec![0.0f32; npx];
    for x in 0..w {
        let mut sum = 0.0f32;
        let mut count = 0i32;

        for y in 0..=(radius.min(h - 1)) {
            sum += blur_h[y * w + x];
            count += 1;
        }
        blurred[x] = sum / count as f32;

        for y in 1..h {
            let add_y = y + radius;
            if add_y < h {
                sum += blur_h[add_y * w + x];
                count += 1;
            }
            let rem_y = y as isize - r - 1;
            if rem_y >= 0 {
                sum -= blur_h[rem_y as usize * w + x];
                count -= 1;
            }
            blurred[y * w + x] = sum / count as f32;
        }
    }

    // Step 3: Apply unsharp mask: new_lum = lum + strength * (lum - blurred)
    // Use luminance ratio to scale RGB channels proportionally
    for i in 0..npx {
        let old_lum = lum[i];
        if old_lum < 1.0 {
            continue;
        }

        let detail = old_lum - blurred[i];
        let new_lum = (old_lum + strength * detail).clamp(0.0, 255.0);

        // Fixed-point scale: (new_lum << 16) / old_lum
        let scale_fp = ((new_lum as u32) << 16) / (old_lum as u32).max(1);
        let off = i * 4;
        rgba[off] = ((rgba[off] as u32 * scale_fp) >> 16).min(255) as u8;
        rgba[off + 1] = ((rgba[off + 1] as u32 * scale_fp) >> 16).min(255) as u8;
        rgba[off + 2] = ((rgba[off + 2] as u32 * scale_fp) >> 16).min(255) as u8;
    }
}
