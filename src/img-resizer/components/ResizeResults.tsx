'use client';
/* eslint-disable @next/next/no-img-element */

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ResizeItem } from '@/img-resizer/types';
import { formatBytes } from '@/lib/imageUtils';

interface ResizeResultsProps {
  items: ResizeItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onResize: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  getOutputDimensions: (item: ResizeItem) => { width: number; height: number };
}

const MAX_VISIBLE = 4;
const ITEM_HEIGHT = 72;
const ITEM_GAP = 8;

export const ResizeResults = memo(function ResizeResults({
  items,
  onRemove,
  onDownload,
  onResize,
  onRetry,
  onCancel,
  getOutputDimensions,
}: ResizeResultsProps) {
  if (items.length === 0) return null;

  const needsScroll = items.length > MAX_VISIBLE;
  const containerMaxHeight = MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * ITEM_GAP;

  const doneCount = items.filter((i) => i.status === 'done').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-3">
      {/* Header with status pills */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Images ({items.length})
        </h3>
        <div className="flex items-center gap-2">
          {processingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/10 text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {processingCount} resizing
            </span>
          )}
          {doneCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
              {doneCount} done
            </span>
          )}
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
              {errorCount} failed
            </span>
          )}
        </div>
      </div>

      {/* Scrollable container */}
      <ScrollContainer needsScroll={needsScroll} maxHeight={containerMaxHeight}>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                onRemove={onRemove}
                onDownload={onDownload}
                onResize={onResize}
                onRetry={onRetry}
                onCancel={onCancel}
                getOutputDimensions={getOutputDimensions}
                enableLayout={items.length <= 15}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollContainer>

      {needsScroll && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
          <svg
            className="w-3.5 h-3.5 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Scroll to see {items.length - MAX_VISIBLE} more
        </div>
      )}
    </div>
  );
});

// ── Scroll container ──────────────────────────────────────────────────────

interface ScrollContainerProps {
  needsScroll: boolean;
  maxHeight: number;
  children: React.ReactNode;
}

function ScrollContainer({ needsScroll, maxHeight, children }: ScrollContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 8;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
    // Only set state if values actually changed — avoids unnecessary re-renders
    setShowTopFade((prev) => (prev === top ? prev : top));
    setShowBottomFade((prev) => (prev === bottom ? prev : bottom));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !needsScroll) return;
    updateFades();
    el.addEventListener('scroll', updateFades, { passive: true });
    const observer = new MutationObserver(updateFades);
    observer.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', updateFades);
      observer.disconnect();
    };
  }, [needsScroll, updateFades]);

  if (!needsScroll) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none transition-opacity duration-200 rounded-t-xl"
        style={{
          opacity: showTopFade ? 1 : 0,
          background: 'linear-gradient(to bottom, var(--bg-surface), transparent)',
        }}
      />
      <div
        ref={ref}
        className="overflow-y-auto pr-1"
        style={{ maxHeight: `${maxHeight}px`, scrollbarGutter: 'stable' }}
      >
        {children}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-6 z-10 pointer-events-none transition-opacity duration-200 rounded-b-xl"
        style={{
          opacity: showBottomFade ? 1 : 0,
          background: 'linear-gradient(to top, var(--bg-surface), transparent)',
        }}
      />
    </div>
  );
}

// ── Individual result row ─────────────────────────────────────────────────

interface ResultRowProps {
  item: ResizeItem;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onResize: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  getOutputDimensions: (item: ResizeItem) => { width: number; height: number };
  enableLayout: boolean;
}

const ResultRow = memo(function ResultRow({
  item,
  onRemove,
  onDownload,
  onResize,
  onRetry,
  onCancel,
  getOutputDimensions,
  enableLayout,
}: ResultRowProps) {
  const dims = getOutputDimensions(item);

  return (
    <motion.div
      layout={enableLayout || undefined}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)]/20 transition-colors group"
      style={{ contain: 'content' }}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--bg-primary)] flex-shrink-0">
        <img
          src={item.result?.dataUrl || item.thumbnail || item.preview}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--foreground)] truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {item.originalWidth}×{item.originalHeight}
          </span>
          {(item.status === 'pending' || item.status === 'done') && dims.width > 0 && (
            <>
              <svg
                className="w-3 h-3 text-[var(--accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-[10px] font-mono text-[var(--accent)]">
                {dims.width}×{dims.height}
              </span>
            </>
          )}
          {item.status === 'done' && item.result && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatBytes(item.result.newSize)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {item.status === 'processing' && (
          <div className="mt-1 w-full h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]"
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}

        {/* Error */}
        {item.status === 'error' && (
          <p className="text-[10px] text-red-400 mt-0.5 truncate">{item.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {item.status === 'pending' && (
          <button
            onClick={() => onResize(item.id)}
            className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
            title="Resize"
          >
            <svg
              className="w-3.5 h-3.5"
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
          </button>
        )}
        {item.status === 'processing' && (
          <button
            onClick={() => onCancel(item.id)}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
            title="Cancel"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {item.status === 'done' && (
          <>
            <button
              onClick={() => onRetry(item.id)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Re-resize"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
            </button>
            <button
              onClick={() => onDownload(item.id)}
              className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
              title="Download"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            </button>
          </>
        )}
        {item.status === 'error' && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
            title="Retry"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});
