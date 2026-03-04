'use client';

import type { CompressionItem } from '@/img-compressor/hooks/useCompression';
import { ComparisonResults } from '@/components/ComparisonResults';

interface CompressionResultsProps {
	items: CompressionItem[];
	onRemove: (id: string) => void;
	onDownload: (id: string) => void;
	onCompress: (id: string) => void;
	onRetry: (id: string) => void;
	onCancel: (id: string) => void;
	getEstimate?: (item: CompressionItem) => number;
}

export function CompressionResults(props: CompressionResultsProps) {
	return <ComparisonResults mode="compress" {...props} />;
}
