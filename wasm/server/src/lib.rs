mod chunked_download;

use wasm_bindgen::prelude::*;

/// Check if a model is fully cached in IndexedDB.
#[wasm_bindgen]
pub async fn is_cached(
    url: &str,
    db_name: &str,
    store_name: &str,
) -> Result<bool, JsValue> {
    chunked_download::is_cached(url, db_name, store_name).await
}

/// Retrieve a cached model from IndexedDB.
/// Returns the complete data as an ArrayBuffer.
#[wasm_bindgen]
pub async fn get_cached(
    url: &str,
    db_name: &str,
    store_name: &str,
) -> Result<js_sys::ArrayBuffer, JsValue> {
    chunked_download::get_cached(url, db_name, store_name).await
}

/// Download a model file in chunks, storing each chunk in IndexedDB.
/// Supports resumable downloads — only fetches missing chunks.
///
/// - url: The model URL to download
/// - chunk_size: Size of each chunk in bytes (recommended: 1048576 = 1MB)
/// - db_name: IndexedDB database name
/// - store_name: IndexedDB object store name
/// - progress_callback: JS function called with (downloaded_bytes: number, total_bytes: number)
///
/// Returns the complete model as an ArrayBuffer.
#[wasm_bindgen]
pub async fn chunked_download(
    url: &str,
    chunk_size: u32,
    db_name: &str,
    store_name: &str,
    progress_callback: &js_sys::Function,
) -> Result<js_sys::ArrayBuffer, JsValue> {
    chunked_download::download(url, chunk_size, db_name, store_name, progress_callback).await
}

/// Clear all cached model data from IndexedDB.
#[wasm_bindgen]
pub async fn clear_cache(
    db_name: &str,
    store_name: &str,
) -> Result<(), JsValue> {
    chunked_download::clear_cache(db_name, store_name).await
}
