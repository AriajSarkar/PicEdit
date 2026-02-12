/// Poisson gradient smoothing with SOR (Successive Over-Relaxation).
///
/// SOR converges ~2x faster than Gauss-Seidel for the same number of iterations
/// by using an over-relaxation factor ω ∈ (1, 2).
///
/// Optimal ω for Laplace equation on a grid: ω ≈ 2 / (1 + sin(π/max(w,h)))
/// For practical purposes, ω = 1.5 works well for most image sizes.
///
/// Only operates on "free" pixels (transition zone 0.02 < α < 0.98).
/// Definite FG/BG pixels are locked as boundary conditions.
pub fn poisson_sor(
    alpha: &mut [f32],
    guide: &[f32],
    w: usize,
    h: usize,
    iterations: usize,
) {
    if h < 3 || w < 3 || iterations == 0 {
        return;
    }

    let npx = w * h;

    // Precompute target Laplacian from guidance gradient
    let mut target_lap = vec![0.0f32; npx];
    for y in 1..h - 1 {
        let yw = y * w;
        for x in 1..w - 1 {
            let idx = yw + x;
            target_lap[idx] = guide[idx - 1] + guide[idx + 1]
                + guide[idx - w] + guide[idx + w]
                - 4.0 * guide[idx];
        }
    }

    // Detect free (transition) pixels
    let mut is_free = vec![false; npx];
    for i in 0..npx {
        is_free[i] = alpha[i] > 0.02 && alpha[i] < 0.98;
    }

    // SOR parameters
    let omega = 1.5f32; // Over-relaxation factor
    let smooth_weight = 0.3f32; // Guidance gradient influence

    for _iter in 0..iterations {
        for y in 1..h - 1 {
            let yw = y * w;
            for x in 1..w - 1 {
                let idx = yw + x;
                if !is_free[idx] {
                    continue;
                }

                // 4-neighbor average
                let avg = 0.25 * (alpha[idx - 1] + alpha[idx + 1]
                    + alpha[idx - w] + alpha[idx + w]);

                // Target: blend between smoothing and gradient-following
                let gs_update = avg + smooth_weight * target_lap[idx];

                // SOR: α_new = α_old + ω * (gs_update - α_old)
                let new_val = alpha[idx] + omega * (gs_update - alpha[idx]);
                alpha[idx] = new_val.clamp(0.0, 1.0);
            }
        }
    }
}
