'use client';

import type { ConversionItem } from '@/img-converter/hooks/useConversion';
import { ComparisonResults } from '@/components/ComparisonResults';

interface ConversionResultsProps {
	items: ConversionItem[];
	onRemove: (id: string) => void;
	onDownload: (id: string) => void;
	onConvert: (id: string) => void;
	onRetry: (id: string) => void;
	onCancel: (id: string) => void;
}

export function ConversionResults(props: ConversionResultsProps) {
	return <ComparisonResults mode="convert" {...props} />;
}
