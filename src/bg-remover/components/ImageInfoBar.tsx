"use client";

import { ImageInfo, EditorState } from "@/types";
import { formatBytes } from "@/lib/imageUtils";

interface ImageInfoBarProps {
  imageInfo: ImageInfo;
  state: EditorState;
  estimatedSize: number;
  onNewImage: () => void;
}

export function ImageInfoBar({
  imageInfo,
  state,
  estimatedSize,
  onNewImage,
}: ImageInfoBarProps) {
  const outputWidth = state.compressionEnabled
    ? Math.round((state.width || state.originalWidth) * state.compressionScale)
    : state.width || state.originalWidth;

  const outputHeight = state.compressionEnabled
    ? Math.round((state.height || state.originalHeight) * state.compressionScale)
    : state.height || state.originalHeight;

  const compressionPercent =
    imageInfo.fileSize > 0 && estimatedSize < imageInfo.fileSize
      ? Math.round((1 - estimatedSize / imageInfo.fileSize) * 100)
      : 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-t border-white/5">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-white/40">
          {outputWidth} × {outputHeight}
        </span>
        <span className="w-px h-3 bg-white/10" />
        <span className="text-white/60 font-medium">
          {formatBytes(estimatedSize)}
        </span>
        {compressionPercent > 0 && (
          <span className="text-emerald-400 font-medium">
            -{compressionPercent}%
          </span>
        )}
        {imageInfo.fileName && (
          <>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-white/30 truncate max-w-[150px]">
              {imageInfo.fileName}
            </span>
          </>
        )}
      </div>

      {/* Prominent New Image Button */}
      <button
        onClick={onNewImage}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Image
      </button>
    </div>
  );
}
