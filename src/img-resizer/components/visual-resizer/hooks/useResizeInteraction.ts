'use client';

import {
	useState,
	useRef,
	useCallback,
	useEffect,
	type PointerEvent as ReactPointerEvent,
} from 'react';
import type { ResizerConfig } from '@/img-resizer/types';
import { clamp } from '../geometry';
import {
	CORNERS,
	MIN_DIM,
	MAX_DIM,
	NUDGE_PX,
	NUDGE_SHIFT_PX,
	type HandleId,
	type InteractionMode,
	type DragState,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseResizeInteractionOptions {
	config: ResizerConfig;
	effectiveW: number;
	effectiveH: number;
	originalWidth: number;
	originalHeight: number;
	disabled: boolean;
	scale: number;
	spaceHeld: boolean;
	onResize: (w: number, h: number, cropX: number, cropY: number) => void;
	setPanX: React.Dispatch<React.SetStateAction<number>>;
	setPanY: React.Dispatch<React.SetStateAction<number>>;
	initialFrameOffX?: number;
	initialFrameOffY?: number;
}

export interface UseResizeInteractionReturn {
	isDragging: boolean;
	interactionMode: InteractionMode;
	activeHandle: HandleId | null;
	hoveredHandle: HandleId | null;
	liveW: number;
	liveH: number;
	frameOffX: number;
	frameOffY: number;
	handlePointerDown: (handle: HandleId, e: ReactPointerEvent) => void;
	framePointerDown: (e: ReactPointerEvent) => void;
	canvasPointerDown: (e: ReactPointerEvent) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	setHoveredHandle: React.Dispatch<React.SetStateAction<HandleId | null>>;
	/** Reset all interaction state (e.g. on image switch). */
	resetInteraction: (offX?: number, offY?: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useResizeInteraction({
	config,
	effectiveW,
	effectiveH,
	originalWidth,
	originalHeight,
	disabled,
	scale,
	spaceHeld,
	onResize,
	setPanX,
	setPanY,
	initialFrameOffX = 0,
	initialFrameOffY = 0,
}: UseResizeInteractionOptions): UseResizeInteractionReturn {
	const dragRef = useRef<DragState | null>(null);

	const [isDragging, setIsDragging] = useState(false);
	const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
	const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null);
	const [dragW, setDragW] = useState(effectiveW);
	const [dragH, setDragH] = useState(effectiveH);
	const [frameOffX, setFrameOffX] = useState(initialFrameOffX);
	const [frameOffY, setFrameOffY] = useState(initialFrameOffY);

	const liveW = isDragging && interactionMode === 'resize' ? dragW : effectiveW;
	const liveH = isDragging && interactionMode === 'resize' ? dragH : effectiveH;

	// ── Stable refs ──────────────────────────────────────────────────

	const configRef = useRef(config);
	useEffect(() => {
		configRef.current = config;
	}, [config]);

	const onResizeRef = useRef(onResize);
	useEffect(() => {
		onResizeRef.current = onResize;
	}, [onResize]);

	const liveRef = useRef({ w: liveW, h: liveH });
	useEffect(() => {
		liveRef.current = { w: liveW, h: liveH };
	}, [liveW, liveH]);

	const scaleRef = useRef(scale);
	useEffect(() => {
		scaleRef.current = scale;
	}, [scale]);

	const frameOffRef = useRef({ x: frameOffX, y: frameOffY });
	useEffect(() => {
		frameOffRef.current = { x: frameOffX, y: frameOffY };
	}, [frameOffX, frameOffY]);

	const panRefState = useRef({ x: 0, y: 0 });
	// We keep a local ref that tracks setPanX/setPanY values — callers
	// must update through setPanX/setPanY which we read via the ref.
	// This avoids needing panX/panY as hook params (circular dep).

	// ── Compute crop origin ──────────────────────────────────────────

	const computeCrop = useCallback(
		(frameW: number, frameH: number) => {
			const s = scaleRef.current;
			const off = frameOffRef.current;
			const cropX = (originalWidth - frameW) / 2 + (s > 0 ? off.x / s : 0);
			const cropY = (originalHeight - frameH) / 2 + (s > 0 ? off.y / s : 0);
			return { cropX, cropY };
		},
		[originalWidth, originalHeight],
	);

	// ── Pointer: handle resize ───────────────────────────────────────

	const handlePointerDown = useCallback(
		(handle: HandleId, e: ReactPointerEvent) => {
			if (disabled) return;
			e.preventDefault();
			e.stopPropagation();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);

			const cur = liveRef.current;
			dragRef.current = {
				mode: 'resize',
				handle,
				startX: e.clientX,
				startY: e.clientY,
				startW: cur.w,
				startH: cur.h,
				startOffX: 0,
				startOffY: 0,
				startPanX: 0,
				startPanY: 0,
			};
			setDragW(cur.w);
			setDragH(cur.h);
			setActiveHandle(handle);
			setIsDragging(true);
			setInteractionMode('resize');
		},
		[disabled],
	);

	// ── Pointer: frame move ──────────────────────────────────────────

	const framePointerDown = useCallback(
		(e: ReactPointerEvent) => {
			if (disabled) return;
			e.preventDefault();
			e.stopPropagation();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);

			const cur = liveRef.current;
			const off = frameOffRef.current;
			dragRef.current = {
				mode: 'move-frame',
				handle: null,
				startX: e.clientX,
				startY: e.clientY,
				startW: cur.w,
				startH: cur.h,
				startOffX: off.x,
				startOffY: off.y,
				startPanX: 0,
				startPanY: 0,
			};
			setIsDragging(true);
			setInteractionMode('move-frame');
		},
		[disabled],
	);

	// ── Pointer: image pan ───────────────────────────────────────────

	const imagePanDown = useCallback(
		(e: ReactPointerEvent) => {
			if (disabled) return;
			e.preventDefault();
			e.stopPropagation();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);

			const cur = liveRef.current;
			const p = panRefState.current;
			dragRef.current = {
				mode: 'pan-image',
				handle: null,
				startX: e.clientX,
				startY: e.clientY,
				startW: cur.w,
				startH: cur.h,
				startOffX: 0,
				startOffY: 0,
				startPanX: p.x,
				startPanY: p.y,
			};
			setIsDragging(true);
			setInteractionMode('pan-image');
		},
		[disabled],
	);

	// ── Global pointer move / up ─────────────────────────────────────
	// RAF-gated for performance.

	const rafId = useRef(0);
	const pendingPointer = useRef<{ x: number; y: number } | null>(null);

	const applyPointerMove = useCallback(() => {
		rafId.current = 0;
		const pos = pendingPointer.current;
		const d = dragRef.current;
		if (!pos || !d) return;

		const dx = pos.x - d.startX;
		const dy = pos.y - d.startY;

		if (d.mode === 'resize') {
			const s = scaleRef.current;
			if (s === 0) return;
			const pixDx = dx / s;
			const pixDy = dy / s;
			const cfg = configRef.current;
			const ratio = d.startW / d.startH;

			let nw = d.startW;
			let nh = d.startH;

			switch (d.handle) {
				case 'se':
					nw += pixDx;
					nh += pixDy;
					break;
				case 'nw':
					nw -= pixDx;
					nh -= pixDy;
					break;
				case 'ne':
					nw += pixDx;
					nh -= pixDy;
					break;
				case 'sw':
					nw -= pixDx;
					nh += pixDy;
					break;
				case 'e':
					nw += pixDx;
					break;
				case 'w':
					nw -= pixDx;
					break;
				case 's':
					nh += pixDy;
					break;
				case 'n':
					nh -= pixDy;
					break;
			}

			nw = clamp(Math.round(nw), MIN_DIM, MAX_DIM);
			nh = clamp(Math.round(nh), MIN_DIM, MAX_DIM);

			if (cfg.lockAspectRatio && d.handle && CORNERS.includes(d.handle)) {
				const adx = Math.abs(nw - d.startW);
				const ady = Math.abs(nh - d.startH);
				if (adx >= ady) {
					nh = clamp(Math.round(nw / ratio), MIN_DIM, MAX_DIM);
				} else {
					nw = clamp(Math.round(nh * ratio), MIN_DIM, MAX_DIM);
				}
			}

			liveRef.current = { w: nw, h: nh };
			setDragW(nw);
			setDragH(nh);
		} else if (d.mode === 'move-frame') {
			setFrameOffX(d.startOffX + dx);
			setFrameOffY(d.startOffY + dy);
		} else if (d.mode === 'pan-image') {
			setPanX(() => d.startPanX + dx);
			setPanY(() => d.startPanY + dy);
			panRefState.current = { x: d.startPanX + dx, y: d.startPanY + dy };
		}
	}, [setPanX, setPanY]);

	const pointerMove = useCallback(
		(e: PointerEvent) => {
			if (!dragRef.current) return;
			pendingPointer.current = { x: e.clientX, y: e.clientY };
			if (!rafId.current) {
				rafId.current = requestAnimationFrame(applyPointerMove);
			}
		},
		[applyPointerMove],
	);

	const pointerUp = useCallback(() => {
		const d = dragRef.current;
		if (!d) return;
		dragRef.current = null;

		if (rafId.current) {
			cancelAnimationFrame(rafId.current);
			rafId.current = 0;
		}
		if (pendingPointer.current) {
			applyPointerMove();
			pendingPointer.current = null;
		}

		if (d.mode === 'resize') {
			const { w, h } = liveRef.current;
			const { cropX, cropY } = computeCrop(w, h);
			onResizeRef.current(w, h, cropX, cropY);
		} else if (d.mode === 'move-frame') {
			const { w, h } = liveRef.current;
			const { cropX, cropY } = computeCrop(w, h);
			onResizeRef.current(w, h, cropX, cropY);
		}

		setIsDragging(false);
		setInteractionMode('idle');
		setActiveHandle(null);
	}, [applyPointerMove, computeCrop]);

	useEffect(() => {
		if (!isDragging) return;
		window.addEventListener('pointermove', pointerMove);
		window.addEventListener('pointerup', pointerUp);
		window.addEventListener('pointercancel', pointerUp);
		return () => {
			window.removeEventListener('pointermove', pointerMove);
			window.removeEventListener('pointerup', pointerUp);
			window.removeEventListener('pointercancel', pointerUp);
		};
	}, [isDragging, pointerMove, pointerUp]);

	// ── Canvas pointer: decide pan vs nothing ────────────────────────

	const canvasPointerDown = useCallback(
		(e: ReactPointerEvent) => {
			if (disabled) return;
			if (spaceHeld || e.button === 1) {
				imagePanDown(e);
			}
		},
		[disabled, spaceHeld, imagePanDown],
	);

	// ── Keyboard nudge ───────────────────────────────────────────────

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (disabled) return;
			if (e.code === 'Space') return;

			const step = e.shiftKey ? NUDGE_SHIFT_PX : NUDGE_PX;
			const cfg = configRef.current;
			let nw = cfg.width;
			let nh = cfg.height;

			switch (e.key) {
				case 'ArrowRight':
					nw += step;
					break;
				case 'ArrowLeft':
					nw -= step;
					break;
				case 'ArrowDown':
					nh += step;
					break;
				case 'ArrowUp':
					nh -= step;
					break;
				default:
					return;
			}
			e.preventDefault();
			nw = clamp(nw, MIN_DIM, MAX_DIM);
			nh = clamp(nh, MIN_DIM, MAX_DIM);

			if (cfg.lockAspectRatio) {
				const ratio = cfg.width / cfg.height;
				if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
					nh = clamp(Math.round(nw / ratio), MIN_DIM, MAX_DIM);
				} else {
					nw = clamp(Math.round(nh * ratio), MIN_DIM, MAX_DIM);
				}
			}
			const { cropX, cropY } = computeCrop(nw, nh);
			onResizeRef.current(nw, nh, cropX, cropY);
		},
		[disabled, computeCrop],
	);

	// ── Reset (on image switch) ──────────────────────────────────────

	const resetInteraction = useCallback((offX = 0, offY = 0) => {
		dragRef.current = null;
		setIsDragging(false);
		setInteractionMode('idle');
		setActiveHandle(null);
		setHoveredHandle(null);
		setDragW(0);
		setDragH(0);
		setFrameOffX(offX);
		setFrameOffY(offY);
	}, []);

	return {
		isDragging,
		interactionMode,
		activeHandle,
		hoveredHandle,
		liveW,
		liveH,
		frameOffX,
		frameOffY,
		handlePointerDown,
		framePointerDown,
		canvasPointerDown,
		handleKeyDown,
		setHoveredHandle,
		resetInteraction,
	};
}
