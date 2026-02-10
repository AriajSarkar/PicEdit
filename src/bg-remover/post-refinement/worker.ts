export {};
/// Web Worker for post-refinement WASM processing.
/// Runs guided filter, edge refinement, and alpha matting off the main thread.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
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
      const { maskRgba, originalRgba, width, height, config } = msg;
      const maskInput = new Uint8Array(maskRgba);
      const originalInput = new Uint8Array(originalRgba);

      const result: Uint8Array = wasmModule.post_process(
        maskInput,
        originalInput,
        width,
        height,
        config.guideRadius,
        config.guideEps,
        config.edgeThreshold,
        config.featherRadius
      );

      const buffer = result.buffer;
      self.postMessage(
        { type: "result", rgba: buffer, width, height },
        // @ts-expect-error transferable
        [buffer]
      );
    } catch (err) {
      self.postMessage({
        type: "error",
        message: `Post-processing failed: ${err}`,
      });
    }
  }
};
