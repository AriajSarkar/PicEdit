'use client';

import { memo, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

const MAX_VISIBLE = 4;
const ITEM_HEIGHT = 72;
const ITEM_GAP = 8;

type ScrollContainerProps = {
	needsScroll: boolean;
	maxHeight: number;
	children: ReactNode;
};

export { MAX_VISIBLE, ITEM_HEIGHT, ITEM_GAP };

export const ScrollContainer = memo(function ScrollContainer({
	needsScroll,
	maxHeight,
	children,
}: ScrollContainerProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [showTopFade, setShowTopFade] = useState(false);
	const [showBottomFade, setShowBottomFade] = useState(false);
	const rafRef = useRef(0);

	const updateFades = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const top = el.scrollTop > 8;
		const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
		setShowTopFade((prev) => (prev === top ? prev : top));
		setShowBottomFade((prev) => (prev === bottom ? prev : bottom));
	}, []);

	// rAF-throttled scroll handler — prevents setState thrashing during fast scrolls
	const onScroll = useCallback(() => {
		if (rafRef.current) return;
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0;
			updateFades();
		});
	}, [updateFades]);

	useEffect(() => {
		const el = ref.current;
		if (!el || !needsScroll) return;
		updateFades();
		el.addEventListener('scroll', onScroll, { passive: true });

		// Observe size/content changes so fades re-evaluate when items are added/removed
		const ro = new ResizeObserver(() => updateFades());
		ro.observe(el);
		// Watch children mutations (item add/remove) that may not trigger ResizeObserver
		const mo = new MutationObserver(() => updateFades());
		mo.observe(el, { childList: true, subtree: true });

		return () => {
			el.removeEventListener('scroll', onScroll);
			ro.disconnect();
			mo.disconnect();
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = 0;
			}
		};
	}, [needsScroll, onScroll, updateFades]);

	if (!needsScroll) return <>{children}</>;

	return (
		<div className="relative">
			<div
				className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none transition-opacity duration-200 rounded-t-xl"
				style={{
					opacity: showTopFade ? 1 : 0,
					background: 'linear-gradient(to bottom, var(--bg-surface), transparent)',
				}}
			/>
			<div
				ref={ref}
				className="overflow-y-auto pr-1"
				style={{
					maxHeight: `${maxHeight}px`,
					scrollbarGutter: 'stable',
					willChange: 'scroll-position',
					contain: 'strict',
					height: `${maxHeight}px`,
					overscrollBehaviorY: 'contain',
				}}
			>
				{children}
			</div>
			<div
				className="absolute bottom-0 left-0 right-0 h-6 z-10 pointer-events-none transition-opacity duration-200 rounded-b-xl"
				style={{
					opacity: showBottomFade ? 1 : 0,
					background: 'linear-gradient(to top, var(--bg-surface), transparent)',
				}}
			/>
		</div>
	);
});
