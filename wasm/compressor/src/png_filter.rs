// PNG Per-Row Filter Optimization
//
// PNG supports 5 filter types per row:
//   0 = None: Raw bytes
//   1 = Sub:  Difference from left pixel
//   2 = Up:   Difference from above pixel
//   3 = Average: Average of left and above
//   4 = Paeth: Paeth predictor (best of Sub, Up, diagonal)
//
// Strategy: Try all 5 filters for each row, select the one that
// minimizes the sum of absolute values (proxy for entropy).
// This maximizes DEFLATE compression efficiency.

pub fn select_optimal_filters(rgba: &[u8], w: usize, h: usize) -> Vec<u8> {
    let stride = w * 4;
    let mut filters = vec![0u8; h];

    for y in 0..h {
        let row_start = y * stride;
        let row = &rgba[row_start..row_start + stride];
        let prev_row = if y > 0 { Some(&rgba[(y - 1) * stride..(y - 1) * stride + stride]) } else { None };

        let mut best_filter = 0u8;
        let mut best_sum = u64::MAX;

        for filter_type in 0..5u8 {
            let sum = compute_filter_cost(row, prev_row, filter_type);
            if sum < best_sum {
                best_sum = sum;
                best_filter = filter_type;
            }
        }

        filters[y] = best_filter;
    }

    filters
}

fn compute_filter_cost(row: &[u8], prev_row: Option<&[u8]>, filter_type: u8) -> u64 {
    let mut sum = 0u64;

    for i in 0..row.len() {
        let x = row[i];
        let a = if i >= 4 { row[i - 4] } else { 0 }; // left pixel (same channel)
        let b = prev_row.map(|p| p[i]).unwrap_or(0);   // above pixel
        let c = if i >= 4 { prev_row.map(|p| p[i - 4]).unwrap_or(0) } else { 0 }; // above-left

        let filtered = match filter_type {
            0 => x,
            1 => x.wrapping_sub(a),
            2 => x.wrapping_sub(b),
            3 => x.wrapping_sub(((a as u16 + b as u16) / 2) as u8),
            4 => x.wrapping_sub(paeth_predictor(a, b, c)),
            _ => x,
        };

        sum += (filtered as i8).unsigned_abs() as u64;
    }

    sum
}

#[inline]
fn paeth_predictor(a: u8, b: u8, c: u8) -> u8 {
    let p = a as i16 + b as i16 - c as i16;
    let pa = (p - a as i16).unsigned_abs();
    let pb = (p - b as i16).unsigned_abs();
    let pc = (p - c as i16).unsigned_abs();

    if pa <= pb && pa <= pc { a }
    else if pb <= pc { b }
    else { c }
}
