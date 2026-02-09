"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence } from "motion/react";

// Components
import { Header } from "@/bg-remover/components/Header";
import { ImageUploader } from "@/bg-remover/components/ImageUploader";
import { CompareSlider } from "@/bg-remover/components/CompareSlider";
import { ProcessingOverlay } from "@/bg-remover/components/ProcessingOverlay";
import { ImageInfoBar } from "@/bg-remover/components/ImageInfoBar";
import { EditorToolbar } from "@/bg-remover/components/EditorToolbar";
import { HistoryPanel } from "@/bg-remover/components/HistoryPanel";

// Hooks
import { useBackgroundRemoval } from "@/bg-remover/hooks/useBackgroundRemoval";
import { useImageEditor } from "@/bg-remover/hooks/useImageEditor";
import { useHistory } from "@/bg-remover/hooks/useHistory";
import { useSession } from "@/bg-remover/hooks/useSession";

// Types & Utils
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
  // State
  const [device, setDevice] = useState<DeviceType>("gpu");
  const [model, setModel] = useState<ModelType>("isnet_quint8");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo>(DEFAULT_IMAGE_INFO);
  const [prevDevice, setPrevDevice] = useState<DeviceType | null>(null);
  const [prevModel, setPrevModel] = useState<ModelType | null>(null);

  // Hooks
  const { processImage, progress, isProcessing } = useBackgroundRemoval();
  const { state, updateState, initializeFromImage, setScale, currentScale } = useImageEditor();
  const { history, addToHistory, removeFromHistory, clearHistory, isLoaded: historyLoaded } = useHistory();
  const { session, saveSession, isLoaded: sessionLoaded } = useSession();

  // Derived
  const hasImage = Boolean(originalImage && processedImage);
  const estimatedSize = useMemo(() => {
    if (!finalImage) return 0;
    return estimateDataUrlSize(finalImage);
  }, [finalImage]);

  // Restore session - DON'T auto-open, just sync settings
  useEffect(() => {
    if (!sessionLoaded) return;
    // Only restore device/model preferences, not the image
    if (session.device) setDevice(session.device);
    if (session.model) setModel(session.model);
  }, [sessionLoaded]);

  // Apply edits when state changes
  useEffect(() => {
    if (!processedImage || !originalImage || !state.width || !state.height) return;

    applyEdits(processedImage, originalImage, state).then(setFinalImage);
  }, [processedImage, originalImage, state]);

  // Handle device/model change
  useEffect(() => {
    if (!originalImage || !sessionLoaded || isProcessing) return;

    if (prevDevice === null || prevModel === null) {
      setPrevDevice(device);
      setPrevModel(model);
      return;
    }

    if (prevDevice !== device || prevModel !== model) {
      setPrevDevice(device);
      setPrevModel(model);

      processImage(originalImage, device, model).then(async (result) => {
        if (result) {
          setProcessedImage(result);
          const applied = await applyEdits(result, originalImage, state);
          setFinalImage(applied);
          saveSession({ device, model, processedImage: result, finalImage: applied });
        }
      });
    }
  }, [device, model, originalImage, sessionLoaded, isProcessing]);

  // Handlers
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

      const result = await processImage(dataUrl, device, model);
      if (result) {
        setProcessedImage(result);
        setFinalImage(result);

        saveSession({
          originalImage: dataUrl,
          processedImage: result,
          finalImage: result,
          device,
          model,
          imageInfo: info,
          editorState: state,
        });

        addToHistory({
          id: generateId(),
          originalImage: dataUrl,
          processedImage: result,
          model,
          device,
          timestamp: Date.now(),
          editorState: state,
          imageInfo: info,
        });
      }
    },
    [device, model, processImage, initializeFromImage, state, saveSession, addToHistory]
  );

  const handleDownload = useCallback(() => {
    if (!finalImage) return;
    downloadImage(finalImage, state.outputFormat, imageInfo.fileName);
  }, [finalImage, state.outputFormat, imageInfo.fileName]);

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

  const handleNewImage = useCallback(() => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setImageInfo(DEFAULT_IMAGE_INFO);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Header
        device={device}
        setDevice={setDevice}
        model={model}
        setModel={setModel}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!hasImage ? (
          // Upload View
          <div className="max-w-2xl mx-auto">
            <ImageUploader
              onImageSelect={handleImageSelect}
              disabled={isProcessing}
              isProcessing={isProcessing}
              progress={progress}
            />

            {historyLoaded && (
              <HistoryPanel
                history={history}
                onSelect={handleHistorySelect}
                onRemove={removeFromHistory}
                onClear={clearHistory}
              />
            )}
          </div>
        ) : (
          // Editor View
          <div className="grid lg:grid-cols-[1fr,340px] gap-6">
            {/* Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-[#0c0c0e] border border-white/5">
              <AnimatePresence>
                {isProcessing && <ProcessingOverlay progress={progress} />}
              </AnimatePresence>

              <CompareSlider
                originalImage={originalImage!}
                processedImage={finalImage || processedImage!}
              />

              <ImageInfoBar
                imageInfo={imageInfo}
                state={state}
                estimatedSize={estimatedSize}
                onNewImage={handleNewImage}
              />
            </div>

            {/* Toolbar */}
            <EditorToolbar
              state={state}
              updateState={updateState}
              setScale={setScale}
              currentScale={currentScale}
              estimatedSize={estimatedSize}
              onDownload={handleDownload}
              isProcessing={isProcessing}
            />
          </div>
        )}
      </main>
    </div>
  );
}
