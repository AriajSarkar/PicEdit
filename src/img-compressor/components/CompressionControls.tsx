'use client';

import { memo, useRef, useEffect, useCallback } from 'react';
import type { CompressorConfig } from '@/img-compressor/types';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { SegmentedButtons, type SegmentedOption } from '@/components/SegmentedButtons';

interface CompressionControlsProps {
	config: CompressorConfig;
	onChange: (config: CompressorConfig) => void;
	disabled?: boolean;
}

const FORMAT_OPTIONS: SegmentedOption<'jpeg' | 'png' | 'webp'>[] = [
	{ value: 'jpeg', label: 'JPEG' },
	{ value: 'png', label: 'PNG' },
	{ value: 'webp', label: 'WebP' },
];

export const CompressionControls = memo(function CompressionControls({
	config,
	onChange,
	disabled,
}: CompressionControlsProps) {
	// Ref-based stable callback — avoids re-creating update() on every config/onChange change
	const configRef = useRef(config);
	useEffect(() => { configRef.current = config; }, [config]);
	const onChangeRef = useRef(onChange);
	useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

	const update = useCallback((patch: Partial<CompressorConfig>) => {
		onChangeRef.current({ ...configRef.current, ...patch });
	}, []);

	// RAF-throttled range handler — prevents 200+ setState calls during slider drag
	const rafRef = useRef(0);
	const makeRangeHandler = useCallback(
		(key: keyof CompressorConfig, divisor = 1) =>
			(e: React.ChangeEvent<HTMLInputElement>) => {
				cancelAnimationFrame(rafRef.current);
				const raw = Number(e.target.value);
				rafRef.current = requestAnimationFrame(() => {
					update({ [key]: divisor === 1 ? raw : raw / divisor } as Partial<CompressorConfig>);
				});
			},
		[update],
	);

	// Cleanup RAF on unmount
	useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

	return (
		<div className="space-y-5">
			{/* Format selector */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-2">
					Output Format
				</label>
				<SegmentedButtons
					options={FORMAT_OPTIONS}
					value={config.format}
					onChange={(fmt) => update({ format: fmt })}
					disabled={disabled}
				/>
			</div>

			{/* Quality slider (not for PNG) */}
			{config.format !== 'png' && (
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-foreground">Quality</label>
						<span className="text-sm text-accent font-mono">
							{Math.round(config.quality * 100)}%
						</span>
					</div>
					<input
						type="range"
						min={1}
						max={100}
						value={Math.round(config.quality * 100)}
						onChange={makeRangeHandler('quality', 100)}
						disabled={disabled}
						className="w-full accent-accent"
					/>
					<div className="flex justify-between text-xs text-muted mt-1">
						<span>Smaller file</span>
						<span>Higher quality</span>
					</div>
				</div>
			)}

			{/* Max Dimension */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<label className="text-sm font-medium text-foreground">Max Dimension</label>
					<span className="text-sm text-muted font-mono">
						{config.maxDimension > 0 ? `${config.maxDimension}px` : 'Original'}
					</span>
				</div>
				<select
					value={config.maxDimension}
					onChange={(e) => update({ maxDimension: Number(e.target.value) })}
					disabled={disabled}
					className="w-full p-3 sm:p-2 rounded-lg bg-elevated border border-border text-foreground text-sm"
				>
					<option value={0}>Original size</option>
					<option value={3840}>4K (3840px)</option>
					<option value={1920}>Full HD (1920px)</option>
					<option value={1280}>HD (1280px)</option>
					<option value={800}>Web (800px)</option>
					<option value={400}>Thumbnail (400px)</option>
				</select>
			</div>

			{/* WASM optimization toggle */}
			<ToggleSwitch
				checked={config.enableWasmOptimize}
				onChange={(v) => update({ enableWasmOptimize: v })}
				label="WASM Optimization"
				description="Perceptual pre-processing via Rust"
				disabled={disabled}
			/>

			{/* Optimization strength */}
			{config.enableWasmOptimize && (
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-foreground">
							Optimization Strength
						</label>
						<span className="text-sm text-accent font-mono">
							{Math.round(config.optimizeStrength * 100)}%
						</span>
					</div>
					<input
						type="range"
						min={0}
						max={100}
						value={Math.round(config.optimizeStrength * 100)}
						onChange={makeRangeHandler('optimizeStrength', 100)}
						disabled={disabled}
						className="w-full accent-accent"
					/>
				</div>
			)}

			{/* PNG quantization */}
			{config.format === 'png' && (
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-foreground">
							Color Quantization
						</label>
						<span className="text-sm text-muted font-mono">
							{config.maxColors > 0 ? `${config.maxColors} colors` : 'Off'}
						</span>
					</div>
					<select
						value={config.maxColors}
						onChange={(e) => update({ maxColors: Number(e.target.value) })}
						disabled={disabled}
						className="w-full p-3 sm:p-2 rounded-lg bg-elevated border border-border text-foreground text-sm"
					>
						<option value={0}>Disabled (lossless)</option>
						<option value={256}>256 colors</option>
						<option value={128}>128 colors</option>
						<option value={64}>64 colors</option>
						<option value={32}>32 colors</option>
					</select>
				</div>
			)}

			{/* Target file size */}
			{config.format !== 'png' && (
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-foreground">
							Target File Size
						</label>
						<span className="text-sm text-muted font-mono">
							{config.targetSize > 0
								? config.targetSize >= 1024 * 1024
									? `${(config.targetSize / (1024 * 1024)).toFixed(1)} MB`
									: `${Math.round(config.targetSize / 1024)} KB`
								: 'Auto'}
						</span>
					</div>
					<select
						value={config.targetSize}
						onChange={(e) => update({ targetSize: Number(e.target.value) })}
						disabled={disabled}
						className="w-full p-3 sm:p-2 rounded-lg bg-elevated border border-border text-foreground text-sm"
					>
						<option value={0}>Auto (use quality slider)</option>
						<option value={50 * 1024}>50 KB</option>
						<option value={100 * 1024}>100 KB</option>
						<option value={200 * 1024}>200 KB</option>
						<option value={500 * 1024}>500 KB</option>
						<option value={1024 * 1024}>1 MB</option>
						<option value={2 * 1024 * 1024}>2 MB</option>
					</select>
				</div>
			)}

			{/* SSIM verification */}
			{config.enableWasmOptimize && (
				<ToggleSwitch
					checked={config.verifySsim}
					onChange={(v) => update({ verifySsim: v })}
					label="Quality Verification"
					description="Calculate SSIM after compression"
					disabled={disabled}
				/>
			)}
		</div>
	);
});
