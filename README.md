# PicEdit

PicEdit is a static, client-side image editing suite built with Next.js + React + TypeScript + Rust/WASM.

It currently includes:

- **Background Remover** (`/bg-remover`) with pre/post-processing and refinement pipeline
- **Image Compressor** (`/img-compressor`) with batch processing, retry/cancel controls, and ZIP export

## Highlights

- ⚡ **Static export architecture** (`output: "export"`) — no backend required
- 🧠 **Rust/WASM acceleration** for image processing workloads
- 🧰 **Batch processor engine** shared across tools (`useBatchProcessor`)
- 🎨 **Obsidian Studio design system** (Tailwind v4 + CSS variables)
- 📦 **Multi-file download** via in-browser ZIP generation

## Tech Stack

- **Next.js 16.1.6** (App Router, static export)
- **React 19** + **TypeScript 5**
- **Tailwind CSS v4**
- **Motion** (`motion/react`)
- **Rust + wasm-pack** (workspace crates in `wasm/`)
- **pnpm** package manager

## Project Structure

```text
src/app/                    # Thin route shells (pages/layouts)
src/bg-remover/             # Background remover domain module
src/imgcompressor/          # Image compressor domain module
src/components/             # Shared UI components
src/hooks/                  # Shared hooks (includes useBatchProcessor)
src/lib/                    # Shared utilities (worker pool, zip, image utils)
public/wasm/                # Committed WASM build artifacts
wasm/                       # Rust workspace crates
scripts/build-wasm.mjs      # Universal WASM build script
```

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- (Optional) Rust toolchain + Cargo if you want to rebuild WASM locally

### Install

```bash
pnpm install
```

### Run Dev Server

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

## Build Commands

```bash
pnpm build         # build:wasm then build:next
pnpm build:wasm    # build all WASM crates
pnpm build:next    # Next.js static export build only
pnpm lint          # ESLint
pnpm preview       # local static preview for /out
```

## WASM Build Behavior

`scripts/build-wasm.mjs` is designed to be resilient across environments:

- If `wasm-pack` is missing and Cargo exists, it will auto-install `wasm-pack`
- If Rust/Cargo is unavailable (e.g., serverless CI), it falls back to prebuilt files in `public/wasm/`
- It removes wasm-pack junk files (`.gitignore`, `package.json`, `README.md`) from output folders
- Core crates (`pre-refinement`, `post-refinement`, `server`) are required; `compressor` is optional with Canvas fallback

## Rust/WASM Crates

| Crate | Purpose |
|------|---------|
| `pre-refinement` | CLAHE, denoise, sharpen for background-removal preprocessing |
| `post-refinement` | Edge refinement, guided filter, Poisson blend |
| `server` | Chunked model download helpers |
| `compressor` | Compression algorithms (denoise, quantization, SSIM, PNG filtering) |

## Deployment

- Target deployment: **GitHub Pages** (`/PicEdit`)
- `next.config.ts` sets `basePath` and `assetPrefix` to `/PicEdit` in production
- Static output is generated in `out/`

## Notes

- This project is fully client-side (no API routes, no middleware)
- WASM artifacts in `public/wasm/` are committed intentionally for serverless/static environments
