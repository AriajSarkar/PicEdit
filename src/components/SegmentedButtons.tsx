'use client';

import { memo, type ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
	/** Optional second-line description */
	description?: string;
	/** Optional badge (e.g. "WASM") */
	badge?: ReactNode;
}

interface SegmentedButtonsProps<T extends string> {
	options: readonly SegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	/** Number of columns in the grid (default: options.length, capped at 6) */
	columns?: number;
	disabled?: boolean;
	className?: string;
	/** Visual variant */
	variant?: 'default' | 'accent';
}

/**
 * Shared segmented button group — replaces 8+ duplicated grid+active patterns.
 *
 * Uses CSS `grid-template-columns` for equal sizing, accent highlight for active state.
 * Keyboard accessible: each button is individually focusable.
 */
function SegmentedButtonsInner<T extends string>({
	options,
	value,
	onChange,
	columns,
	disabled,
	className,
	variant = 'default',
}: SegmentedButtonsProps<T>) {
	const cols = columns ?? Math.min(options.length, 6);

	return (
		<div
			className={`grid gap-2 ${className ?? ''}`}
			style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
		>
			{options.map((opt) => {
				const isActive = value === opt.value;
				const activeClass =
					variant === 'accent'
						? 'bg-accent/15 text-accent border-accent/30'
						: 'bg-accent text-white shadow-lg shadow-accent/25';
				const inactiveClass =
					'bg-elevated text-muted hover:text-foreground border-border';

				return (
					<button
						key={opt.value}
						onClick={() => onChange(opt.value)}
						disabled={disabled}
						className={`
							py-3 sm:py-2 px-2 rounded-lg text-sm font-medium transition-all border
							${isActive ? activeClass : inactiveClass}
							disabled:opacity-50
						`}
					>
						<span className="block">{opt.label}</span>
						{opt.description && (
							<span className="block text-[10px] opacity-60 mt-0.5">
								{opt.description}
							</span>
						)}
						{opt.badge && (
							<span className="block text-[10px] opacity-60 mt-0.5">{opt.badge}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

// Wrap in memo — generics require the inner/outer pattern
export const SegmentedButtons = memo(SegmentedButtonsInner) as typeof SegmentedButtonsInner;
