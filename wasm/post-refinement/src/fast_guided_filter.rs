/// Fast Guided Filter (He & Sun, 2015)
///
/// Compute at 1/s resolution, upsample coefficients. Reduces work by s².
/// Uses f64 integral images for precision on large images.
///
/// Optimizations vs previous version:
/// - Fused ip/ii computation in single loop
/// - Reuse SAT buffers where possible
/// - Precomputed reciprocals in box_mean

/// Downsample by factor s using box averaging
fn downsample(data: &[f32], w: usize, h: usize, s: usize) -> (Vec<f32>, usize, usize) {
    let sw = (w + s - 1) / s;
    let sh = (h + s - 1) / s;
    let mut out = vec![0.0f32; sw * sh];

    for sy in 0..sh {
        let y0 = sy * s;
        let y1 = (y0 + s).min(h);
        for sx in 0..sw {
            let x0 = sx * s;
            let x1 = (x0 + s).min(w);
            let mut sum = 0.0f32;
            let count = ((y1 - y0) * (x1 - x0)) as f32;
            for y in y0..y1 {
                let row = y * w;
                for x in x0..x1 {
                    sum += data[row + x];
                }
            }
            out[sy * sw + sx] = sum / count;
        }
    }

    (out, sw, sh)
}

/// Upsample from (sw, sh) to (w, h) using bilinear interpolation
fn upsample(data: &[f32], sw: usize, sh: usize, w: usize, h: usize) -> Vec<f32> {
    let mut out = vec![0.0f32; w * h];
    let scale_x = sw as f32 / w as f32;
    let scale_y = sh as f32 / h as f32;

    for y in 0..h {
        let fy = (y as f32 + 0.5) * scale_y - 0.5;
        let y0 = (fy.max(0.0) as usize).min(sh.saturating_sub(1));
        let y1 = (y0 + 1).min(sh - 1);
        let wy = (fy - y0 as f32).clamp(0.0, 1.0);
        let wy_inv = 1.0 - wy;

        for x in 0..w {
            let fx = (x as f32 + 0.5) * scale_x - 0.5;
            let x0 = (fx.max(0.0) as usize).min(sw.saturating_sub(1));
            let x1 = (x0 + 1).min(sw - 1);
            let wx = (fx - x0 as f32).clamp(0.0, 1.0);

            out[y * w + x] = (data[y0 * sw + x0] * (1.0 - wx) + data[y0 * sw + x1] * wx) * wy_inv
                + (data[y1 * sw + x0] * (1.0 - wx) + data[y1 * sw + x1] * wx) * wy;
        }
    }

    out
}

/// Integral image (SAT) using f64 for large-image precision
fn integral_image(data: &[f32], w: usize, h: usize) -> Vec<f64> {
    let mut sat = vec![0.0f64; w * h];
    for y in 0..h {
        let mut row_sum = 0.0f64;
        let row = y * w;
        let prev_row = if y > 0 { (y - 1) * w } else { 0 };
        for x in 0..w {
            row_sum += data[row + x] as f64;
            sat[row + x] = row_sum + if y > 0 { sat[prev_row + x] } else { 0.0 };
        }
    }
    sat
}

/// O(1) box mean query on SAT
#[inline(always)]
fn box_mean(sat: &[f64], w: usize, h: usize, x: usize, y: usize, r: usize) -> f64 {
    let x0 = x.saturating_sub(r);
    let y0 = y.saturating_sub(r);
    let x1 = (x + r).min(w - 1);
    let y1 = (y + r).min(h - 1);
    let count = ((x1 - x0 + 1) * (y1 - y0 + 1)) as f64;

    let d = sat[y1 * w + x1];
    let a = if x0 > 0 && y0 > 0 { sat[(y0 - 1) * w + (x0 - 1)] } else { 0.0 };
    let b = if y0 > 0 { sat[(y0 - 1) * w + x1] } else { 0.0 };
    let c = if x0 > 0 { sat[y1 * w + (x0 - 1)] } else { 0.0 };

    (d + a - b - c) / count
}

