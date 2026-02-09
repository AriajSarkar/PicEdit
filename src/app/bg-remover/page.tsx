"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { Header } from "@/bg-remover/components/Header";
import { ImageUploader } from "@/bg-remover/components/ImageUploader";
import { CompareSlider } from "@/bg-remover/components/CompareSlider";
import { ControlTabs } from "@/bg-remover/components/ControlTabs";
import { ProcessingOverlay } from "@/bg-remover/components/ProcessingOverlay";
import { DownloadButton } from "@/bg-remover/components/DownloadButton";
import { HistoryPanel } from "@/bg-remover/components/HistoryPanel";
import { RetryButton } from "@/bg-remover/components/RetryButton";
import { useBackgroundRemoval } from "@/bg-remover/hooks/useBackgroundRemoval";
import { useImageEditor } from "@/bg-remover/hooks/useImageEditor";
import { useHistory } from "@/bg-remover/hooks/useHistory";
import { useSession } from "@/bg-remover/hooks/useSession";
import {
  DeviceType,
  ModelType,
  HistoryItem,
  DEFAULT_IMAGE_INFO,
  ImageInfo,
} from "@/types";
import {
  fileToDataUrl,
  loadImage,
  getImageInfo,
  applyEdits,
  downloadImage,
  generateId,
  estimateDataUrlSize,
} from "@/lib/imageUtils";

