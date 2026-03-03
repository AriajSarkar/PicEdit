'use client';

import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ResizerConfig, ResizeMethod, ResizeFit } from '@/img-resizer/types';
import { RESIZE_PRESETS } from '@/img-resizer/types';

interface ResizeControlsProps {
	config: ResizerConfig;
	onChange: (config: ResizerConfig) => void;
	disabled?: boolean;
	/** Source image dimensions for aspect-ratio calculations */
	sourceWidth?: number;
	sourceHeight?: number;
}

const METHOD_TABS: { id: ResizeMethod; label: string; icon: string }[] = [
	{
		id: 'dimensions',
		label: 'Dimensions',
		icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
	},
	{
		id: 'percentage',
		label: 'Percentage',
		icon: 'M9 14l2-2m4-4l2-2M9 8a1 1 0 11-2 0 1 1 0 012 0zm8 8a1 1 0 11-2 0 1 1 0 012 0z',
	},
	{
		id: 'preset',
		label: 'Presets',
		icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z',
	},
];

const FIT_OPTIONS: { id: ResizeFit; label: string; desc: string }[] = [
	{ id: 'contain', label: 'Contain', desc: 'Fit inside' },
	{ id: 'cover', label: 'Cover', desc: 'Fill & crop' },
	{ id: 'stretch', label: 'Stretch', desc: 'Exact size' },
];

const QUICK_PERCENTS = [25, 50, 75, 100, 150, 200];

