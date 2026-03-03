'use client';

import { memo } from 'react';
import { VisualResizerInner } from './VisualResizerInner';
import type { VisualResizerProps } from './types';

/**
 * Main VisualResizer — thin wrapper that resolves per-image dims
 * and delegates to Inner (keyed by item.id for clean state reset).
 */
export const VisualResizer = memo(function VisualResizer({
	items,
	selectedIndex,
	onSelectIndex,
	config,
	onResize,
	disabled = false,
	perImageDims,
	viewStateCache,
}: VisualResizerProps) {
	const item = items[selectedIndex];
	if (!item) return null;

	const dims = perImageDims?.get(item.id);
	const effectiveW = dims ? dims.width : config.width;
	const effectiveH = dims ? dims.height : config.height;

	return (
		<VisualResizerInner
			key={item.id}
			imageId={item.id}
			imageSrc={item.preview}
			originalWidth={item.originalWidth}
			originalHeight={item.originalHeight}
			config={config}
			effectiveW={effectiveW}
			effectiveH={effectiveH}
			onResize={onResize}
			disabled={disabled}
			items={items}
			selectedIndex={selectedIndex}
			onSelectIndex={onSelectIndex}
			viewStateCache={viewStateCache}
		/>
	);
});

// Re-export types consumers may need
export type { VisualResizerProps } from './types';
