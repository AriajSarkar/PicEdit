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
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
            <span className="text-sm font-bold">PicEdit</span>
          </Link>
          <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
          <h1 className="text-sm font-medium text-[var(--foreground)] hidden sm:block">Background Remover</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)]">
            {(["gpu", "cpu"] as DeviceType[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-4 py-2.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-full transition-all min-h-[44px] sm:min-h-0 ${
                  device === d
                    ? "bg-[var(--foreground)] text-[var(--bg-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Model Selector – mobile: dropdown, desktop: button group */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelType)}
            className="sm:hidden px-3 py-2 min-h-[44px] text-xs font-semibold rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--foreground)]"
          >
            {(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
              <option key={m} value={m}>
                {MODEL_INFO[m].name}
              </option>
            ))}
          </select>

          <div className="hidden sm:flex bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)]">
            {(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  model === m
                    ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
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
