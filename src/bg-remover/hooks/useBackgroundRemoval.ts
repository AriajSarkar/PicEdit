"use client";

import { useCallback, useRef, useState } from "react";
import { removeBackground, Config } from "@imgly/background-removal";
import { DeviceType, ModelType, ProcessingProgress, MODEL_INFO } from "@/types";
import { cachedFetch } from "@/lib/modelCache";
import { dataUrlToImageData, blobToImageData, imageDataToBlob } from "@/bg-remover/lib/dataConversion";
import { preProcess } from "@/bg-remover/pre-refinement";
import { postProcess } from "@/bg-remover/post-refinement";

const DEFAULT_PROGRESS: ProcessingProgress = {
  stage: "complete",
  progress: 0,
  message: "",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function useBackgroundRemoval() {
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>(DEFAULT_PROGRESS);

  // Track download speed
  const downloadStartRef = useRef(0);
  const lastBytesRef = useRef(0);
  const lastSpeedTimeRef = useRef(0);
  const speedRef = useRef(0);
  const stageRef = useRef<string>("");

  // Force every update through — no throttle. React batches these anyway.
  const updateProgress = useCallback((newProgress: ProcessingProgress) => {
    setProgress(newProgress);
  }, []);

  const isModelCached = useCallback((): boolean => {
    return false;
  }, []);

  const preloadModel = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  const processImage = useCallback(
    async (
      imageSource: string | File | Blob,
      device: DeviceType,
      model: ModelType,
      originalImageDataUrl?: string
    ): Promise<string | null> => {
      if (processingRef.current) return null;
      processingRef.current = true;
      setIsProcessing(true);

      try {
        // --- STAGE 1: PRE-PROCESSING (Rust/WASM) ---
        updateProgress({
          stage: "preprocessing",
          progress: 0,
          message: "Preparing image for AI...",
        });

        let sourceForAI: string | File | Blob = imageSource;
        try {
          const sourceDataUrl =
            typeof imageSource === "string"
              ? imageSource
              : await blobToDataUrlLocal(imageSource as Blob);

          updateProgress({
            stage: "preprocessing",
            progress: 20,
            message: "Denoising & enhancing contrast...",
          });

          const rawData = await dataUrlToImageData(sourceDataUrl);

          updateProgress({
            stage: "preprocessing",
            progress: 50,
            message: "Running bilateral filter + CLAHE...",
          });

          const enhanced = await preProcess(rawData);

          updateProgress({
            stage: "preprocessing",
            progress: 80,
            message: "Converting enhanced image...",
          });

          sourceForAI = await imageDataToBlob(
            enhanced.data,
            enhanced.width,
            enhanced.height
          );

          updateProgress({
            stage: "preprocessing",
            progress: 100,
            message: "Enhancement complete",
          });
        } catch (err) {
          console.warn("[pipeline] Pre-processing failed, using original:", err);
        }

        // --- STAGE 2: MODEL DOWNLOAD + AI INFERENCE ---
        // Reset download tracking
        downloadStartRef.current = performance.now();
        lastBytesRef.current = 0;
        lastSpeedTimeRef.current = performance.now();
        speedRef.current = 0;
        stageRef.current = "";

        updateProgress({
          stage: "downloading",
          progress: 0,
          message: `Loading ${MODEL_INFO[model].name} model...`,
        });

        const config: Partial<Config> = {
          device,
          model,
          output: { format: "image/png", quality: 1 },
          fetchArgs: {
            customFetch: cachedFetch,
          },
          progress: (
            progressKey: string,
            current: number,
            total: number
          ) => {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            const now = performance.now();

            if (
              progressKey.includes("fetch") ||
              progressKey.includes("download")
            ) {
              // Track actual bytes and speed
              const elapsed = now - downloadStartRef.current;
              const bytesLoaded = current;
              const bytesTotal = total;

              // Calculate speed (smoothed, update every 200ms)
              if (now - lastSpeedTimeRef.current > 200 && bytesLoaded > lastBytesRef.current) {
                const dt = (now - lastSpeedTimeRef.current) / 1000;
                const db = bytesLoaded - lastBytesRef.current;
                const instantSpeed = db / dt;
                // Exponential smoothing
                speedRef.current = speedRef.current === 0
                  ? instantSpeed
                  : speedRef.current * 0.7 + instantSpeed * 0.3;
                lastBytesRef.current = bytesLoaded;
                lastSpeedTimeRef.current = now;
              }

              const speed = speedRef.current;
              const loaded = formatBytes(bytesLoaded);
              const totalStr = formatBytes(bytesTotal);
              const speedStr = speed > 0 ? ` - ${formatSpeed(speed)}` : "";

              updateProgress({
                stage: "downloading",
                progress: pct,
                message: `Downloading: ${loaded} / ${totalStr}${speedStr}`,
                bytesLoaded,
                bytesTotal,
                speed,
                elapsed,
              });

              stageRef.current = "downloading";
            } else {
              // AI inference — show actual sub-step
              let message = `Removing background: ${pct}%`;
              if (pct < 15) {
                message = `Loading model into ${device === "gpu" ? "GPU" : "CPU"}...`;
              } else if (pct < 40) {
                message = `Running segmentation network...`;
              } else if (pct < 70) {
                message = `Computing foreground mask...`;
              } else if (pct < 95) {
                message = `Generating alpha matte...`;
              } else {
                message = `Finalizing mask output...`;
              }

              const elapsed = now - downloadStartRef.current;
              updateProgress({
                stage: "processing",
                progress: pct,
                message,
                elapsed,
              });

              stageRef.current = "processing";
            }
          },
        };

        const aiResult = await removeBackground(sourceForAI, config);

        // --- STAGE 3: POST-PROCESSING (Rust/WASM) ---
        updateProgress({
          stage: "postprocessing",
          progress: 0,
          message: "Refining edges with guided filter...",
        });

        let finalBlob = aiResult;
        try {
          const maskData = await blobToImageData(aiResult);

          updateProgress({
            stage: "postprocessing",
            progress: 15,
            message: "Building trimap (BFS distance transform)...",
          });

          const origDataUrl =
            originalImageDataUrl ||
            (typeof imageSource === "string" ? imageSource : null);

          if (origDataUrl) {
            const originalData = await dataUrlToImageData(origDataUrl);

            updateProgress({
              stage: "postprocessing",
              progress: 30,
              message: "Running fast guided filter...",
            });

            if (
              originalData.width === maskData.width &&
              originalData.height === maskData.height
            ) {
              const refined = await postProcess(maskData, originalData);

              updateProgress({
                stage: "postprocessing",
                progress: 85,
                message: "Compositing final output...",
              });

              finalBlob = await imageDataToBlob(
                refined.data,
                refined.width,
                refined.height
              );
            } else {
              updateProgress({
                stage: "postprocessing",
                progress: 40,
                message: "Resizing to match dimensions...",
              });

              const resized = await resizeImageData(
                origDataUrl,
                maskData.width,
                maskData.height
              );

              updateProgress({
                stage: "postprocessing",
                progress: 50,
                message: "Running shared matting + edge refinement...",
              });

              const refined = await postProcess(maskData, resized);

              updateProgress({
                stage: "postprocessing",
                progress: 85,
                message: "Compositing final output...",
              });

              finalBlob = await imageDataToBlob(
                refined.data,
                refined.width,
                refined.height
              );
            }
          }

          updateProgress({
            stage: "postprocessing",
            progress: 100,
            message: "Refinement complete",
          });
        } catch (err) {
          console.warn("[pipeline] Post-processing failed, using AI output:", err);
        }

        // --- STAGE 4: CONVERT TO DATA URL ---
        const dataUrl = await blobToDataUrlLocal(finalBlob);
        updateProgress({ stage: "complete", progress: 100, message: "Done!" });
        return dataUrl;
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Processing failed";
        console.error("Background removal failed:", error);
        updateProgress({ stage: "error", progress: 0, message: msg });
        return null;
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [updateProgress]
  );

  return {
    processImage,
    preloadModel,
    isModelCached,
    progress,
    isProcessing,
  };
}

async function blobToDataUrlLocal(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImageData(
  dataUrl: string,
  targetW: number,
  targetH: number
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  return {
    data: new Uint8Array(imgData.data.buffer),
    width: targetW,
    height: targetH,
  };
}
