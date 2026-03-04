'use client';

import { memo, useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ResizerHeader } from '@/img-resizer/components/ResizerHeader';
import { ResizeControls } from '@/img-resizer/components/ResizeControls';
import { ResizeResults } from '@/img-resizer/components/ResizeResults';
import { VisualResizerModal } from '@/img-resizer/components/visual-resizer/VisualResizerModal';
import type { ViewStateCache } from '@/img-resizer/components/visual-resizer/types';
import { FileUploader } from '@/components/FileUploader';
import { RetryButton } from '@/components/RetryButton';
import { CancelButton } from '@/components/CancelButton';
import { useResize } from '@/img-resizer/hooks/useResize';
import { formatBytes } from '@/lib/imageUtils';

// Hoisted constants — prevent new array/object refs every render
const SUPPORTED_FORMATS: string[] = ['JPEG', 'PNG', 'WebP'];

const STEPS = [
	{
		step: '1',
		label: 'Upload',
		icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
	},
	{
		step: '2',
		label: 'Configure',
		icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
	},
	{
		step: '3',
		label: 'Download',
		icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
	},
] as const;

export default function ImgResizerPage() {
	const {
		items,
		config,
		setConfig,
		addFiles,
		removeItem,
		clearAll,
		resizeAll,
		resizeOne,
		retryOne,
		retryAll,
		cancelOne,
		cancelAll,
		downloadOne,
		downloadAll,
		isProcessing,
		processingIds,
		stats,
		getOutputDimensions,
		perImageDims,
		setPerImageDims,
		clearAllPerImageDims,
	} = useResize();

	const hasItems = items.length > 0;

	// Memoize derived counts to avoid recalculating on every render
	const { doneCount, pendingCount, retryableCount } = useMemo(() => {
		let done = 0,
			pending = 0,
			retryable = 0;
		for (const i of items) {
			if (i.status === 'done') {
				done++;
				retryable++;
			}
			if (i.status === 'pending') pending++;
			if (i.status === 'error') {
				pending++;
				retryable++;
			}
		}
		return { doneCount: done, pendingCount: pending, retryableCount: retryable };
	}, [items]);

	// Stable source dimensions from selected item (for controls sidebar)
	const [selectedVisualIdx, setSelectedVisualIdx] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);

	// Per-image visual editor view state (zoom, pan, frame offset) persists across modal/image switches
	const [viewStateCache] = useState<ViewStateCache>(() => new Map());

	const itemsRef = useRef(items);
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);

	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// Derive clamped index directly — never sync back to state (avoids cascading renders)
	const clampedIdx = hasItems ? Math.min(selectedVisualIdx, items.length - 1) : 0;
	const currentItem = items[clampedIdx];
	const currentItemId = currentItem?.id;
	const currentItemOriginalWidth = currentItem?.originalWidth || 0;

	const sourceWidth = currentItem?.originalWidth || 0;
	const sourceHeight = currentItem?.originalHeight || 0;

	// ── Auto-persist per-image dims when viewing in visual resizer ──────
	// Ensures "what you see in the visual resizer = what Resize All uses"
	// Without this, images only get perImageDims when the user explicitly drags.
	// If the user views an image (sees its output dimensions) but doesn't drag,
	// the displayed dimensions must still be saved so Resize All respects them.
	useEffect(() => {
		if (!modalOpen) return;
		const item = itemsRef.current[clampedIdx];
		if (!item || item.originalWidth === 0) return;
		if (perImageDims.has(item.id)) return; // already set by user drag
		const { width, height } = getOutputDimensions(item);
		if (width > 0 && height > 0) {
			setPerImageDims(item.id, width, height);
		}
	}, [
		modalOpen,
		clampedIdx,
		currentItemId,
		currentItemOriginalWidth,
		perImageDims,
		getOutputDimensions,
		setPerImageDims,
	]);

	// When switching images, restore per-image dimensions into the global config sidebar
	const handleSelectImage = useCallback(
		(idx: number) => {
			setSelectedVisualIdx(idx);
			const item = items[idx];
			if (!item) return;
			const dims = perImageDims.get(item.id);
			if (dims) {
				setConfig({
					...configRef.current,
					method: 'dimensions' as const,
					width: dims.width,
					height: dims.height,
				});
			}
		},
		[items, setConfig, perImageDims],
	);

	const handleVisualResize = useCallback(
		(width: number, height: number, cropX: number, cropY: number) => {
			setConfig({ ...configRef.current, method: 'dimensions' as const, width, height });
			// Persist per-image dimensions + crop so switching images preserves adjustments
			const item = itemsRef.current[clampedIdx];
			if (item) setPerImageDims(item.id, width, height, cropX, cropY);
		},
		[setConfig, clampedIdx, setPerImageDims],
	);

	// When user changes config from the sidebar (presets, method, etc.),
	// clear all per-image overrides so the new config takes effect.
	const handleSidebarConfigChange = useCallback(
		(newConfig: typeof config) => {
			setConfig(newConfig);
			clearAllPerImageDims();
		},
		[setConfig, clearAllPerImageDims],
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<ResizerHeader />

			<main className="max-w-6xl mx-auto px-4 py-8">
				{/* Hero */}
				<HeroSection />

				{/* 3-Step Guide */}
				{!hasItems && <StepGuide />}

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
							formats={SUPPORTED_FORMATS}
						/>

						{/* Visual resize — available via Expand overlay */}
						{hasItems && sourceWidth > 0 && (
							<motion.button
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								onClick={() => setModalOpen(true)}
								className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-accent/30 hover:bg-(--bg-elevated) transition-all group"
							>
								<div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
									<svg
										className="w-4.5 h-4.5 text-accent"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
										/>
									</svg>
								</div>
								<div className="flex-1 text-left">
									<span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
										Open Visual Resizer
									</span>
									<p className="text-[10px] text-muted mt-0.5">
										Drag handles, zoom, pan &mdash; interactive resize with
										preview
									</p>
								</div>
								<svg
									className="w-4 h-4 text-muted group-hover:text-accent transition-colors"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
									/>
								</svg>
							</motion.button>
						)}

						{/* Fullscreen overlay modal */}
						<VisualResizerModal
							open={modalOpen}
							onClose={() => setModalOpen(false)}
							items={items}
							selectedIndex={clampedIdx}
							onSelectIndex={handleSelectImage}
							config={config}
							onResize={handleVisualResize}
							disabled={isProcessing}
							perImageDims={perImageDims}
							viewStateCache={viewStateCache}
						/>

						{hasItems && (
							<>
								{/* Action bar */}
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										{pendingCount > 0 && (
											<button
												onClick={resizeAll}
												disabled={isProcessing}
												className="btn-primary text-sm px-4 py-2"
											>
												{isProcessing ? (
													<span className="flex items-center gap-2">
														<svg
															className="w-4 h-4 animate-spin"
															fill="none"
															viewBox="0 0 24 24"
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
														Resizing...
													</span>
												) : (
													`Resize All (${pendingCount})`
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
										className="text-sm text-muted hover:text-red-400 transition-colors disabled:opacity-50"
									>
										Clear All
									</button>
								</div>

								<ResizeResults
									items={items}
									onRemove={removeItem}
									onDownload={downloadOne}
									onResize={resizeOne}
									onRetry={retryOne}
									onCancel={cancelOne}
									getOutputDimensions={getOutputDimensions}
								/>

								{/* Resize Summary Stats */}
								{stats.doneCount > 0 && (
									<ResizeSummary stats={stats} totalCount={items.length} />
								)}
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
								<h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-accent"
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
									Resize Settings
								</h2>
								<ResizeControls
									config={config}
									onChange={handleSidebarConfigChange}
									disabled={isProcessing}
									sourceWidth={sourceWidth}
									sourceHeight={sourceHeight}
								/>
							</div>
						</motion.div>
					)}
				</div>
			</main>
		</div>
	);
}

// ── Extracted memoized sub-components ─────────────────────────────────────

const HeroSection = memo(function HeroSection() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="text-center mb-8"
		>
			<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-(--accent)/5 mb-4">
				<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
				<span className="text-xs text-accent font-medium">
					Social Presets · Batch Resize · High Quality
				</span>
			</div>
			<h1 className="text-3xl sm:text-4xl font-bold mb-2">
				<span className="text-gradient">Image Resizer</span>
			</h1>
			<p className="text-muted text-sm max-w-md mx-auto">
				Resize images to exact dimensions, percentages, or social media presets. Everything
				runs locally — your images never leave your device.
			</p>
		</motion.div>
	);
});

const StepGuide = memo(function StepGuide() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.2 }}
			className="flex items-center justify-center gap-4 mb-8"
		>
			{STEPS.map((s, i) => (
				<div key={s.step} className="flex items-center gap-4">
					<div className="flex flex-col items-center gap-1.5">
						<div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
							<svg
								className="w-5 h-5 text-accent"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
							</svg>
						</div>
						<span className="text-xs text-muted">{s.label}</span>
					</div>
					{i < 2 && (
						<svg
							className="w-4 h-4 text-white/10 -mt-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					)}
				</div>
			))}
		</motion.div>
	);
});

