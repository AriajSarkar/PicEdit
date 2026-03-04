// ═══════════════════════════════════════════════════════════════════
// PicEdit — BMP File Encoder
//
// Encodes raw RGBA pixel data into valid BMP files.
//
// Supports two modes:
//   - 24-bit RGB (BITMAPINFOHEADER, 40 bytes) — alpha stripped
//   - 32-bit BGRA (BITMAPV4HEADER, 108 bytes) — alpha preserved
//     with BI_BITFIELDS for proper channel masking
//
// BMP format key details:
//   - Pixel data is stored bottom-up (last row first)
//   - Rows are padded to 4-byte boundaries
//   - Channel order is BGR (not RGB!)
//   - Resolution is set to 72 DPI (2835 pixels/meter)
//
// Reference: Microsoft BMP file format specification
//            https://learn.microsoft.com/en-us/windows/win32/gdi/bitmap-storage
// ═══════════════════════════════════════════════════════════════════

/// Encode RGBA pixels as a 24-bit BMP file (BGR, no alpha).
///
/// Uses BITMAPINFOHEADER (40-byte DIB header) with BI_RGB compression.
/// Alpha channel is discarded — callers should pre-composite if needed.
pub fn encode_bmp24(rgba: &[u8], w: usize, h: usize) -> Vec<u8> {
    // Row stride: 3 bytes per pixel, rounded up to 4-byte boundary
    let row_stride = (w * 3 + 3) & !3;
    let pixel_data_size = row_stride * h;
    let file_size = 14 + 40 + pixel_data_size;

    let mut buf = Vec::with_capacity(file_size);

    // ── BMP File Header (14 bytes) ──────────────────────────────────
    buf.extend_from_slice(b"BM"); // Signature
    buf.extend_from_slice(&(file_size as u32).to_le_bytes()); // File size
    buf.extend_from_slice(&[0u8; 4]); // Reserved
    buf.extend_from_slice(&54u32.to_le_bytes()); // Pixel data offset (14 + 40)

    // ── BITMAPINFOHEADER (40 bytes) ─────────────────────────────────
    buf.extend_from_slice(&40u32.to_le_bytes()); // Header size
    buf.extend_from_slice(&(w as i32).to_le_bytes()); // Width
    buf.extend_from_slice(&(h as i32).to_le_bytes()); // Height (positive = bottom-up)
    buf.extend_from_slice(&1u16.to_le_bytes()); // Color planes (always 1)
    buf.extend_from_slice(&24u16.to_le_bytes()); // Bits per pixel
    buf.extend_from_slice(&0u32.to_le_bytes()); // Compression: BI_RGB (none)
    buf.extend_from_slice(&(pixel_data_size as u32).to_le_bytes()); // Image size
    buf.extend_from_slice(&2835u32.to_le_bytes()); // H resolution: 72 DPI ≈ 2835 px/m
    buf.extend_from_slice(&2835u32.to_le_bytes()); // V resolution: 72 DPI ≈ 2835 px/m
    buf.extend_from_slice(&0u32.to_le_bytes()); // Colors in palette (0 = default)
    buf.extend_from_slice(&0u32.to_le_bytes()); // Important colors (0 = all)

    // ── Pixel Data (bottom-up, BGR order) ───────────────────────────
    let pad_bytes = row_stride - w * 3;
    for y in (0..h).rev() {
        let row_off = y * w * 4;
        for x in 0..w {
            let px = row_off + x * 4;
            buf.push(rgba[px + 2]); // Blue
            buf.push(rgba[px + 1]); // Green
            buf.push(rgba[px]); // Red
        }
        // Pad row to 4-byte boundary
        for _ in 0..pad_bytes {
            buf.push(0);
        }
    }

    buf
}

