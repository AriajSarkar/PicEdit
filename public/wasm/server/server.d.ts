/* tslint:disable */
/* eslint-disable */

/**
 * Download a model file in chunks, storing each chunk in IndexedDB.
 * Supports resumable downloads — only fetches missing chunks.
 *
 * - url: The model URL to download
 * - chunk_size: Size of each chunk in bytes (recommended: 1048576 = 1MB)
 * - db_name: IndexedDB database name
 * - store_name: IndexedDB object store name
 * - progress_callback: JS function called with (downloaded_bytes: number, total_bytes: number)
 *
 * Returns the complete model as an ArrayBuffer.
 */
export function chunked_download(url: string, chunk_size: number, db_name: string, store_name: string, progress_callback: Function): Promise<ArrayBuffer>;

/**
 * Clear all cached model data from IndexedDB.
 */
export function clear_cache(db_name: string, store_name: string): Promise<void>;

/**
 * Retrieve a cached model from IndexedDB.
 * Returns the complete data as an ArrayBuffer.
 */
export function get_cached(url: string, db_name: string, store_name: string): Promise<ArrayBuffer>;

/**
 * Check if a model is fully cached in IndexedDB.
 */
export function is_cached(url: string, db_name: string, store_name: string): Promise<boolean>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly chunked_download: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly clear_cache: (a: number, b: number, c: number, d: number) => number;
    readonly get_cached: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly is_cached: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wasm_bindgen_func_elem_64: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_956: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_251: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_65: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
