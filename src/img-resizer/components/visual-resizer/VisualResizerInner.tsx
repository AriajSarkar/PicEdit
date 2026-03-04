'use client';
/* eslint-disable @next/next/no-img-element */

import { memo, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fitScale, imgRect, boxRect } from './utils/geometry';
import { Toolbar } from './parts/Toolbar';
import { EdgeLabel } from './parts/EdgeLabel';
import { ZoomBar } from './parts/ZoomBar';
import { ImageStrip } from './parts/ImageStrip';
import { OverlayHandles } from './parts/OverlayHandles';
import { FloatingHUD } from './parts/FloatingHUD';
import { useZoomPan } from './hooks/useZoomPan';
import { useResizeInteraction } from './hooks/useResizeInteraction';
import {
	BRACKET_ARM,
	CANVAS_HEIGHT,
	DEFAULT_ZOOM,
	CURSOR,
	type InnerProps,
	type ViewState,
} from './utils/types';

export const VisualResizerInner = memo(function VisualResizerInner({
	imageSrc,
	originalWidth,
	originalHeight,
	config,
	effectiveW,
	effectiveH,
	onResize,
	disabled,
	items,
	selectedIndex,
	onSelectIndex,
	viewStateCache,
	imageId,
}: InnerProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// ── Restore persisted view state on mount ──────────────────────────
	const cached = viewStateCache?.get(imageId);

	const [cSize, setCSize] = useState({ w: 600, h: CANVAS_HEIGHT });

	// ── Zoom & Pan ───────────────────────────────────────────────────
	const {
		zoom,
		panX,
		panY,
		spaceHeld,
		setZoom,
		setPanX,
		setPanY,
		handleWheel,
		handleDoubleClick,
		resetView: resetZoomPan,
		resetTo: resetZoomPanTo,
	} = useZoomPan({
		containerRef,
		cSize,
		originalWidth,
		originalHeight,
		disabled: disabled ?? false,
		initialZoom: cached?.zoom ?? DEFAULT_ZOOM,
		initialPanX: cached?.panX ?? 0,
		initialPanY: cached?.panY ?? 0,
	});

	// ── Derived geometry ─────────────────────────────────────────────

	const scale = useMemo(
		() => fitScale(cSize.w, cSize.h, originalWidth, originalHeight, zoom),
		[cSize.w, cSize.h, originalWidth, originalHeight, zoom],
	);

	// ── Resize Interaction ───────────────────────────────────────────
	const {
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
	} = useResizeInteraction({
		config,
		effectiveW,
		effectiveH,
		originalWidth,
		originalHeight,
		disabled: disabled ?? false,
		scale,
		spaceHeld,
		onResize,
		setPanX,
		setPanY,
		initialFrameOffX: cached?.frameOffX ?? 0,
		initialFrameOffY: cached?.frameOffY ?? 0,
	});

	// ── Save view state back to cache (debounced) & on unmount ─────

	const viewStateRef = useRef<ViewState>({
		zoom: cached?.zoom ?? DEFAULT_ZOOM,
		panX: cached?.panX ?? 0,
		panY: cached?.panY ?? 0,
		frameOffX: cached?.frameOffX ?? 0,
		frameOffY: cached?.frameOffY ?? 0,
	});

	const cacheTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const prevPersistImageRef = useRef(imageId);

	// ── Adjust state during render when imageId changes ──────────────
	const [prevImageId, setPrevImageId] = useState(imageId);
	if (prevImageId !== imageId) {
		setPrevImageId(imageId);

		const next = viewStateCache?.get(imageId);

		resetZoomPanTo(next?.zoom ?? DEFAULT_ZOOM, next?.panX ?? 0, next?.panY ?? 0);
		resetInteraction(next?.frameOffX ?? 0, next?.frameOffY ?? 0);
	}

	// ── Sync refs when imageId changes ───────────────────────────────
	useEffect(() => {
		viewStateRef.current = { zoom, panX, panY, frameOffX, frameOffY };
	}, [imageId]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (prevPersistImageRef.current !== imageId) {
			prevPersistImageRef.current = imageId;
			viewStateRef.current = { zoom, panX, panY, frameOffX, frameOffY };
			return;
		}
		viewStateRef.current = { zoom, panX, panY, frameOffX, frameOffY };
		clearTimeout(cacheTimer.current);
		cacheTimer.current = setTimeout(() => {
			viewStateCache?.set(imageId, viewStateRef.current);
		}, 300);
	}, [zoom, panX, panY, frameOffX, frameOffY, viewStateCache, imageId]);

	// Save on unmount
	useEffect(() => {
		return () => {
			clearTimeout(cacheTimer.current);
			viewStateCache?.set(imageId, viewStateRef.current);
		};
	}, [imageId, viewStateCache]);

	// ── Observe container size ────────────────────────────────────────

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const { width, height } = entry.contentRect;
			setCSize((prev) => {
				const nw = Math.round(width);
				const nh = Math.round(height);
				return prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh };
			});
		});
		ro.observe(el);
		const r = el.getBoundingClientRect();
		setCSize({ w: Math.round(r.width), h: Math.round(r.height) });
		return () => ro.disconnect();
	}, []);

	// ── Derived rects ────────────────────────────────────────────────

	const ir = useMemo(() => {
		const base = imgRect(cSize.w, cSize.h, originalWidth, originalHeight, scale);
		return { x: base.x + panX, y: base.y + panY, w: base.w, h: base.h };
	}, [cSize.w, cSize.h, originalWidth, originalHeight, scale, panX, panY]);

	const br = useMemo(
		() => boxRect(ir.x, ir.y, ir.w, ir.h, liveW, liveH, scale, frameOffX, frameOffY),
		[ir.x, ir.y, ir.w, ir.h, liveW, liveH, scale, frameOffX, frameOffY],
	);

	// ── Reset view (includes frame offset) ───────────────────────────

	const resetView = useCallback(() => {
		resetZoomPan();
		resetInteraction(0, 0);
	}, [resetZoomPan, resetInteraction]);

	// ── Display info ─────────────────────────────────────────────────

	const pctW = originalWidth > 0 ? ((liveW / originalWidth) * 100).toFixed(0) : '\u2014';
	const pctH = originalHeight > 0 ? ((liveH / originalHeight) * 100).toFixed(0) : '\u2014';
	const isUpscale = liveW > originalWidth || liveH > originalHeight;
	const showStrip = items.length > 1;

	let canvasCursor = 'default';
	if (spaceHeld) canvasCursor = isDragging ? 'grabbing' : 'grab';
	else if (isDragging && activeHandle) canvasCursor = CURSOR[activeHandle];
	else if (isDragging && interactionMode === 'move-frame') canvasCursor = 'move';

	// ── Render ───────────────────────────────────────────────────────

	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
			className="rounded-2xl overflow-hidden border border-border bg-surface"
			style={{
				boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset',
			}}
		>
			{/* Toolbar */}
			<Toolbar
				config={config}
				liveW={liveW}
				liveH={liveH}
				originalWidth={originalWidth}
				originalHeight={originalHeight}
				pctW={pctW}
				isUpscale={isUpscale}
				itemCount={items.length}
				selectedIndex={selectedIndex}
			/>

			{/* Canvas */}
			<div
				ref={containerRef}
				className="relative select-none outline-none overflow-hidden"
				style={{
					height: CANVAS_HEIGHT,
					cursor: canvasCursor,
					background:
						'repeating-conic-gradient(var(--bg-primary) 0% 25%, color-mix(in srgb, var(--bg-elevated) 60%, transparent) 0% 50%) 0 0 / 14px 14px',
				}}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onPointerDown={canvasPointerDown}
				onWheel={handleWheel}
				onDoubleClick={handleDoubleClick}
			>
				{/* Dimmed full image */}
				<img
					src={imageSrc}
					alt=""
					className="absolute max-w-none pointer-events-none"
					style={{
						left: ir.x,
						top: ir.y,
						width: ir.w,
						height: ir.h,
						opacity: 0.18,
						filter: 'grayscale(0.4)',
					}}
					draggable={false}
				/>

				{/* Bright image clipped to target box */}
				<div
					className="absolute overflow-hidden"
					style={{
						left: br.x,
						top: br.y,
						width: br.w,
						height: br.h,
						boxShadow: '0 2px 24px rgba(0,0,0,0.4)',
					}}
				>
					<img
						src={imageSrc}
						alt=""
						className="max-w-none pointer-events-none"
						style={{
							position: 'absolute',
							left: ir.x - br.x,
							top: ir.y - br.y,
							width: ir.w,
							height: ir.h,
						}}
						draggable={false}
					/>
				</div>

				{/* Box border */}
				<div
					className="absolute pointer-events-none"
					style={{
						left: br.x,
						top: br.y,
						width: br.w,
						height: br.h,
						border: '1.5px solid var(--accent)',
						boxShadow: '0 0 0 1px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.1)',
					}}
				/>

				{/* Frame drag area (inside box, behind handles) */}
				{!disabled && !spaceHeld && (
					<div
						className="absolute z-10"
						style={{
							left: br.x + BRACKET_ARM,
							top: br.y + BRACKET_ARM,
							width: Math.max(0, br.w - BRACKET_ARM * 2),
							height: Math.max(0, br.h - BRACKET_ARM * 2),
							cursor: 'move',
						}}
						onPointerDown={framePointerDown}
					/>
				)}

				{/* Rule-of-thirds grid */}
				{br.w > 60 && br.h > 60 && (
					<div
						className="absolute pointer-events-none"
						style={{
							left: br.x,
							top: br.y,
							width: br.w,
							height: br.h,
						}}
					>
						<div
							className="absolute top-0 bottom-0 border-l"
							style={{
								left: '33.33%',
								borderColor: 'rgba(255,255,255,0.08)',
							}}
						/>
						<div
							className="absolute top-0 bottom-0 border-l"
							style={{
								left: '66.66%',
								borderColor: 'rgba(255,255,255,0.08)',
							}}
						/>
						<div
							className="absolute left-0 right-0 border-t"
							style={{
								top: '33.33%',
								borderColor: 'rgba(255,255,255,0.08)',
							}}
						/>
						<div
							className="absolute left-0 right-0 border-t"
							style={{
								top: '66.66%',
								borderColor: 'rgba(255,255,255,0.08)',
							}}
						/>
					</div>
				)}

				{/* Guide lines during resize drag */}
				<AnimatePresence>
					{isDragging && interactionMode === 'resize' && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.1 }}
							className="absolute inset-0 pointer-events-none"
						>
							{[br.y, br.y + br.h].map((top, i) => (
								<div
									key={`h-${i}`}
									className="absolute border-t border-dashed"
									style={{
										left: 0,
										right: 0,
										top,
										borderColor: 'rgba(224,122,95,0.18)',
									}}
								/>
							))}
							{[br.x, br.x + br.w].map((left, i) => (
								<div
									key={`v-${i}`}
									className="absolute border-l border-dashed"
									style={{
										top: 0,
										bottom: 0,
										left,
										borderColor: 'rgba(224,122,95,0.18)',
									}}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Dimension labels */}
				<EdgeLabel value={`${liveW}px`} axis="x" x={br.x + br.w / 2} y={br.y - 20} />
				<EdgeLabel value={`${liveH}px`} axis="y" x={br.x + br.w + 8} y={br.y + br.h / 2} />

				{/* Corner & edge handles */}
				<OverlayHandles
					br={br}
					disabled={disabled ?? false}
					isDragging={isDragging}
					hoveredHandle={hoveredHandle}
					activeHandle={activeHandle}
					onPointerDown={handlePointerDown}
					onHoverHandle={setHoveredHandle}
				/>

				{/* Floating HUD */}
				<FloatingHUD
					isDragging={isDragging}
					interactionMode={interactionMode}
					liveW={liveW}
					liveH={liveH}
					pctW={pctW}
					pctH={pctH}
					isUpscale={isUpscale}
				/>
			</div>

			{/* Zoom bar */}
			<ZoomBar zoom={zoom} onZoom={setZoom} onReset={resetView} />

			{/* Image strip */}
			{showStrip && (
				<ImageStrip
					items={items}
					selectedIndex={selectedIndex}
					onSelect={onSelectIndex}
					disabled={isDragging}
				/>
			)}
		</motion.div>
	);
});
