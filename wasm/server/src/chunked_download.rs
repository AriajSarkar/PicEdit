use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{IdbTransactionMode, Request, Response};

/// Open (or create) the IndexedDB database with the given store.
async fn open_db(db_name: &str, store_name: &str) -> Result<web_sys::IdbDatabase, JsValue> {
    let window = web_sys::window().ok_or("no window")?;
    let idb_factory = window
        .indexed_db()?
        .ok_or("IndexedDB not available")?;

    let open_request = idb_factory.open_with_u32(db_name, 1)?;

    // Handle upgrade (create store if needed)
    let store_name_owned = store_name.to_string();
    let onupgrade = Closure::once(move |event: web_sys::Event| {
        let target = event.target().unwrap();
        let request: web_sys::IdbOpenDbRequest = target.unchecked_into();
        let db: web_sys::IdbDatabase = request.result().unwrap().unchecked_into();

        let names = db.object_store_names();
        let mut found = false;
        for i in 0..names.length() {
            if let Some(name) = names.item(i) {
                if name == store_name_owned {
                    found = true;
                    break;
                }
            }
        }

        if !found {
            let params = web_sys::IdbObjectStoreParameters::new();
            params.set_key_path(Some(&JsValue::from_str("key")).as_ref().unwrap());
            db.create_object_store_with_optional_parameters(&store_name_owned, &params)
                .unwrap();
        }
    });
    open_request.set_onupgradeneeded(Some(onupgrade.as_ref().unchecked_ref()));
    onupgrade.forget();

    let db: web_sys::IdbDatabase = JsFuture::from(
        idb_request_to_promise(&open_request.into())?
    )
    .await?
    .unchecked_into();

    Ok(db)
}

/// Convert an IDBRequest to a Promise.
fn idb_request_to_promise(request: &web_sys::IdbRequest) -> Result<js_sys::Promise, JsValue> {
    let promise = js_sys::Promise::new(&mut |resolve, reject| {
        let resolve2 = resolve.clone();
        let onsuccess = Closure::once(move |event: web_sys::Event| {
            let target = event.target().unwrap();
            let request: web_sys::IdbRequest = target.unchecked_into();
            resolve2.call1(&JsValue::NULL, &request.result().unwrap()).unwrap();
        });
        let onerror = Closure::once(move |_event: web_sys::Event| {
            reject.call1(&JsValue::NULL, &JsValue::from_str("IDB request failed")).unwrap();
        });
        request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
        request.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        onsuccess.forget();
        onerror.forget();
    });
    Ok(promise)
}

/// Store a value in IndexedDB.
async fn idb_put(
    db: &web_sys::IdbDatabase,
    store_name: &str,
    key: &str,
    value: &JsValue,
) -> Result<(), JsValue> {
    let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)?;
    let store = tx.object_store(store_name)?;

    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("key"), &JsValue::from_str(key))?;
    js_sys::Reflect::set(&obj, &JsValue::from_str("data"), value)?;

    let request = store.put(&obj)?;
    JsFuture::from(idb_request_to_promise(&request)?).await?;

    Ok(())
}

/// Get a value from IndexedDB.
async fn idb_get(
    db: &web_sys::IdbDatabase,
    store_name: &str,
    key: &str,
) -> Result<JsValue, JsValue> {
    let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly)?;
    let store = tx.object_store(store_name)?;
    let request = store.get(&JsValue::from_str(key))?;
    let result = JsFuture::from(idb_request_to_promise(&request)?).await?;

    if result.is_undefined() || result.is_null() {
        return Ok(JsValue::NULL);
    }

    let data = js_sys::Reflect::get(&result, &JsValue::from_str("data"))?;
    Ok(data)
}

/// Check if a key exists in IndexedDB.
async fn idb_has(
    db: &web_sys::IdbDatabase,
    store_name: &str,
    key: &str,
) -> Result<bool, JsValue> {
    let val = idb_get(db, store_name, key).await?;
    Ok(!val.is_null() && !val.is_undefined())
}

/// Metadata key for a cached URL.
fn meta_key(url: &str) -> String {
    format!("meta:{}", url)
}

/// Chunk key for a cached URL chunk.
fn chunk_key(url: &str, index: u32) -> String {
    format!("chunk:{}:{}", url, index)
}

/// Check if a model is fully cached.
pub async fn is_cached(
    url: &str,
    db_name: &str,
    store_name: &str,
) -> Result<bool, JsValue> {
    let db = open_db(db_name, store_name).await?;
    let has_meta = idb_has(&db, store_name, &meta_key(url)).await?;

    if !has_meta {
        return Ok(false);
    }

    // Verify metadata indicates complete download
    let meta = idb_get(&db, store_name, &meta_key(url)).await?;
    if meta.is_null() {
        return Ok(false);
    }

    let complete = js_sys::Reflect::get(&meta, &JsValue::from_str("complete"))?;
    Ok(complete.as_bool().unwrap_or(false))
}

