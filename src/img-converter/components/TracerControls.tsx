'use client';

import { memo, useState } from 'react';
import type { TracerConfig, TracerPreset, ColorMode, Hierarchical } from '@/img-converter/types';
import { TRACER_PRESETS } from '@/img-converter/types';

interface TracerControlsProps {
	config: TracerConfig;
	onChange: (config: TracerConfig) => void;
	disabled?: boolean;
}

const PRESET_INFO: { key: TracerPreset; label: string; desc: string }[] = [
	{ key: 'photo', label: 'Photo', desc: 'Rich detail, many colors' },
	{ key: 'poster', label: 'Poster', desc: 'Bold shapes, fewer colors' },
	{ key: 'bw', label: 'B&W', desc: 'Black & white silhouette' },
	{ key: 'custom', label: 'Custom', desc: 'Tune all parameters' },
];

interface SliderDef {
	key: keyof TracerConfig;
	label: string;
	min: number;
	max: number;
	step: number;
	unit?: string;
	desc?: string;
}

const SLIDERS: SliderDef[] = [
	{
		key: 'filterSpeckle',
		label: 'Filter Speckle',
		min: 0,
		max: 128,
		step: 1,
		unit: 'px²',
		desc: 'Remove noise areas smaller than this',
	},
	{
		key: 'colorPrecision',
		label: 'Color Precision',
		min: 1,
		max: 8,
		step: 1,
		desc: 'Higher = more colors extracted',
	},
	{
		key: 'layerDifference',
		label: 'Layer Difference',
		min: 0,
		max: 128,
		step: 1,
		desc: 'Minimum color gap between layers',
	},
	{
		key: 'cornerThreshold',
		label: 'Corner Threshold',
		min: 0,
		max: 180,
		step: 1,
		unit: '°',
		desc: 'Angle sharpness for corners',
	},
	{
		key: 'lengthThreshold',
		label: 'Length Threshold',
		min: 0,
		max: 30,
		step: 0.5,
		desc: 'Minimum path segment length',
	},
	{
		key: 'spliceThreshold',
		label: 'Splice Threshold',
		min: 0,
		max: 180,
		step: 1,
		unit: '°',
		desc: 'Angle threshold for splicing paths',
	},
	{
		key: 'maxIterations',
		label: 'Max Iterations',
		min: 1,
		max: 30,
		step: 1,
		desc: 'Optimization passes for smoother paths',
	},
	{
		key: 'pathPrecision',
		label: 'Path Precision',
		min: 0,
		max: 8,
		step: 1,
		desc: 'SVG coordinate decimal places',
	},
];

