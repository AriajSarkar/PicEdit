export {};
/// Web Worker for pre-refinement WASM processing.
/// Runs CLAHE, noise reduction, and sharpening off the main thread.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      // Dynamic import of the wasm-pack generated JS
      const mod = await import(/* webpackIgnore: true */ msg.wasmJsUrl);
      await mod.default(msg.wasmBgUrl);
      wasmModule = mod;
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({
        type: "error",
        message: `Failed to init WASM: ${err}`,
      });
    }
    return;
  }

  if (msg.type === "process") {
    if (!wasmModule) {
      self.postMessage({ type: "error", message: "WASM not initialized" });
      return;
    }

    try {
      const { rgba, width, height, config } = msg;
      const input = new Uint8Array(rgba);

      const result: Uint8Array = wasmModule.pre_process(
        input,
        width,
        height,
        config.claheClipLimit,
        config.claheGridSize,
        config.noiseKernelSize,
        config.sharpenStrength
      );

      // Transfer the buffer back (zero-copy)
      const buffer = result.buffer;
      self.postMessage(
        { type: "result", rgba: buffer, width, height },
        // @ts-expect-error transferable
        [buffer]
      );
    } catch (err) {
      self.postMessage({
        type: "error",
        message: `Pre-processing failed: ${err}`,
      });
    }
  }
};
