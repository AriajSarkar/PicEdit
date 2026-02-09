"use client";

import { motion } from "motion/react";
import { ProcessingProgress } from "@/types";

interface ProcessingOverlayProps {
  progress: ProcessingProgress;
}

export function ProcessingOverlay({ progress }: ProcessingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
    >
      <div className="w-64">
        <div className="flex justify-between text-xs text-white/60 mb-2">
          <span>
            {progress.stage === "downloading" ? "Downloading model" : "Removing background"}
          </span>
          <span>{progress.progress}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-white/80">{progress.message}</p>

      {progress.stage === "downloading" && (
        <p className="mt-1 text-xs text-white/40">
          First time only - model will be cached
        </p>
      )}
    </motion.div>
  );
}
