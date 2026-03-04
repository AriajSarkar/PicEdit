---
name: code-quality
description: Enforce code quality, modularity, and DRY principles during refactoring and feature development. Use this skill when restructuring code, eliminating duplication, consolidating utilities, splitting large files, or improving architecture.
---

# Code Quality — PicEdit Skill

> Use this skill when restructuring code, eliminating duplication, consolidating utilities, splitting large files, adding new features, or improving architecture. Ensures all contributors and AI agents maintain codebase health.

## Core Principles

### 1. DRY (Don't Repeat Yourself)

- **Exact duplicates**: Extract immediately to a shared module. No exceptions.
- **Near-duplicates** (same logic, minor variations): Parameterize the shared version. Use generics, config objects, or strategy callbacks to handle differences.
- **Structural duplicates** (same pattern, different types): Use generics or factory functions.
- **Worker duplicates**: Workers can't import from the main bundle. Accept duplication of browser/worker-specific code, but extract **pure logic** (math, string formatting, constants) to shared modules that both main thread and workers can import.

### 2. Single Responsibility

- Each file should have ONE clear purpose. If you need "and" to describe it, split it.
- Target: **≤300 lines** per file. Files **>500 lines** are mandatory split candidates.
- Components render UI. Hooks manage state/effects. Utils are pure functions. Workers do heavy computation.

### 3. Barrel Exports for Backwards Compatibility

When splitting a file, keep the original filename as a barrel re-export:

```ts
// resizeUtils.ts — was 445 lines, now barrel
export { calculateOutputDimensions, applyFit } from './dimensions';
export { resizeWithWasm, resizeWithCanvas } from './resizeImplementations';
export { resizeImage } from './resizeImage';
```

This ensures **zero import breakage** across the codebase.

### 4. Feature Module Pattern

PicEdit follows a strict domain module split:

```
src/app/<route>/page.tsx    → thin route shell (< 50 lines ideally)
src/<feature>/              → domain logic
  components/               → feature UI (can have subfolders: parts/, tabs/)
  hooks/                    → feature React hooks
  lib/                      → feature pure functions
  types/                    → feature TypeScript types
  workers/                  → feature Web Workers
```

**Never** put domain logic in route files. Routes import from feature modules.

### 5. Import Hierarchy

```
src/lib/          → shared utilities (pure functions, no React)
src/hooks/        → shared React hooks
src/components/   → shared React components
src/types/        → shared TypeScript types (barrel index.ts)
src/<feature>/    → feature-specific (can import from shared, NEVER cross-feature)
src/app/          → routes (thin shells, import from features + shared)
```

Features NEVER import from other features. If two features need the same thing, move it to shared.

## PicEdit-Specific Patterns

### Shared Utilities (`src/lib/`)

| Module                | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `imageUtils.ts`       | `loadImage`, `blobToDataUrl`, `formatBytes`, etc.    |
| `crc32.ts`            | CRC-32 lookup table (used by zipUtil + bg-remover)   |
| `thumbnailUtils.ts`   | `createThumbnailItems<T>()`, `cleanupItemUrls()`     |
| `downloadUtils.ts`    | `downloadOne<T>()`, `downloadAll<T>()` (single+ZIP)  |
| `workerPoolBridge.ts` | `WorkerPoolBridge<TResult>` — multi-worker bridge    |
| `workerPool.ts`       | Lower-level worker pool management                   |
| `zipUtil.ts`          | Zero-dependency ZIP builder (Store method, CRC-32)   |

Before creating **any** new utility, check if it already exists here.

### Shared Types (`src/types/`)

Organized as a barrel with domain files:

```
src/types/index.ts       → barrel re-export
src/types/image.ts       → OutputFormat, ImageInfo
src/types/bgRemover.ts   → DeviceType, ModelType, EditorState
src/types/compressor.ts  → CompressionMode, CompressedImage
src/types/worker.ts      → TaskStatus, WorkerTask, WorkerResult
```

