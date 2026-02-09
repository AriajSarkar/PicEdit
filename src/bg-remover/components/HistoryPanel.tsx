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
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted">Previous Results</h3>
        <motion.button
          onClick={onClear}
          className="text-xs text-muted hover:text-foreground transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Clear All
        </motion.button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {history.map((item) => (
          <motion.div
            key={item.id}
            className="relative flex-shrink-0 group"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              onClick={() => onSelect(item)}
              className="block rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-20 h-20 checkerboard">
                <img
                  src={item.processedImage}
                  alt="History item"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="px-2 py-1 bg-surface text-xs text-center">
                <span className="text-muted">{MODEL_INFO[item.model].name}</span>
              </div>
            </motion.button>

            {/* Remove button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
