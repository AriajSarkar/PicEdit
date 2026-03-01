'use client';

import { memo, useCallback } from 'react';
import { clamp } from './geometry';
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from './types';
import type { ZoomBarProps } from './types';

const QUICK_ZOOM = [
  { label: 'Fit', value: DEFAULT_ZOOM },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1.0 },
  { label: '200%', value: 2.0 },
] as const;

export const ZoomBar = memo(function ZoomBar({ zoom, onZoom, onReset }: ZoomBarProps) {
  const pct = Math.round(zoom * 100);

  const step = useCallback(
    (delta: number) => onZoom(clamp(+(zoom + delta).toFixed(2), MIN_ZOOM, MAX_ZOOM)),
    [zoom, onZoom],
  );

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-[var(--border)] bg-[var(--bg-elevated)]/40 gap-2">
      {/* Zoom slider group */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[var(--text-muted)] select-none">Zoom</span>
        <button
          onClick={() => step(-0.1)}
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors"
          title="Zoom out (Ctrl+−)"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <input
          type="range"
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          value={zoom * 100}
          onChange={(e) => onZoom(clamp(+e.target.value / 100, MIN_ZOOM, MAX_ZOOM))}
          className="w-20 h-1 accent-[var(--accent)] cursor-pointer"
          style={{ accentColor: 'var(--accent)' }}
        />
        <button
          onClick={() => step(0.1)}
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors"
          title="Zoom in (Ctrl+=)"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-center select-none">
          {pct}%
        </span>
      </div>

      {/* Quick zoom presets */}
      <div className="flex items-center gap-1">
        {QUICK_ZOOM.map((q) => {
          const active =
            q.label === 'Fit' ? zoom === DEFAULT_ZOOM : Math.abs(zoom - q.value) < 0.01;
          return (
            <button
              key={q.label}
              onClick={() => (q.label === 'Fit' ? onReset() : onZoom(q.value))}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                active
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10 font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white/5'
              }`}
              title={q.label === 'Fit' ? 'Fit to canvas (Ctrl+0)' : `Zoom to ${q.label}`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* Shortcut hints */}
      <span className="text-[9px] text-[var(--text-muted)]/50 hidden lg:inline select-none">
        Scroll=zoom · Space+drag=pan · Dbl-click=toggle · Pinch=zoom
      </span>
    </div>
  );
});
