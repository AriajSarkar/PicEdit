'use client';

import { motion } from 'motion/react';
import { CompressorHeader } from '@/imgcompressor/components/CompressorHeader';
import { FileUploader } from '@/components/FileUploader';
import { CompressionControls } from '@/imgcompressor/components/CompressionControls';
import { CompressionResults } from '@/imgcompressor/components/CompressionResults';
import { StatsBar } from '@/imgcompressor/components/StatsBar';
import { RetryButton } from '@/components/RetryButton';
import { CancelButton } from '@/components/CancelButton';
import { useCompression } from '@/imgcompressor/hooks/useCompression';

export default function ImgCompressorPage() {
  const {
    items,
    config,
    setConfig,
    addFiles,
    removeItem,
    clearAll,
    compressAll,
    compressOne,
    retryOne,
    retryAll,
    cancelOne,
    cancelAll,
    downloadOne,
    downloadAll,
    isProcessing,
    processingIds,
    stats,
    getEstimate,
    estimatedStats,
  } = useCompression();

  const hasItems = items.length > 0;
  const doneCount = items.filter(i => i.status === 'done').length;
  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'error').length;
  const retryableCount = items.filter(i => i.status === 'done' || i.status === 'error').length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)]">
      <CompressorHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-xs text-[var(--accent)] font-medium">
              Rust WASM · Perceptual Optimization · Batch Processing
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient">Image Compressor</span>
          </h1>
          <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
            Compress images up to 90% smaller using production-grade algorithms.
            Everything runs locally — your images never leave your device.
          </p>
        </motion.div>

        {/* 3-Tap Steps */}
        {!hasItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            {[
              { step: '1', label: 'Upload', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
              { step: '2', label: 'Adjust', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
              { step: '3', label: 'Download', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--muted)]">{s.label}</span>
                </div>
                {i < 2 && (
                  <svg className="w-4 h-4 text-white/10 -mt-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Main Layout */}
        <div className={`grid gap-6 ${hasItems ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
          {/* Left: Upload + Results */}
          <div className="space-y-6">
            <FileUploader
              onFilesSelect={addFiles}
              disabled={isProcessing}
              multiple
              title="Drop images here or click to browse"
              subtitle="Supports JPEG, PNG, WebP — batch upload supported"
              formats={['JPEG', 'PNG', 'WebP']}
            />

            {hasItems && (
              <>
                {/* Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                      <button
                        onClick={compressAll}
                        disabled={isProcessing}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Compressing...
                          </span>
                        ) : (
                          `Compress All (${pendingCount})`
                        )}
                      </button>
                    )}
                    {isProcessing && (
                      <CancelButton
                        onClick={cancelAll}
                        variant="all"
                        count={processingIds.length}
                        size="md"
                      />
                    )}
                    {!isProcessing && retryableCount > 0 && (
                      <RetryButton
                        onClick={retryAll}
                        variant="all"
                        count={retryableCount}
                        size="md"
                      />
                    )}
                    {doneCount > 0 && (
                      <button
                        onClick={downloadAll}
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        Download All ({doneCount})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={clearAll}
                    disabled={isProcessing}
                    className="text-sm text-[var(--muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>

                <CompressionResults
                  items={items}
                  onRemove={removeItem}
                  onDownload={downloadOne}
                  onCompress={compressOne}
                  onRetry={retryOne}
                  onCancel={cancelOne}
                  getEstimate={getEstimate}
                />

                {/* Estimated savings (shown when there are pending items) */}
                {pendingCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-3 px-4 py-2.5 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15"
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[var(--accent)] font-medium">~Estimated</span>
                      <span className="text-[var(--muted)]">
                        {estimatedStats.formattedEstimated} output
                      </span>
                      {estimatedStats.estimatedSavedPercent > 0 && (
                        <span className="text-green-400 font-medium">
                          ~{estimatedStats.estimatedSavedPercent.toFixed(0)}% savings
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      Based on current settings
                    </span>
                  </motion.div>
                )}

                <StatsBar
                  totalOriginal={stats.formattedOriginal}
                  totalCompressed={stats.formattedCompressed}
                  totalSaved={stats.formattedSaved}
                  savedPercent={stats.savedPercent}
                  increased={stats.increased}
                  doneCount={doneCount}
                  totalCount={items.length}
                />
              </>
            )}
          </div>

          {/* Right: Controls sidebar */}
          {hasItems && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="glass rounded-xl p-5 sticky top-20">
                <h2 className="text-sm font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Compression Settings
                </h2>
                <CompressionControls
                  config={config}
                  onChange={setConfig}
                  disabled={isProcessing}
                />
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
