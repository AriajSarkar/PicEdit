export {};
/// Web Worker for compressor WASM processing.
/// Each operation message carries an `id` that is echoed back so the
/// main thread can correlate responses with requests.
///
/// Init uses a promise so that messages arriving while init is still
/// pending (async import) are queued until WASM is ready rather than
/// hitting the `!wasmModule` guard and erroring immediately.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;
let initDone: Promise<boolean> | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  // ── Init ─────────────────────────────────────────────────────────
  if (msg.type === 'init') {
    initDone = (async () => {
      try {
        const mod = await import(/* webpackIgnore: true */ msg.wasmJsUrl);
        await mod.default({ module_or_path: msg.wasmBgUrl });
        wasmModule = mod;
        self.postMessage({ type: 'ready' });
        return true;
      } catch (err) {
        self.postMessage({ type: 'init-error', message: String(err) });
        return false;
      }
    })();
    return;
  }

  // ── Wait for init before processing any operation ────────────────
  if (initDone) {
    const ok = await initDone;
    if (!ok) {
      self.postMessage({ id: msg.id, type: 'error', message: 'WASM not initialized' });
      return;
    }
  } else {
    self.postMessage({ id: msg.id, type: 'error', message: 'WASM init not started' });
    return;
  }

  // ── Operations (all echo back msg.id) ────────────────────────────
  try {
    switch (msg.type) {
      case 'optimize': {
        const { id, rgba, width, height, strength } = msg;
        const input = new Uint8Array(rgba);
        const result: Uint8Array = wasmModule.optimize_for_compression(
          input, width, height, strength ?? 0.5,
        );
        const buffer = result.buffer;
        self.postMessage(
          { id, type: 'optimized', rgba: buffer, width, height },
          // @ts-expect-error transferable
          [buffer],
        );
        break;
      }

      case 'quantize': {
        const { id, rgba, width, height, maxColors } = msg;
        const input = new Uint8Array(rgba);
        const result: Uint8Array = wasmModule.quantize_colors(
          input, width, height, maxColors ?? 256,
        );
        const buffer = result.buffer;
        self.postMessage(
          { id, type: 'quantized', rgba: buffer, width, height },
          // @ts-expect-error transferable
          [buffer],
        );
        break;
      }

      case 'ssim': {
        const { id, imgA, imgB, width, height } = msg;
        const a = new Uint8Array(imgA);
        const b = new Uint8Array(imgB);
        const ssim: number = wasmModule.calculate_ssim(a, b, width, height);
        self.postMessage({ id, type: 'ssim-result', ssim });
        break;
      }

      case 'png-filters': {
        const { id, rgba, width, height } = msg;
        const input = new Uint8Array(rgba);
        const filters: Uint8Array = wasmModule.select_png_filters(input, width, height);
        self.postMessage({ id, type: 'png-filters-result', filters });
        break;
      }

      default:
        self.postMessage({ id: msg.id, type: 'error', message: `Unknown type: ${msg.type}` });
    }
  } catch (err) {
    self.postMessage({ id: msg.id, type: 'error', message: `Compressor failed: ${err}` });
  }
};
