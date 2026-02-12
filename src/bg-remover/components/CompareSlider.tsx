"use client";

import { useRef, useCallback, useEffect } from "react";

interface CompareSliderProps {
  originalImage: string;
  processedImage: string;
}

export function CompareSlider({ originalImage, processedImage }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipperRef = useRef<HTMLDivElement>(null);
  const sliderLineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const requestRef = useRef<number>(0);

  // Use a ref to track the last drawn position to avoid redundant DOM writes
  const currentPosRef = useRef(50);

  const updateDOM = useCallback((percent: number) => {
    if (clipperRef.current) {
      clipperRef.current.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }
    if (sliderLineRef.current) {
      sliderLineRef.current.style.left = `${percent}%`;
    }
    currentPosRef.current = percent;
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    // Use requestAnimationFrame for smooth visual updates
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(() => updateDOM(percent));
  }, [updateDOM]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    cancelAnimationFrame(requestRef.current);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  useEffect(() => {
    const options = { passive: false };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, options);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-t-2xl overflow-hidden cursor-ew-resize select-none checkerboard"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Processed image (right side, full width behind) */}
      <img
        src={processedImage}
        alt="Processed"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Original Image (left side, clipped) */}
      <div
        ref={clipperRef}
        className="absolute inset-0 pointer-events-none will-change-[clip-path]"
        style={{ clipPath: `inset(0 50% 0 0)` }}
      >
        <img
          src={originalImage}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        ref={sliderLineRef}
        className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none will-change-left"
        style={{
          left: `50%`,
          transform: "translateX(-50%)",
          boxShadow: "0 0 12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Slider handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-auto cursor-ew-resize">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-medium pointer-events-none text-white">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-medium pointer-events-none text-white">
        Result
      </div>
    </div>
  );
}
