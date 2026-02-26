'use client';

import type { ResizeItem } from '@/img-resizer/types';
import { ComparisonResults } from '@/components/ComparisonResults';

interface ResizeResultsProps {
  items: ResizeItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onResize: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  getOutputDimensions: (item: ResizeItem) => { width: number; height: number };
}

export function ResizeResults(props: ResizeResultsProps) {
  return <ComparisonResults mode="resize" {...props} />;
}