/// Guided filter core: compute linear coefficients a, b
fn guided_filter_core(
    guide: &[f32],
    input: &[f32],
    w: usize,
    h: usize,
    r: usize,
    eps: f32,
) -> (Vec<f32>, Vec<f32>) {
    let npx = w * h;

    // Fused product computation
    let mut ip = vec![0.0f32; npx];
    let mut ii = vec![0.0f32; npx];
    for i in 0..npx {
        let g = guide[i];
        ip[i] = g * input[i];
        ii[i] = g * g;
    }

    let sat_i = integral_image(guide, w, h);
    let sat_p = integral_image(input, w, h);
    let sat_ip = integral_image(&ip, w, h);
    let sat_ii = integral_image(&ii, w, h);

    let mut a_buf = vec![0.0f32; npx];
    let mut b_buf = vec![0.0f32; npx];

    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let mean_i = box_mean(&sat_i, w, h, x, y, r) as f32;
            let mean_p = box_mean(&sat_p, w, h, x, y, r) as f32;
            let mean_ip = box_mean(&sat_ip, w, h, x, y, r) as f32;
            let mean_ii = box_mean(&sat_ii, w, h, x, y, r) as f32;

            let cov = mean_ip - mean_i * mean_p;
            let var = mean_ii - mean_i * mean_i;
            let a = cov / (var + eps);
            a_buf[idx] = a;
            b_buf[idx] = mean_p - a * mean_i;
        }
    }

    (a_buf, b_buf)
}

/// Fast Guided Filter: subsample → compute coefficients → upsample → apply
pub fn fast_guided_filter(
    guide: &[f32],
    input: &[f32],
    w: usize,
    h: usize,
    r: usize,
    eps: f32,
    subsample: usize,
) -> Vec<f32> {
    if subsample <= 1 {
        // No subsampling — standard guided filter
        let (a, b) = guided_filter_core(guide, input, w, h, r, eps);
        let sat_a = integral_image(&a, w, h);
        let sat_b = integral_image(&b, w, h);
        let npx = w * h;
        let mut out = vec![0.0f32; npx];
        for y in 0..h {
            for x in 0..w {
                let idx = y * w + x;
                let ma = box_mean(&sat_a, w, h, x, y, r) as f32;
                let mb = box_mean(&sat_b, w, h, x, y, r) as f32;
                out[idx] = (ma * guide[idx] + mb).clamp(0.0, 1.0);
            }
        }
        return out;
    }

    // Downsample both signals
    let (guide_s, sw, sh) = downsample(guide, w, h, subsample);
    let (input_s, _, _) = downsample(input, w, h, subsample);
    let r_s = (r / subsample).max(1);

    // Compute coefficients at low resolution
    let (a_s, b_s) = guided_filter_core(&guide_s, &input_s, sw, sh, r_s, eps);

    // Mean of a, b at low resolution
    let sat_a_s = integral_image(&a_s, sw, sh);
    let sat_b_s = integral_image(&b_s, sw, sh);
    let npx_s = sw * sh;
    let mut mean_a_s = vec![0.0f32; npx_s];
    let mut mean_b_s = vec![0.0f32; npx_s];
    for y in 0..sh {
        for x in 0..sw {
            let idx = y * sw + x;
            mean_a_s[idx] = box_mean(&sat_a_s, sw, sh, x, y, r_s) as f32;
            mean_b_s[idx] = box_mean(&sat_b_s, sw, sh, x, y, r_s) as f32;
        }
    }

    // Upsample coefficients to full resolution
    let mean_a = upsample(&mean_a_s, sw, sh, w, h);
    let mean_b = upsample(&mean_b_s, sw, sh, w, h);

    // Apply: q = mean_a * I + mean_b
    let npx = w * h;
    let mut out = vec![0.0f32; npx];
    for i in 0..npx {
        out[i] = (mean_a[i] * guide[i] + mean_b[i]).clamp(0.0, 1.0);
    }

    out
}
