"use client";

import { motion } from "motion/react";
import { ProcessingProgress } from "@/types";

interface ProcessingOverlayProps {
  progress: ProcessingProgress;
  onCancel?: () => void;
}

const STAGE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  preprocessing: { label: "Pre-processing", icon: "enhance", color: "from-amber-500 to-orange-500" },
  downloading: { label: "Downloading model", icon: "download", color: "from-blue-500 to-cyan-500" },
  processing: { label: "AI inference", icon: "brain", color: "from-indigo-500 to-purple-500" },
  postprocessing: { label: "Post-processing", icon: "refine", color: "from-emerald-500 to-teal-500" },
  complete: { label: "Complete", icon: "check", color: "from-green-500 to-emerald-500" },
  error: { label: "Error", icon: "error", color: "from-red-500 to-rose-500" },
};

function StageIcon({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage];
  if (!config) return null;

  switch (config.icon) {
    case "enhance":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "download":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      );
    case "brain":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      );
    case "refine":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      );
    default:
      return null;
  }
}

// Pipeline stages in order with their weight in the total progress
const PIPELINE_STAGES = [
  { key: "preprocessing", weight: 10 },
  { key: "downloading", weight: 30 },
  { key: "processing", weight: 45 },
  { key: "postprocessing", weight: 15 },
] as const;

function getOverallProgress(stage: string, stageProgress: number): number {
  let accumulated = 0;
  for (const s of PIPELINE_STAGES) {
    if (s.key === stage) {
      return accumulated + (stageProgress / 100) * s.weight;
    }
    accumulated += s.weight;
  }
  return 100;
}

function formatElapsed(ms: number | undefined): string {
  if (!ms) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export function ProcessingOverlay({ progress, onCancel }: ProcessingOverlayProps) {
  const config = STAGE_CONFIG[progress.stage] || STAGE_CONFIG.processing;
  const overall = getOverallProgress(progress.stage, progress.progress);
  const elapsed = formatElapsed(progress.elapsed);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
    >
      <div className="w-72">
        {/* Overall pipeline progress */}
        <div className="flex items-center justify-between text-[10px] text-white/40 mb-3 uppercase tracking-wider">
          <span>Overall</span>
          <span>{Math.round(overall)}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-5">
          <motion.div
            className="h-full bg-gradient-to-r from-white/30 to-white/50"
            animate={{ width: `${overall}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Stage steps indicator */}
        <div className="flex items-center gap-1 mb-5">
          {PIPELINE_STAGES.map((s, i) => {
            const stageIdx = PIPELINE_STAGES.findIndex(p => p.key === progress.stage);
            const isActive = s.key === progress.stage;
            const isDone = i < stageIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`h-1 w-full rounded-full transition-colors duration-300 ${
                    isDone
                      ? "bg-white/40"
                      : isActive
                        ? `bg-gradient-to-r ${config.color}`
                        : "bg-white/8"
                  }`}
                />
                <span className={`text-[9px] transition-colors ${
                  isActive ? "text-white/70" : isDone ? "text-white/30" : "text-white/15"
                }`}>
                  {STAGE_CONFIG[s.key]?.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current stage detail */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-white/70`}>
            <StageIcon stage={progress.stage} />
          </div>
          <span className="text-xs font-medium text-white/80">{config.label}</span>
          <span className="text-xs text-white/40 ml-auto">{progress.progress}%</span>
        </div>

        {/* Stage progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <motion.div
            className={`h-full bg-gradient-to-r ${config.color}`}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        </div>

        {/* Message */}
        <p className="text-xs text-white/60 mt-2">{progress.message}</p>

        {/* Elapsed time */}
        {elapsed && (
          <p className="text-[10px] text-white/30 mt-1">{elapsed} elapsed</p>
        )}

        {/* Download-specific info */}
        {progress.stage === "downloading" && (
          <p className="mt-2 text-[10px] text-white/30">
            First time only — model will be cached
          </p>
        )}

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 w-full px-4 py-2 rounded-lg text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            Cancel Processing
          </button>
        )}
      </div>
    </motion.div>
  );
}
