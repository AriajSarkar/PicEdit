'use client';

import { useCallback, useRef, useState, memo } from 'react';
import { motion } from 'motion/react';

interface FileUploaderProps {
  /** Called when files are selected */
  onFilesSelect: (files: File[]) => void;
  /** Whether to accept multiple files */
  multiple?: boolean;
  /** Accept filter (default: "image/*") */
  accept?: string;
  /** Disable the uploader */
  disabled?: boolean;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Supported format badges */
  formats?: string[];
  /** Show paste hint */
  showPasteHint?: boolean;
  /** Custom accent color class (for the icon bg & border) */
  accentClass?: string;
  /** Min height */
  minHeight?: string;
  /** Children to render below (e.g., processing overlay) */
  children?: React.ReactNode;
}

export const FileUploader = memo(function FileUploader({
  onFilesSelect,
  multiple = false,
  accept = 'image/*',
  disabled = false,
  title = 'Drop your image here',
  subtitle = 'or click to browse',
  formats = ['PNG', 'JPG', 'WebP'],
  showPasteHint = true,
  accentClass,
  minHeight = '240px',
  children,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter(f => {
        if (accept === 'image/*') return f.type.startsWith('image/');
        return true;
      });
      if (files.length) onFilesSelect(multiple ? files : [files[0]]);
    },
    [onFilesSelect, multiple, accept]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData.items;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) onFilesSelect(multiple ? files : [files[0]]);
    },
    [disabled, onFilesSelect, multiple]
  );

  return (
    <motion.div
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onPaste={handlePaste}
      tabIndex={0}
      style={{ minHeight }}
      className={`
        relative flex flex-col items-center justify-center
        w-full rounded-2xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
        ${isDragging
          ? `border-[var(--accent)] bg-[var(--accent)]/10`
          : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--bg-elevated)]/50'
        }
        ${disabled ? 'pointer-events-none opacity-50' : ''}
        ${accentClass ?? ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
        disabled={disabled}
      />

      {children || (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          {/* Icon */}
          <div className="p-4 rounded-2xl bg-[var(--accent)]/10">
            <svg className="w-10 h-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <div>
            <p className="text-[var(--foreground)] font-medium text-lg">{title}</p>
            <p className="text-[var(--muted)] text-sm mt-1">{subtitle}</p>
          </div>

          {formats.length > 0 && (
            <div className="flex items-center gap-2.5 text-xs text-[var(--muted)]">
              {formats.map(fmt => (
                <span key={fmt} className="px-2.5 py-1 rounded-md bg-white/5">{fmt}</span>
              ))}
            </div>
          )}

          {showPasteHint && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Ctrl+V</kbd>
                Paste
              </span>
              {multiple && (
                <>
                  <span className="w-px h-3 bg-white/10" />
                  <span>Multiple files OK</span>
                </>
              )}
            </div>
          )}

          {/* Mobile: simpler hint */}
          {showPasteHint && multiple && (
            <p className="sm:hidden text-xs text-[var(--muted)]">Multiple files supported</p>
          )}
        </div>
      )}
    </motion.div>
  );
});
