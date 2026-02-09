"use client";

import { motion } from "motion/react";
import { EditorState } from "@/types";

interface ResizeTabProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
  setScale: (scale: number) => void;
  currentScale: number;
}

const SCALE_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2];

export function ResizeTab({ state, updateState, setScale, currentScale }: ResizeTabProps) {
  const handleWidthChange = (width: number) => {
    if (state.aspectLocked && state.originalWidth && state.originalHeight) {
      const aspect = state.originalWidth / state.originalHeight;
      updateState({ width, height: Math.round(width / aspect) });
    } else {
      updateState({ width });
    }
  };

  const handleHeightChange = (height: number) => {
    if (state.aspectLocked && state.originalWidth && state.originalHeight) {
      const aspect = state.originalWidth / state.originalHeight;
      updateState({ width: Math.round(height * aspect), height });
    } else {
      updateState({ height });
    }
  };

  return (
    <div className="space-y-4">
      {/* Scale presets */}
      <div className="space-y-2">
        <label className="text-sm text-muted">Scale presets:</label>
        <div className="flex flex-wrap gap-2">
          {SCALE_PRESETS.map((scale) => (
            <motion.button
              key={scale}
              onClick={() => setScale(scale)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                Math.abs(currentScale - scale) < 0.01
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {Math.round(scale * 100)}%
            </motion.button>
          ))}
        </div>
      </div>

      {/* Scale slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted">Scale:</label>
          <span className="text-sm">{Math.round(currentScale * 100)}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="300"
          value={Math.round(currentScale * 100)}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          className="w-full"
        />
      </div>

      {/* Width/Height inputs */}
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-sm text-muted">Width</label>
          <input
            type="number"
            value={state.width}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm"
          />
        </div>

        <motion.button
          onClick={() => updateState({ aspectLocked: !state.aspectLocked })}
          className={`mt-6 p-2 rounded-lg transition-colors ${
            state.aspectLocked ? "bg-accent text-white" : "bg-surface text-muted"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={state.aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {state.aspectLocked ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            )}
          </svg>
        </motion.button>

        <div className="flex-1 space-y-1">
          <label className="text-sm text-muted">Height</label>
          <input
            type="number"
            value={state.height}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Original dimensions info */}
      <p className="text-xs text-muted">
        Original: {state.originalWidth} x {state.originalHeight}px
      </p>
    </div>
  );
}
