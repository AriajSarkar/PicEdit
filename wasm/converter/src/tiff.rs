// ═══════════════════════════════════════════════════════════════════
// PicEdit — TIFF File Encoder (Uncompressed, Windows-Compatible)
//
// Generates Baseline TIFF 6.0 files with RGB or RGBA pixel data.
// Uses uncompressed encoding (Compression=1) for maximum compatibility
// with all viewers including Windows 11 Photos.
//
// TIFF structure:
//   Header (8 bytes):
//     - Byte order: "II" (little-endian)
//     - Magic number: 42
//     - First IFD offset
//
//   IFD (Image File Directory):
//     - Entry count (2 bytes)
//     - Entries (12 bytes each): tag, type, count, value/offset
//     - Next IFD offset (4 bytes): 0 = last IFD
//
//   Required Baseline TIFF tags for full-color images:
//     256: ImageWidth          257: ImageLength
//     258: BitsPerSample       259: Compression (1 = none)
//     262: PhotometricInterp   273: StripOffsets
//     277: SamplesPerPixel     278: RowsPerStrip
//     279: StripByteCounts     282: XResolution
//     283: YResolution         296: ResolutionUnit
//     338: ExtraSamples (RGBA only)
//
// Two modes:
//   - RGB (preserve_alpha=false): 3 channels, no ExtraSamples tag.
//     Maximum compatibility with Windows Photo Viewer, macOS Preview,
//     and all image editors.
//   - RGBA (preserve_alpha=true): 4 channels, ExtraSamples=2
//     (unassociated alpha). Supported by professional image editors
//     and most modern viewers.
//
// Reference:
//   - TIFF Revision 6.0, Adobe Systems, June 1992
// ═══════════════════════════════════════════════════════════════════

