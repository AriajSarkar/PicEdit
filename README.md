<p align="center">
  <img src="public/icon.svg" alt="PicEdit" width="64" height="64" />
</p>

<h1 align="center">PicEdit</h1>

<p align="center">
  A privacy-first image editing suite that runs entirely in your browser.<br/>
  No uploads. No accounts. No watermarks.
</p>

<p align="center">
  <a href="https://ariajsarkar.github.io/PicEdit">Live Demo</a>
</p>

---

## Why PicEdit?

Most online image tools upload your files to remote servers, require sign-ups, add watermarks, or cap usage behind paywalls. PicEdit does none of that.

Every operation — AI background removal, compression, resizing, format conversion — happens client-side using WebAssembly (Rust) and on-device ML inference. Your images never leave your machine.

---

## Tools

| Tool | Route | What it does |
|------|-------|-------------|
| **Background Remover** | `/bg-remover` | AI-powered background removal with WASM pre/post-processing pipeline (CLAHE, guided filter, Poisson blend) |
| **Image Compressor** | `/img-compressor` | WASM-accelerated compression with bilateral denoise, median-cut quantization, SSIM scoring, and PNG filter optimization |
| **Image Resizer** | `/img-resizer` | Lanczos3 WASM resize kernel. Social media presets, custom dimensions, batch support |
| **Format Converter** | `/img-converter` | Convert between JPEG, PNG, WebP, AVIF, BMP, TIFF, ICO, and PDF with Rust WASM encoding |

All tools support **batch processing** with parallel Web Workers, individual retry/cancel controls, progress tracking, and multi-file ZIP download.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (static export, no SSR) |
| UI | React 19, TypeScript 5, Tailwind CSS v4 |
| Animations | Motion (`motion/react`) |
| Image Processing | Rust compiled to WebAssembly via wasm-pack |
| AI / ML | `@imgly/background-removal`, `@huggingface/transformers` (on-device) |
| Package Manager | pnpm 10 |
| Design System | "Obsidian Studio" — CSS custom properties, Outfit + Fira Code fonts |
| CI/CD | GitHub Actions (auto WASM build + GitHub Pages deploy) |

---

## Architecture

```
src/
├── app/                        # Thin route shells (pages + layouts)
│   ├── bg-remover/             #   page.tsx → imports from src/bg-remover/
│   ├── img-compressor/         #   page.tsx → imports from src/img-compressor/
│   ├── img-resizer/            #   page.tsx → imports from src/img-resizer/
│   ├── img-converter/          #   page.tsx → imports from src/img-converter/
│   ├── _components/            #   Landing page section components
│   ├── _data/                  #   Static data for the landing page
│   ├── layout.tsx              #   Root layout + fonts
│   └── page.tsx                #   Landing page orchestrator
├── bg-remover/                 # Domain: components, hooks, lib, types, workers
├── img-compressor/             # Domain: components, hooks, lib, types, worker
├── img-resizer/                # Domain: components, hooks, lib, types
├── img-converter/              # Domain: components, hooks, lib, types
├── components/                 # Shared UI (FileUploader, StatsBar, buttons, etc.)
├── hooks/                      # Shared hooks (useBatchProcessor)
├── lib/                        # Shared utils (workerPool, zip, crc32, imageUtils)
└── types/                      # Shared type definitions

wasm/                           # Rust workspace (6 crates)
├── pre-refinement/             #   CLAHE, denoise, sharpen
├── post-refinement/            #   Edge refine, guided filter, Poisson blend
├── server/                     #   Chunked model download
├── compressor/                 #   Bilateral denoise, quantize, SSIM, PNG filters
├── resizer/                    #   Lanczos3 resize kernel
└── converter/                  #   Format encoding (AVIF, WebP, BMP, TIFF, ICO, PDF)

public/wasm/                    # Pre-built WASM artifacts (committed to git)
scripts/
├── build-wasm.mjs              #   Universal WASM build script
├── preview.mjs                 #   Local static preview server
└── format.mjs                  #   Prettier + cargo fmt runner
```

**Key convention:** Routes are thin wrappers. Domain logic lives in `src/<feature>/`, not inside `src/app/<feature>/`. New tools follow this same split.

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **Rust toolchain + Cargo** (optional — only if you want to rebuild WASM crates locally)

### Install and Run

```bash
# Clone the repository
git clone https://github.com/AriajSarkar/PicEdit.git
cd PicEdit

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build           # Full build: WASM crates + Next.js static export → /out
pnpm build:next      # Next.js only (uses pre-built WASM from public/wasm/)
pnpm build:wasm      # Rebuild all Rust WASM crates
```

### Other Commands

```bash
pnpm lint            # ESLint (flat config)
pnpm format          # Prettier (tabs) + cargo fmt
pnpm preview         # Serve the /out directory locally
```

---

## WASM Build System

The build script (`scripts/build-wasm.mjs`) is designed to work across all environments:

- Auto-installs `wasm-pack` via `cargo install` when Rust is available
- Falls back silently to pre-built artifacts in `public/wasm/` when no Rust toolchain exists (CI, Vercel, etc.)
- Cleans up wasm-pack junk files (`.gitignore`, `package.json`, `README.md`) from output directories
- Always exits `0` — the build never fails due to missing Rust

The `compressor` and `converter` crates are optional at runtime; the app uses Canvas API fallbacks when WASM modules are unavailable.

---

## Deployment

PicEdit deploys as a fully static site.

| Target | How |
|--------|-----|
| **GitHub Pages** | Automated via `.github/workflows/deploy.yml` on push to `main`. Sets `basePath: /PicEdit`. |
| **Vercel** | Zero-config. Serves at root `/`. Uses pre-built WASM artifacts. |
| **Self-hosted** | Run `pnpm build`, then serve the `out/` directory with any static file server. |

Cross-origin isolation (required for `SharedArrayBuffer` in WASM workers) is handled by `coi-serviceworker.js`.

---

## Contributing

1. Fork the repo and create your branch from `main`
2. Follow the existing domain module pattern: route shell in `src/app/<tool>/`, domain code in `src/<tool>/`
3. Run `pnpm lint` and `pnpm format` before committing
4. Open a pull request

For architecture details and coding conventions, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

---

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
