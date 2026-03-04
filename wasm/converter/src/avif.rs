use ravif::{Encoder, Img};
use rgb::RGBA8;

/// Encode raw RGBA pixels to AVIF format.
///
/// - `rgba`: flat RGBA pixel buffer (length = width * height * 4)
/// - `width`, `height`: image dimensions
/// - `quality`: 0.0–100.0 (higher = better quality, larger file)
/// - `speed`: 1–10 (1 = slowest/best compression, 10 = fastest)
///
/// Returns the AVIF file bytes.
pub fn encode(
    rgba: &[u8],
    width: usize,
    height: usize,
    quality: f32,
    speed: u8,
) -> Result<Vec<u8>, String> {
    let expected = width * height * 4;
    if rgba.len() != expected {
        return Err(format!(
            "Invalid RGBA buffer: expected {} bytes, got {}",
            expected,
            rgba.len()
        ));
    }

    let pixels: Vec<RGBA8> = rgba
        .chunks_exact(4)
        .map(|c| RGBA8::new(c[0], c[1], c[2], c[3]))
        .collect();

    let img = Img::new(&pixels[..], width, height);

    let encoded = Encoder::new()
        .with_quality(quality.clamp(0.0, 100.0))
        .with_speed(speed.clamp(1, 10))
        .encode_rgba(img)
        .map_err(|e| e.to_string())?;

    Ok(encoded.avif_file)
}
