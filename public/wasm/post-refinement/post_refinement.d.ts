/* tslint:disable */
/* eslint-disable */

/**
 * High-performance post-refinement pipeline.
 *
 * Pipeline: Trimap → Fast Guided Filter (s=4) → Shared Matting → Edge Refine → Poisson Smooth → Feather
 *
 * Algorithmic choices for maximum speed:
 * - Trimap: O(n) BFS distance transform (not O(n*r²) brute-force)
 * - Guided Filter: Subsampled (s=4) with integral images (O(1) box mean)
 * - Shared Matting: Spiral search with early termination + multi-sample confidence
 * - Edge Refine: Scharr operator (better isotropy than Sobel, same cost)
 * - Poisson: SOR with ω=1.5 (2x faster convergence than Gauss-Seidel)
 * - Feather: Separable running-sum box blur
 */
export function post_process(mask_rgba: Uint8Array, original_rgba: Uint8Array, width: number, height: number, guide_radius: number, guide_eps: number, edge_threshold: number, feather_radius: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly post_process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
