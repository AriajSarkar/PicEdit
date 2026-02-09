"use client";

import { useState, useCallback, useMemo } from "react";
import { EditorState, DEFAULT_EDITOR_STATE } from "@/types";

export function useImageEditor() {
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  const updateState = useCallback((updates: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const initializeFromImage = useCallback((width: number, height: number) => {
    setState({
      ...DEFAULT_EDITOR_STATE,
      width,
      height,
      originalWidth: width,
      originalHeight: height,
      cropWidth: width,
      cropHeight: height,
    });
  }, []);

  const setSize = useCallback(
    (width: number, height: number, keepAspect = true) => {
      setState((prev) => {
        let newWidth = width;
        let newHeight = height;

        if (keepAspect && prev.aspectLocked && prev.originalWidth && prev.originalHeight) {
          const aspect = prev.originalWidth / prev.originalHeight;
          if (width !== prev.width) {
            newHeight = Math.round(width / aspect);
          } else {
            newWidth = Math.round(height * aspect);
          }
        }

        return { ...prev, width: newWidth, height: newHeight };
      });
    },
    []
  );

  const setScale = useCallback((scale: number) => {
    setState((prev) => ({
      ...prev,
      width: Math.round(prev.originalWidth * scale),
      height: Math.round(prev.originalHeight * scale),
    }));
  }, []);

  const resetState = useCallback(() => {
    setState((prev) => ({
      ...DEFAULT_EDITOR_STATE,
      width: prev.originalWidth,
      height: prev.originalHeight,
      originalWidth: prev.originalWidth,
      originalHeight: prev.originalHeight,
      cropWidth: prev.originalWidth,
      cropHeight: prev.originalHeight,
    }));
  }, []);

  const currentScale = useMemo(() => {
    if (!state.originalWidth) return 1;
    return state.width / state.originalWidth;
  }, [state.width, state.originalWidth]);

  return {
    state,
    setState,
    updateState,
    initializeFromImage,
    setSize,
    setScale,
    resetState,
    currentScale,
  };
}
