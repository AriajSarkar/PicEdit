"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { EditorState } from "@/types";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { ResizeTab } from "./tabs/ResizeTab";
import { RotateTab } from "./tabs/RotateTab";
import { ExportTab } from "./tabs/ExportTab";

type TabType = "background" | "resize" | "rotate" | "export";

interface ControlTabsProps {
  state: EditorState;
  updateState: (updates: Partial<EditorState>) => void;
  setScale: (scale: number) => void;
  currentScale: number;
  onBackgroundImageSelect: (file: File) => void;
  estimatedSize: number;
  originalSize: number;
}

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: "background",
    label: "Background",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "resize",
    label: "Resize",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    id: "rotate",
    label: "Rotate",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "export",
    label: "Export",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export function ControlTabs({
  state,
  updateState,
  setScale,
  currentScale,
  onBackgroundImageSelect,
  estimatedSize,
  originalSize,
}: ControlTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("background");

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Tab headers */}
      <div className="flex border-b border-border bg-surface">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm transition-all duration-150 flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-background text-foreground border-b-2 border-accent"
                : "text-muted hover:text-foreground hover:bg-background/50"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <div
            key={activeTab}
            className="animate-in fade-in duration-150"
          >
            {activeTab === "background" && (
              <BackgroundTab
                state={state}
                updateState={updateState}
                onImageSelect={onBackgroundImageSelect}
              />
            )}
            {activeTab === "resize" && (
              <ResizeTab
                state={state}
                updateState={updateState}
                setScale={setScale}
                currentScale={currentScale}
              />
            )}
            {activeTab === "rotate" && (
              <RotateTab state={state} updateState={updateState} />
            )}
            {activeTab === "export" && (
              <ExportTab
                state={state}
                updateState={updateState}
                estimatedSize={estimatedSize}
                originalSize={originalSize}
              />
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
