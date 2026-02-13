// ═══════════════════════════════════════════════════════════════════
// PicEdit — Model Cache with Global Fetch Interceptor
//
// IndexedDB-backed cache for @imgly/background-removal model files.
//
// WHY GLOBAL FETCH INTERCEPTION?
//   The library calls native `fetch(url, config.fetchArgs)` directly.
//   `fetchArgs` is just RequestInit — there is NO customFetch hook.
//   The only way to intercept is to temporarily replace globalThis.fetch
//   while removeBackground() runs.
//
// How it works:
//   1. Call installFetchInterceptor() before removeBackground()
//   2. Any fetch() to staticimgly.com is routed through IndexedDB cache
//   3. All other fetch() calls pass through to the real native fetch
//   4. Call uninstallFetchInterceptor() after (in finally block)
//
// Downloads use retry + exponential backoff + stall timeout
// to survive flaky CDN connections on GH Pages / Vercel.
// ═══════════════════════════════════════════════════════════════════

const DB_NAME = "bg-remover-cache";
const DB_VERSION = 1;
const MODEL_STORE = "models";

/** Max retry attempts per download */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const BASE_DELAY_MS = 1_000;
/** If no bytes arrive for this long, abort and retry (ms) */
const STALL_TIMEOUT_MS = 15_000;

/** URL patterns that should be intercepted and cached */
const INTERCEPT_PATTERNS = [
  "staticimgly.com",
  "cdn.img.ly",
  "@imgly/background-removal",
] as const;

interface CachedModel {
  key: string;
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

// ── IndexedDB Cache ─────────────────────────────────────────────

class ModelCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error("[ModelCache] IndexedDB open failed:", request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            this.initPromise = null;
          };
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(MODEL_STORE)) {
            db.createObjectStore(MODEL_STORE, { keyPath: "key" });
          }
        };
      } catch (err) {
        console.error("[ModelCache] IndexedDB not available:", err);
        reject(err);
      }
    }).catch((err) => {
      console.warn("[ModelCache] Running without cache:", err);
      this.db = null;
    });

    return this.initPromise;
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(MODEL_STORE, "readonly");
        const store = tx.objectStore(MODEL_STORE);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as CachedModel | undefined;
          if (result?.data && result.data.byteLength > 0) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.warn("[ModelCache] IDB read error:", request.error);
          resolve(null);
        };

        tx.onerror = () => {
          console.warn("[ModelCache] IDB read tx error:", tx.error);
          resolve(null);
        };
      } catch (err) {
        console.warn("[ModelCache] IDB read exception:", err);
        resolve(null);
      }
    });
  }

  async set(key: string, data: ArrayBuffer): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    if (!data || data.byteLength === 0) {
      console.warn("[ModelCache] Refusing to cache empty buffer for:", key);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const tx = this.db!.transaction(MODEL_STORE, "readwrite");
        const store = tx.objectStore(MODEL_STORE);

        const entry: CachedModel = {
          key,
          data,
          timestamp: Date.now(),
          size: data.byteLength,
        };

        store.put(entry);

        tx.oncomplete = () => {
          resolve(true);
        };

        tx.onerror = () => {
          console.error("[ModelCache] IDB write tx error:", tx.error);
          resolve(false);
        };

        tx.onabort = () => {
          console.error("[ModelCache] IDB write tx aborted:", tx.error);
          resolve(false);
        };
      } catch (err) {
        console.error("[ModelCache] IDB write exception:", err);
        resolve(false);
      }
    });
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(MODEL_STORE, "readwrite");
        const store = tx.objectStore(MODEL_STORE);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getSize(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(MODEL_STORE, "readonly");
        const store = tx.objectStore(MODEL_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
          const entries = request.result as CachedModel[];
          const totalSize = entries.reduce(
            (sum, e) => sum + (e.size || e.data?.byteLength || 0),
            0
          );
          resolve(totalSize);
        };
        request.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }
}

const modelCache = new ModelCache();

// ── Version-aware cache eviction ────────────────────────────────

const VERSION_STORAGE_KEY = "picedit-model-cache-version";

function extractVersion(url: string): string | null {
  const match = url.match(
    /\/@imgly\/background-removal-data\/([^/]+)\//
  );
  return match?.[1] ?? null;
}

let versionChecked = false;

