import { loadServer } from "@/bg-remover/lib/wasmLoader";
import {
  DownloadProgress,
  ServerConfig,
  DEFAULT_SERVER_CONFIG,
} from "./types";

/**
 * Cached model fetch using Rust/WASM chunked download with IndexedDB persistence.
 *
 * This replaces the JS-based cachedFetch for model files, handling binary data
 * without GC pauses.
 *
 * This function is only used as customFetch for @imgly/background-removal,
 * so every request through it is a model/runtime resource (content-hashed
 * filenames from CDN — no .onnx/.wasm extensions). Cache everything.
 */
export async function cachedModelFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  onProgress?: (progress: DownloadProgress) => void,
  config?: Partial<ServerConfig>
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  const fullConfig = { ...DEFAULT_SERVER_CONFIG, ...config };

  // Try loading the server WASM module
  const serverModule = await loadServer();

  if (!serverModule) {
    // Fallback to regular fetch if WASM unavailable
    return fetch(input, init);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = serverModule as any;

    // Check cache first
    const cached = await mod.is_cached(url, fullConfig.dbName, fullConfig.storeName);
    if (cached) {
      const buffer = await mod.get_cached(url, fullConfig.dbName, fullConfig.storeName);
      return new Response(buffer, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    }

    // Download with chunked caching
    const progressCallback = (downloaded: number, total: number) => {
      onProgress?.({
        downloadedBytes: downloaded,
        totalBytes: total,
        percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0,
      });
    };

    const buffer = await mod.chunked_download(
      url,
      fullConfig.chunkSize,
      fullConfig.dbName,
      fullConfig.storeName,
      progressCallback
    );

    return new Response(buffer, {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
  } catch (err) {
    console.warn("[server] WASM cache failed, falling back to fetch:", err);
    return fetch(input, init);
  }
}
