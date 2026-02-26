'use client';
/* eslint-disable @next/next/no-img-element */

import { memo, useRef, useEffect } from 'react';
import { THUMB_SIZE } from './types';
import type { ImageStripProps } from './types';

export const ImageStrip = memo(function ImageStrip({
  items,
  selectedIndex,
  onSelect,
  disabled,
}: ImageStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedIndex]);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)]/40">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0 || disabled}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors shrink-0"
          aria-label="Previous image"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto flex-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((it, i) => {
            const sel = i === selectedIndex;
            const statusBorder =
              it.status === 'done'
                ? 'border-emerald-400/60'
                : it.status === 'error'
                  ? 'border-red-400/60'
                  : it.status === 'processing'
                    ? 'border-[var(--accent)]/60'
                    : 'border-transparent';

            return (
              <button
                key={it.id}
                onClick={() => onSelect(i)}
                disabled={disabled}
                className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-150 border-b-2 ${statusBorder} ${
                  sel
                    ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-elevated)]'
                    : 'opacity-55 hover:opacity-90'
                } disabled:pointer-events-none`}
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                title={it.file.name}
              >
                <img
                  src={it.thumbnail || it.preview}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
                {it.status === 'processing' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {it.status === 'done' && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg
                      className="w-2 h-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {it.status === 'error' && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">!</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onSelect(Math.min(items.length - 1, selectedIndex + 1))}
          disabled={selectedIndex === items.length - 1 || disabled}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors shrink-0"
          aria-label="Next image"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
});
