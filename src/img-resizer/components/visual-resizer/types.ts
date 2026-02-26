import type { ResizerConfig, ResizeItem } from '@/img-resizer/types';
import type { PerImageDims } from '@/img-resizer/hooks/useResize';

// ═══════════════════════════════════════════════════════════════════════════
// Handle & Interaction Types
// ═══════════════════════════════════════════════════════════════════════════

export type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
export type InteractionMode = 'idle' | 'resize' | 'move-frame' | 'pan-image';

export interface DragState {
  mode: InteractionMode;
  handle: HandleId | null;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startOffX: number;
  startOffY: number;
  startPanX: number;
  startPanY: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Per-image visual editor view state (zoom, pan, frame offset). */
export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  frameOffX: number;
  frameOffY: number;
}

/** Mutable map storing per-image view state across re-mounts. */
export type ViewStateCache = Map<string, ViewState>;

// ═══════════════════════════════════════════════════════════════════════════
// Component Props
// ═══════════════════════════════════════════════════════════════════════════

export interface VisualResizerProps {
  items: ResizeItem[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  config: ResizerConfig;
  onResize: (w: number, h: number, cropX: number, cropY: number) => void;
  disabled?: boolean;
  perImageDims?: PerImageDims;
  viewStateCache?: ViewStateCache;
}

export interface InnerProps {
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  config: ResizerConfig;
  effectiveW: number;
  effectiveH: number;
  onResize: (w: number, h: number, cropX: number, cropY: number) => void;
  disabled: boolean;
  items: ResizeItem[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  viewStateCache?: ViewStateCache;
  /** Unique id of the current image — used as cache key. */
  imageId: string;
}

export interface ToolbarProps {
  config: ResizerConfig;
  liveW: number;
  liveH: number;
  originalWidth: number;
  originalHeight: number;
  pctW: string;
  isUpscale: boolean;
  itemCount: number;
  selectedIndex: number;
}

export interface EdgeLabelProps {
  value: string;
  axis: 'x' | 'y';
  x: number;
  y: number;
}

export interface ZoomBarProps {
  zoom: number;
  onZoom: (z: number) => void;
  onReset: () => void;
}

export interface ImageStripProps {
  items: ResizeItem[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  disabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

export const CORNERS: HandleId[] = ['nw', 'ne', 'sw', 'se'];

/** L-shaped bracket arm lengths */
export const BRACKET_ARM = 16;
export const BRACKET_THICK = 2.5;

/** Edge handle dimensions */
export const EDGE_SIZE_W = 24;
export const EDGE_SIZE_H = 4;

export const HIT_EXPAND = 10;
export const CANVAS_HEIGHT = 460;
export const PADDING = 32;
export const THUMB_SIZE = 44;

export const MIN_DIM = 1;
export const MAX_DIM = 16384;
export const NUDGE_PX = 1;
export const NUDGE_SHIFT_PX = 10;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;

export const CURSOR: Record<HandleId, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};
