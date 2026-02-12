const DB_NAME = "bg-remover-cache";
const DB_VERSION = 1;
const MODEL_STORE = "models";

interface CachedModel {
  key: string;
  data: ArrayBuffer;
  timestamp: number;
}

class ModelCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn("IndexedDB not available, using default cache");
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(MODEL_STORE)) {
          db.createObjectStore(MODEL_STORE, { keyPath: "key" });
        }
      };
    });

    return this.initPromise;
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MODEL_STORE, "readonly");
      const store = transaction.objectStore(MODEL_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedModel | undefined;
        resolve(result?.data || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  async set(key: string, data: ArrayBuffer): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MODEL_STORE, "readwrite");
      const store = transaction.objectStore(MODEL_STORE);

      const cacheEntry: CachedModel = {
        key,
        data,
        timestamp: Date.now(),
      };

      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
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
      const transaction = this.db!.transaction(MODEL_STORE, "readwrite");
      const store = transaction.objectStore(MODEL_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async getSize(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MODEL_STORE, "readonly");
      const store = transaction.objectStore(MODEL_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CachedModel[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.data.byteLength, 0);
        resolve(totalSize);
      };

      request.onerror = () => resolve(0);
    });
  }
}

export const modelCache = new ModelCache();

// Custom fetch function that uses IndexedDB cache
export async function cachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  // Only cache model/wasm files
  const shouldCache = url.includes(".onnx") || url.includes(".wasm") || url.includes("ort-wasm");

  if (!shouldCache) {
    return fetch(input, init);
  }

  // Check IndexedDB cache first
  const cachedData = await modelCache.get(url);

  if (cachedData) {
    console.log(`[ModelCache] Using cached: ${url.split("/").pop()}`);
    return new Response(cachedData, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  // Fetch from network
  console.log(`[ModelCache] Downloading: ${url.split("/").pop()}`);
  const response = await fetch(input, init);

  if (response.ok) {
    // Clone response and cache the data
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.arrayBuffer();
      await modelCache.set(url, data);
      console.log(`[ModelCache] Cached: ${url.split("/").pop()}`);
    } catch (error) {
      console.warn("[ModelCache] Failed to cache:", error);
    }
  }

  return response;
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
