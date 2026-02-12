export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface ServerConfig {
  /** Size of each chunk in bytes (default: 1MB) */
  chunkSize: number;
  /** IndexedDB database name */
  dbName: string;
  /** IndexedDB object store name */
  storeName: string;
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  chunkSize: 1048576, // 1MB
  dbName: "bg-remover-wasm-cache",
  storeName: "model-chunks",
};
