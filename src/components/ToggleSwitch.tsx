'use client';

import { memo } from 'react';

interface ToggleSwitchProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	description?: string;
	disabled?: boolean;
	className?: string;
}

/**
 * Accessible toggle switch with smooth transition.
 * Replaces repeated 44-line toggle markup across Controls components.
 *
 * Design: pill track with sliding knob, accent-colored when active.
 * WCAG: role="switch" + aria-checked + keyboard Enter/Space.
 */
export const ToggleSwitch = memo(function ToggleSwitch({
	checked,
	onChange,
	label,
	description,
	disabled,
	className,
}: ToggleSwitchProps) {
	return (
		<div className={`flex items-center justify-between ${className ?? ''}`}>
			<div className="select-none">
				<p className="text-sm font-medium text-foreground">{label}</p>
				{description && <p className="text-xs text-muted">{description}</p>}
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label}
				onClick={() => onChange(!checked)}
				disabled={disabled}
				className={`
					relative w-11 h-6 rounded-full transition-colors duration-200
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
					disabled:opacity-50 disabled:cursor-not-allowed
					${checked ? 'bg-accent shadow-[0_0_8px_rgba(224,122,95,0.3)]' : 'bg-white/10 hover:bg-white/15'}
				`}
			>
				<span
					className={`
						absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
						transition-transform duration-200 ease-out
						${checked ? 'translate-x-5' : 'translate-x-0'}
					`}
				/>
			</button>
		</div>
	);
});