- **Shared types** (used by 2+ features) → `src/types/<domain>.ts`
- **Feature types** (single feature only) → `src/<feature>/types/`
- **Worker types**: Duplicated in workers with `@see` comments pointing to source of truth

### Batch Processing

All batch/retry/cancel logic uses `useBatchProcessor<T>` from `src/hooks/useBatchProcessor.ts`. Never implement custom batch/retry logic — extend the existing hook.

### Worker Bridge

Both compressor and resizer use `WorkerPoolBridge<TResult>` from `src/lib/workerPoolBridge.ts`. New worker-based tools must use this bridge, not roll their own message routing.

### Component Organization

When a component folder gets crowded (6+ files at root level):
- Move internal sub-components into a `parts/` subfolder
- Keep only the main component, entry barrel, types, and shared utils at root
- Example: `visual-resizer/parts/` holds `Toolbar`, `ZoomBar`, `ImageStrip`, etc.

## Refactoring Workflow

### Before Starting

1. **Read the refactoring plan** if one exists (`REFACTORING_PLAN.md`)
2. **Verify build works**: `pnpm build:next` before ANY changes
3. **Understand import graph**: `grep` for all usages of functions you plan to move

### During Refactoring

1. **One logical change per step** — extract, update imports, verify
2. **Never change behavior** — pure move/rename/re-import operations only
3. **Update ALL import sites** — grep for every usage of moved functions
4. **Preserve public API** — barrel re-exports maintain backwards compatibility
5. **Workers are special** — they need local copies of browser-specific utilities (Canvas, Blob APIs). Only pure functions can be shared.

### After Each Step

1. **Check for TypeScript errors**: `pnpm build:next`
2. **Verify no circular imports**: watch for A→B→A chains
3. **Confirm no dead code**: removed duplicates should have zero remaining usages

## Code Quality Checks

### Function Extraction Criteria

**Extract to shared** when a function:
- Appears in 2+ files with identical or near-identical logic
- Has no feature-specific dependencies (pure input→output)
- Is a general utility (formatting, conversion, math)

**Keep feature-local** when a function:
- Uses feature-specific types or state
- Has domain-specific branching logic
- Is only used within one feature module

### File Split Criteria

**Split** when a file:
- Exceeds 500 lines
- Contains multiple unrelated concerns (data + rendering + logic)
- Has internal "sections" that could be independent modules
- Contains static data arrays (constants, configs) mixed with logic

### Tailwind CSS

- Use **canonical class names** — Tailwind v4 shorthand utilities, not `text-(--foreground)` when `text-foreground` works
- All custom theme tokens are defined via `@theme inline` in `globals.css`
- Use CSS variables via Tailwind utilities (`text-accent`, `bg-surface`, `border-border`), never hardcode hex values
- Run `pnpm format` to auto-fix class ordering via `prettier-plugin-tailwindcss-canonical-classes`

### Component Conventions

- Shared components: `React.memo` with named function — `export const Foo = memo(function Foo({...}) { ... })`
- All components start with `'use client'` directive
- Animations: `motion` from `'motion/react'` (NEVER `'framer-motion'`)
- Shared components accept `variant`, `size`, `disabled`, `className` props

## Anti-Patterns to Avoid

1. **God files** — single files doing everything (>500 lines)
2. **Copy-paste utilities** — same function in multiple files
3. **Cross-feature imports** — `src/img-compressor/` importing from `src/img-resizer/`
4. **Hardcoded constants in workers** — duplicate data that drifts out of sync
5. **Deep import paths** — prefer barrel exports over `import from './sub/deep/module'`
6. **Premature abstraction** — don't create shared utilities for single-use functions
7. **Domain logic in routes** — `src/app/**` files should be thin shells
8. **Non-canonical Tailwind classes** — always prefer shorthand (`text-accent` not `text-(--accent)`)
9. **Custom batch/retry logic** — use `useBatchProcessor<T>` from shared hooks
10. **Custom worker pooling** — use `WorkerPoolBridge<TResult>` from shared lib
