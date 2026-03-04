'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { InteractionMode } from '../utils/types';

// ═══════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════

interface FloatingHUDProps {
	isDragging: boolean;
	interactionMode: InteractionMode;
	liveW: number;
	liveH: number;
	pctW: string;
	pctH: string;
	isUpscale: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export const FloatingHUD = memo(function FloatingHUD({
	isDragging,
	interactionMode,
	liveW,
	liveH,
	pctW,
	pctH,
	isUpscale,
}: FloatingHUDProps) {
	return (
		<AnimatePresence>
			{isDragging && (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 4 }}
					transition={{ duration: 0.15 }}
					className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30"
				>
					<div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/6">
						{interactionMode === 'resize' && (
							<>
								<span className="text-[11px] font-mono text-accent font-semibold tracking-wide">
									{liveW} &times; {liveH}
								</span>
								<div className="w-px h-3 bg-white/10" />
								<span
									className={`text-[10px] font-mono ${isUpscale ? 'text-amber-400/80' : 'text-emerald-400/80'}`}
								>
									{pctW}&times;{pctH}%
								</span>
							</>
						)}
						{interactionMode === 'move-frame' && (
							<span className="text-[11px] font-mono text-white/70">
								Moving frame
							</span>
						)}
						{interactionMode === 'pan-image' && (
							<span className="text-[11px] font-mono text-white/70">
								Panning image
							</span>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
});
