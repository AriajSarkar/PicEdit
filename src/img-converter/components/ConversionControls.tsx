'use client';

import { memo } from 'react';
import type {
	ConverterConfig,
	ConvertOutputFormat,
	PdfPageSize,
	PdfFitMode,
	PdfOrientation,
	PdfDpi,
} from '@/img-converter/types';
import { FORMAT_INFO, ICO_SIZES } from '@/img-converter/types';

interface ConversionControlsProps {
	config: ConverterConfig;
	onChange: (config: ConverterConfig) => void;
	disabled?: boolean;
}

export const ConversionControls = memo(function ConversionControls({
	config,
	onChange,
	disabled,
}: ConversionControlsProps) {
	const update = (patch: Partial<ConverterConfig>) => onChange({ ...config, ...patch });
	const currentFormat = FORMAT_INFO[config.outputFormat];

	return (
		<div className="space-y-5">
			{/* Output format selector */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-2">
					Output Format
				</label>
				<div className="grid grid-cols-4 gap-2">
					{(Object.keys(FORMAT_INFO) as ConvertOutputFormat[]).map((fmt) => {
						const info = FORMAT_INFO[fmt];
						return (
							<button
								key={fmt}
								onClick={() => update({ outputFormat: fmt })}
								disabled={disabled}
								className={`
									py-3 sm:py-2 px-2 rounded-lg text-sm font-medium transition-all
									${
										config.outputFormat === fmt
											? 'bg-accent text-white shadow-lg shadow-(--accent)/25'
											: 'bg-(--bg-elevated) text-(--muted) hover:text-foreground border border-border'
									}
									disabled:opacity-50
								`}
							>
								<span className="block">{info.label}</span>
								{info.needsWasm && (
									<span className="block text-[10px] opacity-60 mt-0.5">
										WASM
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Quality slider (JPEG / WebP only) */}
			{currentFormat.supportsQuality && (
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
						onChange={(e) => update({ quality: Number(e.target.value) / 100 })}
						disabled={disabled}
						className="w-full accent-accent"
					/>
					<div className="flex justify-between text-xs text-(--muted) mt-1">
						<span>Smaller file</span>
						<span>Higher quality</span>
					</div>
				</div>
			)}

			{/* Transparency toggle */}
			{currentFormat.supportsAlpha && (
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-foreground">
							Preserve Transparency
						</p>
						<p className="text-xs text-(--muted)">Keep alpha channel in output</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={config.preserveTransparency}
						aria-label="Preserve transparency"
						onClick={() =>
							update({ preserveTransparency: !config.preserveTransparency })
						}
						disabled={disabled}
						className={`
							relative w-11 h-6 rounded-full transition-colors
							${config.preserveTransparency ? 'bg-accent' : 'bg-white/10'}
						`}
					>
						<span
							className={`
								absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
								${config.preserveTransparency ? 'translate-x-5' : ''}
							`}
						/>
					</button>
				</div>
			)}

			{/* Background color picker */}
			{(!currentFormat.supportsAlpha || !config.preserveTransparency) && (
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						Background Color
					</label>
					<p className="text-xs text-(--muted) mb-2">
						Replaces transparent areas when alpha is removed
					</p>
					<div className="flex items-center gap-3">
						<input
							type="color"
							value={config.backgroundColor}
							onChange={(e) => update({ backgroundColor: e.target.value })}
							disabled={disabled}
							className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
						/>
						<div className="flex gap-2">
							{['#ffffff', '#000000', '#f5f5f5', '#e0e0e0'].map((color) => (
								<button
									key={color}
									onClick={() => update({ backgroundColor: color })}
									disabled={disabled}
									className={`
										w-8 h-8 rounded-lg border-2 transition-all
										${
											config.backgroundColor === color
												? 'border-accent scale-110'
												: 'border-border hover:border-foreground/30'
										}
									`}
									style={{ backgroundColor: color }}
									title={color}
								/>
							))}
						</div>
						<span className="text-xs text-(--muted) font-mono ml-auto">
							{config.backgroundColor}
						</span>
					</div>
				</div>
			)}

			{/* Grayscale toggle */}
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Grayscale</p>
					<p className="text-xs text-(--muted)">BT.709 perceptual luminance</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={config.grayscale}
					aria-label="Convert to grayscale"
					onClick={() => update({ grayscale: !config.grayscale })}
					disabled={disabled}
					className={`
						relative w-11 h-6 rounded-full transition-colors
						${config.grayscale ? 'bg-accent' : 'bg-white/10'}
					`}
				>
					<span
						className={`
							absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
							${config.grayscale ? 'translate-x-5' : ''}
						`}
					/>
				</button>
			</div>

			{/* ICO sizes multi-select */}
			{config.outputFormat === 'ico' && (
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						ICO Sizes
					</label>
					<p className="text-xs text-(--muted) mb-2">
						Select which resolutions to embed in the .ico file.
						All sizes are packed into one file &mdash; apps pick
						the best size automatically.
					</p>
					<div className="grid grid-cols-4 gap-2">
						{ICO_SIZES.map((size) => {
							const selected = config.icoSizes.includes(size);
							return (
								<button
									key={size}
									onClick={() => {
										const next = selected
											? config.icoSizes.filter((s) => s !== size)
											: [...config.icoSizes, size].sort((a, b) => a - b);
										// Ensure at least one size is always selected
										if (next.length > 0) update({ icoSizes: next });
									}}
									disabled={disabled}
									className={`
										py-2 px-2 rounded-lg text-sm font-mono transition-all
										${
											selected
												? 'bg-accent/15 text-accent border border-accent/30'
												: 'bg-(--bg-elevated) text-(--muted) border border-border hover:text-foreground'
										}
										disabled:opacity-50
									`}
								>
									{size}×{size}
								</button>
							);
						})}
					</div>
					{/* Custom size input */}
					<div className="mt-3 flex items-center gap-2">
						<input
							type="number"
							min={1}
							max={1024}
							placeholder="Custom size"
							disabled={disabled}
							className="flex-1 px-3 py-1.5 rounded-lg text-sm font-mono
								bg-(--bg-elevated) border border-border text-foreground
								placeholder:text-(--muted) focus:outline-none focus:border-accent/50
								disabled:opacity-50"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									const val = parseInt((e.target as HTMLInputElement).value);
									if (val >= 1 && val <= 1024 && !config.icoSizes.includes(val)) {
										update({
											icoSizes: [...config.icoSizes, val].sort((a, b) => a - b),
										});
										(e.target as HTMLInputElement).value = '';
									}
								}
							}}
						/>
						<span className="text-xs text-(--muted) shrink-0">1–1024 px</span>
					</div>
					{/* Custom sizes display */}
					{config.icoSizes.some((s) => !(ICO_SIZES as readonly number[]).includes(s)) && (
						<div className="flex flex-wrap gap-1 mt-2">
							{config.icoSizes
								.filter((s) => !(ICO_SIZES as readonly number[]).includes(s))
								.map((size) => (
									<button
										key={size}
										onClick={() => {
											const next = config.icoSizes.filter((s) => s !== size);
											if (next.length > 0) update({ icoSizes: next });
										}}
										disabled={disabled}
										className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono
											bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20
											disabled:opacity-50"
									>
										{size}×{size}
										<span className="text-accent/60">×</span>
									</button>
								))}
						</div>
					)}
					<p className="text-xs text-(--muted) mt-2">
						{config.icoSizes.length} size{config.icoSizes.length !== 1 ? 's' : ''}{' '}
						selected
						{config.icoSizes.some((s) => s > 256) && (
							<span className="text-info"> · Sizes &gt;256 use PNG embedding</span>
						)}
					</p>
				</div>
			)}

			{/* PDF settings */}
			{config.outputFormat === 'pdf' && (
				<div className="space-y-4">
					{/* DPI */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Resolution (DPI)
						</label>
						<p className="text-xs text-(--muted) mb-2">
							Higher DPI = sharper image, larger file
						</p>
						<div className="grid grid-cols-4 gap-2">
							{([72, 150, 300, 600] as PdfDpi[]).map((dpi) => (
								<button
									key={dpi}
									onClick={() => update({ pdfDpi: dpi })}
									disabled={disabled}
									className={`
										py-2 px-2 rounded-lg text-sm font-mono transition-all
										${
											config.pdfDpi === dpi
												? 'bg-accent/15 text-accent border border-accent/30'
												: 'bg-(--bg-elevated) text-(--muted) border border-border hover:text-foreground'
										}
										disabled:opacity-50
									`}
								>
									{dpi}
								</button>
							))}
						</div>
						<p className="text-xs text-(--muted) mt-1">
							{config.pdfDpi === 72 && 'Screen quality — small file'}
							{config.pdfDpi === 150 && 'Good for digital sharing'}
							{config.pdfDpi === 300 && 'Print quality — recommended'}
							{config.pdfDpi === 600 && 'High-resolution print'}
						</p>
					</div>

					{/* Page Size */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Page Size
						</label>
						<div className="grid grid-cols-3 gap-2">
							{(
								[
									{ value: 'fit', label: 'Fit Image' },
									{ value: 'a4', label: 'A4' },
									{ value: 'letter', label: 'Letter' },
									{ value: 'a3', label: 'A3' },
									{ value: 'legal', label: 'Legal' },
								] as { value: PdfPageSize; label: string }[]
							).map(({ value, label }) => (
								<button
									key={value}
									onClick={() => update({ pdfPageSize: value })}
									disabled={disabled}
									className={`
										py-2 px-2 rounded-lg text-sm transition-all
										${
											config.pdfPageSize === value
												? 'bg-accent/15 text-accent border border-accent/30'
												: 'bg-(--bg-elevated) text-(--muted) border border-border hover:text-foreground'
										}
										disabled:opacity-50
									`}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Fit Mode (only when not "fit") */}
					{config.pdfPageSize !== 'fit' && (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Fit Mode
							</label>
							<div className="grid grid-cols-3 gap-2">
								{(
									[
										{ value: 'contain', label: 'Contain', desc: 'Fit inside' },
										{ value: 'fill', label: 'Fill', desc: 'Cover page' },
										{ value: 'stretch', label: 'Stretch', desc: 'Exact fit' },
									] as { value: PdfFitMode; label: string; desc: string }[]
								).map(({ value, label, desc }) => (
									<button
										key={value}
										onClick={() => update({ pdfFitMode: value })}
										disabled={disabled}
										className={`
											py-2 px-1.5 rounded-lg transition-all
											${
												config.pdfFitMode === value
													? 'bg-accent/15 text-accent border border-accent/30'
													: 'bg-(--bg-elevated) text-(--muted) border border-border hover:text-foreground'
											}
											disabled:opacity-50
										`}
									>
										<span className="block text-sm font-medium">{label}</span>
										<span className="block text-[10px] opacity-60">{desc}</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Orientation (only when not "fit") */}
					{config.pdfPageSize !== 'fit' && (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Orientation
							</label>
							<div className="grid grid-cols-3 gap-2">
								{(
									[
										{ value: 'auto', label: 'Auto' },
										{ value: 'portrait', label: 'Portrait' },
										{ value: 'landscape', label: 'Landscape' },
									] as { value: PdfOrientation; label: string }[]
								).map(({ value, label }) => (
									<button
										key={value}
										onClick={() => update({ pdfOrientation: value })}
										disabled={disabled}
										className={`
											py-2 px-2 rounded-lg text-sm transition-all
											${
												config.pdfOrientation === value
													? 'bg-accent/15 text-accent border border-accent/30'
													: 'bg-(--bg-elevated) text-(--muted) border border-border hover:text-foreground'
											}
											disabled:opacity-50
										`}
									>
										{label}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Format info */}
			<div className="px-3 py-2.5 rounded-lg bg-(--bg-elevated) border border-border">
				<div className="flex items-center gap-2 mb-1">
					<svg
						className="w-3.5 h-3.5 text-accent"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span className="text-xs font-medium text-foreground">
						{currentFormat.label} Info
					</span>
				</div>
				<p className="text-xs text-(--muted) leading-relaxed">
					{config.outputFormat === 'jpeg' &&
						'Lossy compression. Best for photos. No transparency support.'}
					{config.outputFormat === 'png' &&
						'Lossless compression. Supports transparency. Ideal for graphics & screenshots.'}
					{config.outputFormat === 'webp' &&
						'Modern format with excellent compression. Supports transparency & lossy/lossless.'}
					{config.outputFormat === 'bmp' &&
						'Uncompressed bitmap. Large files. Useful for legacy applications.'}
					{config.outputFormat === 'tiff' &&
						'Professional format with PackBits compression. Supports alpha channel.'}
					{config.outputFormat === 'ico' &&
						'Windows icon format. Embeds multiple resolutions in one file. Sizes ≤256px use BMP encoding, larger sizes use PNG embedding. Add custom sizes up to 1024px.'}
					{config.outputFormat === 'avif' &&
						'Next-gen format with superior compression. Supports transparency & lossy/lossless. Requires modern browser.'}
					{config.outputFormat === 'pdf' &&
						'High-quality PDF with configurable DPI and page sizing. Supports standard page sizes (A4, Letter, A3, Legal) or pixel-perfect fit. Use "Download as PDF" to merge multiple images into one document.'}
				</p>
				{currentFormat.needsWasm && (
					<p className="text-xs text-accent/70 mt-1">
						Encoded by Rust WASM for maximum performance
					</p>
				)}
			</div>
		</div>
	);
});
