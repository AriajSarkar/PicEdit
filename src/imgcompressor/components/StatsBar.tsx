'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

interface StatsBarProps {
  totalOriginal: string;
  totalCompressed: string;
  totalSaved: string;
  savedPercent: number;
  /** True when file size increased instead of decreased */
  increased?: boolean;
  doneCount: number;
  totalCount: number;
}

export const StatsBar = memo(function StatsBar({
  totalOriginal,
  totalCompressed,
  totalSaved,
  savedPercent,
  increased = false,
  doneCount,
  totalCount,
}: StatsBarProps) {
  if (totalCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Compression Summary
        </span>
        <span className="text-xs text-[var(--muted)]">
          {doneCount}/{totalCount} processed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Original</p>
          <p className="text-sm font-mono text-[var(--foreground)]">{totalOriginal}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Compressed</p>
          <p className="text-sm font-mono text-[var(--foreground)]">{totalCompressed}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">{increased ? 'Increased' : 'Saved'}</p>
          <p className={`text-sm font-mono ${increased ? 'text-amber-400' : 'text-green-400'}`}>
            {increased ? '+' : ''}{totalSaved}
            {savedPercent !== 0 && (
              <span className={`${increased ? 'text-amber-400/70' : 'text-green-400/70'} ml-1`}>
                ({increased ? '+' : ''}{Math.abs(savedPercent).toFixed(1)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {doneCount > 0 && (
        <div className="mt-3 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / totalCount) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  );
});
