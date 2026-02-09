"use client";

import Link from "next/link";
import { DeviceType, ModelType, MODEL_INFO } from "@/types";

interface HeaderProps {
  device: DeviceType;
  setDevice: (device: DeviceType) => void;
  model: ModelType;
  setModel: (model: ModelType) => void;
}

export function Header({ device, setDevice, model, setModel }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">PicEdit</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium">Background Remover</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex bg-white/5 rounded-full p-0.5">
            {(["gpu", "cpu"] as DeviceType[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  device === d
                    ? "bg-white text-black"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Model Selector */}
          <div className="flex bg-white/5 rounded-full p-0.5">
            {(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  model === m
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
                title={`${MODEL_INFO[m].size} - ${MODEL_INFO[m].precision}`}
              >
                {MODEL_INFO[m].name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
