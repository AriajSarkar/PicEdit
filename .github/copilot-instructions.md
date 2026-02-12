# PicEdit — Copilot Instructions

## Architecture

Static SPA (Next.js 16 + `output: "export"`) with modular image tools:

```
src/app/bg-remover/page.tsx      → thin route shell (metadata in layout.tsx)
src/bg-remover/                  → domain: components/, hooks/, lib/, types/, workers/
src/app/img-compressor/page.tsx  → thin route shell
src/imgcompressor/               → domain: components/, hooks/, lib/, types/, worker.ts, index.ts
src/components/                  → shared: FileUploader, RetryButton, CancelButton, DownloadButton, StatsBar
src/hooks/                       → shared: useBatchProcessor (generic batch engine)
src/lib/                         → shared: imageUtils, workerPool, zipUtil
src/types/index.ts               → shared type definitions
wasm/                            → Rust workspace (4 crates) → built to public/wasm/
```

**Key pattern:** Routes are thin wrappers. Domain logic lives in `src/<feature>/`, NOT `src/app/<feature>/`. New tools follow this same split.

## Tech Stack

- **Next.js 16.1.6**, React 19, TypeScript 5, pnpm 10
- **Tailwind CSS v4** — NO `tailwind.config.js`. Theme via `@theme inline` in `globals.css`
- **Motion** — import from `'motion/react'` (NOT `'framer-motion'`)
- **Rust/WASM** — 4 crates (`pre-refinement`, `post-refinement`, `server`, `compressor`) in `wasm/` workspace
- **All pages are `'use client'`** — no SSR, no API routes, no middleware

## Build & Dev

```bash
pnpm install            # dependencies
pnpm dev                # http://localhost:3000
pnpm build              # build:wasm → build:next → /out
pnpm build:next         # skip WASM (uses pre-built from public/wasm/)
pnpm build:wasm         # auto-installs wasm-pack if cargo available
pnpm lint               # eslint (flat config)
```

`build-wasm.mjs` auto-installs `wasm-pack` via `cargo install` if missing. Falls back to pre-built `public/wasm/` artifacts when no Rust toolchain exists (Vercel). Always exits 0. The `compressor` crate is optional — app uses Canvas fallback.

## WASM Crates

| Crate | Purpose | Output |
|-------|---------|--------|
| `pre-refinement` | CLAHE, denoise, sharpen for BG removal | `public/wasm/pre-refinement/` |
| `post-refinement` | Edge refine, guided filter, Poisson blend | `public/wasm/post-refinement/` |
| `server` | Chunked model download | `public/wasm/server/` |
| `compressor` | Bilateral denoise, median-cut quantize, SSIM, PNG filters | `public/wasm/compressor/` |

All Cargo.toml files have `wasm-opt = false` (avoids wasm-opt binary crashes). Pre-built `.wasm`/`.js`/`.d.ts` files are committed to git. The build script cleans wasm-pack junk (`.gitignore`, `package.json`, `README.md`) from output dirs automatically.

## Design System ("Obsidian Studio")

CSS custom properties in `globals.css`:
- Backgrounds: `--bg-primary`, `--bg-surface`, `--bg-elevated`, `--bg-hover`
- Text: `--foreground`, `--text-secondary`, `--text-muted`
- Accent: `--accent` (#e07a5f copper), `--accent-hover`, `--accent-soft`, `--accent-glow`
- Status: `--success`, `--info`, `--warning`, `--error` (+ `-soft` variants)
- Utility classes: `.glass`, `.btn-primary`, `.btn-secondary`, `.card`, `.text-gradient`, `.noise`
- Always use `var(--accent)` / `var(--bg-surface)` — never hardcode colors
- Fonts: **Outfit** (sans), **Fira Code** (mono) via `next/font/google`

## Component Conventions

- Shared components use `React.memo` with named function: `export const Foo = memo(function Foo({...}) { ... })`
- All components start with `'use client'` directive
- Animations: `motion` from `'motion/react'` with `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`
- Shared components accept `variant`, `size`, `disabled`, `className` props

## Batch Processing Pattern

All batch/retry/cancel logic uses `useBatchProcessor<T>` from `src/hooks/useBatchProcessor.ts`:

```tsx
const { items, processOne, processAll, retryOne, retryAll, cancelOne, cancelAll } =
  useBatchProcessor<MyItem>({ processFn, onRemove, onClear });
```

`ProcessFn` signature: `(item, signal: AbortSignal, onProgress) => Promise<Partial<T>>`
Items extend `BatchItem { id, status, progress, stage, error? }`.

## Worker Bridge Pattern (Compressor)

`src/imgcompressor/index.ts` uses message-ID based concurrency-safe worker bridge:
- Singleton worker with `initPromise` guard (check promise FIRST, not worker ref)
- Numeric `id` on every message for request/response correlation via `pending` Map
- Init uses `'ready'`/`'init-error'` types; operations use `'error'` + `msg.id`
- Worker (`worker.ts`) queues operations behind `initDone` promise during async WASM load

## Download Pattern

- Single file: direct `<a>` download with `URL.createObjectURL`
- Multiple files: ZIP via `src/lib/zipUtil.ts` (zero-dependency, Store method, CRC-32)
- ZIP filename: `PicEdit-{random6}.zip`

## Deployment

- **Target:** GitHub Pages at `/PicEdit`
- `basePath: "/PicEdit"` in `next.config.ts` (production only)
- `process.env.NEXT_PUBLIC_BASE_PATH` for runtime asset paths
- Cross-origin isolation via `coi-serviceworker.js` (required for WASM SharedArrayBuffer)
- CI: `.github/workflows/deploy.yml` (Pages), `.github/workflows/build-wasm.yml` (auto-commit WASM artifacts)

## Critical Gotchas

1. **Import `motion` from `'motion/react'`**, never `'framer-motion'`
2. **No `tailwind.config.js`** — Tailwind v4 uses `@theme inline` in CSS
3. **Refs must sync via `useEffect`**, not inline assignment (ESLint `react-hooks/refs` rule)
4. **Static export only** — no server components, no API routes, no middleware
5. **WASM build auto-installs** — `build-wasm.mjs` runs `cargo install wasm-pack` if needed, exits 0 gracefully
6. **Domain module pattern** — new tools go in `src/<tool-name>/` with thin route in `src/app/<tool-name>/page.tsx`
7. **IndexedDB** for persistence — model cache, session state, history (no backend)
8. **ESLint flat config** (`eslint.config.mjs`) — ignores `public/wasm/**`, `public/workers/**`
9. **wasm-pack outputs junk** — `.gitignore` (with `*`), `package.json`, `README.md` must be deleted after builds
10. **Pre-built WASM is committed** — `public/wasm/` files are tracked in git for serverless deploys
