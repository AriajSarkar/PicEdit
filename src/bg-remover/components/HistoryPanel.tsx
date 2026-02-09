"use client";

import { motion } from "motion/react";
import { HistoryItem, MODEL_INFO } from "@/types";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, onSelect, onRemove, onClear }: HistoryPanelProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-white/40">Recent</h3>
        <button
          onClick={onClear}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        {history.map((item) => (
          <motion.div
            key={item.id}
            className="relative group"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => onSelect(item)}
              className="block w-full aspect-square rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/5 hover:ring-indigo-500/50 transition-all"
            >
              <div className="w-full h-full checkerboard">
                <img
                  src={item.processedImage}
                  alt="History item"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
            >
              ×
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
