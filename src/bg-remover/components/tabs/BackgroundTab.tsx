"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef } from "react";
import { motion } from "motion/react";
import { EditorState, BackgroundType } from "@/types";

interface BackgroundTabProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
  onImageSelect: (file: File) => void;
}

const BG_OPTIONS: { type: BackgroundType; label: string }[] = [
  { type: "transparent", label: "Transparent" },
  { type: "solid", label: "Solid Color" },
  { type: "image", label: "Custom Image" },
  { type: "blur", label: "Blur Original" },
];

export function BackgroundTab({ state, updateState, onImageSelect }: BackgroundTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Background type selector */}
      <div className="flex flex-wrap gap-2">
        {BG_OPTIONS.map((option) => (
          <motion.button
            key={option.type}
            onClick={() => updateState({ backgroundType: option.type })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              state.backgroundType === option.type
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {option.label}
          </motion.button>
        ))}
      </div>

      {/* Solid color picker */}
      {state.backgroundType === "solid" && (
        <div className="flex items-center gap-4">
          <label className="text-sm text-muted">Color:</label>
          <input
            type="color"
            value={state.backgroundColor}
            onChange={(e) => updateState({ backgroundColor: e.target.value })}
            className="w-12 h-8 rounded cursor-pointer bg-transparent border border-border"
          />
          <input
            type="text"
            value={state.backgroundColor}
            onChange={(e) => updateState({ backgroundColor: e.target.value })}
            className="w-24 px-2 py-1 bg-surface border border-border rounded text-sm"
          />
        </div>
      )}

      {/* Image upload */}
      {state.backgroundType === "image" && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageSelect(file);
            }}
            className="hidden"
          />
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {state.backgroundImage ? "Change Image" : "Select Image"}
          </motion.button>
          {state.backgroundImage && (
            <img
              src={state.backgroundImage}
              alt="Background"
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
        </div>
      )}

      {/* Blur slider */}
      {state.backgroundType === "blur" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted">Blur amount:</label>
            <span className="text-sm">{state.backgroundBlur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={state.backgroundBlur}
            onChange={(e) => updateState({ backgroundBlur: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
