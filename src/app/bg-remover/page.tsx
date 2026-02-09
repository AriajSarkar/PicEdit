"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
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
  MODEL_INFO,
  BackgroundType,
  OutputFormat,
} from "@/types";
import {
  fileToDataUrl,
  loadImage,
  getImageInfo,
  applyEdits,
  downloadImage,
  generateId,
  estimateDataUrlSize,
  formatBytes,
} from "@/lib/imageUtils";

export default function BGRemoverPage() {
  const [device, setDevice] = useState<DeviceType>("gpu");
  const [model, setModel] = useState<ModelType>("isnet_quint8");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo>(DEFAULT_IMAGE_INFO);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showOriginal, setShowOriginal] = useState(false);

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

  // Output dimensions
  const outputWidth = state.compressionEnabled
    ? Math.round((state.width || state.originalWidth) * state.compressionScale)
    : (state.width || state.originalWidth);
  const outputHeight = state.compressionEnabled
    ? Math.round((state.height || state.originalHeight) * state.compressionScale)
    : (state.height || state.originalHeight);

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

  // Handle file
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

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

  // Track previous device/model
  const [prevDevice, setPrevDevice] = useState<DeviceType | null>(null);
  const [prevModel, setPrevModel] = useState<ModelType | null>(null);

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

  const handleClear = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setImageInfo(DEFAULT_IMAGE_INFO);
  };

  const hasImage = originalImage && processedImage;

  // Background options
  const bgOptions: { type: BackgroundType; label: string; icon: React.ReactNode }[] = [
    { type: "transparent", label: "None", icon: <div className="w-4 h-4 rounded bg-[repeating-conic-gradient(#333_0_25%,#555_0_50%)] bg-[length:8px_8px]" /> },
    { type: "solid", label: "Color", icon: <div className="w-4 h-4 rounded" style={{ background: state.backgroundColor }} /> },
    { type: "blur", label: "Blur", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" strokeWidth="2" opacity="0.5" /></svg> },
  ];

  // Format options
  const formatOptions: { format: OutputFormat; label: string }[] = [
    { format: "image/png", label: "PNG" },
    { format: "image/jpeg", label: "JPG" },
    { format: "image/webp", label: "WebP" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">PicEdit</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-sm font-semibold">Background Remover</h1>
          </div>

          {/* Settings Pills */}
          <div className="flex items-center gap-3">
            {/* Device */}
            <div className="flex items-center bg-white/5 rounded-full p-0.5">
              {(["gpu", "cpu"] as DeviceType[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    device === d
                      ? "bg-white text-black"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Model */}
            <div className="flex items-center bg-white/5 rounded-full p-0.5">
              {(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    model === m
                      ? "bg-linear-to-r from-violet-500 to-purple-500 text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                  title={`${MODEL_INFO[m].size} - ${MODEL_INFO[m].precision}`}
                >
                  {MODEL_INFO[m].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {!hasImage ? (
          /* Upload Area */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) handleFile(file);
                    break;
                  }
                }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
              tabIndex={0}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
                ${isDragging
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                }
                ${isProcessing ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <div className="flex flex-col items-center justify-center py-24 px-8">
                <div className={`mb-6 p-4 rounded-2xl ${isDragging ? "bg-violet-500/20" : "bg-white/5"} transition-colors`}>
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-white/80 mb-2">
                  Drop your image here
                </p>
                <p className="text-sm text-white/40 mb-6">
                  or click to browse. You can also paste from clipboard.
                </p>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span className="px-2 py-1 rounded bg-white/5">PNG</span>
                  <span className="px-2 py-1 rounded bg-white/5">JPG</span>
                  <span className="px-2 py-1 rounded bg-white/5">WebP</span>
                </div>
              </div>
            </div>

            {/* History */}
            {historyLoaded && history.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/40">Recent</h3>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {history.slice(0, 10).map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => handleHistorySelect(item)}
                      className="aspect-square rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/5 hover:ring-violet-500/50 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="w-full h-full checkerboard">
                        <img
                          src={item.processedImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Editor View */
          <div className="grid lg:grid-cols-[1fr,320px] gap-6 mt-4">
            {/* Image Preview */}
            <div className="space-y-4">
              {/* Image Container */}
              <div className="relative rounded-2xl overflow-hidden bg-[#0f0f11] ring-1 ring-white/5">
                {/* Processing Overlay */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                      <div className="w-48 mb-4">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-linear-to-r from-violet-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-white/80">{progress.message}</p>
                      {progress.stage === "downloading" && (
                        <p className="text-xs text-white/40 mt-1">First time takes longer</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Comparison Slider */}
                <div
                  className="relative aspect-video checkerboard cursor-ew-resize"
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const updateSlider = (clientX: number) => {
                      const x = clientX - rect.left;
                      setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                    };
                    updateSlider(e.clientX);

                    const handleMove = (e: MouseEvent) => updateSlider(e.clientX);
                    const handleUp = () => {
                      window.removeEventListener("mousemove", handleMove);
                      window.removeEventListener("mouseup", handleUp);
                    };
                    window.addEventListener("mousemove", handleMove);
                    window.addEventListener("mouseup", handleUp);
                  }}
                >
                  {/* Processed */}
                  <img
                    src={finalImage || processedImage}
                    alt="Processed"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />

                  {/* Original (clipped) */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <img
                      src={originalImage}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>

                  {/* Slider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
                    style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-medium">
                    Original
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-medium">
                    Result
                  </div>
                </div>

                {/* Image Info Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-t border-white/5">
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{outputWidth} x {outputHeight}</span>
                    <span className="w-px h-3 bg-white/10" />
                    <span className="text-white/60 font-medium">{formatBytes(estimatedSize)}</span>
                    {imageInfo.fileSize > 0 && estimatedSize < imageInfo.fileSize && (
                      <span className="text-emerald-400">
                        -{Math.round((1 - estimatedSize / imageInfo.fileSize) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
                    >
                      New image
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {/* Background Options */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
                  {bgOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => updateState({ backgroundType: opt.type })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        state.backgroundType === opt.type
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {state.backgroundType === "solid" && (
                  <input
                    type="color"
                    value={state.backgroundColor}
                    onChange={(e) => updateState({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                )}

                {state.backgroundType === "blur" && (
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={state.backgroundBlur}
                    onChange={(e) => updateState({ backgroundBlur: Number(e.target.value) })}
                    className="w-24"
                  />
                )}

                <div className="flex-1" />

                {/* Rotation */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
                  <button
                    onClick={() => updateState({ rotation: (state.rotation - 90 + 360) % 360 })}
                    className="p-2 rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
                    title="Rotate left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => updateState({ rotation: (state.rotation + 90) % 360 })}
                    className="p-2 rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
                    title="Rotate right"
                  >
                    <svg className="w-4 h-4 scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => updateState({ flipH: !state.flipH })}
                    className={`p-2 rounded-md transition-all ${state.flipH ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}
                    title="Flip horizontal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l10-10L7 1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => updateState({ flipV: !state.flipV })}
                    className={`p-2 rounded-md transition-all ${state.flipV ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}
                    title="Flip vertical"
                  >
                    <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l10-10L7 1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Download Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 ring-white/10">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    {formatOptions.map((opt) => (
                      <button
                        key={opt.format}
                        onClick={() => updateState({ outputFormat: opt.format })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          state.outputFormat === opt.format
                            ? "bg-white/10 text-white ring-1 ring-white/20"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {state.outputFormat !== "image/png" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Quality</span>
                        <span className="text-white/60">{Math.round(state.outputQuality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={Math.round(state.outputQuality * 100)}
                        onChange={(e) => updateState({ outputQuality: Number(e.target.value) / 100 })}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <motion.button
                  onClick={handleDownload}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-linear-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Download {formatOptions.find(f => f.format === state.outputFormat)?.label}
                </motion.button>
              </div>

              {/* Scale Card */}
              <div className="p-4 rounded-2xl bg-white/[0.02] ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/60">Scale</span>
                  <span className="text-xs text-white/40">{Math.round(currentScale * 100)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[0.25, 0.5, 0.75, 1].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        Math.abs(currentScale - s) < 0.01
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      {s * 100}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={Math.round(currentScale * 100)}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>

              {/* Model Upgrade */}
              {model !== "isnet" && (
                <motion.button
                  onClick={async () => {
                    const nextModel = model === "isnet_quint8" ? "isnet_fp16" : "isnet";
                    setModel(nextModel);
                  }}
                  className="w-full p-4 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 text-left hover:bg-amber-500/15 transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-300">Improve quality</p>
                      <p className="text-xs text-amber-400/60">
                        Try {model === "isnet_quint8" ? "Balanced" : "Precise"} model
                      </p>
                    </div>
                  </div>
                </motion.button>
              )}

              {/* History */}
              {historyLoaded && history.length > 1 && (
                <div className="p-4 rounded-2xl bg-white/[0.02] ring-1 ring-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-white/60">History</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {history.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistorySelect(item)}
                        className="aspect-square rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/5 hover:ring-violet-500/50 transition-all"
                      >
                        <div className="w-full h-full checkerboard">
                          <img
                            src={item.processedImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
