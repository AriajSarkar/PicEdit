/**
 * Image Resizer — barrel re-export.
 *
 * All logic has been split into focused modules:
 *  - dimensions.ts         — pure dimension calculations
 *  - canvasHelpers.ts      — Canvas creation, encoding, pixel data helpers
 *  - resizeImplementations.ts — WASM + Canvas resize strategies
 *  - resizeImage.ts        — main resize orchestrator
 *
 * This file re-exports the public API for backwards compatibility.
 */

export {
	calculateOutputDimensions,
	getPresetDimensions,
	getCoverTargetDimensions,
} from './dimensions';
export { resizeImage } from './resizeImage';
