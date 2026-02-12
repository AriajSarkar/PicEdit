/// SSIM (Structural Similarity Index) Implementation
///
/// Measures perceptual similarity between two images.
/// Uses windowed approach with 8x8 blocks for efficiency.
///
/// Formula: SSIM(x,y) = (2*μx*μy + C1)(2*σxy + C2) / (μx² + μy² + C1)(σx² + σy² + C2)
/// Where C1 = (0.01*L)², C2 = (0.03*L)², L = 255
const WINDOW_SIZE: usize = 8;
const C1: f32 = (0.01 * 255.0) * (0.01 * 255.0); // 6.5025
const C2: f32 = (0.03 * 255.0) * (0.03 * 255.0); // 58.5225

pub fn compute_ssim(img_a: &[u8], img_b: &[u8], w: usize, h: usize) -> f32 {
    // Convert to luminance for faster computation
    let npx = w * h;
    let mut lum_a = vec![0.0f32; npx];
    let mut lum_b = vec![0.0f32; npx];

    for i in 0..npx {
        let off = i * 4;
        lum_a[i] = img_a[off] as f32 * 0.2126
            + img_a[off + 1] as f32 * 0.7152
            + img_a[off + 2] as f32 * 0.0722;
        lum_b[i] = img_b[off] as f32 * 0.2126
            + img_b[off + 1] as f32 * 0.7152
            + img_b[off + 2] as f32 * 0.0722;
    }

    // Compute SSIM over 8x8 windows
    let mut sum_ssim = 0.0f64;
    let mut count = 0u32;

    let blocks_h = h / WINDOW_SIZE;
    let blocks_w = w / WINDOW_SIZE;

    for by in 0..blocks_h {
        for bx in 0..blocks_w {
            let mut sum_a = 0.0f64;
            let mut sum_b = 0.0f64;
            let mut sum_a2 = 0.0f64;
            let mut sum_b2 = 0.0f64;
            let mut sum_ab = 0.0f64;
            let n = (WINDOW_SIZE * WINDOW_SIZE) as f64;

            for dy in 0..WINDOW_SIZE {
                for dx in 0..WINDOW_SIZE {
                    let y = by * WINDOW_SIZE + dy;
                    let x = bx * WINDOW_SIZE + dx;
                    let idx = y * w + x;
                    let a = lum_a[idx] as f64;
                    let b = lum_b[idx] as f64;

                    sum_a += a;
                    sum_b += b;
                    sum_a2 += a * a;
                    sum_b2 += b * b;
                    sum_ab += a * b;
                }
            }

            let mu_a = sum_a / n;
            let mu_b = sum_b / n;
            let sigma_a2 = (sum_a2 / n) - mu_a * mu_a;
            let sigma_b2 = (sum_b2 / n) - mu_b * mu_b;
            let sigma_ab = (sum_ab / n) - mu_a * mu_b;

            let c1 = C1 as f64;
            let c2 = C2 as f64;

            let ssim = ((2.0 * mu_a * mu_b + c1) * (2.0 * sigma_ab + c2))
                / ((mu_a * mu_a + mu_b * mu_b + c1) * (sigma_a2 + sigma_b2 + c2));

            sum_ssim += ssim;
            count += 1;
        }
    }

    if count == 0 {
        return 1.0;
    }

    (sum_ssim / count as f64) as f32
}
