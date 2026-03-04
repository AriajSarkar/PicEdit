'use client';

import { memo } from 'react';
import { AnimatePresence } from 'motion/react';
import type { CompressionItem } from '@/imgcompressor/hooks/useCompression';
import type { ResizeItem } from '@/img-resizer/types';
import type { ConversionItem } from '@/img-converter/hooks/useConversion';
import { ScrollContainer, MAX_VISIBLE, ITEM_HEIGHT, ITEM_GAP } from './ScrollContainer';
import { ResultRow } from './ResultRow';

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

type ConvertProps = {
	mode: 'convert';
	items: ConversionItem[];
	onRemove: (id: string) => void;
	onDownload: (id: string) => void;
	onConvert: (id: string) => void;
	onRetry: (id: string) => void;
	onCancel: (id: string) => void;
};

export type GlobalCompressionResultsProps = CompressProps | ResizeProps | ConvertProps;

export const ComparisonResults = memo(function ComparisonResults(
	props: GlobalCompressionResultsProps,
) {
	const { items } = props;
	if (items.length === 0) return null;

	const needsScroll = items.length > MAX_VISIBLE;
	const containerMaxHeight = MAX_VISIBLE * ITEM_HEIGHT + (MAX_VISIBLE - 1) * ITEM_GAP;

	const { doneCount, processingCount, errorCount } = items.reduce(
		(acc, item) => {
			if (item.status === 'done') acc.doneCount += 1;
			else if (item.status === 'processing') acc.processingCount += 1;
			else if (item.status === 'error') acc.errorCount += 1;
			return acc;
		},
		{ doneCount: 0, processingCount: 0, errorCount: 0 },
	);

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
							{processingCount} {props.mode === 'resize' ? 'resizing' : props.mode === 'convert' ? 'converting' : 'processing'}
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
				<div className="flex items-center justify-center gap-1.5 text-xs text-muted">
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
