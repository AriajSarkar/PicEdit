"use client";

import { motion } from "motion/react";
import { EditorState } from "@/types";

interface RotateTabProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
}

const ROTATION_PRESETS = [0, 90, 180, 270];

export function RotateTab({ state, updateState }: RotateTabProps) {
  return (
    <div className="space-y-4">
      {/* Rotation presets */}
      <div className="space-y-2">
        <label className="text-sm text-muted">Rotation presets:</label>
        <div className="flex flex-wrap gap-2">
          {ROTATION_PRESETS.map((deg) => (
            <motion.button
              key={deg}
              onClick={() => updateState({ rotation: deg })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                state.rotation === deg
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {deg}°
            </motion.button>
          ))}
        </div>
      </div>

      {/* Rotation slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted">Rotation:</label>
          <span className="text-sm">{state.rotation}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          value={state.rotation}
          onChange={(e) => updateState({ rotation: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Flip buttons */}
      <div className="flex gap-4">
        <motion.button
          onClick={() => updateState({ flipH: !state.flipH })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            state.flipH
              ? "bg-accent text-white"
              : "bg-surface text-muted hover:text-foreground"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Flip H
        </motion.button>

        <motion.button
          onClick={() => updateState({ flipV: !state.flipV })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            state.flipV
              ? "bg-accent text-white"
              : "bg-surface text-muted hover:text-foreground"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Flip V
        </motion.button>
      </div>

      {/* Reset button */}
      <motion.button
        onClick={() => updateState({ rotation: 0, flipH: false, flipV: false })}
        className="px-4 py-2 bg-surface text-muted rounded-lg text-sm hover:text-foreground transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Reset Rotation
      </motion.button>
    </div>
  );
}
