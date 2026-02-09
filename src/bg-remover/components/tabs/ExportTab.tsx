"use client";

import { EditorState, OutputFormat } from "@/types";
import { formatBytes } from "@/lib/imageUtils";

interface ExportTabProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
  estimatedSize: number;
  originalSize: number;
}

const FORMAT_OPTIONS: { format: OutputFormat; label: string; ext: string }[] = [
  { format: "image/png", label: "PNG", ext: "Lossless, transparency" },
  { format: "image/jpeg", label: "JPG", ext: "Smaller, no transparency" },
  { format: "image/webp", label: "WebP", ext: "Best compression" },
];

const SCALE_PRESETS = [
  { value: 1.0, label: "100%" },
  { value: 0.75, label: "75%" },
  { value: 0.5, label: "50%" },
  { value: 0.25, label: "25%" },
];

export function ExportTab({ state, updateState, estimatedSize, originalSize }: ExportTabProps) {
  const showQuality = state.outputFormat !== "image/png";
  const compressionPercent = originalSize > 0
    ? Math.round((1 - estimatedSize / originalSize) * 100)
    : 0;

  // Calculate output dimensions
  const outputWidth = state.compressionEnabled
    ? Math.round((state.width || state.originalWidth) * state.compressionScale)
    : (state.width || state.originalWidth);
  const outputHeight = state.compressionEnabled
    ? Math.round((state.height || state.originalHeight) * state.compressionScale)
    : (state.height || state.originalHeight);

  return (
    <div className="space-y-5">
      {/* Format selector */}
      <div className="space-y-2">
        <label className="text-sm text-muted">Format</label>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => updateState({ outputFormat: option.format })}
              className={`flex flex-col px-4 py-2 rounded-lg text-sm transition-all duration-150 ${
                state.outputFormat === option.format
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs opacity-70">{option.ext}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality slider */}
      {showQuality && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted">Quality</label>
            <span className="text-sm font-medium">{Math.round(state.outputQuality * 100)}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={Math.round(state.outputQuality * 100)}
            onChange={(e) => updateState({ outputQuality: Number(e.target.value) / 100 })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>
      )}

      {/* Compression toggle */}
      <div className="p-4 bg-surface rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Scale Down</p>
            <p className="text-xs text-muted">Reduce image dimensions for smaller file</p>
          </div>
          <button
            onClick={() => updateState({ compressionEnabled: !state.compressionEnabled })}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              state.compressionEnabled ? "bg-accent" : "bg-border"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                state.compressionEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {state.compressionEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Scale presets */}
            <div className="flex gap-2">
              {SCALE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateState({ compressionScale: preset.value })}
                  className={`flex-1 py-1.5 rounded text-sm transition-all duration-150 ${
                    Math.abs(state.compressionScale - preset.value) < 0.01
                      ? "bg-accent text-white"
                      : "bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Scale slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Scale</span>
                <span className="text-sm font-medium">{Math.round(state.compressionScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(state.compressionScale * 100)}
                onChange={(e) => updateState({ compressionScale: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Output info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-surface rounded-lg">
          <p className="text-xs text-muted mb-1">Output Size</p>
          <p className="text-lg font-semibold">{outputWidth} × {outputHeight}</p>
          <p className="text-xs text-muted">pixels</p>
        </div>

        <div className="p-3 bg-surface rounded-lg">
          <p className="text-xs text-muted mb-1">Est. File Size</p>
          <p className="text-lg font-semibold">{formatBytes(estimatedSize)}</p>
          {compressionPercent > 0 && (
            <p className="text-xs text-green-400">-{compressionPercent}% from original</p>
          )}
        </div>
      </div>

      {/* Original file info */}
      {originalSize > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Original: {formatBytes(originalSize)} • {state.originalWidth} × {state.originalHeight}px
        </div>
      )}
    </div>
  );
}
