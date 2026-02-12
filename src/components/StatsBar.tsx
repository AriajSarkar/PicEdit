'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { formatBytes } from '@/lib/imageUtils';

interface InfoEntry {
  label: string;
  value: string | number;
  /** Optional color class */
  color?: string;
}

interface StatsBarProps {
  /** Key-value pairs to display */
  entries: InfoEntry[];
  /** Progress bar (0-100, hidden if undefined) */
  progress?: number;
  /** Right-side action element */
  action?: React.ReactNode;
  /** Top-right label */
  badge?: string;
}

export const StatsBar = memo(function StatsBar({
  entries,
  progress,
  action,
  badge,
}: StatsBarProps) {
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border)]"
    >
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {entries.map((entry, i) => (
          <span key={i}>
            {i > 0 && <span className="w-px h-3 bg-white/10 inline-block mr-4" />}
            <span className={entry.color || 'text-[var(--muted)]'}>
              {typeof entry.value === 'number' ? formatBytes(entry.value) : entry.value}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {badge && (
          <span className="text-xs text-[var(--muted)]">{badge}</span>
        )}
        {action}
      </div>

      {progress !== undefined && progress > 0 && progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
});
