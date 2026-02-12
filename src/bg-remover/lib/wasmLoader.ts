/// WASM module loader with basePath awareness and lazy initialization.
/// Each module is loaded once and cached. Graceful fallback on failure.

type WasmModule = {
  default: (input?: string | URL | Request | BufferSource) => Promise<unknown>;
  [key: string]: unknown;
};

const modules: Record<string, WasmModule | null> = {
  "pre-refinement": null,
  "post-refinement": null,
  server: null,
};

const loadPromises: Record<string, Promise<WasmModule | null> | undefined> = {};

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

async function loadModule(name: string): Promise<WasmModule | null> {
  if (modules[name]) return modules[name];
  const promise = loadPromises[name];
  if (promise) return promise;

  loadPromises[name] = (async () => {
    try {
      const basePath = getBasePath();
      // The .js files and .wasm files are served from public/wasm/<crate>/
      const jsUrl = `${basePath}/wasm/${name}/${name.replace(/-/g, "_")}.js`;
      const wasmUrl = `${basePath}/wasm/${name}/${name.replace(/-/g, "_")}_bg.wasm`;

      const mod = await import(/* webpackIgnore: true */ jsUrl);

      // Initialize with explicit WASM URL (passed as object to avoid warnings)
      await mod.default({ module_or_path: wasmUrl });

      modules[name] = mod;
      return mod;
    } catch (err) {
      console.warn(`[WASM] Failed to load ${name}:`, err);
      return null;
    }
  })();

  return loadPromises[name]!;
}

export async function loadPreRefinement() {
  return loadModule("pre-refinement");
}

export async function loadPostRefinement() {
  return loadModule("post-refinement");
}

export async function loadServer() {
  return loadModule("server");
}
