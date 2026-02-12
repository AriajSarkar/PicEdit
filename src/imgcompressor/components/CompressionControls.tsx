'use client';

import { memo } from 'react';
import type { CompressorConfig } from '@/imgcompressor/types';

interface CompressionControlsProps {
  config: CompressorConfig;
  onChange: (config: CompressorConfig) => void;
  disabled?: boolean;
}

export const CompressionControls = memo(function CompressionControls({ config, onChange, disabled }: CompressionControlsProps) {
  const update = (patch: Partial<CompressorConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-5">
      {/* Format selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Output Format
        </label>
        <div className="flex gap-2">
          {(['jpeg', 'png', 'webp'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => update({ format: fmt })}
              disabled={disabled}
              className={`
                flex-1 py-3 sm:py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${config.format === fmt
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                  : 'bg-[var(--bg-elevated)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
                }
                disabled:opacity-50
              `}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quality slider (not for PNG) */}
      {config.format !== 'png' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Quality</label>
            <span className="text-sm text-[var(--accent)] font-mono">
              {Math.round(config.quality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.round(config.quality * 100)}
            onChange={e => update({ quality: Number(e.target.value) / 100 })}
            disabled={disabled}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
            <span>Smaller file</span>
            <span>Higher quality</span>
          </div>
        </div>
      )}

      {/* Max Dimension */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[var(--foreground)]">Max Dimension</label>
          <span className="text-sm text-[var(--muted)] font-mono">
            {config.maxDimension > 0 ? `${config.maxDimension}px` : 'Original'}
          </span>
        </div>
        <select
          value={config.maxDimension}
          onChange={e => update({ maxDimension: Number(e.target.value) })}
          disabled={disabled}
          className="w-full p-3 sm:p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm"
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">WASM Optimization</p>
          <p className="text-xs text-[var(--muted)]">Perceptual pre-processing via Rust</p>
        </div>
        <button
          onClick={() => update({ enableWasmOptimize: !config.enableWasmOptimize })}
          disabled={disabled}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${config.enableWasmOptimize ? 'bg-[var(--accent)]' : 'bg-white/10'}
          `}
        >
          <span className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
            ${config.enableWasmOptimize ? 'translate-x-5' : ''}
          `} />
        </button>
      </div>

      {/* Optimization strength */}
      {config.enableWasmOptimize && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Optimization Strength</label>
            <span className="text-sm text-[var(--accent)] font-mono">
              {Math.round(config.optimizeStrength * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.optimizeStrength * 100)}
            onChange={e => update({ optimizeStrength: Number(e.target.value) / 100 })}
            disabled={disabled}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      )}

      {/* PNG quantization */}
      {config.format === 'png' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Color Quantization</label>
            <span className="text-sm text-[var(--muted)] font-mono">
              {config.maxColors > 0 ? `${config.maxColors} colors` : 'Off'}
            </span>
          </div>
          <select
            value={config.maxColors}
            onChange={e => update({ maxColors: Number(e.target.value) })}
            disabled={disabled}
            className="w-full p-3 sm:p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm"
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
            <label className="text-sm font-medium text-[var(--foreground)]">Target File Size</label>
            <span className="text-sm text-[var(--muted)] font-mono">
              {config.targetSize > 0
                ? config.targetSize >= 1024 * 1024
                  ? `${(config.targetSize / (1024 * 1024)).toFixed(1)} MB`
                  : `${Math.round(config.targetSize / 1024)} KB`
                : 'Auto'}
            </span>
          </div>
          <select
            value={config.targetSize}
            onChange={e => update({ targetSize: Number(e.target.value) })}
            disabled={disabled}
            className="w-full p-3 sm:p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--foreground)] text-sm"
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Quality Verification</p>
            <p className="text-xs text-[var(--muted)]">Calculate SSIM after compression</p>
          </div>
          <button
            onClick={() => update({ verifySsim: !config.verifySsim })}
            disabled={disabled}
            className={`
              relative w-11 h-6 rounded-full transition-colors
              ${config.verifySsim ? 'bg-[var(--accent)]' : 'bg-white/10'}
            `}
          >
            <span className={`
              absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
              ${config.verifySsim ? 'translate-x-5' : ''}
            `} />
          </button>
        </div>
      )}
    </div>
  );
});
