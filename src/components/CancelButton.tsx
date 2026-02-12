'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

interface CancelButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  /** 'single' for per-item cancel, 'all' for batch cancel */
  variant?: 'single' | 'all';
  /** Number of items currently processing (shown in label for 'all' variant) */
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const cancelIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 10l6 4M15 10l-6 4" />
  </svg>
);

const stopIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" />
  </svg>
);

export const CancelButton = memo(function CancelButton({
  onClick,
  label,
  disabled = false,
  variant = 'single',
  count,
  size = 'md',
  className = '',
}: CancelButtonProps) {
  const defaultLabel = variant === 'all'
    ? `Cancel All${count !== undefined ? ` (${count})` : ''}`
    : 'Cancel';

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
          ? `${sizeClasses} hover:bg-red-500/10 text-red-400 hover:text-red-300`
          : `${sizeClasses} bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20`
        }
        ${className}
      `}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      title={displayLabel}
    >
      {variant === 'all' ? stopIcon : cancelIcon}
      {(variant === 'all' || size === 'md') && <span>{displayLabel}</span>}
    </motion.button>
  );
});