/// Encode RGBA pixels as a 32-bit BMP file (BGRA with alpha channel).
///
/// Uses BITMAPV4HEADER (108-byte DIB header) with BI_BITFIELDS compression
/// for proper alpha channel support. Channel masks define BGRA layout.
/// Color space is declared as sRGB.
pub fn encode_bmp32(rgba: &[u8], w: usize, h: usize) -> Vec<u8> {
    let row_stride = w * 4; // 32-bit rows are always 4-byte aligned
    let pixel_data_size = row_stride * h;
    let header_size = 14 + 108; // File header + V4 header
    let file_size = header_size + pixel_data_size;

    let mut buf = Vec::with_capacity(file_size);

    // ── BMP File Header (14 bytes) ──────────────────────────────────
    buf.extend_from_slice(b"BM");
    buf.extend_from_slice(&(file_size as u32).to_le_bytes());
    buf.extend_from_slice(&[0u8; 4]);
    buf.extend_from_slice(&(header_size as u32).to_le_bytes());

    // ── BITMAPV4HEADER (108 bytes) ──────────────────────────────────
    buf.extend_from_slice(&108u32.to_le_bytes()); // Header size
    buf.extend_from_slice(&(w as i32).to_le_bytes()); // Width
    buf.extend_from_slice(&(h as i32).to_le_bytes()); // Height (positive = bottom-up)
    buf.extend_from_slice(&1u16.to_le_bytes()); // Color planes
    buf.extend_from_slice(&32u16.to_le_bytes()); // Bits per pixel
    buf.extend_from_slice(&3u32.to_le_bytes()); // Compression: BI_BITFIELDS
    buf.extend_from_slice(&(pixel_data_size as u32).to_le_bytes()); // Image size
    buf.extend_from_slice(&2835u32.to_le_bytes()); // H resolution (72 DPI)
    buf.extend_from_slice(&2835u32.to_le_bytes()); // V resolution (72 DPI)
    buf.extend_from_slice(&0u32.to_le_bytes()); // Colors in palette
    buf.extend_from_slice(&0u32.to_le_bytes()); // Important colors

    // Channel bitmasks (defines which bits map to which channel)
    buf.extend_from_slice(&0x00FF_0000u32.to_le_bytes()); // Red mask
    buf.extend_from_slice(&0x0000_FF00u32.to_le_bytes()); // Green mask
    buf.extend_from_slice(&0x0000_00FFu32.to_le_bytes()); // Blue mask
    buf.extend_from_slice(&0xFF00_0000u32.to_le_bytes()); // Alpha mask

    // Color space type: LCS_sRGB (identified by magic bytes)
    buf.extend_from_slice(b"sRGB"); // CSType
    buf.extend_from_slice(&[0u8; 36]); // CIEXYZTRIPLE endpoints (unused for sRGB)
    buf.extend_from_slice(&[0u8; 12]); // Gamma RGB (unused for sRGB)

    // ── Pixel Data (bottom-up, BGRA order) ──────────────────────────
    for y in (0..h).rev() {
        let row_off = y * w * 4;
        for x in 0..w {
            let px = row_off + x * 4;
            buf.push(rgba[px + 2]); // Blue
            buf.push(rgba[px + 1]); // Green
            buf.push(rgba[px]); // Red
            buf.push(rgba[px + 3]); // Alpha
        }
    }

    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bmp24_header() {
        let rgba = vec![255, 0, 0, 255]; // 1×1 red pixel
        let bmp = encode_bmp24(&rgba, 1, 1);

        // Check BMP signature
        assert_eq!(&bmp[0..2], b"BM");
        // File size: 14 + 40 + 4 (1 pixel = 3 bytes, padded to 4)
        let file_size = u32::from_le_bytes([bmp[2], bmp[3], bmp[4], bmp[5]]);
        assert_eq!(file_size, 58);
        // BPP = 24
        let bpp = u16::from_le_bytes([bmp[28], bmp[29]]);
        assert_eq!(bpp, 24);
        // Pixel data: BGR = 0, 0, 255 (red), plus 1 pad byte
        assert_eq!(bmp[54], 0); // B
        assert_eq!(bmp[55], 0); // G
        assert_eq!(bmp[56], 255); // R
    }

    #[test]
    fn test_bmp32_header() {
        let rgba = vec![255, 128, 64, 200]; // 1×1 pixel
        let bmp = encode_bmp32(&rgba, 1, 1);

        assert_eq!(&bmp[0..2], b"BM");
        let bpp = u16::from_le_bytes([bmp[28], bmp[29]]);
        assert_eq!(bpp, 32);
        // Check sRGB color space marker
        assert_eq!(&bmp[70..74], b"sRGB");
    }

    #[test]
    fn test_bmp24_row_padding() {
        // 3 pixels wide = 9 bytes per row, needs 3 bytes padding to reach 12
        let rgba = vec![0u8; 3 * 1 * 4]; // 3×1
        let bmp = encode_bmp24(&rgba, 3, 1);
        let pixel_offset = u32::from_le_bytes([bmp[10], bmp[11], bmp[12], bmp[13]]) as usize;
        let pixel_data = &bmp[pixel_offset..];
        // 3 pixels × 3 bytes + 3 padding = 12 bytes
        assert_eq!(pixel_data.len(), 12);
    }
}
