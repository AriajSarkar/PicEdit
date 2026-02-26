'use client';

import { memo } from 'react';
import type { ToolbarProps } from './types';

export const Toolbar = memo(function Toolbar({
  config,
  liveW,
  liveH,
  originalWidth,
  originalHeight,
  pctW,
  isUpscale,
  itemCount,
  selectedIndex,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-[var(--accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </div>
        <span className="text-xs font-medium text-[var(--foreground)]">Visual Resize</span>
        {itemCount > 1 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {selectedIndex + 1}/{itemCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-primary)]/60 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)]">Orig</span>
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            {originalWidth}×{originalHeight}
          </span>
        </div>

        <svg
          className="w-3 h-3 text-[var(--text-muted)] hidden sm:block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent)]/8 border border-[var(--accent)]/20">
          <span className="text-[10px] font-mono text-[var(--accent)] font-semibold">
            {liveW}×{liveH}
          </span>
        </div>

        <div
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
            isUpscale
              ? 'text-amber-400/90 bg-amber-400/8 border-amber-400/15'
              : 'text-emerald-400/90 bg-emerald-400/8 border-emerald-400/15'
          }`}
        >
          {pctW}%
        </div>

        <div
          className={`w-5 h-5 rounded flex items-center justify-center ${
            config.lockAspectRatio
              ? 'text-[var(--accent)] bg-[var(--accent)]/8'
              : 'text-[var(--text-muted)] bg-[var(--bg-primary)]/40'
          }`}
          title={config.lockAspectRatio ? 'Aspect ratio locked' : 'Free resize'}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            {config.lockAspectRatio ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
});