export default function BGRemoverPage() {
  const [device, setDevice] = useState<DeviceType>("gpu");
  const [model, setModel] = useState<ModelType>("isnet_quint8");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo>(DEFAULT_IMAGE_INFO);

  const { processImage, progress, isProcessing } = useBackgroundRemoval();
  const {
    state,
    updateState,
    initializeFromImage,
    setScale,
    currentScale,
  } = useImageEditor();
  const { history, addToHistory, removeFromHistory, clearHistory, isLoaded: historyLoaded } = useHistory();
  const { session, saveSession, isLoaded: sessionLoaded } = useSession();

  // Calculate estimated file size
  const estimatedSize = useMemo(() => {
    if (!finalImage) return 0;
    return estimateDataUrlSize(finalImage);
  }, [finalImage]);

  // Restore session on mount
  useEffect(() => {
    if (!sessionLoaded) return;
    if (session.originalImage && session.processedImage) {
      setOriginalImage(session.originalImage);
      setProcessedImage(session.processedImage);
      setFinalImage(session.finalImage || session.processedImage);
      setDevice(session.device);
      setModel(session.model);
      setImageInfo(session.imageInfo);
      if (session.editorState) {
        Object.entries(session.editorState).forEach(([key, value]) => {
          updateState({ [key]: value });
        });
      }
    }
  }, [sessionLoaded]);

  // Apply edits when state changes
  useEffect(() => {
    if (!processedImage || !originalImage) return;
    if (!state.width || !state.height) return;

    const applyChanges = async () => {
      const result = await applyEdits(processedImage, originalImage, state);
      setFinalImage(result);
    };

    applyChanges();
  }, [processedImage, originalImage, state]);

  // Handle image selection
  const handleImageSelect = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      const info = getImageInfo(file);
      info.width = img.width;
      info.height = img.height;

      setOriginalImage(dataUrl);
      setImageInfo(info);
      initializeFromImage(img.width, img.height);

      // Process immediately
      const result = await processImage(dataUrl, device, model);
      if (result) {
        setProcessedImage(result);
        setFinalImage(result);

        // Save to session
        saveSession({
          originalImage: dataUrl,
          processedImage: result,
          finalImage: result,
          device,
          model,
          imageInfo: info,
          editorState: state,
        });

        // Add to history
        const historyItem: HistoryItem = {
          id: generateId(),
          originalImage: dataUrl,
          processedImage: result,
          model,
          device,
          timestamp: Date.now(),
          editorState: state,
          imageInfo: info,
        };
        addToHistory(historyItem);
      }
    },
    [device, model, processImage, initializeFromImage, state, saveSession, addToHistory]
  );

  // Handle background image selection
  const handleBackgroundImageSelect = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      updateState({ backgroundImage: dataUrl });
    },
    [updateState]
  );

  // Handle retry with better model
  const handleRetry = useCallback(
    async (newModel: ModelType) => {
      if (!originalImage) return;
      setModel(newModel);

      const result = await processImage(originalImage, device, newModel);
      if (result) {
        setProcessedImage(result);
        const applied = await applyEdits(result, originalImage, state);
        setFinalImage(applied);

        saveSession({
          processedImage: result,
          finalImage: applied,
          model: newModel,
        });
      }
    },
    [originalImage, device, processImage, state, saveSession]
  );

  // Track previous device/model to detect user-initiated changes
  const [prevDevice, setPrevDevice] = useState<DeviceType | null>(null);
  const [prevModel, setPrevModel] = useState<ModelType | null>(null);

  // Handle model/device change (re-process current image)
  useEffect(() => {
    if (!originalImage || !sessionLoaded || isProcessing) return;

    // Skip on initial load (when prev values are null)
    if (prevDevice === null || prevModel === null) {
      setPrevDevice(device);
      setPrevModel(model);
      return;
    }

    // Only re-process if device or model actually changed by user
    if (prevDevice !== device || prevModel !== model) {
      setPrevDevice(device);
      setPrevModel(model);

      const reprocess = async () => {
        const result = await processImage(originalImage, device, model);
        if (result) {
          setProcessedImage(result);
          const applied = await applyEdits(result, originalImage, state);
          setFinalImage(applied);
          saveSession({ device, model, processedImage: result, finalImage: applied });
        }
      };
      reprocess();
    }
  }, [device, model, originalImage, sessionLoaded, isProcessing]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!finalImage) return;
    downloadImage(finalImage, state.outputFormat, imageInfo.fileName);
  }, [finalImage, state.outputFormat, imageInfo.fileName]);

  // Handle history selection
  const handleHistorySelect = useCallback(
    (item: HistoryItem) => {
      setOriginalImage(item.originalImage);
      setProcessedImage(item.processedImage);
      setFinalImage(item.processedImage);
      setDevice(item.device);
      setModel(item.model);
      setImageInfo(item.imageInfo);
      Object.entries(item.editorState).forEach(([key, value]) => {
        updateState({ [key]: value });
      });
      saveSession({
        originalImage: item.originalImage,
        processedImage: item.processedImage,
        finalImage: item.processedImage,
        device: item.device,
        model: item.model,
        imageInfo: item.imageInfo,
        editorState: item.editorState,
      });
    },
    [updateState, saveSession]
  );

  const hasImage = originalImage && processedImage;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        device={device}
        setDevice={setDevice}
        model={model}
        setModel={setModel}
      />

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Upload area or comparison view */}
        <div className="relative">
          {!hasImage ? (
            <ImageUploader
              onImageSelect={handleImageSelect}
              disabled={isProcessing}
            />
          ) : (
            <div className="relative">
              <CompareSlider
                originalImage={originalImage}
                processedImage={finalImage || processedImage}
              />
              <AnimatePresence>
                {isProcessing && <ProcessingOverlay progress={progress} />}
              </AnimatePresence>
            </div>
          )}

          {isProcessing && !hasImage && (
            <ProcessingOverlay progress={progress} />
          )}
        </div>

        {/* Controls */}
        {hasImage && !isProcessing && (
          <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
            <div className="space-y-4">
              <ControlTabs
                state={state}
                updateState={updateState}
                setScale={setScale}
                currentScale={currentScale}
                onBackgroundImageSelect={handleBackgroundImageSelect}
                estimatedSize={estimatedSize}
                originalSize={imageInfo.fileSize}
              />

              <RetryButton
                currentModel={model}
                onRetry={handleRetry}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-4">
              <DownloadButton
                onClick={handleDownload}
                format={state.outputFormat}
                disabled={isProcessing}
              />

              {/* New image button */}
              <button
                onClick={() => {
                  setOriginalImage(null);
                  setProcessedImage(null);
                  setFinalImage(null);
                  setImageInfo(DEFAULT_IMAGE_INFO);
                }}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-sm text-muted hover:text-foreground transition-colors"
              >
                Upload New Image
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {historyLoaded && (
          <HistoryPanel
            history={history}
            onSelect={handleHistorySelect}
            onRemove={removeFromHistory}
            onClear={clearHistory}
          />
        )}
      </main>
    </div>
  );
}
