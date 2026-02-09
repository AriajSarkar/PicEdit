"use client";

import { useCallback, useRef, useState } from "react";
import { removeBackground, Config } from "@imgly/background-removal";
import { DeviceType, ModelType, ProcessingProgress, MODEL_INFO } from "@/types";
import { cachedFetch } from "@/lib/modelCache";

const DEFAULT_PROGRESS: ProcessingProgress = {
  stage: "complete",
  progress: 0,
  message: "",
};

export function useBackgroundRemoval() {
  const processingRef = useRef(false);
  const preloadingRef = useRef(false);
  const lastProgressRef = useRef(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>(DEFAULT_PROGRESS);

  // Throttled progress update to reduce re-renders
  const updateProgress = useCallback((newProgress: ProcessingProgress) => {
    // Always update on stage change or completion
    if (newProgress.stage !== "downloading" && newProgress.stage !== "processing") {
      lastProgressRef.current = newProgress.progress;
      setProgress(newProgress);
      return;
    }
    // Throttle progress updates - only update every 5%
    const diff = Math.abs(newProgress.progress - lastProgressRef.current);
    if (diff >= 5 || newProgress.progress === 100) {
      lastProgressRef.current = newProgress.progress;
      setProgress(newProgress);
    }
  }, []);

  // Check if model is already loaded (simple stub - always false)
  const isModelCached = useCallback((): boolean => {
    return false;
  }, []);

  // Preload model (stub - we'll just process directly)
  const preloadModel = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  // Process image
  const processImage = useCallback(
    async (
      imageSource: string | File | Blob,
      device: DeviceType,
      model: ModelType
    ): Promise<string | null> => {
      if (processingRef.current) return null;
      processingRef.current = true;
      setIsProcessing(true);

      try {
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
          progress: (progressKey: string, current: number, total: number) => {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            if (progressKey.includes("fetch") || progressKey.includes("download")) {
              updateProgress({ stage: "downloading", progress: pct, message: `Downloading: ${pct}%` });
            } else {
              updateProgress({ stage: "processing", progress: pct, message: `Processing: ${pct}%` });
            }
          },
        };

        const result = await removeBackground(imageSource, config);

        const dataUrl = await blobToDataUrl(result);
        updateProgress({ stage: "complete", progress: 100, message: "Done!" });
        return dataUrl;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Processing failed";
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
    isPreloading,
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
