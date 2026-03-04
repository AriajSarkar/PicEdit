'use client';
/* eslint-disable @next/next/no-img-element */

import { memo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { TracerItem } from '@/img-converter/types';
import { formatBytes } from '@/lib/imageUtils';

interface TracerResultsProps {
	items: TracerItem[];
	onRemove: (id: string) => void;
	onDownload: (id: string) => void;
	onTrace: (id: string) => void;
	onRetry: (id: string) => void;
	onCancel: (id: string) => void;
}

const MAX_VISIBLE = 8;
const ITEM_HEIGHT = 80;
const ITEM_GAP = 8;

export const TracerResults = memo(function TracerResults({
	items,
	onRemove,
	onDownload,
	onTrace,
	onRetry,
	onCancel,
}: TracerResultsProps) {
	if (items.length === 0) return null;

	const needsScroll = items.length > MAX_VISIBLE;
	const containerMaxHeight = MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * ITEM_GAP;

	const doneCount = items.filter((i) => i.status === 'done').length;
	const processingCount = items.filter((i) => i.status === 'processing').length;
	const errorCount = items.filter((i) => i.status === 'error').length;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted uppercase tracking-wider">
					Images ({items.length})
				</h3>
				<div className="flex items-center gap-2">
					{processingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
							<span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
							{processingCount} tracing
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

			<div
				className={needsScroll ? 'overflow-y-auto pr-1 custom-scrollbar' : ''}
				style={needsScroll ? { maxHeight: containerMaxHeight } : undefined}
			>
				<div className="space-y-2">
					<AnimatePresence initial={false}>
						{items.map((item) => (
							<TracerRow
								key={item.id}
								item={item}
								onRemove={onRemove}
								onDownload={onDownload}
								onTrace={onTrace}
								onRetry={onRetry}
								onCancel={onCancel}
							/>
						))}
					</AnimatePresence>
				</div>
			</div>

			{needsScroll && (
				<div className="flex items-center justify-center gap-1.5 text-xs text-muted">
					<svg
						className="w-3.5 h-3.5 animate-bounce"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						aria-hidden="true"
						focusable={false}
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
					Scroll to see {items.length - MAX_VISIBLE} more
				</div>
			)}
		</div>
	);
});

// ── Row component ───────────────────────────────────────────────────────────

const TracerRow = memo(function TracerRow({
	item,
	onRemove,
	onDownload,
	onTrace,
	onRetry,
	onCancel,
}: {
	item: TracerItem;
	onRemove: (id: string) => void;
	onDownload: (id: string) => void;
	onTrace: (id: string) => void;
	onRetry: (id: string) => void;
	onCancel: (id: string) => void;
}) {
	const thumbnailSrc = item.thumbnail || item.preview;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
			className="glass rounded-xl px-3 py-2.5 group"
			style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }}
		>
			<div className="flex items-center gap-3">
				{/* Source thumbnail */}
				<div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-(--bg-elevated) border border-border">
					<img
						src={thumbnailSrc}
						alt={item.file.name}
						className="w-full h-full object-cover"
						loading="lazy"
						decoding="async"
					/>
				</div>

				{/* Arrow */}
				<svg
					className="w-4 h-4 shrink-0 text-(--muted)"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
					aria-hidden="true"
					focusable={false}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
				</svg>

				{/* SVG preview or status */}
				<div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-(--bg-elevated) border border-border flex items-center justify-center">
					{item.status === 'done' && item.result ? (
						<img
							src={item.result.url}
							alt={`${item.file.name} traced`}
							className="w-full h-full object-contain bg-white"
							loading="lazy"
							decoding="async"
						/>
					) : item.status === 'processing' ? (
						<svg
							className="w-5 h-5 text-accent animate-spin"
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
					) : item.status === 'error' ? (
						<svg
							className="w-5 h-5 text-red-400"
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
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
							/>
						</svg>
					) : (
						<span className="text-xs text-(--muted) font-mono">SVG</span>
					)}
				</div>

				{/* Info */}
				<div className="min-w-0 flex-1">
					<p className="text-sm text-foreground truncate">{item.file.name}</p>
					<div className="flex items-center gap-2 mt-0.5">
						{item.status === 'done' && item.result ? (
							<>
								<span className="text-xs text-(--muted)">
									{formatBytes(item.result.originalSize)}
								</span>
								<span className="text-xs text-(--muted)">→</span>
								<span className="text-xs text-accent font-medium">
									{formatBytes(item.result.svgSize)}
								</span>
								<span className="text-[10px] text-(--muted)">
									{item.result.durationMs}ms
								</span>
							</>
						) : item.status === 'processing' ? (
							<>
								<span className="text-xs text-accent">{item.stage || 'Starting...'}</span>
								{item.progress > 0 && (
									<span className="text-xs text-(--muted) font-mono">
										{item.progress}%
									</span>
								)}
							</>
						) : item.status === 'error' ? (
							<span className="text-xs text-red-400 truncate">
								{item.error || 'Failed'}
							</span>
						) : (
							<span className="text-xs text-(--muted)">
								{formatBytes(item.file.size)} · {item.originalWidth}×{item.originalHeight}
							</span>
						)}
					</div>
				</div>

				{/* Progress bar for processing items */}
				{item.status === 'processing' && item.progress > 0 && (
					<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--bg-elevated) rounded-b-xl overflow-hidden">
						<div
							className="h-full bg-accent transition-all duration-300"
							style={{ width: `${item.progress}%` }}
						/>
					</div>
				)}

				{/* Actions */}
				<div className="flex items-center gap-1 shrink-0">
					{item.status === 'pending' && (
						<button
							type="button"
							aria-label={`Trace ${item.file.name}`}
							onClick={() => onTrace(item.id)}
							className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors"
							title="Trace to SVG"
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
									d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
								/>
							</svg>
						</button>
					)}

					{item.status === 'processing' && (
						<button
							type="button"
							aria-label={`Cancel ${item.file.name}`}
							onClick={() => onCancel(item.id)}
							className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
							title="Cancel"
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
								<circle cx="12" cy="12" r="9" />
								<rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" />
							</svg>
						</button>
					)}

					{item.status === 'done' && (
						<>
							<button
								type="button"
								aria-label={`Re-trace ${item.file.name}`}
								onClick={() => onRetry(item.id)}
								className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
								title="Re-trace with current settings"
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
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</button>
							<button
								type="button"
								aria-label={`Download ${item.file.name}`}
								onClick={() => onDownload(item.id)}
								className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors"
								title="Download SVG"
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
							onClick={() => onRetry(item.id)}
							className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
							title="Retry"
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
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						</button>
					)}

					<button
						type="button"
						aria-label={`Remove ${item.file.name}`}
						onClick={() => onRemove(item.id)}
						className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
						title="Remove"
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>
		</motion.div>
	);
});
