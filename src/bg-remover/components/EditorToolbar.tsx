"use client";

import { EditorState, BackgroundType, OutputFormat } from "@/types";
import { formatBytes } from "@/lib/imageUtils";

interface EditorToolbarProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
  setScale: (scale: number) => void;
  currentScale: number;
  estimatedSize: number;
  onDownload: () => void;
  isProcessing: boolean;
}

export function EditorToolbar({
  state,
  updateState,
  setScale,
  currentScale,
  estimatedSize,
  onDownload,
  isProcessing,
}: EditorToolbarProps) {
  const bgOptions: { type: BackgroundType; label: string }[] = [
    { type: "transparent", label: "None" },
    { type: "solid", label: "Color" },
    { type: "blur", label: "Blur" },
  ];

  const formatOptions: { format: OutputFormat; label: string }[] = [
    { format: "image/png", label: "PNG" },
    { format: "image/jpeg", label: "JPG" },
    { format: "image/webp", label: "WebP" },
  ];

  return (
    <div className="p-4 bg-[#0c0c0e] rounded-2xl border border-white/5 space-y-4">
      {/* Background */}
      <div>
        <label className="text-xs text-white/40 mb-2 block">Background</label>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {bgOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => updateState({ backgroundType: opt.type })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  state.backgroundType === opt.type
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {opt.label}
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
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="50"
                value={state.backgroundBlur}
                onChange={(e) => updateState({ backgroundBlur: Number(e.target.value) })}
                className="w-20"
              />
              <span className="text-xs text-white/40">{state.backgroundBlur}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Transform */}
      <div>
        <label className="text-xs text-white/40 mb-2 block">Transform</label>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
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
              className={`p-2 rounded-md transition-all ${
                state.flipH ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
              title="Flip horizontal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 7l4-4m-4 4l4 4M8 17h12M8 17l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button
              onClick={() => updateState({ flipV: !state.flipV })}
              className={`p-2 rounded-md transition-all ${
                state.flipV ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
              title="Flip vertical"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 7l4-4m-4 4l4 4M8 17h12M8 17l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          {state.rotation !== 0 && (
            <span className="text-xs text-white/40">{state.rotation}°</span>
          )}
        </div>
      </div>

      {/* Scale */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">Scale</label>
          <span className="text-xs text-white/60">{Math.round(currentScale * 100)}%</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                Math.abs(currentScale - s) < 0.01
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
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

      {/* Export */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-3">
          {formatOptions.map((opt) => (
            <button
              key={opt.format}
              onClick={() => updateState({ outputFormat: opt.format })}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                state.outputFormat === opt.format
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {state.outputFormat !== "image/png" && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
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

        <div className="flex items-center justify-between text-xs text-white/40 mb-3">
          <span>Estimated size</span>
          <span className="text-white/60 font-medium">{formatBytes(estimatedSize)}</span>
        </div>

        <button
          onClick={onDownload}
          disabled={isProcessing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
        >
          Download {formatOptions.find((f) => f.format === state.outputFormat)?.label}
        </button>
      </div>
    </div>
  );
}
