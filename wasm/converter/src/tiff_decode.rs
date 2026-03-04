/// TIFF decoder — wraps the `tiff` crate to produce RGBA8 pixel data.
///
/// Returns a packed buffer: `[width_le_u32, height_le_u32, ...rgba_pixels]`
/// so the caller (JS worker) can extract dimensions and pixel data in one call.

use std::io::Cursor;
use tiff::decoder::{Decoder, DecodingResult};
use tiff::ColorType;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn decode_tiff(data: &[u8]) -> Result<Vec<u8>, JsError> {
    let cursor = Cursor::new(data);
    let mut decoder = Decoder::new(cursor).map_err(|e| JsError::new(&format!("TIFF decode error: {e}")))?;

    let (width, height) = decoder.dimensions().map_err(|e| JsError::new(&format!("TIFF dimensions error: {e}")))?;
    let color_type = decoder.colortype().map_err(|e| JsError::new(&format!("TIFF color type error: {e}")))?;
    let result = decoder.read_image().map_err(|e| JsError::new(&format!("TIFF read error: {e}")))?;

    let rgba = match result {
        DecodingResult::U8(pixels) => match color_type {
            ColorType::RGBA(8) => pixels,
            ColorType::RGB(8) => {
                // RGB → RGBA
                let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                for chunk in pixels.chunks_exact(3) {
                    rgba.push(chunk[0]);
                    rgba.push(chunk[1]);
                    rgba.push(chunk[2]);
                    rgba.push(255);
                }
                rgba
            }
            ColorType::Gray(8) => {
                // Grayscale → RGBA
                let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                for &g in &pixels {
                    rgba.push(g);
                    rgba.push(g);
                    rgba.push(g);
                    rgba.push(255);
                }
                rgba
            }
            ColorType::GrayA(8) => {
                // Grayscale + Alpha → RGBA
                let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                for chunk in pixels.chunks_exact(2) {
                    let g = chunk[0];
                    rgba.push(g);
                    rgba.push(g);
                    rgba.push(g);
                    rgba.push(chunk[1]);
                }
                rgba
            }
            _ => return Err(JsError::new(&format!("Unsupported TIFF color type: {color_type:?}"))),
        },
        DecodingResult::U16(pixels) => {
            // 16-bit → 8-bit (scale down)
            match color_type {
                ColorType::RGBA(16) => {
                    let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                    for chunk in pixels.chunks_exact(4) {
                        rgba.push((chunk[0] >> 8) as u8);
                        rgba.push((chunk[1] >> 8) as u8);
                        rgba.push((chunk[2] >> 8) as u8);
                        rgba.push((chunk[3] >> 8) as u8);
                    }
                    rgba
                }
                ColorType::RGB(16) => {
                    let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                    for chunk in pixels.chunks_exact(3) {
                        rgba.push((chunk[0] >> 8) as u8);
                        rgba.push((chunk[1] >> 8) as u8);
                        rgba.push((chunk[2] >> 8) as u8);
                        rgba.push(255);
                    }
                    rgba
                }
                ColorType::Gray(16) => {
                    let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);
                    for &g in &pixels {
                        let v = (g >> 8) as u8;
                        rgba.push(v);
                        rgba.push(v);
                        rgba.push(v);
                        rgba.push(255);
                    }
                    rgba
                }
                _ => return Err(JsError::new(&format!("Unsupported TIFF 16-bit color type: {color_type:?}"))),
            }
        }
        _ => return Err(JsError::new("Unsupported TIFF pixel format (expected 8 or 16 bit)")),
    };

    // Pack: [width_le_u32, height_le_u32, ...rgba_pixels]
    let mut out = Vec::with_capacity(8 + rgba.len());
    out.extend_from_slice(&width.to_le_bytes());
    out.extend_from_slice(&height.to_le_bytes());
    out.extend_from_slice(&rgba);
    Ok(out)
}
