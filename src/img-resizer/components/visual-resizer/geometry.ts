import { PADDING } from './types';
import type { Rect } from './types';

/**
 * Compute the base scale so the image fits inside the canvas with padding,
 * then multiply by user zoom.
 */
export function fitScale(cw: number, ch: number, iw: number, ih: number, zoom: number): number {
  const maxW = cw - PADDING * 2;
  const maxH = ch - PADDING * 2;
  if (maxW <= 0 || maxH <= 0 || iw <= 0 || ih <= 0) return 1;
  return Math.min(maxW / iw, maxH / ih) * zoom;
}

/** Compute the centered image rectangle (before pan offset). */
export function imgRect(cw: number, ch: number, iw: number, ih: number, s: number): Rect {
  const w = iw * s;
  const h = ih * s;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

/** Compute the target-size box rectangle centered on the image. */
export function boxRect(
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  tw: number,
  th: number,
  s: number,
  offX: number,
  offY: number,
): Rect {
  const bw = tw * s;
  const bh = th * s;
  return {
    x: ix + iw / 2 - bw / 2 + offX,
    y: iy + ih / 2 - bh / 2 + offY,
    w: bw,
    h: bh,
  };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