async function evictStaleCache(currentVersion: string): Promise<void> {
  if (versionChecked) return;
  versionChecked = true;

  try {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);

    if (storedVersion && storedVersion !== currentVersion) {
      console.log(
        `[ModelCache] Library version changed: ${storedVersion} → ${currentVersion}. Purging old cache...`
      );
      await modelCache.clear();
      console.log("[ModelCache] Old cache purged.");
    }

    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
  } catch {
    // localStorage unavailable — skip
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function streamToBuffer(
  response: Response,
  stallMs: number,
  onAbort?: () => void
): Promise<ArrayBuffer> {
  if (!response.body) {
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const clearStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = null;
  };

  const resetStall = () => {
    clearStall();
    stallTimer = setTimeout(() => {
      timedOut = true;
      reader.cancel("Download stalled — no data for 15s");
      onAbort?.();
    }, stallMs);
  };

  resetStall();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (timedOut) {
        throw new Error("Download stalled — no data received for 15s");
      }

      resetStall();
      chunks.push(value);
      totalLength += value.byteLength;
    }
  } finally {
    clearStall();
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

async function robustDownload(
  nativeFetch: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ArrayBuffer> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const fileName = url.split("/").pop() || url;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff =
        BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.log(
        `[ModelCache] Retry ${attempt}/${MAX_RETRIES} for ${fileName} in ${Math.round(backoff)}ms`
      );
      await delay(backoff);
    }

    try {
      if (init?.signal?.aborted) throw new Error("Aborted");

      const response = await nativeFetch(input, init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await streamToBuffer(response, STALL_TIMEOUT_MS);

      if (data.byteLength === 0) {
        throw new Error("Received empty response body");
      }

      console.log(
        `[ModelCache] Downloaded ${fileName}: ${formatBytes(data.byteLength)}`
      );
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (init?.signal?.aborted) throw lastError;

      console.warn(
        `[ModelCache] Attempt ${attempt + 1} failed for ${fileName}:`,
        lastError.message
      );
    }
  }

  throw lastError ?? new Error(`Failed to download ${fileName}`);
}

// ── Global Fetch Interceptor ────────────────────────────────────
//
// @imgly/background-removal calls `fetch(url, config.fetchArgs)` directly.
// There is NO customFetch hook in the library. The ONLY way to intercept
// model downloads is to temporarily replace globalThis.fetch.
//
// Usage:
//   installFetchInterceptor();
//   try {
//     await removeBackground(image, config);
//   } finally {
//     uninstallFetchInterceptor();
//   }
//
// Safety:
//   - Reference-counted: nested install/uninstall is safe
//   - Non-matching URLs pass through to native fetch unchanged
//   - Always uninstall in a finally block to prevent leaks
// ─────────────────────────────────────────────────────────────────

/** The REAL native fetch, captured once before any patching */
const nativeFetch: typeof fetch = globalThis.fetch?.bind(globalThis);

/** Reference count for nested interceptor installs */
let interceptorRefCount = 0;

/** Check if a URL should be intercepted (imgly CDN) */
function shouldIntercept(url: string): boolean {
  return INTERCEPT_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * The intercepting fetch function. Checks if the URL is an imgly CDN URL,
 * and if so routes through IndexedDB cache. All other URLs pass through.
 */
async function interceptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Extract URL string from any input type
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  // Non-imgly URLs: pass straight through to native fetch
  if (!shouldIntercept(url)) {
    return nativeFetch(input, init);
  }

  const fileName = url.split("/").pop()?.split("?")[0] || "file";

  // ── Version eviction (once per session) ───────────────────────
  const version = extractVersion(url);
  if (version) {
    await evictStaleCache(version);
  }

  // ── Check IndexedDB cache ───────────────────────────────────
  try {
    const cachedData = await modelCache.get(url);
    if (cachedData && cachedData.byteLength > 0) {
      console.log(
        `[ModelCache] ✓ Cache hit: ${fileName} (${formatBytes(cachedData.byteLength)})`
      );
      // Return a proper Response that the library can .blob() on
      return new Response(cachedData, {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(cachedData.byteLength),
        },
      });
    }
  } catch (err) {
    console.warn("[ModelCache] Cache read failed, falling through:", err);
  }

  // ── Download with retry + stall guard ─────────────────────────
  console.log(`[ModelCache] ↓ Downloading: ${fileName}`);
  const data = await robustDownload(nativeFetch, input, init);

  // ── Cache to IndexedDB (fire-and-forget for speed, but log result) ───
  // We DON'T await this — let the response return immediately
  // while caching happens in the background
  modelCache.set(url, data).then((ok) => {
    if (ok) {
      console.log(
        `[ModelCache] ✓ Cached: ${fileName} (${formatBytes(data.byteLength)})`
      );
    } else {
      console.warn(`[ModelCache] ✗ Failed to cache: ${fileName}`);
    }
  });

  // ── Return Response from buffered data ────────────────────────
  return new Response(data, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(data.byteLength),
    },
  });
}

/**
 * Install the global fetch interceptor.
 * Must be called BEFORE removeBackground().
 * Safe to nest — uses reference counting.
 */
export function installFetchInterceptor(): void {
  interceptorRefCount++;

  if (interceptorRefCount === 1) {
    // First install — replace global fetch
    globalThis.fetch = interceptedFetch as typeof fetch;
    console.log("[ModelCache] Fetch interceptor installed");
  }
}

/**
 * Uninstall the global fetch interceptor.
 * Must be called AFTER removeBackground(), ideally in a finally block.
 * Only actually restores native fetch when all nested installs are undone.
 */
export function uninstallFetchInterceptor(): void {
  interceptorRefCount = Math.max(0, interceptorRefCount - 1);

  if (interceptorRefCount === 0) {
    // Last uninstall — restore native fetch
    globalThis.fetch = nativeFetch;
    console.log("[ModelCache] Fetch interceptor uninstalled");
  }
}

// ── Exported utilities ──────────────────────────────────────────

export { modelCache };

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
