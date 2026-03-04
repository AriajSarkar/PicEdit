'use client';

import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
	CORNERS,
	BRACKET_ARM,
	BRACKET_THICK,
	EDGE_SIZE_W,
	EDGE_SIZE_H,
	HIT_EXPAND,
	CURSOR,
	type HandleId,
} from '../utils/types';
import type { Rect } from '../utils/types';

// ═══════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════

interface OverlayHandlesProps {
	br: Rect;
	disabled: boolean;
	isDragging: boolean;
	hoveredHandle: HandleId | null;
	activeHandle: HandleId | null;
	onPointerDown: (handle: HandleId, e: ReactPointerEvent) => void;
	onHoverHandle: (handle: HandleId | null) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export const OverlayHandles = memo(function OverlayHandles({
	br,
	disabled,
	isDragging,
	hoveredHandle,
	activeHandle,
	onPointerDown,
	onHoverHandle,
}: OverlayHandlesProps) {
	if (disabled) return null;

	return (
		<>
			{/* L-shaped bracket corner handles */}
			{CORNERS.map((id) => {
				const isActive = hoveredHandle === id || activeHandle === id;
				const color = isActive ? 'var(--accent)' : '#ffffff';

				let cx = br.x;
				let cy = br.y;
				if (id === 'ne' || id === 'se') cx = br.x + br.w;
				if (id === 'sw' || id === 'se') cy = br.y + br.h;

				const dirX = id === 'nw' || id === 'sw' ? 1 : -1;
				const dirY = id === 'nw' || id === 'ne' ? 1 : -1;

				return (
					<div
						key={id}
						className="absolute z-20 pointer-events-none"
						style={{ left: 0, top: 0, right: 0, bottom: 0 }}
					>
						{/* Horizontal arm */}
						<div
							style={{
								position: 'absolute',
								left: dirX === 1 ? cx : cx - BRACKET_ARM,
								top: cy - BRACKET_THICK / 2,
								width: BRACKET_ARM,
								height: BRACKET_THICK,
								background: color,
								borderRadius: 1,
								boxShadow: isActive
									? '0 0 8px rgba(224,122,95,0.5)'
									: '0 1px 3px rgba(0,0,0,0.6)',
								transition: 'background 0.1s, box-shadow 0.1s',
							}}
						/>
						{/* Vertical arm */}
						<div
							style={{
								position: 'absolute',
								left: cx - BRACKET_THICK / 2,
								top: dirY === 1 ? cy : cy - BRACKET_ARM,
								width: BRACKET_THICK,
								height: BRACKET_ARM,
								background: color,
								borderRadius: 1,
								boxShadow: isActive
									? '0 0 8px rgba(224,122,95,0.5)'
									: '0 1px 3px rgba(0,0,0,0.6)',
								transition: 'background 0.1s, box-shadow 0.1s',
							}}
						/>
						{/* Hit area */}
						<div
							style={{
								position: 'absolute',
								left: (dirX === 1 ? cx : cx - BRACKET_ARM) - HIT_EXPAND,
								top: (dirY === 1 ? cy : cy - BRACKET_ARM) - HIT_EXPAND,
								width: BRACKET_ARM + HIT_EXPAND * 2,
								height: BRACKET_ARM + HIT_EXPAND * 2,
								cursor: CURSOR[id],
								pointerEvents: 'auto',
							}}
							onPointerDown={(e) => onPointerDown(id, e)}
							onPointerEnter={() => !isDragging && onHoverHandle(id)}
							onPointerLeave={() => !isDragging && onHoverHandle(null)}
						/>
					</div>
				);
			})}

			{/* Edge handles */}
			{(['n', 's', 'e', 'w'] as HandleId[]).map((id) => {
				const isHoriz = id === 'n' || id === 's';
				const vw = isHoriz ? EDGE_SIZE_W : EDGE_SIZE_H;
				const vh = isHoriz ? EDGE_SIZE_H : EDGE_SIZE_W;
				const isActive = hoveredHandle === id || activeHandle === id;

				let vx = br.x;
				let vy = br.y;
				switch (id) {
					case 'n':
						vx = br.x + br.w / 2 - vw / 2;
						vy = br.y - vh / 2;
						break;
					case 's':
						vx = br.x + br.w / 2 - vw / 2;
						vy = br.y + br.h - vh / 2;
						break;
					case 'e':
						vx = br.x + br.w - vw / 2;
						vy = br.y + br.h / 2 - vh / 2;
						break;
					case 'w':
						vx = br.x - vw / 2;
						vy = br.y + br.h / 2 - vh / 2;
						break;
				}

				return (
					<div
						key={id}
						className="absolute z-20"
						style={{
							left: vx - HIT_EXPAND,
							top: vy - HIT_EXPAND,
							width: vw + HIT_EXPAND * 2,
							height: vh + HIT_EXPAND * 2,
							cursor: CURSOR[id],
						}}
						onPointerDown={(e) => onPointerDown(id, e)}
						onPointerEnter={() => !isDragging && onHoverHandle(id)}
						onPointerLeave={() => !isDragging && onHoverHandle(null)}
					>
						<div
							className="absolute transition-all duration-75"
							style={{
								left: HIT_EXPAND,
								top: HIT_EXPAND,
								width: vw,
								height: vh,
								borderRadius: 1.5,
								background: isActive ? 'var(--accent)' : '#fff',
								border: '1px solid var(--accent)',
								boxShadow: isActive
									? '0 0 8px rgba(224,122,95,0.45)'
									: '0 1px 3px rgba(0,0,0,0.5)',
								transform: isActive ? 'scale(1.3)' : 'scale(1)',
							}}
						/>
					</div>
				);
			})}
		</>
	);
});