/// Retrieve a fully cached model, reassembling chunks.
pub async fn get_cached(
    url: &str,
    db_name: &str,
    store_name: &str,
) -> Result<js_sys::ArrayBuffer, JsValue> {
    let db = open_db(db_name, store_name).await?;

    let meta = idb_get(&db, store_name, &meta_key(url)).await?;
    if meta.is_null() {
        return Err(JsValue::from_str("Not cached"));
    }

    let total_chunks = js_sys::Reflect::get(&meta, &JsValue::from_str("totalChunks"))?
        .as_f64()
        .ok_or("invalid totalChunks")? as u32;
    let total_size = js_sys::Reflect::get(&meta, &JsValue::from_str("totalSize"))?
        .as_f64()
        .ok_or("invalid totalSize")? as u32;

    // Reassemble chunks into a single ArrayBuffer
    let buffer = js_sys::ArrayBuffer::new(total_size);
    let target = js_sys::Uint8Array::new(&buffer);
    let mut offset = 0u32;

    for i in 0..total_chunks {
        let chunk_data = idb_get(&db, store_name, &chunk_key(url, i)).await?;
        if chunk_data.is_null() {
            return Err(JsValue::from_str(&format!("Missing chunk {}", i)));
        }
        let chunk_arr = js_sys::Uint8Array::new(&chunk_data);
        target.set(&chunk_arr, offset);
        offset += chunk_arr.length();
    }

    Ok(buffer)
}

/// Download a model in chunks with IndexedDB persistence and progress reporting.
pub async fn download(
    url: &str,
    chunk_size: u32,
    db_name: &str,
    store_name: &str,
    progress_callback: &js_sys::Function,
) -> Result<js_sys::ArrayBuffer, JsValue> {
    // Check if already cached
    if is_cached(url, db_name, store_name).await? {
        return get_cached(url, db_name, store_name).await;
    }

    let db = open_db(db_name, store_name).await?;

    // Fetch the resource
    let window = web_sys::window().ok_or("no window")?;
    let request = Request::new_with_str(url)?;
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let response: Response = resp_value.unchecked_into();

    if !response.ok() {
        return Err(JsValue::from_str(&format!(
            "Fetch failed: {}",
            response.status()
        )));
    }

    // Get total size from Content-Length header
    let total_size = response
        .headers()
        .get("content-length")?
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(0);

    // Read entire response as ArrayBuffer
    let array_buffer = JsFuture::from(response.array_buffer()?).await?;
    let full_data = js_sys::Uint8Array::new(&array_buffer);
    let actual_size = full_data.length();

    // Split into chunks and store in IndexedDB
    let mut chunk_index = 0u32;
    let mut offset = 0u32;

    while offset < actual_size {
        let end = (offset + chunk_size).min(actual_size);
        let chunk = full_data.slice(offset, end);

        idb_put(
            &db,
            store_name,
            &chunk_key(url, chunk_index),
            &chunk.buffer(),
        )
        .await?;

        offset = end;
        chunk_index += 1;

        // Report progress
        let _ = progress_callback.call2(
            &JsValue::NULL,
            &JsValue::from(offset),
            &JsValue::from(if total_size > 0 { total_size } else { actual_size }),
        );
    }

    // Store metadata
    let meta = js_sys::Object::new();
    js_sys::Reflect::set(&meta, &JsValue::from_str("totalChunks"), &JsValue::from(chunk_index))?;
    js_sys::Reflect::set(
        &meta,
        &JsValue::from_str("totalSize"),
        &JsValue::from(actual_size),
    )?;
    js_sys::Reflect::set(&meta, &JsValue::from_str("complete"), &JsValue::from(true))?;
    js_sys::Reflect::set(
        &meta,
        &JsValue::from_str("timestamp"),
        &JsValue::from(js_sys::Date::now()),
    )?;

    idb_put(&db, store_name, &meta_key(url), &meta).await?;

    // Return the full data
    Ok(array_buffer.unchecked_into())
}

/// Clear all cached data.
pub async fn clear_cache(db_name: &str, store_name: &str) -> Result<(), JsValue> {
    let db = open_db(db_name, store_name).await?;
    let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)?;
    let store = tx.object_store(store_name)?;
    let request = store.clear()?;
    JsFuture::from(idb_request_to_promise(&request)?).await?;
    Ok(())
}
