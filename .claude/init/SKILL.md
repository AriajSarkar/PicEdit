---
name: init
description: Initialize the PicEdit development environment — static SPA with modular image tools
disable-model-invocation: true
user-invokable: true
---

# PicEdit — Development Setup

## Quick Start

```bash
pnpm install            # dependencies
pnpm dev                # http://localhost:3000
pnpm build              # build:wasm → build:next → /out
pnpm build:next         # skip WASM (uses pre-built from public/wasm/)
pnpm lint               # eslint (flat config)
pnpm format             # prettier (tabs)
```

Static SPA — Next.js 16, React 19, TypeScript 5, Tailwind v4, Rust/WASM. No SSR, no API routes.

## Tools

| Tool               | Route             | Domain               |
| ------------------ | ----------------- | -------------------- |
| Background Remover | `/bg-remover`     | `src/bg-remover/`    |
| Image Compressor   | `/img-compressor` | `src/img-compressor/` |
| Image Resizer      | `/img-resizer`    | `src/img-resizer/`   |

## Project Structure

```
src/app/bg-remover/page.tsx      → thin route shell (metadata in layout.tsx)
src/bg-remover/                  → domain: components/, hooks/, lib/, types/, workers/
src/app/img-compressor/page.tsx  → thin route shell
src/img-compressor/              → domain: components/, hooks/, lib/, types/, worker.ts
src/app/img-resizer/page.tsx     → thin route shell
src/img-resizer/                 → domain: components/, hooks/, lib/, types/
src/app/page.tsx                 → landing page (imports from _data/ + _components/)
src/components/                  → shared: FileUploader, RetryButton, CancelButton, DownloadButton, StatsBar, ComparisonResults/
src/hooks/                       → shared: useBatchProcessor (generic batch engine)
src/lib/                         → shared: imageUtils, workerPool, workerPoolBridge, zipUtil, crc32, thumbnailUtils, downloadUtils
src/types/                       → shared types (barrel index.ts → image.ts, bgRemover.ts, compressor.ts, worker.ts)
wasm/                            → Rust workspace (5 crates) → built to public/wasm/
```

**Key pattern:** Routes are thin wrappers. Domain logic lives in `src/<feature>/`, NOT `src/app/<feature>/`.

## Key Patterns

- **Domain module split**: `src/app/<route>/page.tsx` (thin shell) + `src/<feature>/` (domain logic)
- **Batch processing**: `useBatchProcessor<T>` in `src/hooks/` — all retry/cancel/progress
- **Worker bridge**: `WorkerPoolBridge<TResult>` in `src/lib/workerPoolBridge.ts` — multi-worker, message-ID routing
- **Motion**: import from `'motion/react'` (NOT `'framer-motion'`)
- **Tailwind v4**: `@theme inline` in `globals.css`, no `tailwind.config.js`
- **All pages are `'use client'`** — no SSR, no API routes, no middleware

## WASM Crates

| Crate             | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `pre-refinement`  | CLAHE, denoise, sharpen for BG removal                    |
| `post-refinement` | Edge refine, guided filter, Poisson blend                 |
| `server`          | Chunked model download                                    |
| `compressor`      | Bilateral denoise, median-cut quantize, SSIM, PNG filters |
| `resizer`         | Lanczos3 resize kernel                                    |

Pre-built `.wasm`/`.js`/`.d.ts` files committed to `public/wasm/`. Build script (`scripts/build-wasm.mjs`) auto-installs `wasm-pack`, exits 0 gracefully when no Rust toolchain is available.

## Critical Gotchas

1. **Import `motion` from `'motion/react'`**, never `'framer-motion'`
2. **No `tailwind.config.js`** — Tailwind v4 uses `@theme inline` in CSS
3. **Static export only** — no server components, no API routes, no middleware
4. **Domain module pattern** — new tools go in `src/<tool-name>/` with thin route in `src/app/<tool-name>/page.tsx`
5. **ESLint flat config** (`eslint.config.mjs`) — ignores `public/wasm/**`, `public/workers/**`
6. **Pre-built WASM is committed** — `public/wasm/` files tracked in git for serverless deploys

## Skills

- **Code Quality**: See `.claude/skills/code-quality.md` — refactoring, DRY, module patterns, file split criteria, anti-patterns