interface ResizeSummaryProps {
	stats: {
		totalOriginal: number;
		totalResized: number;
		doneCount: number;
		formattedOriginal: string;
		formattedResized: string;
	};
	totalCount: number;
}

const ResizeSummary = memo(function ResizeSummary({ stats, totalCount }: ResizeSummaryProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="glass rounded-xl p-4"
		>
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm font-medium text-foreground">Resize Summary</span>
				<span className="text-xs text-muted">
					{stats.doneCount}/{totalCount} processed
				</span>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div>
					<p className="text-xs text-muted mb-0.5">Original</p>
					<p className="text-sm font-mono text-foreground">{stats.formattedOriginal}</p>
				</div>
				<div>
					<p className="text-xs text-muted mb-0.5">Resized</p>
					<p className="text-sm font-mono text-foreground">{stats.formattedResized}</p>
				</div>
				<div>
					<p className="text-xs text-muted mb-0.5">Difference</p>
					<p
						className={`text-sm font-mono ${stats.totalResized <= stats.totalOriginal ? 'text-green-400' : 'text-amber-400'}`}
					>
						{stats.totalResized <= stats.totalOriginal ? '-' : '+'}
						{formatBytes(Math.abs(stats.totalOriginal - stats.totalResized))}
					</p>
				</div>
			</div>

			{stats.doneCount > 0 && (
				<div className="mt-3 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
					<motion.div
						className="h-full rounded-full bg-linear-to-r from-accent to-green-400"
						initial={{ width: 0 }}
						animate={{ width: `${(stats.doneCount / totalCount) * 100}%` }}
						transition={{ duration: 0.5 }}
					/>
				</div>
			)}
		</motion.div>
	);
});