export const ResizeControls = memo(function ResizeControls({
	config,
	onChange,
	disabled = false,
	sourceWidth = 0,
	sourceHeight = 0,
}: ResizeControlsProps) {
	const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

	// Refs for stable callbacks — avoids re-creating handlers on every config change
	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const sourceRef = useRef({ sourceWidth, sourceHeight });
	useEffect(() => {
		sourceRef.current = { sourceWidth, sourceHeight };
	}, [sourceWidth, sourceHeight]);

	const update = useCallback((partial: Partial<ResizerConfig>) => {
		onChangeRef.current({ ...configRef.current, ...partial });
	}, []);

	// Group presets by category
	const presetCategories = useMemo(() => {
		const cats = new Map<string, typeof RESIZE_PRESETS>();
		RESIZE_PRESETS.forEach((p) => {
			const list = cats.get(p.category) || [];
			list.push(p);
			cats.set(p.category, list);
		});
		return Array.from(cats.entries());
	}, []);

	// Calculate locked dimension when aspect ratio is locked
	const handleWidthChange = useCallback(
		(w: number) => {
			const { sourceWidth: sw, sourceHeight: sh } = sourceRef.current;
			if (configRef.current.lockAspectRatio && sw > 0 && sh > 0) {
				const ratio = sh / sw;
				update({ width: w, height: Math.max(1, Math.round(w * ratio)) });
			} else {
				update({ width: w });
			}
		},
		[update],
	);

	const handleHeightChange = useCallback(
		(h: number) => {
			const { sourceWidth: sw, sourceHeight: sh } = sourceRef.current;
			if (configRef.current.lockAspectRatio && sw > 0 && sh > 0) {
				const ratio = sw / sh;
				update({ height: h, width: Math.max(1, Math.round(h * ratio)) });
			} else {
				update({ height: h });
			}
		},
		[update],
	);

	return (
		<div className="space-y-5">
			{/* Method Tabs */}
			<div className="space-y-2">
				<label className="text-xs font-medium text-muted uppercase tracking-wider">
					Resize Method
				</label>
				<div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-background">
					{METHOD_TABS.map((tab) => (
						<button
							key={tab.id}
							onClick={() => update({ method: tab.id })}
							disabled={disabled}
							className={`relative px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
								config.method === tab.id
									? 'text-foreground'
									: 'text-muted hover:text-foreground'
							} disabled:opacity-50`}
						>
							{config.method === tab.id && (
								<motion.div
									layoutId="method-tab"
									className="absolute inset-0 bg-(--bg-elevated) rounded-lg border border-border"
									transition={{ type: 'spring', stiffness: 400, damping: 30 }}
								/>
							)}
							<svg
								className="w-3.5 h-3.5 relative z-10"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
							</svg>
							<span className="relative z-10">{tab.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Dimensions Panel */}
			<AnimatePresence mode="wait">
				{config.method === 'dimensions' && (
					<motion.div
						key="dimensions"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
						className="space-y-3"
					>
						<div className="flex items-end gap-2">
							{/* Width */}
							<div className="flex-1 space-y-1">
								<label className="text-xs text-muted">Width (px)</label>
								<input
									type="number"
									value={config.width}
									onChange={(e) =>
										handleWidthChange(
											Math.max(1, parseInt(e.target.value) || 1),
										)
									}
									disabled={disabled}
									min={1}
									max={16384}
									className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 font-mono"
								/>
							</div>

							{/* Aspect ratio lock toggle */}
							<button
								onClick={() => update({ lockAspectRatio: !config.lockAspectRatio })}
								disabled={disabled}
								className={`p-2.5 rounded-lg border transition-all mb-px ${
									config.lockAspectRatio
										? 'bg-(--accent)/10 border-accent/30 text-accent'
										: 'bg-background border-border text-muted'
								} hover:bg-(--accent)/15 disabled:opacity-50`}
								title={
									config.lockAspectRatio
										? 'Aspect ratio locked'
										: 'Aspect ratio unlocked'
								}
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									{config.lockAspectRatio ? (
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
										/>
									) : (
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
										/>
									)}
								</svg>
							</button>

							{/* Height */}
							<div className="flex-1 space-y-1">
								<label className="text-xs text-muted">Height (px)</label>
								<input
									type="number"
									value={config.height}
									onChange={(e) =>
										handleHeightChange(
											Math.max(1, parseInt(e.target.value) || 1),
										)
									}
									disabled={disabled}
									min={1}
									max={16384}
									className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 font-mono"
								/>
							</div>
						</div>

						{/* Fit mode */}
						<div className="space-y-1.5">
							<label className="text-xs text-muted">Fit Mode</label>
							<div className="grid grid-cols-3 gap-1.5">
								{FIT_OPTIONS.map((opt) => (
									<button
										key={opt.id}
										onClick={() => update({ fit: opt.id })}
										disabled={disabled}
										className={`px-2 py-2 rounded-lg text-xs transition-all border ${
											config.fit === opt.id
												? 'bg-(--accent)/10 border-accent/30 text-accent'
												: 'bg-background border-border text-muted hover:text-foreground'
										} disabled:opacity-50`}
									>
										<div className="font-medium">{opt.label}</div>
										<div className="text-[10px] opacity-70 mt-0.5">
											{opt.desc}
										</div>
									</button>
								))}
							</div>
						</div>
					</motion.div>
				)}

				{/* Percentage Panel */}
				{config.method === 'percentage' && (
					<motion.div
						key="percentage"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
						className="space-y-3"
					>
						{/* Quick select buttons */}
						<div className="grid grid-cols-3 gap-1.5">
							{QUICK_PERCENTS.map((p) => (
								<button
									key={p}
									onClick={() => update({ percentage: p })}
									disabled={disabled}
									className={`px-2 py-2 rounded-lg text-xs font-mono font-medium transition-all border ${
										config.percentage === p
											? 'bg-(--accent)/10 border-accent/30 text-accent'
											: 'bg-background border-border text-muted hover:text-foreground'
									} disabled:opacity-50`}
								>
									{p}%
								</button>
							))}
						</div>

						{/* Custom slider */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<label className="text-xs text-muted">Custom</label>
								<span className="text-xs font-mono text-accent">
									{config.percentage}%
								</span>
							</div>
							<input
								type="range"
								min={1}
								max={500}
								value={config.percentage}
								onChange={(e) => update({ percentage: parseInt(e.target.value) })}
								disabled={disabled}
								className="w-full"
							/>
							<div className="flex justify-between text-[10px] text-muted">
								<span>1%</span>
								<span>500%</span>
							</div>
						</div>
					</motion.div>
				)}

				{/* Presets Panel */}
				{config.method === 'preset' && (
					<motion.div
						key="preset"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
						className="space-y-2 max-h-80 overflow-y-auto pr-1"
					>
						{presetCategories.map(([category, presets]) => (
							<div key={category}>
								<button
									onClick={() =>
										setExpandedCategory(
											expandedCategory === category ? null : category,
										)
									}
									className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background hover:bg-surface-hover transition-colors"
								>
									<span className="text-xs font-medium text-foreground">
										{category}
									</span>
									<svg
										className={`w-3.5 h-3.5 text-muted transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>

								<AnimatePresence>
									{expandedCategory === category && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.15 }}
											className="overflow-hidden"
										>
											<div className="grid grid-cols-2 gap-1 pt-1 pl-1">
												{presets.map((preset) => (
													<button
														key={preset.id}
														onClick={() =>
															update({ presetId: preset.id })
														}
														disabled={disabled}
														className={`px-2.5 py-2 rounded-lg text-left transition-all border ${
															config.presetId === preset.id
																? 'bg-(--accent)/10 border-accent/30'
																: 'bg-(--bg-elevated) border-transparent hover:border-border'
														} disabled:opacity-50`}
													>
														<div
															className={`text-xs font-medium ${config.presetId === preset.id ? 'text-accent' : 'text-foreground'}`}
														>
															{preset.label}
														</div>
														<div className="text-[10px] text-muted font-mono mt-0.5">
															{preset.width}×{preset.height}
														</div>
													</button>
												))}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						))}

						{/* Fit mode for presets */}
						<div className="space-y-1.5 pt-2 border-t border-border">
							<label className="text-xs text-muted">Fit Mode</label>
							<div className="grid grid-cols-3 gap-1.5">
								{FIT_OPTIONS.map((opt) => (
									<button
										key={opt.id}
										onClick={() => update({ fit: opt.id })}
										disabled={disabled}
										className={`px-2 py-1.5 rounded-lg text-xs transition-all border ${
											config.fit === opt.id
												? 'bg-(--accent)/10 border-accent/30 text-accent'
												: 'bg-background border-border text-muted hover:text-foreground'
										} disabled:opacity-50`}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Divider */}
			<div className="border-t border-border" />

			{/* Output Format */}
			<div className="space-y-1.5">
				<label className="text-xs font-medium text-muted uppercase tracking-wider">
					Output Format
				</label>
				<select
					value={config.outputFormat}
					onChange={(e) =>
						update({ outputFormat: e.target.value as ResizerConfig['outputFormat'] })
					}
					disabled={disabled}
					className="w-full"
				>
					<option value="preserve">Same as original</option>
					<option value="jpeg">JPEG</option>
					<option value="png">PNG</option>
					<option value="webp">WebP</option>
				</select>
			</div>

			{/* Quality (for JPEG/WebP) */}
			{config.outputFormat !== 'png' && (
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<label className="text-xs text-muted">Quality</label>
						<span className="text-xs font-mono text-accent">
							{Math.round(config.quality * 100)}%
						</span>
					</div>
					<input
						type="range"
						min={10}
						max={100}
						value={Math.round(config.quality * 100)}
						onChange={(e) => update({ quality: parseInt(e.target.value) / 100 })}
						disabled={disabled}
						className="w-full"
					/>
				</div>
			)}
		</div>
	);
});
