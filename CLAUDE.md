# PicEdit

> **Canonical AI agent instructions**: See [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
>
> **Code quality skill**: See [`.github/skills/code-quality.md`](.github/skills/code-quality.md) — refactoring, DRY, module patterns, file split criteria

## Quick Reference

```bash
pnpm install            # dependencies
pnpm dev                # http://localhost:3000
pnpm build              # build:wasm → build:next → /out
pnpm build:next         # skip WASM (uses pre-built from public/wasm/)
pnpm lint               # eslint
pnpm format             # prettier (tabs)
```

Static SPA — Next.js 16, React 19, Tailwind v4, Rust/WASM. No SSR, no API routes.

### Tools

| Tool               | Route             | Domain               |
| ------------------ | ----------------- | -------------------- |
| Background Remover | `/bg-remover`     | `src/bg-remover/`    |
| Image Compressor   | `/img-compressor` | `src/img-compressor/` |
| Image Resizer      | `/img-resizer`    | `src/img-resizer/`   |

### Key Patterns

- **Domain module split**: `src/app/<route>/page.tsx` (thin shell) + `src/<feature>/` (domain logic)
- **Batch processing**: `useBatchProcessor<T>` in `src/hooks/` — all retry/cancel/progress
- **Worker bridge**: `WorkerPoolBridge<TResult>` in `src/lib/workerPoolBridge.ts` — multi-worker, message-ID routing
- **Shared utils**: `src/lib/` — `crc32`, `thumbnailUtils`, `downloadUtils`, `imageUtils`, `zipUtil`
- **Shared types**: `src/types/index.ts` barrel → `image.ts`, `bgRemover.ts`, `compressor.ts`, `worker.ts`
- **WASM build**: `scripts/build-wasm.mjs` auto-installs `wasm-pack`, cleans junk, exits 0
- **Motion**: import from `'motion/react'` (NOT `'framer-motion'`)
- **Tailwind v4**: `@theme inline` in `globals.css`, no `tailwind.config.js`
