'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ConverterHeader } from '@/img-converter/components/ConverterHeader';
import { FileUploader } from '@/components/FileUploader';
import { ConversionControls } from '@/img-converter/components/ConversionControls';
import { ConversionResults } from '@/img-converter/components/ConversionResults';
import { SummaryStatsBar } from '@/components/StatsBar';
import { PdfMergePanel } from '@/img-converter/components/PdfMergePanel';
import { TracerControls } from '@/img-converter/components/TracerControls';
import { TracerResults } from '@/img-converter/components/TracerResults';
import { RetryButton } from '@/components/RetryButton';
import { CancelButton } from '@/components/CancelButton';
import { useConversion } from '@/img-converter/hooks/useConversion';
import { useTracer } from '@/img-converter/hooks/useTracer';

type PageMode = 'convert' | 'trace';

// Hoisted constants — prevent new array refs every render
const CONVERT_FORMATS: string[] = ['JPEG', 'PNG', 'WebP', 'AVIF', 'BMP', 'TIFF', 'SVG', 'GIF'];
const TRACE_FORMATS: string[] = ['JPEG', 'PNG', 'WebP', 'BMP', 'TIFF', 'GIF'];

export default function ImgConverterPage() {
	const [mode, setMode] = useState<PageMode>('convert');

	// ── Converter hook ────────────────────────────────────────────
	const conv = useConversion();

	// ── Tracer hook ───────────────────────────────────────────────
	const tracer = useTracer();

	// Active state derived from the current mode
	const activeItems = mode === 'convert' ? conv.items : tracer.items;
	const activeIsProcessing = mode === 'convert' ? conv.isProcessing : tracer.isProcessing;
	const hasItems = activeItems.length > 0;

	const convCounts = useMemo(() => {
		let done = 0, pending = 0, retryable = 0, processing = 0;
		for (const i of conv.items) {
			if (i.status === 'done') { done++; retryable++; }
			if (i.status === 'pending') pending++;
			if (i.status === 'error') { pending++; retryable++; }
			if (i.status === 'processing') processing++;
		}
		return { doneCount: done, pendingCount: pending, retryableCount: retryable, processingCount: processing };
	}, [conv.items]);

	const tracerCounts = useMemo(() => {
		let done = 0, pending = 0, retryable = 0, processing = 0;
		for (const i of tracer.items) {
			if (i.status === 'done') { done++; retryable++; }
			if (i.status === 'pending') pending++;
			if (i.status === 'error') { pending++; retryable++; }
			if (i.status === 'processing') processing++;
		}
		return { doneCount: done, pendingCount: pending, retryableCount: retryable, processingCount: processing };
	}, [tracer.items]);

	const counts = mode === 'convert' ? convCounts : tracerCounts;

	// Memoize SummaryStatsBar columns to prevent memo bypass
	const convSummaryColumns = useMemo(
		() => [
			{ label: 'Original', value: conv.stats.formattedOriginal },
			{ label: 'Converted', value: conv.stats.formattedConverted },
			{
				label: conv.stats.increased ? 'Increase' : 'Saved',
				value: `${conv.stats.increased ? '+' : ''}${conv.stats.formattedDiff}`,
				color: conv.stats.increased ? 'text-amber-400' : 'text-green-400',
				suffix:
					conv.stats.diffPercent !== 0
						? `(${conv.stats.increased ? '+' : ''}${Math.abs(conv.stats.diffPercent).toFixed(1)}%)`
						: undefined,
				suffixColor: conv.stats.increased ? 'text-amber-400/70' : 'text-green-400/70',
			},
		],
		[conv.stats],
	);
	const convSummaryProgress = useMemo(
		() => ({ done: convCounts.doneCount, total: conv.items.length }),
		[convCounts.doneCount, conv.items.length],
	);
	const tracerSummaryColumns = useMemo(
		() => [
			{ label: 'Original', value: tracer.stats.formattedOriginal },
			{ label: 'SVG Output', value: tracer.stats.formattedSvg, color: 'text-accent' },
		],
		[tracer.stats],
	);
	const tracerSummaryProgress = useMemo(
		() => ({ done: tracer.stats.doneCount, total: tracer.items.length }),
		[tracer.stats.doneCount, tracer.items.length],
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<ConverterHeader />

			<main className="max-w-6xl mx-auto px-4 py-8">
				{/* Hero */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center mb-8"
				>
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 mb-4">
						<div className="w-1.5 h-1.5 rounded-full bg-accent badge-dot animate-pulse [animation-iteration-count:3]" />
						<span className="text-xs text-accent font-medium tracking-wide">
							Rust WASM · Format Conversion · SVG Tracing · Batch Processing
						</span>
					</div>
					<h1 className="text-3xl sm:text-4xl font-bold mb-2">
						<span className="text-gradient">
							{mode === 'convert' ? 'Format Converter' : 'SVG Tracer'}
						</span>
					</h1>
					<p className="text-muted text-sm max-w-md mx-auto">
						{mode === 'convert'
							? 'Convert images between JPEG, PNG, WebP, AVIF, BMP, TIFF, ICO, and PDF. Everything runs locally — your images never leave your device.'
							: 'Convert raster images to scalable vector graphics using Rust WASM. Powered by vtracer — fast, precise, and fully local.'}
					</p>
				</motion.div>

				{/* Mode toggle */}
				<div className="flex items-center justify-center mb-8">
					<div className="inline-flex items-center rounded-xl bg-elevated border border-white/6 p-1 gap-1 shadow-lg shadow-black/20">
						<button
							onClick={() => setMode('convert')}
							className={`
								px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
								${mode === 'convert'
									? 'bg-accent text-white shadow-lg shadow-accent/25'
									: 'text-muted hover:text-foreground'}
							`}
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
								focusable={false}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
								/>
							</svg>
							Convert
						</button>
						<button
							onClick={() => setMode('trace')}
							className={`
								px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
								${mode === 'trace'
									? 'bg-accent text-white shadow-lg shadow-accent/25'
									: 'text-muted hover:text-foreground'}
							`}
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
								focusable={false}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
								/>
							</svg>
							Vectorize
						</button>
					</div>
				</div>

				{/* 3-Tap Steps */}
				{!hasItems && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="flex items-center justify-center gap-4 mb-8"
					>
						{(mode === 'convert'
							? [
									{ step: '1', label: 'Upload', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
									{ step: '2', label: 'Pick Format', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
									{ step: '3', label: 'Download', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' },
								]
							: [
									{ step: '1', label: 'Upload', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
									{ step: '2', label: 'Tune', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
									{ step: '3', label: 'Download SVG', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' },
								]
						).map((s, i) => (
							<div key={s.step} className="flex items-center gap-4">
								<div className="flex flex-col items-center gap-1.5">
									<div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
										<svg
											className="w-5 h-5 text-accent"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={1.5}
											aria-hidden="true"
											focusable={false}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d={s.icon}
											/>
										</svg>
									</div>
									<span className="text-xs text-muted">{s.label}</span>
								</div>
								{i < 2 && (
									<div className="w-8 h-px bg-linear-to-r from-accent/30 to-transparent -mt-5" />
								)}
							</div>
						))}
					</motion.div>
				)}

				{/* Main Layout */}
				<FileUploader
					onFilesSelect={mode === 'convert' ? conv.addFiles : tracer.addFiles}
					disabled={activeIsProcessing}
					multiple
					title="Drop images here or click to browse"
					subtitle={
						mode === 'convert'
							? 'Supports JPEG, PNG, WebP, AVIF, BMP, TIFF, SVG, GIF — batch upload'
							: 'Upload raster images to vectorize — JPEG, PNG, WebP, BMP, TIFF, GIF'
					}
					formats={mode === 'convert' ? CONVERT_FORMATS : TRACE_FORMATS}
				/>

				{hasItems && (
					<div className="mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
						{/* Results & Stats */}
						<div className="space-y-4 lg:space-y-5 min-w-0">
							{/* Action bar */}
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									{counts.pendingCount > 0 && (
										<button
											onClick={mode === 'convert' ? conv.convertAll : tracer.traceAll}
											disabled={activeIsProcessing}
											className="btn-primary text-sm px-4 py-2"
										>
											{activeIsProcessing ? (
												<span className="flex items-center gap-2">
													<svg
														className="w-4 h-4 animate-spin"
														fill="none"
														viewBox="0 0 24 24"
														aria-hidden="true"
														focusable={false}
													>
														<circle
															className="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															strokeWidth="4"
														/>
														<path
															className="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
														/>
													</svg>
													{mode === 'convert' ? 'Converting...' : 'Tracing...'}
												</span>
											) : mode === 'convert' ? (
												`Convert All (${counts.pendingCount})`
											) : (
												`Trace All (${counts.pendingCount})`
											)}
										</button>
									)}
									{activeIsProcessing && (
										<CancelButton
											onClick={mode === 'convert' ? conv.cancelAll : tracer.cancelAll}
											variant="all"
											count={counts.processingCount}
											size="md"
										/>
									)}
									{!activeIsProcessing && counts.retryableCount > 0 && (
										<RetryButton
											onClick={mode === 'convert' ? conv.retryAll : tracer.retryAll}
											variant="all"
											count={counts.retryableCount}
											size="md"
										/>
									)}
									{counts.doneCount > 0 && (
										<button
											onClick={mode === 'convert' ? conv.downloadAll : tracer.downloadAll}
											className="btn-secondary text-sm px-4 py-2"
										>
											Download All ({counts.doneCount})
										</button>
									)}
									{mode === 'convert' && conv.items.length >= 2 && (
										<PdfMergePanel
											items={conv.items}
											isBuildingPdf={conv.isBuildingPdf}
											pdfProgress={conv.pdfProgress}
											onMerge={(selectedIds) => conv.downloadAsPdf(selectedIds)}
										/>
									)}
								</div>
								<button
									onClick={mode === 'convert' ? conv.clearAll : tracer.clearAll}
									disabled={activeIsProcessing}
									className="text-sm text-muted hover:text-red-400 transition-colors disabled:opacity-50"
								>
									Clear All
								</button>
							</div>

							{/* Results */}
							{mode === 'convert' ? (
								<>
									<ConversionResults
										items={conv.items}
										onRemove={conv.removeItem}
										onDownload={conv.downloadOne}
										onConvert={conv.convertOne}
										onRetry={conv.retryOne}
										onCancel={conv.cancelOne}
									/>
								<SummaryStatsBar
									title="Conversion Summary"
									countLabel={`${convCounts.doneCount}/${conv.items.length} converted`}
									columns={convSummaryColumns}
									progress={convSummaryProgress}
									/>
								</>
							) : (
								<>
									<TracerResults
										items={tracer.items}
										onRemove={tracer.removeItem}
										onDownload={tracer.downloadOne}
										onTrace={tracer.traceOne}
										onRetry={tracer.retryOne}
										onCancel={tracer.cancelOne}
									/>
								<SummaryStatsBar
									title="Trace Summary"
									countLabel={`${tracer.stats.doneCount} of ${tracer.items.length} traced`}
									columns={tracerSummaryColumns}
									progress={tracerSummaryProgress}
									/>
								</>
							)}
						</div>

						{/* Settings panel */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<div className="glass-panel p-5 lg:sticky lg:top-20">
								<h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-accent"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
										aria-hidden="true"
										focusable={false}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d={
												mode === 'convert'
													? 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
													: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75'
											}
										/>
									</svg>
									{mode === 'convert'
										? 'Conversion Settings'
										: 'Tracer Settings'}
								</h2>
								{mode === 'convert' ? (
									<ConversionControls
										config={conv.config}
										onChange={conv.setConfig}
										disabled={conv.isProcessing}
									/>
								) : (
									<TracerControls
										config={tracer.config}
										onChange={tracer.setConfig}
										disabled={tracer.isProcessing}
									/>
								)}
							</div>
						</motion.div>
					</div>
				)}
			</main>
		</div>
	);
}
