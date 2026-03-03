# PicEdit — Codebase Refactoring Plan

> **Goal**: Improve code quality, eliminate duplication, and enhance modularity — **without changing external behavior or the existing top-level folder structure**.

---

## Table of Contents

1. [Current Structure Overview](#1-current-structure-overview)
2. [Duplicated Functions — Full Audit](#2-duplicated-functions--full-audit)
3. [Large Files — Split Candidates](#3-large-files--split-candidates)
4. [Worker Bridge Consolidation](#4-worker-bridge-consolidation)
5. [Hook-Level Duplication](#5-hook-level-duplication)
6. [Type Definition Fragmentation](#6-type-definition-fragmentation)
7. [Component Organization](#7-component-organization)
8. [Proposed Shared Utility Structure](#8-proposed-shared-utility-structure)
9. [Refactoring Steps — Ordered Checklist](#9-refactoring-steps--ordered-checklist)
10. [Rules of Engagement](#10-rules-of-engagement)

---

## 1. Current Structure Overview

```
src/
├── app/                         ← Pages (Next.js App Router)
│   ├── page.tsx                 ← Landing page (588 lines / 26KB) ⚠️
│   ├── globals.css
│   ├── layout.tsx
│   ├── bg-remover/
│   ├── img-compressor/
│   └── img-resizer/
│
├── bg-remover/                  ← BG Removal feature module
│   ├── components/ (10 files + tabs/)
│   ├── hooks/ (4 files)
│   ├── lib/ (5 files)
│   ├── post-refinement/
│   ├── pre-refinement/
│   ├── server/
│   └── types/
│
├── imgcompressor/               ← Image Compression feature module
│   ├── components/ (5 files)
│   ├── hooks/ (1 file)
│   ├── lib/ (3 files)
│   ├── types/
│   ├── index.ts                 ← WASM bridge (215 lines)
│   └── worker.ts                ← Legacy WASM worker
│
├── img-resizer/                 ← Image Resize feature module
│   ├── components/ (3 files + visual-resizer/)
│   ├── hooks/ (1 file)
│   ├── lib/ (3 files)
│   └── types/
│
├── components/                  ← Global shared components (6 files)
├── hooks/                       ← Global shared hooks (1 file)
├── lib/                         ← Global shared utilities (3 files)
└── types/                       ← Global shared types (1 file)
```

**What stays the same**: `app/`, `bg-remover/`, `imgcompressor/`, `img-resizer/`, `components/` as top-level directories. All changes are **internal**.

---

## 2. Duplicated Functions — Full Audit

### 2.1 — `createCanvas(width, height)`

| Location                           | Lines |
| ---------------------------------- | ----- |
| `src/lib/imageUtils.ts`            | L8–13 |
| `src/bg-remover/lib/imageUtils.ts` | L3–8  |

**Verdict**: ✅ Exact duplicate → use shared `src/lib/imageUtils.ts` everywhere.

---

### 2.2 — `loadImage(src)`

| Location                                       | Lines    | Notes                                |
| ---------------------------------------------- | -------- | ------------------------------------ |
| `src/lib/imageUtils.ts`                        | L16–24   | Returns `HTMLImageElement`           |
| `src/bg-remover/lib/imageUtils.ts`             | L10–18   | Same exact code                      |
| `src/bg-remover/lib/dataConversion.ts`         | L67–75   | Named `loadImageElement`, same logic |
| `src/bg-remover/hooks/useBackgroundRemoval.ts` | L371–377 | Inline version in `resizeImageData`  |

**Verdict**: ✅ 4 copies of the same function → single shared version in `src/lib/imageUtils.ts`. `dataConversion.ts` can import from shared lib.

---

### 2.3 — `fileToDataUrl(file)`

| Location                           | Lines  |
| ---------------------------------- | ------ |
| `src/lib/imageUtils.ts`            | L27–34 |
| `src/bg-remover/lib/imageUtils.ts` | L20–27 |

**Verdict**: ✅ Exact duplicate → use shared.

---

### 2.4 — `getImageInfo(file)`

| Location                           | Lines  |
| ---------------------------------- | ------ |
| `src/lib/imageUtils.ts`            | L37–47 |
| `src/bg-remover/lib/imageUtils.ts` | L29–41 |

**Verdict**: ✅ Exact same logic → use shared.

---

### 2.5 — `generateId()`

| Location                           | Lines    |
| ---------------------------------- | -------- |
| `src/lib/imageUtils.ts`            | L50–52   |
| `src/bg-remover/lib/imageUtils.ts` | L245–247 |

**Verdict**: ✅ Exact duplicate → use shared.

---

### 2.6 — `formatBytes(bytes)`

| Location                                       | Lines    | Notes                          |
| ---------------------------------------------- | -------- | ------------------------------ |
| `src/lib/imageUtils.ts`                        | L55–63   | Handles negative sign          |
| `src/bg-remover/lib/imageUtils.ts`             | L250–256 | Slightly simpler (no negative) |
| `src/bg-remover/hooks/useBackgroundRemoval.ts` | L25–29   | Local copy (simplified)        |

**Verdict**: ✅ 3 copies → use shared version (which handles negatives). The bg-remover hook should import from `@/lib/imageUtils`.

---

### 2.7 — `estimateDataUrlSize(dataUrl)`

| Location                           | Lines    |
| ---------------------------------- | -------- |
| `src/lib/imageUtils.ts`            | L66–69   |
| `src/bg-remover/lib/imageUtils.ts` | L259–264 |

**Verdict**: ✅ Exact duplicate → use shared.

---

### 2.8 — `calculateCompressionPercent(originalSize, newSize)`

| Location                           | Lines    |
| ---------------------------------- | -------- |
| `src/lib/imageUtils.ts`            | L72–75   |
| `src/bg-remover/lib/imageUtils.ts` | L267–270 |

**Verdict**: ✅ Exact duplicate → use shared.

---

### 2.9 — `blobToDataUrl(blob)` / `blobToDataUrlLocal(blob)`

| Location                                       | Lines    | Notes                      |
| ---------------------------------------------- | -------- | -------------------------- |
| `src/imgcompressor/lib/compressionUtils.ts`    | L185–191 | No reject handler          |
| `src/imgcompressor/lib/compressionWorker.ts`   | L59–66   | Has reject handler         |
| `src/img-resizer/lib/resizeUtils.ts`           | L257–264 | Has reject handler         |
| `src/img-resizer/lib/resizeWorker.ts`          | L201–208 | Has reject handler         |
| `src/bg-remover/hooks/useBackgroundRemoval.ts` | L357–364 | Named `blobToDataUrlLocal` |

**Verdict**: ✅ 5 copies → add to `src/lib/imageUtils.ts` (with reject handler). Workers must keep their local copy (can't import from main thread), but main-thread code should use shared.

---

### 2.10 — `getMimeType(format)` / `resolveOutputMime(config, type)`

| Location                                     | Lines    | Notes                         |
| -------------------------------------------- | -------- | ----------------------------- |
| `src/imgcompressor/lib/compressionUtils.ts`  | L172–183 | format → MIME                 |
| `src/imgcompressor/lib/compressionWorker.ts` | L46–57   | Exact copy                    |
| `src/img-resizer/lib/resizeUtils.ts`         | L169–181 | Different: handles `preserve` |
| `src/img-resizer/lib/resizeWorker.ts`        | L191–199 | Same as resizeUtils           |

**Verdict**: ⚠️ Move `getMimeType` to shared utils. Workers keep local copies (unavoidable). The resizer's `resolveOutputMime` has extra `preserve` logic that stays feature-local.

---

### 2.11 — `crc32(data)` + CRC32 Table

| Location                           | Lines    | Notes                              |
| ---------------------------------- | -------- | ---------------------------------- |
| `src/lib/zipUtil.ts`               | L109–127 | IIFE table + function              |
| `src/bg-remover/lib/imageUtils.ts` | L193–214 | Lazy-instantiated table + function |

**Verdict**: ✅ Same algorithm → extract to `src/lib/crc32.ts` and import in both `zipUtil.ts` and `bg-remover/lib/imageUtils.ts`.

---

### 2.12 — `binarySearchQuality(canvas, mimeType, targetSize)`

| Location                                     | Lines    | Notes                                          |
| -------------------------------------------- | -------- | ---------------------------------------------- |
| `src/imgcompressor/lib/compressionUtils.ts`  | L141–170 | Seeds with `hi` quality                        |
| `src/imgcompressor/lib/compressionWorker.ts` | L72–110  | Seeds with `lo` quality, smarter closest-match |

**Verdict**: ⚠️ **Near-duplicate** with subtle behavior differences. The worker version is better (seeds with lo, tracks closest-match). Unify logic in `compressionUtils.ts` and copy the improved version to the worker.

---

### 2.13 — Resizer Full Function Duplication (Utils ↔ Worker)

The entire file `resizeWorker.ts` (418 lines) is a near-complete copy of `resizeUtils.ts` (445 lines). These functions are duplicated:

| Function                       | `resizeUtils.ts`         | `resizeWorker.ts`        |
| ------------------------------ | ------------------------ | ------------------------ |
| `calculateOutputDimensions`    | L64–97                   | L113–142                 |
| `applyFit`                     | L102–132                 | L88–111                  |
| `getCoverTargetDimensions`     | L144–160                 | L157–173                 |
| `bitmapToRGBA`                 | L226–238                 | L146–155                 |
| `rgbaToBlob`                   | L241–255                 | L175–189                 |
| `resolveOutputMime`            | L169–181                 | L191–199                 |
| `blobToDataUrl`                | L257–264                 | L201–208                 |
| `resizeWithWasm`               | L273–292                 | L212–227                 |
| `resizeWithCanvas`             | L297–315                 | L229–247                 |
| `resizeCoverWithCanvas`        | L320–345                 | L249–270                 |
| `processResize` (orchestrator) | `resizeImage` L355–443   | `processResize` L274–385 |
| **`RESIZE_PRESETS` array**     | `types/index.ts` L79–104 | Hard-coded copy L48–70   |

**Verdict**: ⚠️ This is the **biggest duplication** in the codebase. Workers can't directly import from the main bundle, but the **dimension calculation functions** (`calculateOutputDimensions`, `applyFit`, `getCoverTargetDimensions`) and constants (`RESIZE_PRESETS`) don't use any browser/worker-specific APIs. These can be extracted to a **shared pure-logic module** that both the utils and worker import.

---

### 2.14 — Compressor Worker Full Duplication

Similar pattern as the resizer. `compressionWorker.ts` (281 lines) duplicates:

| Function                     | Duplicated in Worker?       |
| ---------------------------- | --------------------------- |
| `getMimeType`                | ✅ (L46–57)                 |
| `blobToDataUrl`              | ✅ (L59–66)                 |
| `binarySearchQuality`        | ✅ (L72–110)                |
| `CompressorConfig` interface | ✅ (L27–36) — explicit copy |

---

## 3. Large Files — Split Candidates

### 3.1 — `app/page.tsx` (588 lines / 26KB)

**Problem**: The landing page contains 3 large static data arrays (`TOOLS`, `FEATURES`, `COMPARISON`) totaling ~130 lines, plus the entire `Home()` component at 430+ lines.

**Proposed split**:

```
src/app/
├── page.tsx                  ← Imports and renders sections
├── _data/
│   └── landing.ts            ← TOOLS, FEATURES, COMPARISON arrays
├── _components/
│   ├── HeroSection.tsx
│   ├── ToolCards.tsx
│   ├── FeaturesGrid.tsx
│   └── ComparisonTable.tsx
```

---

### 3.2 — `img-resizer/components/visual-resizer/VisualResizerInner.tsx` (37KB / ~900+ lines)

**Problem**: By far the largest file in the codebase. Contains multiple tightly-coupled but extractable sub-sections.

**Proposed split**:

```
visual-resizer/
├── VisualResizerInner.tsx       ← Main orchestrator (imports sub-components)
├── hooks/
│   ├── useResizeInteraction.ts  ← Drag/resize logic and state
│   └── useZoomPan.ts            ← Zoom and pan interaction
├── OverlayHandles.tsx           ← Resize handles overlay
├── InfoPanel.tsx                ← Current dimension display
└── ...existing files
```

---

### 3.3 — `components/ComparisonResults.tsx` (500 lines / 18KB)

**Problem**: Contains multiple internal components (`ScrollContainer`, `ResultRow`) and complex rendering logic for both compressor and resizer modes.

**Proposed split**:

```
components/
├── ComparisonResults/
│   ├── index.tsx                ← Main export (ComparisonResults)
│   ├── ResultRow.tsx            ← Single item row
│   └── ScrollContainer.tsx      ← Virtualized scroll wrapper
```

---

### 3.4 — `img-resizer/lib/resizeUtils.ts` (445 lines / 15.9KB)

**Problem**: Mixes pure dimension calculations with Canvas/WASM-dependent resize implementations.

**Proposed split**:

```
img-resizer/lib/
├── resizeUtils.ts              ← Re-exports from sub-files (barrel)
├── dimensions.ts               ← calculateOutputDimensions, applyFit, getCoverTargetDimensions (pure logic)
├── canvasHelpers.ts            ← makeCanvas, canvasToBlob, bitmapToRGBA, rgbaToBlob
├── resizeImplementations.ts    ← resizeWithWasm, resizeWithCanvas, resizeCoverWithCanvas
└── resizeImage.ts              ← Main resizeImage orchestrator
```

---

### 3.5 — `img-resizer/lib/resizeWorker.ts` (418 lines / 15.7KB)

After splitting `resizeUtils.ts` dimensions to a shared pure module, the worker can import `dimensions.ts` directly and only keep worker-specific Canvas code.

---

### 3.6 — `imgcompressor/lib/compressionWorkerBridge.ts` (282 lines / 9.8KB) & `img-resizer/lib/resizeWorkerBridge.ts` (260 lines / 8.3KB)

**Problem**: These two files are ~90% identical. They share the same:

- `WorkerSlot` interface
- `PendingOp` interface (slight variations)
- `getPoolSize()`, `getBasePath()`
- `rejectAllPending()`, `rejectPendingForSlot()`
- `createHandler()` factory
- `initWorker()` flow (init message → ready → timeout)
- `pickWorker()` least-busy algorithm
- `initXxxWorkers()` pool startup
- `terminateXxxWorkers()` cleanup

**Proposed solution**: Extract a generic `WorkerPoolBridge<TResult>` class to `src/lib/workerPoolBridge.ts` that both bridges instantiate with feature-specific config (worker URL, WASM URLs, result transformer).

---

### 3.7 — `hooks/useBatchProcessor.ts` (416 lines / 14.4KB)

This hook is already shared and well-structured. No split needed, it just needs awareness that it's being used properly by both modules.

---

### 3.8 — `bg-remover/hooks/useBackgroundRemoval.ts` (394 lines / 13KB)

**Problem**: Contains local utility functions (`formatBytes`, `formatSpeed`, `blobToDataUrlLocal`, `resizeImageData`) that should be imported.

**Proposed changes** (internal only):

- Replace `formatBytes` (L25–29) → import from `@/lib/imageUtils`
- Move `formatSpeed` → `@/lib/imageUtils` (new shared function)
- Replace `blobToDataUrlLocal` (L357–364) → import from `@/lib/imageUtils` as `blobToDataUrl`
- Move `resizeImageData` (L366–393) → `@/bg-remover/lib/imageUtils.ts` where similar logic already lives

---

### 3.9 — `bg-remover/lib/imageUtils.ts` (271 lines / 8.4KB)

**Problem**: Contains a mix of shared duplicates and BG-specific functions.

**After removing duplicates**, this file should only contain BG-specific functions:

- `applyEdits()` — BG-specific editor rendering
- `embedPngMetadata()` — PicEdit branding in PNG
- `downloadImage()` — BG-specific download with metadata embedding

The ~13 duplicated functions should be imported from `@/lib/imageUtils`.

---

### 3.10 — `bg-remover/lib/modelCache.ts` (15.6KB)

Large but single-purpose. No split needed.

---

## 4. Worker Bridge Consolidation

### Problem Summary

| Feature          | `compressionWorkerBridge.ts`                | `resizeWorkerBridge.ts`                     |
| ---------------- | ------------------------------------------- | ------------------------------------------- |
| Pool state       | `pool: WorkerSlot[]`                        | `pool: WorkerSlot[]`                        |
| Pick logic       | `pickWorker()`                              | `pickWorker()`                              |
| Init flow        | `initWorker()` → `onInit` → `createHandler` | `initWorker()` → `onInit` → `createHandler` |
| Timeout          | 10s init, 30s per-request                   | 10s init, none per-request                  |
| Result transform | Reconstructs `Blob` from `ArrayBuffer`      | Reconstructs `Blob` from `ArrayBuffer`      |
| Pool size        | `getPoolSize()` → 2–4                       | `getPoolSize()` → 2–4                       |

### Proposed: `src/lib/workerPoolBridge.ts`

```ts
interface WorkerPoolConfig<TResult> {
	workerFactory: () => Worker;
	wasmJsUrl: string;
	wasmBgUrl: string;
	messageType: string; // 'compress' | 'resize'
	transformResult: (data: any) => TResult;
	requestTimeoutMs?: number; // optional per-request timeout
}

class WorkerPoolBridge<TResult> {
	constructor(config: WorkerPoolConfig<TResult>);
	init(): Promise<boolean>;
	execute(payload: Record<string, unknown>, onProgress?: ProgressFn): Promise<TResult>;
	terminate(): void;
}
```

Both bridges become thin wrappers:

```
compressionWorkerBridge.ts  →  ~50 lines (instantiates WorkerPoolBridge<CompressedResult>)
resizeWorkerBridge.ts       →  ~50 lines (instantiates WorkerPoolBridge<ResizeResult>)
```

**Estimated savings**: ~400 lines of duplicated boilerplate eliminated.

---

## 5. Hook-Level Duplication

### 5.1 — Thumbnail Generation in `addFiles`

Both `useCompression.ts` (L180–228) and `useResize.ts` (L207–288) contain **nearly identical** `addFiles` callbacks that:

1. Filter for `image/*` files
2. Create `ObjectURL` for preview
3. Load image into `<img>` element
4. Generate 88px JPEG thumbnail on a canvas
5. Call `addItems()`

**Proposed**: Extract `createThumbnailItems<T extends BatchItem>(files, idPrefix, buildItem)` to `src/lib/thumbnailUtils.ts`. Both hooks call this shared function with a small factory callback.

---

### 5.2 — Download Helpers

Both `useCompression.ts` (L231–267) and `useResize.ts` (L291–325) contain **nearly identical** download logic:

- `downloadOne(id)` — creates `<a>` element, triggers download
- `downloadAll()` — single file direct download, or ZIP multiple files

**Proposed**: Extract `downloadProcessedItems(items, opts)` to `src/lib/downloadUtils.ts`.

---

### 5.3 — URL Cleanup Callbacks

Both hooks define identical `handleRemove` and `handleClear` callbacks that revoke object URLs:

```ts
const handleRemove = useCallback((item) => {
	URL.revokeObjectURL(item.preview);
	if (item.thumbnail && item.thumbnail !== item.preview) {
		URL.revokeObjectURL(item.thumbnail);
	}
}, []);
```

**Proposed**: Extract `createCleanupCallbacks<T>()` to `src/lib/thumbnailUtils.ts` alongside the creation logic.

---

## 6. Type Definition Fragmentation

### Current State

| File                                                  | Contains                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/types/index.ts` (200 lines)                      | Shared types + BG Remover types + Compressor types + Worker Pool types  |
| `src/imgcompressor/types/index.ts` (58 lines)         | `CompressorConfig`, worker message types                                |
| `src/img-resizer/types/index.ts` (105 lines)          | `ResizerConfig`, `ResizeItem`, presets                                  |
| `src/bg-remover/types/index.ts` (1 file)              | BG-remover specific types                                               |
| `src/imgcompressor/lib/compressionWorker.ts` (L27–36) | **Hardcoded copy** of `CompressorConfig` interface                      |
| `src/img-resizer/lib/resizeWorker.ts` (L25–70)        | **Hardcoded copy** of `ResizerConfig`, `ResizePreset`, `RESIZE_PRESETS` |

### Problems

1. **`src/types/index.ts` is a grab-bag** — it has BG Remover types (`EditorState`, `HistoryItem`, `ModelType`, `DeviceType`, etc.) mixed in with "truly shared" types (`OutputFormat`, `ImageInfo`, `WorkerTask`, etc.).
2. Workers duplicate type definitions because they can't import from the main bundle.
3. `RESIZE_PRESETS` is duplicated as a **data array** inside `resizeWorker.ts` — this is a maintenance hazard (must sync two arrays manually).

### Proposed type organization

```
src/types/
├── index.ts           ← Re-exports everything (barrel file)
├── image.ts           ← OutputFormat, ImageInfo, DEFAULT_IMAGE_INFO (pure, no deps)
├── worker.ts          ← TaskStatus, WorkerTask, WorkerResult, PoolTaskInfo (pure)
├── bgRemover.ts       ← DeviceType, ModelType, EditorState, HistoryItem, etc.
└── compressor.ts      ← (remains in imgcompressor/types — feature-local)

src/img-resizer/types/
└── index.ts           ← ResizerConfig, ResizePreset, RESIZE_PRESETS (keep feature-local)
```

For worker type duplication: keep `// @see src/types/worker.ts` comments in workers, accept the duplication as an unavoidable worker constraint, but minimize it by extracting pure-logic functions to importable modules.

---

## 7. Component Organization

### Global Components (`src/components/`)

| File                    | Size   | Used By                                               |
| ----------------------- | ------ | ----------------------------------------------------- |
| `FileUploader.tsx`      | 6.2KB  | bg-remover (via `ImageUploader`), compressor, resizer |
| `ComparisonResults.tsx` | 18.4KB | compressor, resizer                                   |
| `DownloadButton.tsx`    | 1.3KB  | compressor, resizer                                   |
| `StatsBar.tsx`          | 1.8KB  | compressor, resizer                                   |
| `CancelButton.tsx`      | 2.3KB  | compressor, resizer                                   |
| `RetryButton.tsx`       | 1.9KB  | compressor, resizer                                   |

**Assessment**: ✅ Global components are already well-organized. `ComparisonResults.tsx` should be split into a folder (see §3.3) but stays in `components/`.

### BG Remover Components

The `bg-remover/components/tabs/` subfolder is well-organized. The main `components/` folder has 10 files which is manageable. No changes needed.

### Visual Resizer

The `visual-resizer/` subfolder needs internal splitting (see §3.2 — `VisualResizerInner.tsx` at 37KB).

---

## 8. Proposed Shared Utility Structure

After all refactoring, the shared `src/lib/` directory would look like:

```
src/lib/
├── imageUtils.ts          ← Existing + consolidated shared functions
│   ├── createCanvas
│   ├── loadImage
│   ├── fileToDataUrl
│   ├── blobToDataUrl      ← NEW (moved from multiple locations)
│   ├── getImageInfo
│   ├── generateId
│   ├── formatBytes
│   ├── formatSpeed         ← NEW (moved from useBackgroundRemoval)
│   ├── estimateDataUrlSize
│   ├── calculateCompressionPercent
│   ├── dataUrlToBlob
│   ├── formatToExtension
│   ├── triggerDownload
│   └── getMimeType         ← NEW (moved from compressionUtils)
│
├── crc32.ts               ← NEW: Extracted CRC-32 algorithm
│
├── thumbnailUtils.ts      ← NEW: Shared thumbnail generation + cleanup helpers
│   ├── createThumbnailItems<T>()
│   ├── createCleanupCallbacks()
│   └── THUMB_MAX_SIZE constant
│
├── downloadUtils.ts       ← NEW: Shared download helpers
│   ├── downloadOneItem()
│   └── downloadAllAsZip()
│
├── workerPoolBridge.ts    ← NEW: Generic worker pool manager
│   └── class WorkerPoolBridge<TResult>
│
├── workerPool.ts          ← Existing (used by global hooks)
└── zipUtil.ts             ← Existing (imports crc32 from crc32.ts)
```

---

## 9. Refactoring Steps — Ordered Checklist

> ⚠️ Each step is a single, testable commit. No behavior changes.

### Phase 1: Extract Shared Utilities (Low Risk)

- [ ] **1.1** Create `src/lib/crc32.ts` — extract CRC-32 from `zipUtil.ts`
- [ ] **1.2** Update `zipUtil.ts` to import from `crc32.ts`
- [ ] **1.3** Update `bg-remover/lib/imageUtils.ts` to import `crc32` from shared
- [ ] **1.4** Add `blobToDataUrl`, `formatSpeed`, `getMimeType` to `src/lib/imageUtils.ts`
- [ ] **1.5** Remove 6 duplicated functions from `bg-remover/lib/imageUtils.ts` → import from `@/lib/imageUtils`
    - `createCanvas`, `loadImage`, `fileToDataUrl`, `getImageInfo`, `generateId`, `formatBytes`, `estimateDataUrlSize`, `calculateCompressionPercent`
- [ ] **1.6** Update `bg-remover/lib/dataConversion.ts` — import `loadImage` from `@/lib/imageUtils` instead of local `loadImageElement`
- [ ] **1.7** Update `bg-remover/hooks/useBackgroundRemoval.ts` — replace local `formatBytes`, `blobToDataUrlLocal` with shared imports; move `resizeImageData` to `bg-remover/lib/imageUtils.ts`
- [ ] **1.8** Update `imgcompressor/lib/compressionUtils.ts` — import `blobToDataUrl`, `getMimeType` from shared
- [ ] **1.9** Update `img-resizer/lib/resizeUtils.ts` — import `blobToDataUrl` from shared

### Phase 2: Extract Shared Hook Helpers (Medium Risk)

- [ ] **2.1** Create `src/lib/thumbnailUtils.ts` with `createThumbnailItems<T>()` and cleanup helpers
- [ ] **2.2** Refactor `imgcompressor/hooks/useCompression.ts` `addFiles` → use `createThumbnailItems`
- [ ] **2.3** Refactor `img-resizer/hooks/useResize.ts` `addFiles` → use `createThumbnailItems`
- [ ] **2.4** Create `src/lib/downloadUtils.ts` with `downloadOneItem()` and `downloadAllAsZip()`
- [ ] **2.5** Refactor both hooks' download logic → use shared `downloadUtils`

### Phase 3: Worker Bridge Consolidation (Medium Risk)

- [ ] **3.1** Create `src/lib/workerPoolBridge.ts` — generic `WorkerPoolBridge<TResult>` class
- [ ] **3.2** Refactor `compressionWorkerBridge.ts` → thin wrapper using `WorkerPoolBridge`
- [ ] **3.3** Refactor `resizeWorkerBridge.ts` → thin wrapper using `WorkerPoolBridge`

### Phase 4: Split Large Files (Medium Risk)

- [ ] **4.1** Split `img-resizer/lib/resizeUtils.ts` into `dimensions.ts`, `canvasHelpers.ts`, `resizeImplementations.ts`, `resizeImage.ts`. Keep `resizeUtils.ts` as barrel re-export.
- [ ] **4.2** Update `resizeWorker.ts` — import `dimensions.ts` where possible (pure functions work in worker context)
- [ ] **4.3** Split `components/ComparisonResults.tsx` into folder with `index.tsx`, `ResultRow.tsx`, `ScrollContainer.tsx`
- [ ] **4.4** Split `app/page.tsx` — extract `_data/landing.ts` and section components to `_components/`
- [ ] **4.5** Split `visual-resizer/VisualResizerInner.tsx` — extract interaction hooks and overlay components

### Phase 5: Type Organization (Low Risk)

- [ ] **5.1** Split `src/types/index.ts` into `image.ts`, `worker.ts`, `bgRemover.ts`. Keep `index.ts` as barrel re-export.
- [ ] **5.2** Add sync-reminder comments in worker type duplications

---

## 10. Rules of Engagement

1. **No behavioral changes** — every refactor is a pure move/rename/re-import. All existing functionality must remain identical.
2. **One phase per PR** — each phase is a self-contained set of changes that can be merged independently.
3. **Keep import aliases stable** — all `@/` path aliases continue to work. Barrel files re-export for backwards compatibility.
4. **Workers stay self-contained** — Web Workers can't use `@/` path aliases or import from the main bundle. Worker-internal duplicates are accepted but minimized (pure functions extracted to shared modules).
5. **Test after each phase** — run `pnpm build` after each phase to verify zero breakage.
6. **No new dependencies** — all changes use existing language/framework features.

---

## Summary of Impact

| Metric                            | Before                    | After (estimated)                                                                      |
| --------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Duplicated utility functions      | 20+ copies across modules | 0 (shared) + 5 (unavoidable in workers)                                                |
| Worker bridge boilerplate         | ~540 lines × 2            | ~100 lines × 2 + 200 shared                                                            |
| Hook download/thumbnail code      | ~180 lines × 2            | ~20 lines × 2 + 100 shared                                                             |
| Largest file (VisualResizerInner) | 37KB / ~900 lines         | ~300 lines + sub-modules                                                               |
| Landing page (page.tsx)           | 26KB / 588 lines          | ~200 lines + section components                                                        |
| New shared lib files              | 3                         | 7 (+4 new: `crc32.ts`, `thumbnailUtils.ts`, `downloadUtils.ts`, `workerPoolBridge.ts`) |
