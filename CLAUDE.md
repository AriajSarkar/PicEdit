# PicEdit

A collection of client-side image editing tools built with Next.js 16 and Tailwind CSS v4.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Tech Stack

- **Next.js 16.1.6** - React framework with App Router
- **Tailwind CSS v4** - Utility-first CSS with `@tailwindcss/postcss`
- **Framer Motion** - Animations
- **IndexedDB** - Persistent storage for images and model cache

## Available Tools

### Background Remover (`/bg-remover`)

AI-powered background removal using `@imgly/background-removal 1.7.0`.

**Features:**
- Client-side AI background removal
- WebGPU acceleration (with CPU fallback)
- Multiple AI model options (Fast, Balanced, Precise)
- Before/after comparison slider
- Background replacement (transparent, solid, image, blur)
- Resize, rotate, and flip
- Export as PNG, JPG, or WebP
- Session persistence across refreshes
- History of previous results (up to 10)

**Model Options:**
| Model | Size | Precision | Use Case |
|-------|------|-----------|----------|
| `isnet_quint8` | ~20MB | Good | Quick previews |
| `isnet_fp16` | ~40MB | Better | Balanced |
| `isnet` | ~80MB | Best | Final output |

### Coming Soon

- Image Compressor
- Image Resizer
- Format Converter

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main landing page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── bg-remover/        # BG Remover route
│       └── page.tsx       # BG Remover page
├── bg-remover/            # BG Remover service module
│   ├── components/        # React components
│   │   ├── Header.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── CompareSlider.tsx
│   │   ├── ControlTabs.tsx
│   │   ├── ProcessingOverlay.tsx
│   │   ├── DownloadButton.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── RetryButton.tsx
│   │   └── tabs/
│   │       ├── BackgroundTab.tsx
│   │       ├── ResizeTab.tsx
│   │       ├── RotateTab.tsx
│   │       └── ExportTab.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useBackgroundRemoval.ts
│   │   ├── useImageEditor.ts
│   │   ├── useHistory.ts
│   │   └── useSession.ts
│   ├── lib/               # Utility functions
│   │   ├── imageUtils.ts
│   │   ├── indexedDB.ts
│   │   └── modelCache.ts
│   └── types/
│       └── index.ts       # TypeScript types
└── ...
```

## Key Features

- **Privacy First**: All processing happens in the browser, no server uploads
- **Model caching**: AI models cached in IndexedDB to avoid re-downloading
- **Session persistence**: Current image survives page refresh
- **History persistence**: Previous edits stored in IndexedDB

## Build & Deploy

```bash
pnpm build    # Output in /out directory
```

## Configuration

`next.config.ts`:
- `output: "export"` - Static site generation
- `basePath` - Set to repo name for GitHub Pages
