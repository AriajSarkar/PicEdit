"use client";

import { motion } from "motion/react";
import { DeviceType, ModelType, MODEL_INFO } from "@/types";

interface HeaderProps {
  device: DeviceType;
  setDevice: (device: DeviceType) => void;
  model: ModelType;
  setModel: (model: ModelType) => void;
}

export function Header({ device, setDevice, model, setModel }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-border">
      <h1 className="text-xl font-semibold tracking-tight">BG Remover</h1>

      <div className="flex items-center gap-4">
        {/* Device Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Device:</span>
          <div className="flex bg-surface rounded-lg p-1">
            {(["gpu", "cpu"] as DeviceType[]).map((d) => (
              <motion.button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  device === d
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {d.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Model:</span>
          <div className="flex bg-surface rounded-lg p-1">
            {(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
              <motion.button
                key={m}
                onClick={() => setModel(m)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  model === m
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={`${MODEL_INFO[m].size} - ${MODEL_INFO[m].precision}`}
              >
                {MODEL_INFO[m].name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
