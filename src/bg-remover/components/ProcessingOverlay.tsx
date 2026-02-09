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
      className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl z-10"
    >
      <div className="w-48 mb-4">
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <p className="text-sm text-foreground">{progress.message}</p>

      {progress.stage === "downloading" && (
        <p className="text-xs text-muted mt-1">
          First time takes longer (downloading AI model)
        </p>
      )}
    </motion.div>
  );
}
