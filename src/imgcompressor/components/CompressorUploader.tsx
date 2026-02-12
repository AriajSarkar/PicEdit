'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface CompressorUploaderProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function CompressorUploader({ onFilesSelect, disabled }: CompressorUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
      if (files.length) onFilesSelect(files);
    },
    [onFilesSelect]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) onFilesSelect(files);
  }, [disabled, onFilesSelect]);

  return (
    <motion.div
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onPaste={handlePaste}
      tabIndex={0}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[240px] rounded-2xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
        ${isDragging
          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
          : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--bg-elevated)]/50'
        }
        ${disabled ? 'pointer-events-none opacity-50' : ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 px-6 text-center">
        {/* Icon */}
        <div className="p-4 rounded-2xl bg-[var(--accent)]/10">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div>
          <p className="text-[var(--foreground)] font-medium text-lg">
            Drop images here or click to browse
          </p>
          <p className="text-[var(--muted)] text-sm mt-1">
            Supports JPEG, PNG, WebP — batch upload supported
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Ctrl+V</kbd>
            Paste
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span>Multiple files OK</span>
        </div>
      </div>
    </motion.div>
  );
}
