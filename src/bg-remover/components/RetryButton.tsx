"use client";

import { motion } from "motion/react";
import { ModelType, MODEL_INFO, MODEL_HIERARCHY } from "@/types";

interface RetryButtonProps {
  currentModel: ModelType;
  onRetry: (model: ModelType) => void;
  disabled?: boolean;
}

export function RetryButton({ currentModel, onRetry, disabled }: RetryButtonProps) {
  const currentIndex = MODEL_HIERARCHY.indexOf(currentModel);
  const canRetry = currentIndex < MODEL_HIERARCHY.length - 1;
  const nextModel = canRetry ? MODEL_HIERARCHY[currentIndex + 1] : null;

  // Show current model info even if at highest
  if (!canRetry) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Using highest precision model
      </div>
    );
  }

  return (
    <motion.button
      onClick={() => onRetry(nextModel!)}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/50 rounded-lg text-sm text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>
        <strong>Retry with {MODEL_INFO[nextModel!].name}</strong>
        <span className="text-amber-400/70 ml-1">({MODEL_INFO[nextModel!].precision} quality)</span>
      </span>
    </motion.button>
  );
}
