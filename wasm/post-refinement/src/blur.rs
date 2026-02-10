/// Separable box blur for alpha feathering.
///
/// Two-pass running sum: O(1) per pixel regardless of radius.
/// Horizontal pass → Vertical pass.

pub fn box_blur_separable(
    alpha: &[f32],
    w: usize,
    h: usize,
    radius: usize,
) -> Vec<f32> {
    if radius == 0 {
        return alpha.to_vec();
    }

    let npx = w * h;
    let r = radius as isize;

    // Horizontal pass
    let mut temp = vec![0.0f32; npx];
    for y in 0..h {
        let row = y * w;
        let mut sum = 0.0f32;
        let mut count = 0i32;

        // Initialize window
        for x in 0..=(radius.min(w - 1)) {
            sum += alpha[row + x];
            count += 1;
        }
        temp[row] = sum / count as f32;

        for x in 1..w {
            let add_x = x + radius;
            if add_x < w {
                sum += alpha[row + add_x];
                count += 1;
            }
            let rem_x = x as isize - r - 1;
            if rem_x >= 0 {
                sum -= alpha[row + rem_x as usize];
                count -= 1;
            }
            temp[row + x] = sum / count as f32;
        }
    }

    // Vertical pass
    let mut output = vec![0.0f32; npx];
    for x in 0..w {
        let mut sum = 0.0f32;
        let mut count = 0i32;

        for y in 0..=(radius.min(h - 1)) {
            sum += temp[y * w + x];
            count += 1;
        }
        output[x] = sum / count as f32;

        for y in 1..h {
            let add_y = y + radius;
            if add_y < h {
                sum += temp[add_y * w + x];
                count += 1;
            }
            let rem_y = y as isize - r - 1;
            if rem_y >= 0 {
                sum -= temp[rem_y as usize * w + x];
                count -= 1;
            }
            output[y * w + x] = (sum / count as f32).clamp(0.0, 1.0);
        }
    }

    output
}
