'use client';

import { memo, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VisualResizer } from './index';
import type { VisualResizerProps } from './types';

interface VisualResizerModalProps extends VisualResizerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen overlay modal that wraps the VisualResizer for an
 * expanded editing experience. Animated with Motion.
 */
export const VisualResizerModal = memo(function VisualResizerModal({
  open,
  onClose,
  ...resizerProps
}: VisualResizerModalProps) {
  const titleId = useId();

  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKey);
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(12px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* Modal container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
          >
            <h2 id={titleId} className="sr-only">
              Visual Resizer
            </h2>
            {/* Close button */}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                aria-label="Close visual resizer"
                onClick={onClose}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]/80 border border-[var(--border)] backdrop-blur-md text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30 transition-all"
                title="Close (Esc)"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                  ESC
                </span>
              </button>
            </div>

            {/* Resizer fills available space */}
            <div className="flex-1 min-h-0">
              <VisualResizer {...resizerProps} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
