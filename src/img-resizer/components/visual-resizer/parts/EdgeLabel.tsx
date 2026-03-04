'use client';

import { memo } from 'react';
import type { EdgeLabelProps } from '../utils/types';

export const EdgeLabel = memo(function EdgeLabel({ value, axis, x, y }: EdgeLabelProps) {
	return (
		<div
			className="absolute pointer-events-none z-10"
			style={{
				left: x,
				top: y,
				transform: axis === 'x' ? 'translateX(-50%)' : 'translateY(-50%)',
			}}
		>
			<div
				className="px-1.5 py-0.5 rounded-sm border"
				style={{
					background: 'rgba(0,0,0,0.65)',
					borderColor: 'rgba(255,255,255,0.06)',
					backdropFilter: 'blur(6px)',
				}}
			>
				<span className="text-[10px] font-mono text-white/85 whitespace-nowrap leading-none">
					{value}
				</span>
			</div>
		</div>
	);
});
