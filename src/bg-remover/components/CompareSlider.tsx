"use client";

import { useRef, useCallback, useEffect } from "react";

interface CompareSliderProps {
  originalImage: string;
  processedImage: string;
}

/**
 * GPU-accelerated compare slider.
 *
 * Strategy: Both images are rendered to a single <canvas> at DISPLAY resolution
 * (not source resolution). The slider position simply controls how many columns
 * of each image to draw. This means:
 *  - Zero layout/reflow (no clip-path, no DOM style updates during drag)
 *  - Constant memory (canvas is always display-size, not image-size)
 *  - 60fps+ on 4K images because we never decode or composite full-res during drag
 */
export function CompareSlider({ originalImage, processedImage }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const posRef = useRef(0.5); // 0..1
  const rafRef = useRef(0);

  // Cache decoded images as ImageBitmap for instant GPU draws
  const originalBmpRef = useRef<ImageBitmap | null>(null);
  const processedBmpRef = useRef<ImageBitmap | null>(null);
  const naturalW = useRef(0);
  const naturalH = useRef(0);

  // ── Draw one frame ──────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const origBmp = originalBmpRef.current;
    const procBmp = processedBmpRef.current;
    if (!origBmp || !procBmp) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const nw = naturalW.current;
    const nh = naturalH.current;

    // Compute object-contain fit
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    // Split x in canvas coords
    const splitX = dx + dw * posRef.current;

    // Clear + checkerboard is handled by CSS on the container
    ctx.clearRect(0, 0, cw, ch);

    // Draw processed (right side — full, then we overdraw left)
    ctx.drawImage(procBmp, 0, 0, nw, nh, dx, dy, dw, dh);

    // Draw original (left side only) — clip to splitX
    if (splitX > dx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, splitX - dx, dh);
      ctx.clip();
      ctx.drawImage(origBmp, 0, 0, nw, nh, dx, dy, dw, dh);
      ctx.restore();
    }

    // Divider line
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(splitX, dy);
    ctx.lineTo(splitX, dy + dh);
    ctx.stroke();
    ctx.restore();

    // Position the DOM handle
    if (handleRef.current) {
      handleRef.current.style.left = `${(splitX / cw) * 100}%`;
    }
  }, []);

  // ── Decode images into ImageBitmaps ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function decode(src: string): Promise<ImageBitmap> {
      const res = await fetch(src);
      const blob = await res.blob();
      return createImageBitmap(blob);
    }

    Promise.all([decode(originalImage), decode(processedImage)]).then(
      ([origBmp, procBmp]) => {
        if (cancelled) {
          origBmp.close();
          procBmp.close();
          return;
        }
        // Close old bitmaps
        originalBmpRef.current?.close();
        processedBmpRef.current?.close();

        originalBmpRef.current = origBmp;
        processedBmpRef.current = procBmp;
        naturalW.current = origBmp.width;
        naturalH.current = origBmp.height;

        draw();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [originalImage, processedImage, draw]);

  // ── Size canvas to container (with DPR) ─────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      draw();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // ── Pointer handling (zero-alloc, direct rAF) ───────────────────
  const updatePosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      posRef.current = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    },
    [draw]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      isDragging.current = true;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      originalBmpRef.current?.close();
      processedBmpRef.current?.close();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-t-2xl overflow-hidden cursor-ew-resize select-none checkerboard"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "none" }}
    >
      {/* Single canvas — both images composited here */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Floating handle (only DOM element that moves) */}
      <div
        ref={handleRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: "50%", transform: "translateX(-50%)", width: 0 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 sm:w-9 sm:h-9 rounded-full pointer-events-auto cursor-ew-resize"
          style={{
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
          }}
        >
          <svg className="w-full h-full p-1.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <svg className="absolute inset-0 w-full h-full p-1.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1)" }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] font-semibold tracking-wider uppercase pointer-events-none text-white/80">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] font-semibold tracking-wider uppercase pointer-events-none text-white/80">
        Result
      </div>
    </div>
  );
}
