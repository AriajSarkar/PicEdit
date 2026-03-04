// ═══════════════════════════════════════════════════════════════════
// PicEdit — ICO File Encoder
//
// Generates Windows ICO (icon) files containing multiple image sizes.
// Each entry uses the BMP-embedded format with XOR + AND masks,
// which is the traditional ICO encoding method.
//
// ICO file structure:
//   ICONDIR (6 bytes):
//     - Reserved (2 bytes): always 0
//     - Type (2 bytes): 1 = ICO, 2 = CUR
//     - Count (2 bytes): number of images
//
//   ICONDIRENTRY (16 bytes each):
//     - Width (1 byte): 0 means 256
//     - Height (1 byte): 0 means 256
//     - Color count (1 byte): 0 = >256 colors
//     - Reserved (1 byte): always 0
//     - Color planes (2 bytes): 1
//     - Bits per pixel (2 bytes): 32
//     - Data size (4 bytes): image data byte count
//     - Data offset (4 bytes): file offset to image data
//
//   Image data (per entry):
//     - BITMAPINFOHEADER (40 bytes): DIB header with height = 2× actual
//     - XOR mask: BGRA pixel data (bottom-up)
//     - AND mask: 1-bit transparency (bottom-up, 4-byte aligned rows)
//
// The AND mask provides legacy transparency:
//   - 0 = pixel is opaque (use XOR color)
//   - 1 = pixel is transparent (XOR ignored)
//
// Modern viewers use the 32-bit alpha channel from the XOR mask,
// but the AND mask is required for backward compatibility.
//
// Reference: Microsoft ICO format specification
//            https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)
// ═══════════════════════════════════════════════════════════════════

use crate::resize;

/// Encode RGBA pixels as a multi-resolution ICO file.
///
/// The source image is downscaled to each requested size using
/// area-average resampling (optimal for large reduction ratios).
/// Each size is embedded as a 32-bit BMP entry with AND mask.
///
/// Valid sizes: 1–256 pixels (square). Duplicates are removed.
pub fn encode_ico_multi(rgba: &[u8], w: usize, h: usize, sizes: &[usize]) -> Vec<u8> {
    // Validate and deduplicate sizes
    let mut valid_sizes: Vec<usize> = sizes
        .iter()
        .copied()
        .filter(|&s| s >= 1 && s <= 256)
        .collect();
    valid_sizes.sort_unstable();
    valid_sizes.dedup();

    if valid_sizes.is_empty() {
        return Vec::new();
    }

    let count = valid_sizes.len();

    // Generate resized images and encode each as a BMP entry
    let mut entries: Vec<(usize, Vec<u8>)> = Vec::with_capacity(count);
    for &size in &valid_sizes {
        let resized = if size == w && size == h {
            rgba.to_vec()
        } else {
            resize::area_average(rgba, w, h, size, size)
        };
        let bmp_data = encode_ico_bmp_entry(&resized, size, size);
        entries.push((size, bmp_data));
    }

    // Calculate file layout: directory then image data
    let dir_size = 6 + count * 16;
    let mut offset = dir_size;
    let mut offsets = Vec::with_capacity(count);
    for (_, data) in &entries {
        offsets.push(offset);
        offset += data.len();
    }

    let total_size = offset;
    let mut buf = Vec::with_capacity(total_size);

    // ── ICONDIR (6 bytes) ───────────────────────────────────────────
    buf.extend_from_slice(&0u16.to_le_bytes()); // Reserved
    buf.extend_from_slice(&1u16.to_le_bytes()); // Type: ICO
    buf.extend_from_slice(&(count as u16).to_le_bytes()); // Image count

    // ── ICONDIRENTRY (16 bytes each) ────────────────────────────────
    for (i, &(size, _)) in entries.iter().enumerate() {
        // Width/height: 0 encodes as 256 in ICO spec
        let ico_dim = if size >= 256 { 0u8 } else { size as u8 };

        buf.push(ico_dim); // Width
        buf.push(ico_dim); // Height
        buf.push(0); // Color count (0 = >256 colors)
        buf.push(0); // Reserved
        buf.extend_from_slice(&1u16.to_le_bytes()); // Color planes
        buf.extend_from_slice(&32u16.to_le_bytes()); // Bits per pixel
        buf.extend_from_slice(&(entries[i].1.len() as u32).to_le_bytes()); // Data size
        buf.extend_from_slice(&(offsets[i] as u32).to_le_bytes()); // Data offset
    }

    // ── Image data ──────────────────────────────────────────────────
    for (_, data) in &entries {
        buf.extend_from_slice(data);
    }

    buf
}