/// Encode RGBA pixel data as a TIFF file (uncompressed).
///
/// When `preserve_alpha` is false, strips the alpha channel and writes
/// 3-channel RGB for maximum viewer compatibility.
/// When true, writes 4-channel RGBA with unassociated alpha.
///
/// Uses one strip per row. Resolution is set to 72 DPI.
pub fn encode_tiff(rgba: &[u8], w: usize, h: usize, preserve_alpha: bool) -> Vec<u8> {
    let spp: usize = if preserve_alpha { 4 } else { 3 };
    let row_bytes = w * spp;

    // Build pixel data — either copy RGBA or strip to RGB
    let pixels: Vec<u8> = if preserve_alpha {
        rgba.to_vec()
    } else {
        let mut rgb = Vec::with_capacity(w * h * 3);
        for chunk in rgba.chunks_exact(4) {
            rgb.extend_from_slice(&chunk[..3]);
        }
        rgb
    };

    // ── IFD entry definitions (sorted by tag, required by TIFF spec) ──
    let mut ifd_entries: Vec<IfdEntry> = vec![
        IfdEntry::short(256, 1, w as u32),           // ImageWidth
        IfdEntry::short(257, 1, h as u32),           // ImageLength
        IfdEntry::short(258, spp as u32, 0),         // BitsPerSample → offset
        IfdEntry::short(259, 1, 1),                  // Compression: none
        IfdEntry::short(262, 1, 2),                  // PhotometricInterpretation: RGB
        IfdEntry::long(273, h as u32, 0),            // StripOffsets → offset
        IfdEntry::short(277, 1, spp as u32),         // SamplesPerPixel
        IfdEntry::short(278, 1, 1),                  // RowsPerStrip: 1
        IfdEntry::long(279, h as u32, 0),            // StripByteCounts → offset
        IfdEntry::rational(282, 1, 0),               // XResolution → offset
        IfdEntry::rational(283, 1, 0),               // YResolution → offset
        IfdEntry::short(296, 1, 2),                  // ResolutionUnit: inch
    ];

    if preserve_alpha {
        ifd_entries.push(IfdEntry::short(338, 1, 2)); // ExtraSamples: unassociated alpha
    }

    let num_entries = ifd_entries.len();

    // ── Calculate layout ────────────────────────────────────────────
    let ifd_offset: usize = 8; // Right after header
    let ifd_size = 2 + num_entries * 12 + 4; // count + entries + next-IFD
    let ext_base = ifd_offset + ifd_size;

    // Extended data area: values that don't fit in the 4-byte IFD value field
    let mut ext_data: Vec<u8> = Vec::new();

    // BitsPerSample: [8, 8, 8] or [8, 8, 8, 8]
    let bits_per_sample_off = ext_base + ext_data.len();
    for _ in 0..spp {
        ext_data.extend_from_slice(&8u16.to_le_bytes());
    }

    // XResolution: 72/1 (RATIONAL = two u32s)
    let x_res_off = ext_base + ext_data.len();
    ext_data.extend_from_slice(&72u32.to_le_bytes());
    ext_data.extend_from_slice(&1u32.to_le_bytes());

    // YResolution: 72/1
    let y_res_off = ext_base + ext_data.len();
    ext_data.extend_from_slice(&72u32.to_le_bytes());
    ext_data.extend_from_slice(&1u32.to_le_bytes());

    // StripByteCounts: each strip is row_bytes (uncompressed)
    let strip_byte_counts_off = ext_base + ext_data.len();
    for _ in 0..h {
        ext_data.extend_from_slice(&(row_bytes as u32).to_le_bytes());
    }

    // StripOffsets: placeholder — computed after we know positions
    let strip_offsets_off = ext_base + ext_data.len();
    let strip_offsets_local_off = ext_data.len();
    for _ in 0..h {
        ext_data.extend_from_slice(&0u32.to_le_bytes()); // placeholder
    }

    // Strip data starts after all extended data
    let strips_base = ext_base + ext_data.len();

    // Fill in actual strip offsets
    for i in 0..h {
        let strip_pos = strips_base + i * row_bytes;
        let off_pos = strip_offsets_local_off + i * 4;
        let bytes = (strip_pos as u32).to_le_bytes();
        ext_data[off_pos] = bytes[0];
        ext_data[off_pos + 1] = bytes[1];
        ext_data[off_pos + 2] = bytes[2];
        ext_data[off_pos + 3] = bytes[3];
    }

    // Total file size
    let total_size = strips_base + h * row_bytes;
    let mut buf = Vec::with_capacity(total_size);

    // ── TIFF Header (8 bytes) ───────────────────────────────────────
    buf.extend_from_slice(b"II"); // Little-endian byte order
    buf.extend_from_slice(&42u16.to_le_bytes()); // Magic number
    buf.extend_from_slice(&(ifd_offset as u32).to_le_bytes()); // First IFD offset

    // ── Image File Directory ────────────────────────────────────────
    buf.extend_from_slice(&(num_entries as u16).to_le_bytes());

    for entry in &ifd_entries {
        buf.extend_from_slice(&entry.tag.to_le_bytes());
        buf.extend_from_slice(&entry.field_type.to_le_bytes());
        buf.extend_from_slice(&entry.count.to_le_bytes());

        // Determine the value/offset to write
        let val = match entry.tag {
            258 => bits_per_sample_off as u32,
            273 => strip_offsets_off as u32,
            279 => strip_byte_counts_off as u32,
            282 => x_res_off as u32,
            283 => y_res_off as u32,
            _ => entry.value,
        };

        // Tags whose data doesn't fit in the 4-byte value field
        let needs_offset = matches!(entry.tag, 258 | 273 | 279 | 282 | 283);

        if needs_offset {
            buf.extend_from_slice(&val.to_le_bytes());
        } else {
            // Inline value: write as SHORT or LONG, padded to 4 bytes
            match entry.field_type {
                3 => {
                    // SHORT: write u16 + 2 pad bytes
                    buf.extend_from_slice(&(entry.value as u16).to_le_bytes());
                    buf.extend_from_slice(&[0u8; 2]);
                }
                _ => {
                    // LONG: write u32 directly
                    buf.extend_from_slice(&entry.value.to_le_bytes());
                }
            }
        }
    }

    // Next IFD offset: 0 (single-page TIFF)
    buf.extend_from_slice(&0u32.to_le_bytes());

    // ── Extended data ───────────────────────────────────────────────
    buf.extend_from_slice(&ext_data);

    // ── Uncompressed pixel data (one strip per row) ─────────────────
    for y in 0..h {
        let start = y * row_bytes;
        buf.extend_from_slice(&pixels[start..start + row_bytes]);
    }

    debug_assert_eq!(buf.len(), total_size);

    buf
}

/// IFD entry helper struct
struct IfdEntry {
    tag: u16,
    field_type: u16,
    count: u32,
    value: u32,
}

impl IfdEntry {
    fn short(tag: u16, count: u32, value: u32) -> Self {
        Self {
            tag,
            field_type: 3,
            count,
            value,
        }
    }

    fn long(tag: u16, count: u32, value: u32) -> Self {
        Self {
            tag,
            field_type: 4,
            count,
            value,
        }
    }

    fn rational(tag: u16, count: u32, value: u32) -> Self {
        Self {
            tag,
            field_type: 5,
            count,
            value,
        }
    }
}

