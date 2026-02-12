/// Trimap generation via BFS distance transform — O(n) instead of O(n*r²).
///
/// Traditional approach: for each pixel, scan all neighbors in radius to check
/// if all are FG/BG. This is O(n * (2r+1)²).
///
/// BFS approach: seed the frontier from edge pixels, propagate distance outward.
/// Each pixel is visited exactly once → O(n).
///
/// Values: 0 = definite BG, 128 = unknown, 255 = definite FG
use std::collections::VecDeque;

pub fn generate_trimap_bfs(alpha: &[f32], w: usize, h: usize, radius: usize) -> Vec<u8> {
    let npx = w * h;
    let mut trimap = vec![128u8; npx];

    // Step 1: Classify pixels as hard FG, hard BG, or transition
    // A pixel is "hard" only if it's clearly on one side
    const FG_THRESH: f32 = 0.95;
    const BG_THRESH: f32 = 0.05;

    // Step 2: BFS from transition boundaries
    // Find all pixels that are near a transition (has a neighbor on the other side)
    let mut dist = vec![u32::MAX; npx];
    let mut queue: VecDeque<usize> = VecDeque::with_capacity(npx / 4);

    // Seed: any pixel that has a neighbor with a significantly different alpha
    // These are the "edge" pixels — the boundary of the transition zone
    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let a = alpha[idx];

            // Check if this pixel is on the boundary (has neighbor on other side)
            let mut is_edge = false;
            if x > 0 && (alpha[idx - 1] - a).abs() > 0.3 { is_edge = true; }
            if x + 1 < w && (alpha[idx + 1] - a).abs() > 0.3 { is_edge = true; }
            if y > 0 && (alpha[idx - w] - a).abs() > 0.3 { is_edge = true; }
            if y + 1 < h && (alpha[idx + w] - a).abs() > 0.3 { is_edge = true; }

            // Also seed from any transition pixel
            if (a > BG_THRESH && a < FG_THRESH) || is_edge {
                dist[idx] = 0;
                queue.push_back(idx);
            }
        }
    }

    // BFS: propagate distance from seeds
    while let Some(idx) = queue.pop_front() {
        let d = dist[idx] + 1;
        if d > radius as u32 {
            continue;
        }

        let x = idx % w;
        let y = idx / w;

        let neighbors = [
            if x > 0 { Some(idx - 1) } else { None },
            if x + 1 < w { Some(idx + 1) } else { None },
            if y > 0 { Some(idx - w) } else { None },
            if y + 1 < h { Some(idx + w) } else { None },
        ];

        for ni in neighbors.iter().flatten() {
            let ni = *ni;
            if d < dist[ni] {
                dist[ni] = d;
                queue.push_back(ni);
            }
        }
    }

    // Classify: pixels within radius of transition are unknown, rest are definite
    for i in 0..npx {
        if dist[i] <= radius as u32 {
            trimap[i] = 128; // unknown zone
        } else if alpha[i] >= FG_THRESH {
            trimap[i] = 255; // definite FG
        } else if alpha[i] <= BG_THRESH {
            trimap[i] = 0; // definite BG
        }
        // else stays 128 (transition pixels far from boundary — shouldn't happen often)
    }

    trimap
}
