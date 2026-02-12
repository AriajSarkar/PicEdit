'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

interface DownloadButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary';
  /** Full width */
  fullWidth?: boolean;
  /** Icon slot */
  icon?: React.ReactNode;
}

const defaultIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export const DownloadButton = memo(function DownloadButton({
  onClick,
  label = 'Download',
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  icon,
}: DownloadButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
        transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${variant === 'primary'
          ? 'btn-primary'
          : 'btn-secondary'
        }
      `}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {icon || defaultIcon}
      {label}
    </motion.button>
  );
});
