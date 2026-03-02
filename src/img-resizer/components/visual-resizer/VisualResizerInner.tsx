'use client';
/* eslint-disable @next/next/no-img-element */

import {
  memo,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fitScale, imgRect, boxRect, clamp } from './geometry';
import { Toolbar } from './Toolbar';
import { EdgeLabel } from './EdgeLabel';
import { ZoomBar } from './ZoomBar';
import { ImageStrip } from './ImageStrip';
import {
  CORNERS,
  BRACKET_ARM,
  BRACKET_THICK,
  EDGE_SIZE_W,
  EDGE_SIZE_H,
  HIT_EXPAND,
  CANVAS_HEIGHT,
  MIN_DIM,
  MAX_DIM,
  NUDGE_PX,
  NUDGE_SHIFT_PX,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  CURSOR,
} from './types';
import {
  PADDING,
  type HandleId,
  type InteractionMode,
  type DragState,
  type InnerProps,
  type ViewState,
} from './types';

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
  const dragRef = useRef<DragState | null>(null);

  // ── Restore persisted view state on mount ──────────────────────────
  const cached = viewStateCache?.get(imageId);

  const [cSize, setCSize] = useState({ w: 600, h: CANVAS_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null);
  const [dragW, setDragW] = useState(effectiveW);
  const [dragH, setDragH] = useState(effectiveH);
  const [frameOffX, setFrameOffX] = useState(cached?.frameOffX ?? 0);
  const [frameOffY, setFrameOffY] = useState(cached?.frameOffY ?? 0);
  const [panX, setPanX] = useState(cached?.panX ?? 0);
  const [panY, setPanY] = useState(cached?.panY ?? 0);
  const [zoom, setZoom] = useState(cached?.zoom ?? DEFAULT_ZOOM);
  const [spaceHeld, setSpaceHeld] = useState(false);

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

  // ── Adjust state during render when imageId changes (React recommended pattern) ──
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevImageId, setPrevImageId] = useState(imageId);
  if (prevImageId !== imageId) {
    setPrevImageId(imageId);

    const next = viewStateCache?.get(imageId);

    setIsDragging(false);
    setInteractionMode('idle');
    setActiveHandle(null);
    setHoveredHandle(null);
    setDragW(effectiveW);
    setDragH(effectiveH);
    setZoom(next?.zoom ?? DEFAULT_ZOOM);
    setPanX(next?.panX ?? 0);
    setPanY(next?.panY ?? 0);
    setFrameOffX(next?.frameOffX ?? 0);
    setFrameOffY(next?.frameOffY ?? 0);
  }

  // ── Sync refs when imageId changes (ref mutations belong in effects, not render) ──
  useEffect(() => {
    dragRef.current = null;
    viewStateRef.current = {
      zoom,
      panX,
      panY,
      frameOffX,
      frameOffY,
    };
  }, [imageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Skip the debounced cache write when imageId just changed — the state
    // values are from initial hydration, not from user interaction.
    if (prevPersistImageRef.current !== imageId) {
      prevPersistImageRef.current = imageId;
      viewStateRef.current = { zoom, panX, panY, frameOffX, frameOffY };
      return;
    }
    viewStateRef.current = { zoom, panX, panY, frameOffX, frameOffY };
    // Debounce cache writes — no need to write 60fps during drag
    clearTimeout(cacheTimer.current);
    cacheTimer.current = setTimeout(() => {
      viewStateCache?.set(imageId, viewStateRef.current);
    }, 300);
  }, [zoom, panX, panY, frameOffX, frameOffY, viewStateCache, imageId]);

  // Save on unmount — always flush latest
  useEffect(() => {
    return () => {
      clearTimeout(cacheTimer.current);
      viewStateCache?.set(imageId, viewStateRef.current);
    };
  }, [imageId, viewStateCache]);

  const liveW = isDragging && interactionMode === 'resize' ? dragW : effectiveW;
  const liveH = isDragging && interactionMode === 'resize' ? dragH : effectiveH;

  // ── Observe container size ─────────────────────────────────────────

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

  // ── Stable refs ────────────────────────────────────────────────────

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

  // ── Derived geometry ───────────────────────────────────────────────

  const scale = useMemo(
    () => fitScale(cSize.w, cSize.h, originalWidth, originalHeight, zoom),
    [cSize.w, cSize.h, originalWidth, originalHeight, zoom],
  );

  const ir = useMemo(() => {
    const base = imgRect(cSize.w, cSize.h, originalWidth, originalHeight, scale);
    return { x: base.x + panX, y: base.y + panY, w: base.w, h: base.h };
  }, [cSize.w, cSize.h, originalWidth, originalHeight, scale, panX, panY]);

  const br = useMemo(
    () => boxRect(ir.x, ir.y, ir.w, ir.h, liveW, liveH, scale, frameOffX, frameOffY),
    [ir.x, ir.y, ir.w, ir.h, liveW, liveH, scale, frameOffX, frameOffY],
  );

  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // ── Spacebar + Ctrl keyboard shortcuts ─────────────────────────────

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
  }, []);

  // ── Pinch-to-zoom (touch) ─────────────────────────────────────────

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
  }, [zoom]);

  // ── Pointer: handle resize ────────────────────────────────────────

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

  // ── Pointer: frame move ───────────────────────────────────────────

  const frameOffRef = useRef({ x: frameOffX, y: frameOffY });
  useEffect(() => {
    frameOffRef.current = { x: frameOffX, y: frameOffY };
  }, [frameOffX, frameOffY]);

  const panRefState = useRef({ x: panX, y: panY });
  useEffect(() => {
    panRefState.current = { x: panX, y: panY };
  }, [panX, panY]);

  /** Compute crop origin in original-image pixels from current frame offset. */
  const computeCrop = useCallback(
    (frameW: number, frameH: number) => {
      const s = scaleRef.current;
      const off = frameOffRef.current;
      // Frame is centered on image by default; offset adjusts from centre.
      // Convert canvas-pixel offset to original-image pixels (÷ scale).
      const cropX = (originalWidth - frameW) / 2 + (s > 0 ? off.x / s : 0);
      const cropY = (originalHeight - frameH) / 2 + (s > 0 ? off.y / s : 0);
      return { cropX, cropY };
    },
    [originalWidth, originalHeight],
  );

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

  // ── Pointer: image pan ────────────────────────────────────────────

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

  // ── Global pointer move / up ──────────────────────────────────────
  // RAF-gated: pointer events fire 60-120fps but we only commit to
  // React state once per animation frame. This eliminates re-render
  // storms during drag/pan/zoom — the single biggest perf win.

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

      // Keep ref in sync synchronously so pointerUp commits the latest values.
      liveRef.current = { w: nw, h: nh };
      setDragW(nw);
      setDragH(nh);
    } else if (d.mode === 'move-frame') {
      setFrameOffX(d.startOffX + dx);
      setFrameOffY(d.startOffY + dy);
    } else if (d.mode === 'pan-image') {
      setPanX(d.startPanX + dx);
      setPanY(d.startPanY + dy);
    }
  }, []);

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

    // Cancel any pending RAF
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
    // Flush last pending position
    if (pendingPointer.current) {
      applyPointerMove();
      pendingPointer.current = null;
    }

    if (d.mode === 'resize') {
      const { w, h } = liveRef.current;
      const { cropX, cropY } = computeCrop(w, h);
      onResizeRef.current(w, h, cropX, cropY);
    } else if (d.mode === 'move-frame') {
      // Frame position changed — recompute crop with current dimensions
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

  // ── Canvas pointer: decide pan vs nothing ─────────────────────────

  const canvasPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled) return;
      if (spaceHeld || e.button === 1) {
        imagePanDown(e);
      }
    },
    [disabled, spaceHeld, imagePanDown],
  );

  // ── Mouse wheel zoom (toward cursor) ───────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Cursor position relative to container
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;

      // Use functional setState so we always read the latest zoom/pan
      setZoom((prevZoom) => {
        const newZoom = clamp(+(prevZoom + delta).toFixed(2), MIN_ZOOM, MAX_ZOOM);
        if (newZoom === prevZoom) return prevZoom;

        // Compute old and new scales from the fit function
        const cw = cSize.w;
        const ch = cSize.h;
        const maxW = cw - PADDING * 2;
        const maxH = ch - PADDING * 2;
        if (maxW <= 0 || maxH <= 0 || originalWidth <= 0 || originalHeight <= 0) return newZoom;
        const baseScale = Math.min(maxW / originalWidth, maxH / originalHeight);
        const s1 = baseScale * prevZoom;
        const s2 = baseScale * newZoom;
        const ratio = s1 > 0 ? s2 / s1 : 1;

        // Old image rect center (before pan): centered in container
        const base1x = (cw - originalWidth * s1) / 2;
        const base1y = (ch - originalHeight * s1) / 2;
        const base2x = (cw - originalWidth * s2) / 2;
        const base2y = (ch - originalHeight * s2) / 2;

        // Adjust pan so cursor keeps pointing at the same image position
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
    [disabled, cSize.w, cSize.h, originalWidth, originalHeight],
  );

  // ── Keyboard nudge ────────────────────────────────────────────────

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

  // ── Reset view ────────────────────────────────────────────────────

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPanX(0);
    setPanY(0);
    setFrameOffX(0);
    setFrameOffY(0);
  }, []);

  // ── Double-click: toggle zoom at cursor point ─────────────────────

  const TOGGLE_ZOOM = 2;
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // If already zoomed past default, reset; otherwise zoom to TOGGLE_ZOOM at cursor
      setZoom((prevZoom) => {
        const isZoomed = Math.abs(prevZoom - DEFAULT_ZOOM) > 0.05;
        const newZoom = isZoomed ? DEFAULT_ZOOM : TOGGLE_ZOOM;

        const cw = cSize.w;
        const ch = cSize.h;
        const maxW = cw - PADDING * 2;
        const maxH = ch - PADDING * 2;
        if (maxW <= 0 || maxH <= 0 || originalWidth <= 0 || originalHeight <= 0) return newZoom;
        const baseScale = Math.min(maxW / originalWidth, maxH / originalHeight);
        const s1 = baseScale * prevZoom;
        const s2 = baseScale * newZoom;
        const ratio = s1 > 0 ? s2 / s1 : 1;

        const base1x = (cw - originalWidth * s1) / 2;
        const base1y = (ch - originalHeight * s1) / 2;
        const base2x = (cw - originalWidth * s2) / 2;
        const base2y = (ch - originalHeight * s2) / 2;

        if (isZoomed) {
          // Reset pan when going back to fit
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
    [disabled, cSize.w, cSize.h, originalWidth, originalHeight],
  );

  // ── Display info ──────────────────────────────────────────────────

  const pctW = originalWidth > 0 ? ((liveW / originalWidth) * 100).toFixed(0) : '—';
  const pctH = originalHeight > 0 ? ((liveH / originalHeight) * 100).toFixed(0) : '—';
  const isUpscale = liveW > originalWidth || liveH > originalHeight;
  const showStrip = items.length > 1;

  let canvasCursor = 'default';
  if (spaceHeld) canvasCursor = isDragging ? 'grabbing' : 'grab';
  else if (isDragging && activeHandle) canvasCursor = CURSOR[activeHandle];
  else if (isDragging && interactionMode === 'move-frame') canvasCursor = 'move';

  // ── Render ────────────────────────────────────────────────────────

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

        {/* Rule-of-thirds grid (always visible) */}
        {br.w > 60 && br.h > 60 && (
          <div
            className="absolute pointer-events-none"
            style={{ left: br.x, top: br.y, width: br.w, height: br.h }}
          >
            <div
              className="absolute top-0 bottom-0 border-l"
              style={{ left: '33.33%', borderColor: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute top-0 bottom-0 border-l"
              style={{ left: '66.66%', borderColor: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute left-0 right-0 border-t"
              style={{ top: '33.33%', borderColor: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute left-0 right-0 border-t"
              style={{ top: '66.66%', borderColor: 'rgba(255,255,255,0.08)' }}
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
                  style={{ left: 0, right: 0, top, borderColor: 'rgba(224,122,95,0.18)' }}
                />
              ))}
              {[br.x, br.x + br.w].map((left, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute border-l border-dashed"
                  style={{ top: 0, bottom: 0, left, borderColor: 'rgba(224,122,95,0.18)' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dimension labels */}
        <EdgeLabel value={`${liveW}px`} axis="x" x={br.x + br.w / 2} y={br.y - 20} />
        <EdgeLabel value={`${liveH}px`} axis="y" x={br.x + br.w + 8} y={br.y + br.h / 2} />

        {/* L-shaped bracket corner handles */}
        {!disabled &&
          CORNERS.map((id) => {
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
                  onPointerDown={(e) => handlePointerDown(id, e)}
                  onPointerEnter={() => !isDragging && setHoveredHandle(id)}
                  onPointerLeave={() => !isDragging && setHoveredHandle(null)}
                />
              </div>
            );
          })}

        {/* Edge handles */}
        {!disabled &&
          (['n', 's', 'e', 'w'] as HandleId[]).map((id) => {
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
                onPointerDown={(e) => handlePointerDown(id, e)}
                onPointerEnter={() => !isDragging && setHoveredHandle(id)}
                onPointerLeave={() => !isDragging && setHoveredHandle(null)}
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

        {/* Floating HUD */}
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
                      {liveW} × {liveH}
                    </span>
                    <div className="w-px h-3 bg-white/10" />
                    <span
                      className={`text-[10px] font-mono ${isUpscale ? 'text-amber-400/80' : 'text-emerald-400/80'}`}
                    >
                      {pctW}×{pctH}%
                    </span>
                  </>
                )}
                {interactionMode === 'move-frame' && (
                  <span className="text-[11px] font-mono text-white/70">Moving frame</span>
                )}
                {interactionMode === 'pan-image' && (
                  <span className="text-[11px] font-mono text-white/70">Panning image</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
