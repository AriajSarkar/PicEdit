"use client";

import { useCallback, memo } from "react";
import { motion } from "motion/react";
import { ProcessingProgress } from "@/types";
import { FileUploader } from "@/components/FileUploader";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  progress?: ProcessingProgress;
}

const STAGE_LABELS: Record<string, string> = {
  preprocessing: "Pre-processing",
  downloading: "Downloading model",
  processing: "AI inference",
  postprocessing: "Post-processing",
};

const STAGE_COLORS: Record<string, string> = {
  preprocessing: "from-amber-500 to-orange-500",
  downloading: "from-blue-500 to-cyan-500",
  processing: "from-indigo-500 to-purple-500",
  postprocessing: "from-emerald-500 to-teal-500",
};

export const ImageUploader = memo(function ImageUploader({
  onImageSelect,
  disabled,
  isProcessing,
  progress,
}: ImageUploaderProps) {
  const handleFilesSelect = useCallback(
    (files: File[]) => {
      if (files[0]) onImageSelect(files[0]);
    },
    [onImageSelect]
  );

  return (
    <FileUploader
      onFilesSelect={handleFilesSelect}
      disabled={disabled || isProcessing}
      title="Drop your image here"
      subtitle="or click to browse"
      formats={["PNG", "JPG", "WebP"]}
      minHeight="320px"
    >
      {isProcessing && progress ? (
        <div className="flex flex-col items-center px-8">
          <div className="mb-6 p-4 rounded-2xl bg-[var(--accent)]/20">
            <svg
              className="w-12 h-12 text-[var(--accent)] animate-pulse"
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
            <div className="flex justify-between text-xs text-[var(--muted)] mb-2">
              <span>{STAGE_LABELS[progress.stage] ?? progress.stage}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${STAGE_COLORS[progress.stage] ?? "from-[var(--accent)] to-purple-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          <p className="text-sm text-[var(--foreground)]/70 mb-1">{progress.message}</p>
          {progress.stage === "downloading" && (
            <p className="text-xs text-[var(--muted)]">First time only — model will be cached</p>
          )}
        </div>
      ) : undefined}
    </FileUploader>
  );
});
