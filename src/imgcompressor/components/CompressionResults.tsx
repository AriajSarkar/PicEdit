'use client';
/* eslint-disable @next/next/no-img-element */

import { memo } from 'react';
import { motion } from 'motion/react';
import type { CompressionItem } from '@/imgcompressor/hooks/useCompression';
import { formatBytes } from '@/lib/imageUtils';

interface CompressionResultsProps {
  items: CompressionItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onCompress: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  /** Returns estimated compressed size for a given item */
  getEstimate?: (item: CompressionItem) => number;
}

export const CompressionResults = memo(function CompressionResults({ items, onRemove, onDownload, onCompress, onRetry, onCancel, getEstimate }: CompressionResultsProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">
        Images ({items.length})
      </h3>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] group"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
              <img
                src={item.result?.dataUrl || item.preview}
                alt={item.file.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)] truncate font-medium">
                {item.file.name}
              </p>

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

              {item.status === 'done' && item.result && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--muted)]">
                    {formatBytes(item.result.originalSize)}
                  </span>
                  <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className={`text-xs font-medium ${item.result.compressionRatio >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                    {formatBytes(item.result.compressedSize)}
                  </span>
                  <span className={`text-xs ${item.result.compressionRatio >= 0 ? 'text-green-400/70' : 'text-amber-400/70'}`}>
                    ({item.result.compressionRatio >= 0 ? '-' : '+'}{Math.abs(item.result.compressionRatio).toFixed(1)}%)
                  </span>
                  {item.result.ssim !== undefined && item.result.ssim > 0 && (
                    <span className="text-xs text-[var(--muted)] ml-1">
                      SSIM: {item.result.ssim.toFixed(4)}
                    </span>
                  )}
                </div>
              )}

              {item.status === 'error' && (
                <p className="text-xs text-red-400 mt-0.5">{item.error}</p>
              )}

              {item.status === 'pending' && (
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {formatBytes(item.file.size)}
                  {getEstimate && (
                    <span className="text-[var(--accent)]/70 ml-2">
                      → ~{formatBytes(getEstimate(item))} estimated
                    </span>
                  )}
                  {' '}— Ready to compress
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.status === 'pending' && (
                <button
                  onClick={() => onCompress(item.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
                  title="Compress"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </button>
              )}

              {item.status === 'processing' && (
                <button
                  onClick={() => onCancel(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" />
                  </svg>
                </button>
              )}

              {item.status === 'done' && (
                <>
                  <button
                    onClick={() => onRetry(item.id)}
                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
                    title="Retry with current settings"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDownload(item.id)}
                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors"
                    title="Download"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>
                </>
              )}

              {item.status === 'error' && (
                <button
                  onClick={() => onRetry(item.id)}
                  className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
                  title="Retry"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              <button
                onClick={() => onRemove(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
