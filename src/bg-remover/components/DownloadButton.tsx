"use client";

import { OutputFormat } from "@/types";
import { DownloadButton as SharedDownloadButton } from "@/components/DownloadButton";

const FORMAT_LABELS: Record<OutputFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
};

interface BGDownloadButtonProps {
  onClick: () => void;
  format: OutputFormat;
  disabled?: boolean;
}

export function DownloadButton({ onClick, format, disabled }: BGDownloadButtonProps) {
  return (
    <SharedDownloadButton
      onClick={onClick}
      label={`Download ${FORMAT_LABELS[format]}`}
      disabled={disabled}
      variant="primary"
    />
  );
}
