---
name: init
description: Initialize the BG Remover development environment
disable-model-invocation: true
user-invocable: true
---

# BG Remover - Development Setup

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Features

### Background Removal
- **100% Client-side** - Uses WebGPU/WASM, no server needed
- **Device Selection** - GPU (faster) or CPU (more compatible)
- **3 Model Options**:
  - Fast (~20MB) - Quick previews
  - Balanced (~40MB) - Good quality
  - Precise (~80MB) - Best results
- **Retry with Higher Precision** - One-click upgrade

### Image Editing
- **Background Options**: Transparent, solid color, custom image, blur
- **Resize**: Scale presets (25-200%), custom W×H, aspect lock
- **Rotate**: -180° to 180°, flip H/V
- **Compression**: Scale down for smaller files

### Export
- **Formats**: PNG, JPG, WebP
- **Quality Slider**: 10-100% for JPG/WebP
- **Scale Down**: Reduce dimensions for smaller file
- **File Size Display**: Shows estimated output size
- **Smart Naming**: Downloads as `{original}-AriajSarkar.{ext}`

### Model Caching
- Models cached in browser Cache API
- Persists across sessions
- "AI model cached and ready" indicator
- Preloads default model on page load
- Error handling for WebGPU, memory, network issues

## Project Structure

```
src/
├── app/
│   ├── layout.tsx    # Dark theme, metadata
│   ├── page.tsx      # Main app with all state
│   └── globals.css   # Tailwind v4 + custom styles
├── components/
│   ├── Header.tsx           # Device/Model selector
│   ├── ImageUploader.tsx    # Drag/drop/paste
│   ├── CompareSlider.tsx    # Before/after with clip-path
│   ├── ControlTabs.tsx      # Tab container
│   ├── ProcessingOverlay.tsx
│   ├── RetryButton.tsx
│   ├── DownloadButton.tsx
│   ├── HistoryPanel.tsx
│   └── tabs/
│       ├── BackgroundTab.tsx
│       ├── ResizeTab.tsx
│       ├── RotateTab.tsx
│       └── ExportTab.tsx    # Compression + file size
├── hooks/
│   ├── useBackgroundRemoval.ts  # AI processing + caching
│   ├── useImageEditor.ts        # Editor state
│   └── useHistory.ts
├── lib/
│   ├── imageUtils.ts    # Canvas, download, file info
│   └── modelCache.ts    # IndexedDB cache (optional)
└── types/
    └── index.ts         # All types + defaults
```

## Key Types

```typescript
interface ImageInfo {
  fileName: string;    // Original name (without extension)
  fileSize: number;    // Original size in bytes
  width: number;
  height: number;
  type: string;
}

interface EditorState {
  backgroundType: "transparent" | "solid" | "image" | "blur";
  backgroundColor: string;
  outputFormat: "image/png" | "image/jpeg" | "image/webp";
  outputQuality: number;      // 0.1 to 1.0
  compressionEnabled: boolean;
  compressionScale: number;   // 0.1 to 1.0
  // ... resize, rotate, crop fields
}
```

## Build & Deploy

```bash
# Development
pnpm dev

# Build static export
pnpm build

# Output in /out directory
```

### GitHub Pages

The `next.config.ts` is configured for static export:
- `output: "export"`
- `basePath: "/bg-remover"` (production)
- `images: { unoptimized: true }`

## Tech Stack

- Next.js 16.1.6
- Tailwind CSS v4
- @imgly/background-removal 1.7.0
- Motion 12.x (import from "motion/react")
