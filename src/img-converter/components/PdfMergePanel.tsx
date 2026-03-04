'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ConversionItem } from '@/img-converter/hooks/useConversion';

interface PdfMergePanelProps {
	items: ConversionItem[];
	isBuildingPdf: boolean;
	pdfProgress: { stage: string; percent: number } | null;
	onMerge: (selectedIds: string[]) => void;
}

export const PdfMergePanel = memo(function PdfMergePanel({
	items,
	isBuildingPdf,
	pdfProgress,
	onMerge,
}: PdfMergePanelProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));

	// Sync selected IDs when items change (add new items automatically)
	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const validSelected = useMemo(
		() => new Set([...selectedIds].filter((id) => itemIds.has(id))),
		[selectedIds, itemIds],
	);

	const toggleItem = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const selectAll = useCallback(() => {
		setSelectedIds(new Set(items.map((i) => i.id)));
	}, [items]);

	const deselectAll = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const handleMerge = useCallback(() => {
		const ids = [...validSelected];
		if (ids.length < 1) return;
		onMerge(ids);
	}, [validSelected, onMerge]);

	const selectedCount = validSelected.size;
	const allSelected = selectedCount === items.length;

	if (items.length < 2) return null;

	return (
		<div className="relative">
			{/* Toggle button */}
			<button
				onClick={() => {
					if (!isOpen) {
						// Auto-select all when opening
						setSelectedIds(new Set(items.map((i) => i.id)));
					}
					setIsOpen(!isOpen);
				}}
				disabled={isBuildingPdf}
				className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
				title="Select images and merge into a multi-page PDF"
			>
				{isBuildingPdf ? (
					<span className="flex items-center gap-2">
						<svg
							className="w-3.5 h-3.5 animate-spin"
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
						{pdfProgress?.stage || 'Building PDF...'}
					</span>
				) : (
					<span className="flex items-center gap-1.5">
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
								d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2h-2z"
							/>
						</svg>
						Merge to PDF
					</span>
				)}
			</button>

			{/* Selection panel */}
			<AnimatePresence>
				{isOpen && !isBuildingPdf && (
					<motion.div
						initial={{ opacity: 0, y: 8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className="absolute left-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-(--bg-elevated) shadow-2xl"
					>
						{/* Header */}
						<div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
							<span className="text-xs font-medium text-(--text-secondary)">
								Select images for PDF
							</span>
							<div className="flex items-center gap-2">
								<button
									onClick={allSelected ? deselectAll : selectAll}
									className="text-[11px] text-accent hover:text-accent-hover transition-colors"
								>
									{allSelected ? 'Deselect All' : 'Select All'}
								</button>
								<button
									onClick={() => setIsOpen(false)}
									className="text-muted hover:text-foreground transition-colors"
									aria-label="Close"
								>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Image list */}
						<div className="max-h-60 overflow-y-auto p-2 space-y-1 scrollbar-thin">
							{items.map((item, index) => {
								const isChecked = validSelected.has(item.id);
								return (
									<button
										key={item.id}
										onClick={() => toggleItem(item.id)}
										className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
											isChecked
												? 'bg-(--accent-soft) border border-accent/30'
												: 'hover:bg-surface-hover border border-transparent'
										}`}
									>
										{/* Checkbox */}
										<div
											className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
												isChecked
													? 'bg-accent border-accent'
													: 'border-(--border-light) bg-surface'
											}`}
										>
											{isChecked && (
												<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											)}
										</div>

										{/* Thumbnail */}
										<div className="w-8 h-8 rounded overflow-hidden bg-surface shrink-0">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={item.thumbnail}
												alt=""
												className="w-full h-full object-cover"
											/>
										</div>

										{/* File info */}
										<div className="flex-1 min-w-0 text-left">
											<p className="text-xs text-foreground truncate">
												{item.file.name}
											</p>
											<p className="text-[10px] text-muted">
												Page {index + 1}
											</p>
										</div>
									</button>
								);
							})}
						</div>

						{/* Footer */}
						<div className="px-4 py-3 border-t border-border flex items-center justify-between">
							<span className="text-[11px] text-muted">
								{selectedCount} of {items.length} selected
							</span>
							<button
								onClick={handleMerge}
								disabled={selectedCount < 1}
								className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
							>
								Create PDF ({selectedCount})
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Click-outside overlay */}
			{isOpen && !isBuildingPdf && (
				<div
					className="fixed inset-0 z-40"
					onClick={() => setIsOpen(false)}
					aria-hidden="true"
				/>
			)}
		</div>
	);
});
