use vtracer::{ColorImage, ColorMode, Config, Hierarchical};

/// Trace RGBA pixels to SVG string.
///
/// Takes a flat RGBA pixel buffer and configuration parameters,
/// returns an SVG string via vtracer's vectorization engine.
pub fn trace(
    rgba: &[u8],
    width: usize,
    height: usize,
    color_mode: &str,
    hierarchical: &str,
    filter_speckle: usize,
    color_precision: i32,
    layer_difference: i32,
    corner_threshold: i32,
    length_threshold: f64,
    splice_threshold: i32,
    max_iterations: usize,
    path_precision: u32,
) -> Result<String, String> {
    let expected = width * height * 4;
    if rgba.len() != expected {
        return Err(format!(
            "Invalid RGBA buffer: expected {} bytes, got {}",
            expected,
            rgba.len()
        ));
    }

    let img = ColorImage {
        pixels: rgba.to_vec(),
        width,
        height,
    };

    let cm = match color_mode {
        "binary" => ColorMode::Binary,
        _ => ColorMode::Color,
    };

    let hi = match hierarchical {
        "cutout" => Hierarchical::Cutout,
        _ => Hierarchical::Stacked,
    };

    let pp = if path_precision == 0 {
        None
    } else {
        Some(path_precision)
    };

    let config = Config {
        color_mode: cm,
        hierarchical: hi,
        filter_speckle,
        color_precision,
        layer_difference,
        corner_threshold,
        length_threshold,
        splice_threshold,
        max_iterations,
        path_precision: pp,
        ..Config::default()
    };

    let svg_file = vtracer::convert(img, config)
        .map_err(|e| e)?;

    Ok(svg_file.to_string())
}
