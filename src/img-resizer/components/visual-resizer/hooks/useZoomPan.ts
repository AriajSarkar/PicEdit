'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { clamp } from '../geometry';
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, PADDING } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseZoomPanOptions {
	containerRef: React.RefObject<HTMLDivElement | null>;
	cSize: { w: number; h: number };
	originalWidth: number;
	originalHeight: number;
	disabled: boolean;
	initialZoom?: number;
	initialPanX?: number;
	initialPanY?: number;
}

export interface UseZoomPanReturn {
	zoom: number;
	panX: number;
	panY: number;
	spaceHeld: boolean;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	setPanX: React.Dispatch<React.SetStateAction<number>>;
	setPanY: React.Dispatch<React.SetStateAction<number>>;
	handleWheel: (e: React.WheelEvent) => void;
	handleDoubleClick: (e: React.MouseEvent) => void;
	resetView: () => void;
	/** Reset to specific values (e.g. on image switch). */
	resetTo: (z: number, px: number, py: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useZoomPan({
	containerRef,
	cSize,
	originalWidth,
	originalHeight,
	disabled,
	initialZoom = DEFAULT_ZOOM,
	initialPanX = 0,
	initialPanY = 0,
}: UseZoomPanOptions): UseZoomPanReturn {
	const [zoom, setZoom] = useState(initialZoom);
	const [panX, setPanX] = useState(initialPanX);
	const [panY, setPanY] = useState(initialPanY);
	const [spaceHeld, setSpaceHeld] = useState(false);

	// ── Spacebar + Ctrl keyboard shortcuts ───────────────────────────

	useEffect(() => {
		const isEditable = (target: EventTarget | null): boolean =>
			target instanceof HTMLElement &&
			(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

		const isInsideCanvas = (target: EventTarget | null): boolean => {
			const container = containerRef.current;
			return !!container && target instanceof Node && container.contains(target);
		};

		const onDown = (e: KeyboardEvent) => {
			const container = containerRef.current;
			const active = document.activeElement;
			const focusedInCanvas =
				!!container && !!active && (active === container || container.contains(active));
			if ((!focusedInCanvas && !isInsideCanvas(e.target)) || isEditable(e.target)) return;

			if (e.code === 'Space' && !e.repeat) {
				e.preventDefault();
				setSpaceHeld(true);
				return;
			}
			// Ctrl+ / Ctrl- / Ctrl0 zoom shortcuts
			if (e.ctrlKey || e.metaKey) {
				if (e.key === '=' || e.key === '+') {
					e.preventDefault();
					setZoom((prev) => clamp(+(prev + 0.1).toFixed(2), MIN_ZOOM, MAX_ZOOM));
				} else if (e.key === '-') {
					e.preventDefault();
					setZoom((prev) => clamp(+(prev - 0.1).toFixed(2), MIN_ZOOM, MAX_ZOOM));
				} else if (e.key === '0') {
					e.preventDefault();
					setZoom(DEFAULT_ZOOM);
					setPanX(0);
					setPanY(0);
				}
			}
		};
		const onUp = (e: KeyboardEvent) => {
			const container = containerRef.current;
			const active = document.activeElement;
			const focusedInCanvas =
				!!container && !!active && (active === container || container.contains(active));
			if ((!focusedInCanvas && !isInsideCanvas(e.target)) || isEditable(e.target)) return;
			if (e.code === 'Space') setSpaceHeld(false);
		};
		window.addEventListener('keydown', onDown);
		window.addEventListener('keyup', onUp);
		return () => {
			window.removeEventListener('keydown', onDown);
			window.removeEventListener('keyup', onUp);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Pinch-to-zoom (touch) ────────────────────────────────────────

	const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const touchDist = (t: TouchList) => {
			const dx = t[0].clientX - t[1].clientX;
			const dy = t[0].clientY - t[1].clientY;
			return Math.hypot(dx, dy);
		};

		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				e.preventDefault();
				pinchRef.current = { dist: touchDist(e.touches), zoom };
			}
		};
		const onTouchMove = (e: TouchEvent) => {
			if (e.touches.length === 2 && pinchRef.current) {
				e.preventDefault();
				const newDist = touchDist(e.touches);
				const ratio = newDist / pinchRef.current.dist;
				setZoom(clamp(+(pinchRef.current.zoom * ratio).toFixed(2), MIN_ZOOM, MAX_ZOOM));
			}
		};
		const onTouchEnd = () => {
			pinchRef.current = null;
		};

		el.addEventListener('touchstart', onTouchStart, { passive: false });
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		el.addEventListener('touchend', onTouchEnd);
		return () => {
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
			el.removeEventListener('touchend', onTouchEnd);
		};
	}, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Mouse wheel zoom (toward cursor) ─────────────────────────────

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			if (disabled) return;
			e.preventDefault();
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			const delta = e.deltaY > 0 ? -0.1 : 0.1;

			setZoom((prevZoom) => {
				const newZoom = clamp(+(prevZoom + delta).toFixed(2), MIN_ZOOM, MAX_ZOOM);
				if (newZoom === prevZoom) return prevZoom;

				const cw = cSize.w;
				const ch = cSize.h;
				const maxW = cw - PADDING * 2;
				const maxH = ch - PADDING * 2;
				if (maxW <= 0 || maxH <= 0 || originalWidth <= 0 || originalHeight <= 0)
					return newZoom;
				const baseScale = Math.min(maxW / originalWidth, maxH / originalHeight);
				const s1 = baseScale * prevZoom;
				const s2 = baseScale * newZoom;
				const ratio = s1 > 0 ? s2 / s1 : 1;

				const base1x = (cw - originalWidth * s1) / 2;
				const base1y = (ch - originalHeight * s1) / 2;
				const base2x = (cw - originalWidth * s2) / 2;
				const base2y = (ch - originalHeight * s2) / 2;

				setPanX((prevPanX) => {
					const ix1 = base1x + prevPanX;
					const newIx = cx - ratio * (cx - ix1);
					return newIx - base2x;
				});
				setPanY((prevPanY) => {
					const iy1 = base1y + prevPanY;
					const newIy = cy - ratio * (cy - iy1);
					return newIy - base2y;
				});

				return newZoom;
			});
		},
		[containerRef, disabled, cSize.w, cSize.h, originalWidth, originalHeight],
	);

	// ── Double-click: toggle zoom at cursor point ────────────────────

	const TOGGLE_ZOOM = 2;
	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			if (disabled) return;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;

			setZoom((prevZoom) => {
				const isZoomed = Math.abs(prevZoom - DEFAULT_ZOOM) > 0.05;
				const newZoom = isZoomed ? DEFAULT_ZOOM : TOGGLE_ZOOM;

				const cw = cSize.w;
				const ch = cSize.h;
				const maxW = cw - PADDING * 2;
				const maxH = ch - PADDING * 2;
				if (maxW <= 0 || maxH <= 0 || originalWidth <= 0 || originalHeight <= 0)
					return newZoom;
				const baseScale = Math.min(maxW / originalWidth, maxH / originalHeight);
				const s1 = baseScale * prevZoom;
				const s2 = baseScale * newZoom;
				const ratio = s1 > 0 ? s2 / s1 : 1;

				const base1x = (cw - originalWidth * s1) / 2;
				const base1y = (ch - originalHeight * s1) / 2;
				const base2x = (cw - originalWidth * s2) / 2;
				const base2y = (ch - originalHeight * s2) / 2;

				if (isZoomed) {
					setPanX(0);
					setPanY(0);
				} else {
					setPanX((prevPanX) => {
						const ix1 = base1x + prevPanX;
						return cx - ratio * (cx - ix1) - base2x;
					});
					setPanY((prevPanY) => {
						const iy1 = base1y + prevPanY;
						return cy - ratio * (cy - iy1) - base2y;
					});
				}
				return newZoom;
			});
		},
		[containerRef, disabled, cSize.w, cSize.h, originalWidth, originalHeight],
	);

	// ── Reset view ───────────────────────────────────────────────────

	const resetView = useCallback(() => {
		setZoom(DEFAULT_ZOOM);
		setPanX(0);
		setPanY(0);
	}, []);

	const resetTo = useCallback((z: number, px: number, py: number) => {
		setZoom(z);
		setPanX(px);
		setPanY(py);
	}, []);

	return {
		zoom,
		panX,
		panY,
		spaceHeld,
		setZoom,
		setPanX,
		setPanY,
		handleWheel,
		handleDoubleClick,
		resetView,
		resetTo,
	};
}