/// Encode RGBA pixels as an ICO-embedded BMP entry.
///
/// ICO BMP entries differ from standalone BMP files:
///   - No BMP file header (starts directly at DIB header)
///   - Height field is doubled (accounts for XOR + AND mask regions)
///   - Includes a 1-bit AND mask after the pixel data
pub fn encode_ico_bmp_entry(rgba: &[u8], w: usize, h: usize) -> Vec<u8> {
    // AND mask: 1-bit per pixel, rows padded to 4-byte boundaries
    let and_row_stride = ((w + 31) / 32) * 4;
    let xor_size = w * h * 4; // 32-bit BGRA
    let and_size = and_row_stride * h;
    let total_size = 40 + xor_size + and_size;

    let mut buf = Vec::with_capacity(total_size);

    // ── BITMAPINFOHEADER (40 bytes) ─────────────────────────────────
    buf.extend_from_slice(&40u32.to_le_bytes()); // Header size
    buf.extend_from_slice(&(w as i32).to_le_bytes()); // Width
    buf.extend_from_slice(&((h * 2) as i32).to_le_bytes()); // Height × 2 (XOR + AND)
    buf.extend_from_slice(&1u16.to_le_bytes()); // Planes
    buf.extend_from_slice(&32u16.to_le_bytes()); // BPP
    buf.extend_from_slice(&0u32.to_le_bytes()); // Compression: BI_RGB
    buf.extend_from_slice(&((xor_size + and_size) as u32).to_le_bytes()); // Data size
    buf.extend_from_slice(&0u32.to_le_bytes()); // H resolution
    buf.extend_from_slice(&0u32.to_le_bytes()); // V resolution
    buf.extend_from_slice(&0u32.to_le_bytes()); // Colors
    buf.extend_from_slice(&0u32.to_le_bytes()); // Important colors

    // ── XOR mask (BGRA, bottom-up) ──────────────────────────────────
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

    // ── AND mask (1-bit per pixel, bottom-up) ───────────────────────
    // Bit value: 0 = opaque (use XOR pixel), 1 = transparent
    for y in (0..h).rev() {
        let row_off = y * w * 4;
        let mut byte: u8 = 0;
        let mut bit_pos: usize = 0;

        for x in 0..w {
            let alpha = rgba[row_off + x * 4 + 3];
            // Mark as transparent if alpha < 50% (128)
            if alpha < 128 {
                byte |= 1 << (7 - bit_pos);
            }
            bit_pos += 1;

            if bit_pos == 8 {
                buf.push(byte);
                byte = 0;
                bit_pos = 0;
            }
        }

        // Flush partial byte
        if bit_pos > 0 {
            buf.push(byte);
        }

        // Pad row to 4-byte boundary
        let written_bytes = (w + 7) / 8;
        for _ in written_bytes..and_row_stride {
            buf.push(0);
        }
    }

    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ico_header() {
        // 16×16 red pixel icon
        let rgba = vec![255, 0, 0, 255, 16 * 16];
        let ico = encode_ico_multi(&rgba, 16, 16, &[16]);

        // ICONDIR signature
        assert_eq!(&ico[0..2], &[0, 0]); // Reserved
        assert_eq!(ico[2], 1); // Type = ICO (low byte)
        assert_eq!(ico[4], 1); // Count = 1 (low byte)

        // ICONDIRENTRY
        assert_eq!(ico[6], 16); // Width
        assert_eq!(ico[7], 16); // Height
        assert_eq!(ico[12], 32); // BPP (low byte)
    }

    #[test]
    fn test_ico_multi_sizes() {
        let rgba = vec![0u8; 64 * 64 * 4];
        let ico = encode_ico_multi(&rgba, 64, 64, &[16, 32, 64]);

        // Should have 3 entries
        let count = u16::from_le_bytes([ico[4], ico[5]]);
        assert_eq!(count, 3);
    }

    #[test]
    fn test_ico_dedup_and_sort() {
        let rgba = vec![0u8; 32 * 32 * 4];
        let ico = encode_ico_multi(&rgba, 32, 32, &[32, 16, 32, 16]);

        // Should deduplicate to 2 entries
        let count = u16::from_le_bytes([ico[4], ico[5]]);
        assert_eq!(count, 2);
    }

    #[test]
    fn test_ico_256_size_encoding() {
        let rgba = vec![0u8; 256 * 256 * 4];
        let ico = encode_ico_multi(&rgba, 256, 256, &[256]);

        // Width/height should be 0 (encodes as 256 in ICO spec)
        assert_eq!(ico[6], 0); // Width = 0 means 256
        assert_eq!(ico[7], 0); // Height = 0 means 256
    }

    #[test]
    fn test_and_mask_transparency() {
        // 8×1 image: first 4 pixels opaque, last 4 transparent
        let mut rgba = vec![0u8; 8 * 1 * 4];
        for x in 0..4 {
            rgba[x * 4 + 3] = 255; // Opaque
        }
        // Last 4 pixels have alpha = 0 (transparent)

        let bmp = encode_ico_bmp_entry(&rgba, 8, 1);
        // AND mask starts after header (40) + XOR data (8×1×4=32) = offset 72
        // For 8 pixels: 1 byte data, padded to 4 bytes
        let and_offset = 40 + 32;
        // Last 4 bits should be 1 (transparent), first 4 should be 0 (opaque)
        // But it's bottom-up, and we only have 1 row, so:
        assert_eq!(bmp[and_offset], 0b0000_1111); // bits: 0000 (opaque) 1111 (transparent)
    }
}
