/// Edge refinement — Scharr operator (better isotropy than Sobel, same cost).
///
/// Scharr kernel:
///   X: [-3, 0, 3; -10, 0, 10; -3, 0, 3] / 32
///   Y: [-3,-10,-3;  0,  0,  0;  3, 10, 3] / 32
///
/// Advantages over Sobel:
/// - Better rotational symmetry (less directional bias)
/// - Same computational cost (6 adds, 4 multiplies)
/// - More accurate gradient magnitude for diagonal edges

pub fn refine_edges_scharr(
    alpha: &mut [f32],
    guide: &[f32],
    w: usize,
    h: usize,
    edge_threshold: f32,
) {
    if h < 3 || w < 3 {
        return;
    }

    let npx = w * h;
    let mut edges = vec![0.0f32; npx];
    let mut max_edge = 0.0f32;

    // Fused Scharr magnitude computation + max tracking
    for y in 1..h - 1 {
        let yw = y * w;
        let yw_prev = (y - 1) * w;
        let yw_next = (y + 1) * w;

        for x in 1..w - 1 {
            // Scharr X: [-3,0,3; -10,0,10; -3,0,3]
            let gx = -3.0 * guide[yw_prev + x - 1] + 3.0 * guide[yw_prev + x + 1]
                - 10.0 * guide[yw + x - 1] + 10.0 * guide[yw + x + 1]
                - 3.0 * guide[yw_next + x - 1] + 3.0 * guide[yw_next + x + 1];

            // Scharr Y: [-3,-10,-3; 0,0,0; 3,10,3]
            let gy = -3.0 * guide[yw_prev + x - 1] - 10.0 * guide[yw_prev + x] - 3.0 * guide[yw_prev + x + 1]
                + 3.0 * guide[yw_next + x - 1] + 10.0 * guide[yw_next + x] + 3.0 * guide[yw_next + x + 1];

            // Fast magnitude: |gx| + |gy| (L1 norm, avoids sqrt)
            let mag = gx.abs() + gy.abs();
            edges[yw + x] = mag;
            if mag > max_edge {
                max_edge = mag;
            }
        }
    }

    if max_edge < 1e-6 {
        return;
    }

    // Apply: push transition alpha toward 0 or 1 at edges
    let inv_max = 1.0 / max_edge;
    let thresh_inv = if edge_threshold < 1.0 { 1.0 / (1.0 - edge_threshold) } else { 1.0 };

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let idx = y * w + x;
            let a = alpha[idx];

            // Skip non-transition
            if a <= 0.05 || a >= 0.95 {
                continue;
            }

            let edge = edges[idx] * inv_max;
            if edge < edge_threshold {
                continue;
            }

            let strength = ((edge - edge_threshold) * thresh_inv).min(1.0);

            alpha[idx] = if a > 0.5 {
                a + (1.0 - a) * strength * 0.5
            } else {
                a * (1.0 - strength * 0.5)
            };
        }
    }
}