export const TracerControls = memo(function TracerControls({
	config,
	onChange,
	disabled,
}: TracerControlsProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);

	const update = (patch: Partial<TracerConfig>) => {
		const next = { ...config, ...patch };
		// Auto-switch to custom when parameters differ from current preset
		if (next.preset !== 'custom') {
			const presetVals = TRACER_PRESETS[next.preset as Exclude<TracerPreset, 'custom'>];
			if (presetVals) {
				const isMatch = (Object.keys(patch) as (keyof TracerConfig)[]).every(
					(k) => k === 'preset' || next[k] === presetVals[k],
				);
				if (!isMatch) next.preset = 'custom';
			}
		}
		onChange(next);
	};

	const applyPreset = (key: TracerPreset) => {
		if (key === 'custom') {
			onChange({ ...config, preset: 'custom' });
		} else {
			onChange({ ...TRACER_PRESETS[key] });
		}
	};

	// Show advanced sliders when preset is custom or user toggles
	const showSliders = config.preset === 'custom' || showAdvanced;

	return (
		<div className="space-y-5">
			{/* Preset selector */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-2">
					Tracing Preset
				</label>
				<div className="grid grid-cols-2 gap-2">
					{PRESET_INFO.map((p) => (
						<button
							key={p.key}
							onClick={() => applyPreset(p.key)}
							disabled={disabled}
							className={`
								py-2.5 px-3 rounded-lg text-sm font-medium transition-all text-left
								${
									config.preset === p.key
										? 'bg-accent text-white shadow-lg shadow-(--accent)/25'
										: 'bg-(--bg-elevated) text-(--muted) hover:text-foreground border border-border'
								}
								disabled:opacity-50
							`}
						>
							<span className="block">{p.label}</span>
							<span
								className={`block text-[10px] mt-0.5 ${
									config.preset === p.key ? 'text-white/70' : 'text-(--muted)'
								}`}
							>
								{p.desc}
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Color Mode */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-2">
					Color Mode
				</label>
				<div className="grid grid-cols-2 gap-2">
					{[
						{ key: 'color' as ColorMode, label: 'Color', icon: '🎨' },
						{ key: 'binary' as ColorMode, label: 'B&W', icon: '◑' },
					].map((m) => (
						<button
							key={m.key}
							onClick={() => update({ colorMode: m.key })}
							disabled={disabled}
							className={`
								py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2
								${
									config.colorMode === m.key
										? 'bg-accent/15 text-accent border border-accent/30'
										: 'bg-(--bg-elevated) text-(--muted) hover:text-foreground border border-border'
								}
								disabled:opacity-50
							`}
						>
							<span>{m.icon}</span>
							{m.label}
						</button>
					))}
				</div>
			</div>

			{/* Hierarchical Mode */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-2">
					Layer Mode
				</label>
				<div className="grid grid-cols-2 gap-2">
					{[
						{
							key: 'stacked' as Hierarchical,
							label: 'Stacked',
							desc: 'Bottom-up layers',
						},
						{
							key: 'cutout' as Hierarchical,
							label: 'Cutout',
							desc: 'Overlapping shapes',
						},
					].map((h) => (
						<button
							key={h.key}
							onClick={() => update({ hierarchical: h.key })}
							disabled={disabled}
							className={`
								py-2 px-3 rounded-lg text-sm font-medium transition-all text-left
								${
									config.hierarchical === h.key
										? 'bg-accent/15 text-accent border border-accent/30'
										: 'bg-(--bg-elevated) text-(--muted) hover:text-foreground border border-border'
								}
								disabled:opacity-50
							`}
						>
							<span className="block">{h.label}</span>
							<span
								className={`block text-[10px] mt-0.5 ${
									config.hierarchical === h.key
										? 'text-accent/60'
										: 'text-(--muted)'
								}`}
							>
								{h.desc}
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Advanced toggle */}
			{config.preset !== 'custom' && (
				<button
					type="button"
					onClick={() => setShowAdvanced((v) => !v)}
					className="flex items-center gap-1.5 text-xs text-(--muted) hover:text-accent transition-colors w-full"
				>
					<svg
						className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
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
							d="M9 5l7 7-7 7"
						/>
					</svg>
					{showAdvanced ? 'Hide' : 'Show'} advanced parameters
				</button>
			)}

			{/* Parameter sliders */}
			{showSliders && (
				<div className="space-y-4 pt-1">
					{SLIDERS.map((s) => {
						const val = config[s.key] as number;
						return (
							<div key={s.key}>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-xs font-medium text-foreground">
										{s.label}
									</label>
									<span className="text-xs text-accent font-mono tabular-nums">
										{val}
										{s.unit || ''}
									</span>
								</div>
								<input
									type="range"
									min={s.min}
									max={s.max}
									step={s.step}
									value={val}
									onChange={(e) =>
										update({
											[s.key]: Number(e.target.value),
										} as unknown as Partial<TracerConfig>)
									}
									disabled={disabled}
									className="w-full accent-accent"
								/>
								{s.desc && (
									<p className="text-[10px] text-(--muted) mt-0.5">
										{s.desc}
									</p>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Info note */}
			<div className="rounded-lg bg-(--bg-elevated) border border-border p-3">
				<p className="text-[11px] text-(--muted) leading-relaxed">
					<span className="text-accent font-medium">SVG Tracer</span> — Converts
					raster images (JPEG, PNG, WebP, etc.) into scalable vector graphics using{' '}
					<span className="font-mono text-[10px]">vtracer</span> (Rust WASM). Output
					SVGs are resolution-independent and infinitely scalable.
				</p>
			</div>
		</div>
	);
});
