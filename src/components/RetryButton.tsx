'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

interface RetryButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  /** 'single' for per-item retry, 'all' for batch retry */
  variant?: 'single' | 'all';
  /** Number of items to retry (shown in label for 'all' variant) */
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const retryIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const RetryButton = memo(function RetryButton({
  onClick,
  label,
  disabled = false,
  variant = 'single',
  count,
  size = 'md',
  className = '',
}: RetryButtonProps) {
  const defaultLabel = variant === 'all'
    ? `Retry All${count !== undefined ? ` (${count})` : ''}`
    : 'Retry';

  const displayLabel = label || defaultLabel;

  const sizeClasses = size === 'sm'
    ? 'p-1.5 rounded-lg'
    : 'px-4 py-2 rounded-lg text-sm';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'single'
          ? `${sizeClasses} hover:bg-amber-500/10 text-amber-400 hover:text-amber-300`
          : `${sizeClasses} bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20`
        }
        ${className}
      `}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      title={displayLabel}
    >
      {retryIcon}
      {(variant === 'all' || size === 'md') && <span>{displayLabel}</span>}
    </motion.button>
  );
});
