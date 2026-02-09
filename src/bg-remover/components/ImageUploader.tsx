"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { ProcessingProgress } from "@/types";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  progress?: ProcessingProgress;
}

export function ImageUploader({
  onImageSelect,
  disabled,
  isProcessing,
  progress
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || isProcessing) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, isProcessing, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isProcessing) setIsDragging(true);
    },
    [disabled, isProcessing]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) inputRef.current?.click();
  }, [disabled, isProcessing]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled || isProcessing) return;
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    },
    [disabled, isProcessing, handleFile]
  );

  return (
    <motion.div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      tabIndex={0}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[320px] rounded-2xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-indigo-500/50
        ${isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
        }
        ${(disabled || isProcessing) ? "pointer-events-none" : ""}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {isProcessing && progress ? (
        /* Processing State */
        <div className="flex flex-col items-center px-8">
          <div className="mb-6 p-4 rounded-2xl bg-indigo-500/20">
            <svg
              className="w-12 h-12 text-indigo-400 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="w-72 mb-4">
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>{progress.stage === "downloading" ? "Downloading model" : "Processing"}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <p className="text-sm text-white/70 mb-1">{progress.message}</p>
          {progress.stage === "downloading" && (
            <p className="text-xs text-white/40">First time only - model will be cached</p>
          )}
        </div>
      ) : (
        /* Upload State */
        <div className="flex flex-col items-center px-8">
          <div className={`mb-5 p-4 rounded-2xl transition-colors ${
            isDragging ? "bg-indigo-500/20" : "bg-white/5"
          }`}>
            <svg
              className={`w-12 h-12 transition-colors ${
                isDragging ? "text-indigo-400" : "text-white/30"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p className="text-base font-medium text-white/80 mb-1">
            Drop your image here
          </p>
          <p className="text-sm text-white/40 mb-5">
            or click to browse
          </p>

          <div className="flex items-center gap-3 text-xs text-white/30">
            <span className="px-2.5 py-1 rounded-md bg-white/5">PNG</span>
            <span className="px-2.5 py-1 rounded-md bg-white/5">JPG</span>
            <span className="px-2.5 py-1 rounded-md bg-white/5">WebP</span>
          </div>

          <p className="mt-4 text-xs text-white/25">
            Paste from clipboard supported
          </p>
        </div>
      )}
    </motion.div>
  );
}
