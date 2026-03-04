// ═══════════════════════════════════════════════════════════════════
// PicEdit — Color Space Utilities
//
// Production-grade color channel operations for format conversion:
//
//   1. RGBA → Grayscale (ITU-R BT.709 luminance)
//      Uses fixed-point arithmetic for exact reproducibility:
//        Y = (54×R + 183×G + 19×B + 128) >> 8
//      This maps to the BT.709 coefficients:
//        R: 54/256 ≈ 0.2109 (spec: 0.2126)
//        G: 183/256 ≈ 0.7148 (spec: 0.7152)
//        B: 19/256 ≈ 0.0742 (spec: 0.0722)
//      Maximum error: ±1 LSB vs floating-point reference.
//
//   2. RGBA → RGB (alpha strip)
//      Simple channel extraction without compositing.
//      Callers should pre-composite against a background color
//      if the source has meaningful transparency.
//
// Reference:
//   - ITU-R Recommendation BT.709-6, "Parameter values for the HDTV
//     standards for production and international programme exchange",
//     June 2015, §3 Signal format, Table 3 (luminance coefficients)
//   - Poynton, C. "Digital Video and HD: Algorithms and Interfaces",
//     Morgan Kaufmann, 2012, §26.5 (luma from RGB)
// ═══════════════════════════════════════════════════════════════════

/// Convert RGBA to perceptual grayscale using BT.709 luminance.
///
/// Output is RGBA with R = G = B = computed luminance.
/// Alpha channel is preserved unchanged.
///
/// Uses integer-only arithmetic (no floating point) for deterministic
/// cross-platform results. The +128 bias provides correct rounding.
pub fn rgba_to_grayscale(rgba: &[u8]) -> Vec<u8> {
    let npx = rgba.len() / 4;
    let mut out = vec![0u8; npx * 4];

    // BT.709 fixed-point coefficients (sum = 256)
    const CR: u32 = 54; // 0.2126 × 256 ≈ 54.4
    const CG: u32 = 183; // 0.7152 × 256 ≈ 183.1
    const CB: u32 = 19; // 0.0722 × 256 ≈ 18.5 → rounded to 19 so sum = 256

    for i in 0..npx {
        let off = i * 4;
        let r = rgba[off] as u32;
        let g = rgba[off + 1] as u32;
        let b = rgba[off + 2] as u32;

        // Weighted sum with rounding bias, then shift
        let y = ((CR * r + CG * g + CB * b + 128) >> 8).min(255) as u8;

        out[off] = y;
        out[off + 1] = y;
        out[off + 2] = y;
        out[off + 3] = rgba[off + 3]; // preserve alpha
    }

    out
}

/// Strip alpha channel from RGBA data, producing RGB (3 bytes per pixel).
///
/// No compositing is performed — alpha values are simply discarded.
/// For images with transparency, callers should first composite
/// against a background using alpha::composite_over().
pub fn rgba_to_rgb(rgba: &[u8]) -> Vec<u8> {
    let npx = rgba.len() / 4;
    let mut out = Vec::with_capacity(npx * 3);

    for i in 0..npx {
        let off = i * 4;
        out.push(rgba[off]); // Red
        out.push(rgba[off + 1]); // Green
        out.push(rgba[off + 2]); // Blue
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grayscale_pure_white() {
        let rgba = vec![255, 255, 255, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 255);
        assert_eq!(out[1], 255);
        assert_eq!(out[2], 255);
        assert_eq!(out[3], 255);
    }

    #[test]
    fn test_grayscale_pure_black() {
        let rgba = vec![0, 0, 0, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 0);
        assert_eq!(out[1], 0);
        assert_eq!(out[2], 0);
        assert_eq!(out[3], 255);
    }

    #[test]
    fn test_grayscale_pure_red() {
        // Y_red = (54 × 255 + 128) >> 8 = (13,898) >> 8 = 54
        let rgba = vec![255, 0, 0, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 54);
    }

    #[test]
    fn test_grayscale_pure_green() {
        // Y_green = (183 × 255 + 128) >> 8 = (46,793) >> 8 = 182
        let rgba = vec![0, 255, 0, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 182);
    }

    #[test]
    fn test_grayscale_pure_blue() {
        // Y_blue = (19 × 255 + 128) >> 8 = (4,973) >> 8 = 19
        let rgba = vec![0, 0, 255, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 19);
    }

    #[test]
    fn test_grayscale_preserves_alpha() {
        let rgba = vec![100, 150, 200, 128];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[3], 128); // alpha unchanged
    }

    #[test]
    fn test_grayscale_sum_matches() {
        // R=100, G=200, B=50: Y = (54×100 + 183×200 + 19×50 + 128) >> 8
        // = (5400 + 36600 + 950 + 128) >> 8 = 43078 >> 8 = 168
        let rgba = vec![100, 200, 50, 255];
        let out = rgba_to_grayscale(&rgba);
        assert_eq!(out[0], 168);
    }

    #[test]
    fn test_rgba_to_rgb_basic() {
        let rgba = vec![10, 20, 30, 255, 40, 50, 60, 128];
        let rgb = rgba_to_rgb(&rgba);
        assert_eq!(rgb.len(), 6);
        assert_eq!(&rgb[0..3], &[10, 20, 30]);
        assert_eq!(&rgb[3..6], &[40, 50, 60]);
    }

    #[test]
    fn test_rgba_to_rgb_size() {
        let rgba = vec![0u8; 100 * 4]; // 100 pixels
        let rgb = rgba_to_rgb(&rgba);
        assert_eq!(rgb.len(), 300); // 100 × 3
    }
}
