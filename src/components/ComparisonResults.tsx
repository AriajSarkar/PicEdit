'use client';
/* eslint-disable @next/next/no-img-element */

import { memo, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CompressionItem } from '@/imgcompressor/hooks/useCompression';
import type { ResizeItem } from '@/img-resizer/types';
import { formatBytes } from '@/lib/imageUtils';

const MAX_VISIBLE = 4;
const ITEM_HEIGHT = 72;
const ITEM_GAP = 8;

type CompressProps = {
  mode: 'compress';
  items: CompressionItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onCompress: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  getEstimate?: (item: CompressionItem) => number;
};

type ResizeProps = {
  mode: 'resize';
  items: ResizeItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onResize: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  getOutputDimensions: (item: ResizeItem) => { width: number; height: number };
};

export type GlobalCompressionResultsProps = CompressProps | ResizeProps;

export const ComparisonResults = memo(function ComparisonResults(
  props: GlobalCompressionResultsProps,
) {
  const { items } = props;
  if (items.length === 0) return null;

  const needsScroll = items.length > MAX_VISIBLE;
  const containerMaxHeight = MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * ITEM_GAP;

  const doneCount = items.filter((i) => i.status === 'done').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Images ({items.length})
        </h3>
        <div className="flex items-center gap-2">
          {processingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/10 text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {processingCount} {props.mode === 'resize' ? 'resizing' : 'processing'}
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

      <ScrollContainer needsScroll={needsScroll} maxHeight={containerMaxHeight}>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ResultRow key={item.id} item={item} props={props} />
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

type ScrollContainerProps = {
  needsScroll: boolean;
  maxHeight: number;
  children: ReactNode;
};

function ScrollContainer({ needsScroll, maxHeight, children }: ScrollContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 8;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
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

type ResultRowProps = {
  item: CompressionItem | ResizeItem;
  props: GlobalCompressionResultsProps;
};

const ResultRow = memo(function ResultRow({ item, props }: ResultRowProps) {
  const isResize = props.mode === 'resize';
  const resizeItem = isResize ? (item as ResizeItem) : null;
  const compressionItem = !isResize ? (item as CompressionItem) : null;

  const thumbnailSrc = isResize
    ? resizeItem!.result?.dataUrl || resizeItem!.thumbnail || resizeItem!.preview
    : compressionItem!.result?.dataUrl || compressionItem!.preview;

  const resizeDims = isResize ? props.getOutputDimensions(resizeItem!) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] group"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        <img src={thumbnailSrc} alt={item.file.name} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--foreground)] truncate font-medium">{item.file.name}</p>

        {item.status === 'processing' && (
          <div className="mt-1">
            <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
              <span>{item.stage}</span>
              <span>{item.progress}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-[var(--accent)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}

        {!isResize && item.status === 'done' && compressionItem?.result && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--muted)]">
              {formatBytes(compressionItem.result.originalSize)}
            </span>
            <svg
              className="w-3 h-3 text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span
              className={`text-xs font-medium ${compressionItem.result.compressionRatio >= 0 ? 'text-green-400' : 'text-amber-400'}`}
            >
              {formatBytes(compressionItem.result.compressedSize)}
            </span>
            <span
              className={`text-xs ${compressionItem.result.compressionRatio >= 0 ? 'text-green-400/70' : 'text-amber-400/70'}`}
            >
              ({compressionItem.result.compressionRatio >= 0 ? '-' : '+'}
              {Math.abs(compressionItem.result.compressionRatio).toFixed(1)}%)
            </span>
            {compressionItem.result.ssim !== undefined && compressionItem.result.ssim > 0 && (
              <span className="text-xs text-[var(--muted)] ml-1">
                SSIM: {compressionItem.result.ssim.toFixed(4)}
              </span>
            )}
          </div>
        )}

        {isResize && item.status === 'done' && resizeItem?.result && resizeDims && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--muted)]">
              {resizeItem.originalWidth}x{resizeItem.originalHeight}
            </span>
            <svg
              className="w-3 h-3 text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="text-xs font-medium text-[var(--accent)]">
              {resizeDims.width}x{resizeDims.height}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {formatBytes(resizeItem.result.newSize)}
            </span>
          </div>
        )}

        {item.status === 'error' && <p className="text-xs text-red-400 mt-0.5">{item.error}</p>}

        {!isResize && item.status === 'pending' && (
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {formatBytes(item.file.size)}
            {props.getEstimate && (
              <span className="text-[var(--accent)]/70 ml-2">
                -&gt; ~{formatBytes(props.getEstimate(compressionItem!))} estimated
              </span>
            )}{' '}
            - Ready to compress
          </p>
        )}

        {isResize && item.status === 'pending' && resizeDims && (
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {resizeItem!.originalWidth}x{resizeItem!.originalHeight}
            <span className="text-[var(--accent)]/70 ml-2">
              -&gt; {resizeDims.width}x{resizeDims.height}
            </span>{' '}
            - Ready to resize
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {item.status === 'pending' && !isResize && (
          <button
            type="button"
            aria-label={`Compress ${item.file.name}`}
            onClick={() => props.onCompress(item.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
            title="Compress"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </button>
        )}

        {item.status === 'pending' && isResize && (
          <button
            type="button"
            aria-label={`Resize ${item.file.name}`}
            onClick={() => props.onResize(item.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
            title="Resize"
          >
            <svg
              className="w-4 h-4"
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
            type="button"
            aria-label={`Cancel processing ${item.file.name}`}
            onClick={() => props.onCancel(item.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
            title="Cancel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="9" />
              <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" />
            </svg>
          </button>
        )}

        {item.status === 'done' && (
          <>
            <button
              type="button"
              aria-label={`${isResize ? 'Re-resize' : 'Retry'} ${item.file.name}`}
              onClick={() => props.onRetry(item.id)}
              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
              title={isResize ? 'Re-resize' : 'Retry with current settings'}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Download ${item.file.name}`}
              onClick={() => props.onDownload(item.id)}
              className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors"
              title="Download"
            >
              <svg
                className="w-4 h-4"
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
            type="button"
            aria-label={`Retry ${item.file.name}`}
            onClick={() => props.onRetry(item.id)}
            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
            title="Retry"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label={`Remove ${item.file.name}`}
          onClick={() => props.onRemove(item.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
          title="Remove"
        >
          <svg
            className="w-4 h-4"
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
