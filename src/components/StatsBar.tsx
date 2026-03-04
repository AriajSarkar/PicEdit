'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { formatBytes } from '@/lib/imageUtils';

// ── Original StatsBar (entry-based) ─────────────────────────────────────────

interface InfoEntry {
	label: string;
	value: string | number;
	/** Optional color class */
	color?: string;
}

interface StatsBarProps {
	/** Key-value pairs to display */
	entries: InfoEntry[];
	/** Progress bar (0-100, hidden if undefined) */
	progress?: number;
	/** Right-side action element */
	action?: React.ReactNode;
	/** Top-right label */
	badge?: string;
}

export const StatsBar = memo(function StatsBar({
	entries,
	progress,
	action,
	badge,
}: StatsBarProps) {
	if (entries.length === 0) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border"
		>
			<div className="flex items-center gap-4 text-xs flex-wrap">
				{entries.map((entry, i) => (
					<span key={i}>
						{i > 0 && <span className="w-px h-3 bg-white/10 inline-block mr-4" />}
						<span className={entry.color || 'text-muted'}>
							{typeof entry.value === 'number'
								? formatBytes(entry.value)
								: entry.value}
						</span>
					</span>
				))}
			</div>

			<div className="flex items-center gap-3">
				{badge && <span className="text-xs text-muted">{badge}</span>}
				{action}
			</div>

			{progress !== undefined && progress > 0 && progress < 100 && (
				<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
					<motion.div
						className="h-full bg-accent"
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
					/>
				</div>
			)}
		</motion.div>
	);
});

// ── SummaryStatsBar (column-based, glass card) ──────────────────────────────

interface StatColumn {
	/** Column header label (e.g. "Original", "Compressed") */
	label: string;
	/** Formatted value string (e.g. "1.2 MB") */
	value: string;
	/** Tailwind color class for the value text */
	color?: string;
	/** Optional suffix shown after value (e.g. "(+2.1%)") */
	suffix?: string;
	/** Tailwind color class for the suffix */
	suffixColor?: string;
}

interface SummaryStatsBarProps {
	/** Summary title (e.g. "Compression Summary") */
	title: string;
	/** Count label shown top-right (e.g. "3/5 processed") */
	countLabel: string;
	/** Stat columns to display in a grid */
	columns: StatColumn[];
	/** Progress bar — { done, total }. Hidden when done === 0. */
	progress?: { done: number; total: number };
}

export const SummaryStatsBar = memo(function SummaryStatsBar({
	title,
	countLabel,
	columns,
	progress,
}: SummaryStatsBarProps) {
	if (columns.length === 0) return null;

	const percent =
		progress && progress.total > 0
			? (progress.done / progress.total) * 100
			: 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="glass rounded-xl p-4 border-l-2 border-l-accent/40"
		>
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm font-medium text-foreground flex items-center gap-2">
					<svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
					</svg>
					{title}
				</span>
				<span className="text-xs text-muted font-mono">{countLabel}</span>
			</div>

			<div
				className="grid gap-4"
				style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
			>
				{columns.map((col, i) => (
					<div key={i}>
						<p className="text-xs text-muted mb-0.5">{col.label}</p>
						<p className={`text-sm font-mono ${col.color || 'text-foreground'}`}>
							{col.value}
							{col.suffix && (
								<span className={`${col.suffixColor || col.color || 'text-muted'} ml-1`}>
									{col.suffix}
								</span>
							)}
						</p>
					</div>
				))}
			</div>

			{progress && progress.done > 0 && (
				<div className="mt-3 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
					<motion.div
						className="h-full rounded-full bg-linear-to-r from-accent to-green-400"
						initial={{ width: 0 }}
						animate={{ width: `${percent}%` }}
						transition={{ duration: 0.5 }}
					/>
				</div>
			)}
		</motion.div>
	);
});

export type { StatsBarProps, SummaryStatsBarProps, StatColumn };