/// PackBits compression algorithm (kept for potential future use).
///
/// Scans input bytes and produces a compressed stream with two run types:
///
/// **Repeat run** (3+ consecutive identical bytes):
///   Header byte: (257 − run_length) as u8, followed by 1 byte value
///   Maximum repeat: 128 bytes (header = 129)
///
/// **Literal run** (varying bytes):
///   Header byte: (run_length − 1) as u8, followed by run_length literal bytes
///   Maximum literal: 128 bytes (header = 127)
///
/// The algorithm greedily finds repeat runs of ≥3 bytes, and collects
/// everything else into literal runs. This matches the canonical Apple
/// PackBits specification behavior.
///
/// Reference: Apple Computer Technical Note TN1023
#[allow(dead_code)]
fn packbits_encode(data: &[u8]) -> Vec<u8> {
    let len = data.len();
    if len == 0 {
        return Vec::new();
    }

    // Worst case: every byte is a 1-byte literal → 2 bytes per byte
    let mut out = Vec::with_capacity(len + len / 128 + 2);
    let mut i = 0;

    while i < len {
        // Count consecutive identical bytes
        let mut run_len: usize = 1;
        while i + run_len < len && run_len < 128 && data[i + run_len] == data[i] {
            run_len += 1;
        }

        if run_len >= 3 {
            // Emit repeat run
            // Header: (257 - run_len) as u8, which is (-run_len + 1) as i8
            out.push((257 - run_len) as u8);
            out.push(data[i]);
            i += run_len;
        } else {
            // Gather literal run: accumulate bytes until we hit a repeat of ≥3
            let lit_start = i;
            i += run_len;

            while i < len && (i - lit_start) < 128 {
                // Peek ahead: does a repeat run of ≥3 start here?
                let mut peek_run: usize = 1;
                while i + peek_run < len && peek_run < 128 && data[i + peek_run] == data[i] {
                    peek_run += 1;
                }
                if peek_run >= 3 {
                    break; // Let the repeat handler process this
                }
                i += 1;
            }

            let lit_len = i - lit_start;
            out.push((lit_len - 1) as u8);
            out.extend_from_slice(&data[lit_start..lit_start + lit_len]);
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_packbits_repeat() {
        // 5 identical bytes → header 252 (= 257-5), value
        let input = vec![0xAA; 5];
        let out = packbits_encode(&input);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0], 252); // 257 - 5
        assert_eq!(out[1], 0xAA);
    }

    #[test]
    fn test_packbits_literal() {
        let input = vec![1, 2, 3, 4, 5];
        let out = packbits_encode(&input);
        assert_eq!(out[0], 4); // 5 - 1 = 4 (literal header)
        assert_eq!(&out[1..6], &[1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_packbits_mixed() {
        // 3 repeats + 3 literals
        let input = vec![0xFF, 0xFF, 0xFF, 1, 2, 3];
        let out = packbits_encode(&input);
        // Repeat: [254, 0xFF] (257-3=254)
        assert_eq!(out[0], 254);
        assert_eq!(out[1], 0xFF);
        // Literal: [2, 1, 2, 3] (3-1=2)
        assert_eq!(out[2], 2);
        assert_eq!(&out[3..6], &[1, 2, 3]);
    }

    #[test]
    fn test_packbits_roundtrip() {
        let input = vec![
            0, 0, 0, 0, 0, // 5× repeat
            1, 2, 3, 4, // 4× literal
            7, 7, 7, // 3× repeat
        ];
        let compressed = packbits_encode(&input);

        // Decompress to verify
        let decompressed = packbits_decode(&compressed);
        assert_eq!(decompressed, input);
    }

    #[test]
    fn test_tiff_header() {
        let rgba = vec![128u8; 4 * 4 * 4]; // 4×4 RGBA
        let tiff = encode_tiff(&rgba, 4, 4, false);

        // TIFF little-endian signature
        assert_eq!(&tiff[0..2], b"II");
        // Magic number 42
        let magic = u16::from_le_bytes([tiff[2], tiff[3]]);
        assert_eq!(magic, 42);
    }

    #[test]
    fn test_tiff_not_empty() {
        let rgba = vec![0u8; 2 * 2 * 4]; // 2×2
        let tiff = encode_tiff(&rgba, 2, 2, false);
        assert!(tiff.len() > 8 + 2 + 12 * 12 + 4); // header + IFD minimum (12 entries for RGB)
    }

    /// PackBits decoder for roundtrip testing only
    fn packbits_decode(data: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        let mut i = 0;
        while i < data.len() {
            let header = data[i] as i8;
            i += 1;
            if header >= 0 {
                // Literal: N+1 bytes follow
                let count = (header as usize) + 1;
                out.extend_from_slice(&data[i..i + count]);
                i += count;
            } else if header != -128 {
                // Repeat: 1 - header bytes of next value
                let count = (1 - header as i16) as usize;
                let val = data[i];
                i += 1;
                for _ in 0..count {
                    out.push(val);
                }
            }
            // header == -128 (0x80) is a no-op
        }
        out
    }
}
