# Research Report: BGBye Repository & AI Models

This report provides research data on the `MangoLion/bgbye` repository and the AI models used by [bgbye.io](https://bgbye.io).

## Repository Overview
- **GitHub Link:** [MangoLion/bgbye](https://github.com/MangoLion/bgbye)
- **Developer:** [Fyrean](https://github.com/MangoLion)
- **Type:** Free and Open Source Software (FOSS).
- **Functionality:** Real-time background removal for images and videos directly in the browser (via a backend server).

## Technical Architecture
- **Tech Stack:** 
  - **Frontend/Backend Server:** Node.js (JavaScript)
  - **Model Inference:** Python
- **Key Mechanism:** Uses a multi-model approach where users can compare results from different AI models.
- **Optimization:** Models are unloaded to RAM (instead of disk) to maintain performance and reduce latency.

## AI Model Information

BGBye uses a variety of open-source models tailored for different object types (humans, anime, general objects).

### 1. InSPyReNet (Primary/Top Rated)
Used for high-quality, pyramidal refinement segmentation.
- **Official Repository:** [plemeri/InSPyReNet](https://github.com/plemeri/InSPyReNet)
- **Hugging Face Model:** [1038lab/inspyrenet](https://huggingface.co/1038lab/inspyrenet)
- **Best Use Case:** Complex edges, fine details like hair.

### 2. Bria RMBG 1.4
A professional-grade background removal model by Bria AI.
- **Hugging Face Model:** [briaai/RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4)
- **License:** Non-commercial (unless specified).

### 3. BiRefNet
Bilateral Reference Network for High-Resolution Background Removal.
- **Official Repository:** [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- **Hugging Face Model:** [ZhengPeng7/BiRefNet](https://huggingface.co/ZhengPeng7/BiRefNet)

### 4. Other Supported Models
| Model Name | Source/Link |
| :--- | :--- |
| **U2Net** | [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net) |
| **BASNet** | [xuebinqin/BASNet](https://github.com/xuebinqin/BASNet) |
| **Tracer-B7** | [Karel911/TRACER](https://github.com/Karel911/TRACER) |
| **DIS (IS-Net)** | [xuebinqin/DIS](https://github.com/xuebinqin/DIS) |
| **DeepLabV3** | [PyTorch Hub - DeepLabV3](https://pytorch.org/hub/pytorch_vision_deeplabv3_resnet101/) |

## Deep Dive: Browser-Only (Serverless) Feasibility

Following the "Last Verification" request, here is the deep-dive data on running InSPyReNet without a server:

### 1. Model Variations & Decimation
- **Standard (Swin-B HD):** Best quality but too heavy for most browsers (requires high VRAM/RAM).
- **Web-Optimized (Swin-B 384x384):** A decimated version that maintains high quality but drastically reduces memory footprint. This is the **ideal candidate** for a Rust/WASM implementation.
- **ONNX Export:** Official efforts exist to export these weights to ONNX format, making them compatible with `onnxruntime-web`.

### 2. Performance Benchmarks
- **Quality:** InSPyReNet consistently outperforms "Open RMBG" and "U2Net" in edge precision and handling of semi-transparent areas (like smoke or fine hair).
- **Runtime:** 
  - **With WebGPU:** Near real-time performance on modern machines (Fast).
  - **With WASM (CPU Fallback):** Slower (2-5 seconds per image) and memory-intensive.
- **Optimization Strategy:** To keep the UI responsive, the model should run in a **Web Worker** with a proxy, preventing the browser from freezing during inference.

### 3. Conclusion for "no-server" picedit
It is **possible** to run a decimated InSPyReNet model in the browser using ONNX Runtime. However, because it is still more demanding than your current `@imgly` models, the best architecture would be:
1. **Model:** InSPyReNet (ONNX decimated 384x384).
2. **Runtime:** ONNX Runtime Web with WebGPU support.
3. **Refinement:** Use **Rust/WASM** to handle the post-processing of the alpha mask to ensure the edges are razor-sharp without needing a 200MB model download.

> [!IMPORTANT]
> We have decided to use **@imgly** as the primary model and focus on a **Rust/WASM Refinement** hybrid to reach professional quality without the overhead of heavy models like InSPyReNet.

## Technical Explainer: Rust/WASM Refinement & Caching

### 1. Why Rust for "Refinement"?
The AI models (like InSPyReNet) provide a **Saliency Map**—basically a fuzzy black-and-white mask of the subject.
- **The Problem:** At high resolutions (4K), the AI might miss fine strands of hair or create "jagged" edges because it works on a downscaled image.
- **The Rust Solution (Guided Filter):** 
  - Rust takes the **Rough Mask** (from AI) and the **Original High-Res Image**.
  - It uses a mathematical algorithm called a **Guided Filter** to compare the colors of the original pixels against the mask.
  - If it sees a sharp edge in the original photo that the mask missed, it "snaps" the mask to that edge.
  - **Speed:** Doing this over millions of pixels in JavaScript is slow; in Rust (WASM), it's close to native speed.

### 2. Model Chunk Caching in Rust
You currently have a `modelCache.ts` using IndexedDB. Here is why doing it in **Rust** is a level-up:
- **Direct Memory Access:** Rust can handle the binary chunks of a 100MB+ model without the "GC pauses" (Garbage Collection) that happen in JavaScript.
- **Reliable Storage:** Using the `indexed-db` crate in Rust, we can stream the model data directly from the network into the browser's storage in small chunks.
- **Persistence:** This stays in the browser's IndexedDB until the user manually clears data. It stays until the data is wiped by the browser (just like you requested).

### 3. Proposed "No-Server" Workflow
1. **User loads page**: Rust checks IndexedDB for the `@imgly` model bits.
2. **First time**: Rust downloads chunks and saves them to IndexedDB for permanent caching.
3. **Processing**:
   - **@imgly AI model** runs (fast, already in browser).
   - **Rust WASM Layer** kicks in: Refines the mask using the original high-res data for sharp edges.
4. **Result**: A consistent, professional result entirely on the user's computer.

> [!TIP]
> This "hybrid" approach (AI + Rust Math) is exactly how high-end professional tools work. It balances the "Intelligence" of the AI with the "Precision" of traditional image processing.

## Tweak & Pre-process with Rust

You asked if it's possible to "prompt" or "tweak" the model. Since `@imgly` is mostly a black box, the best way to "tweak" it is through **Pre-processing** and **Post-processing** layers in Rust.

### 1. Pre-processing (The "Tweak"):
Before the AI even sees the image, Rust can "tweak" it to make the subject stand out:
- **Contrast Boosting (CLAHE):** If the subject and background have similar colors, Rust can boost local contrast so the AI can "see" the edges better.
- **Thresholding Hints:** We can create a rough contrast-based "segmentation hint" to guide the AI.
- **Noise Reduction:** Removing "salt and pepper" noise from phone photos helps the AI avoid jagged edges.

### 2. The "Prompting" Effect:
While you can't type a text prompt into `@imgly`, adjusting these Rust parameters behaves like a "technical prompt":
- **"Subject is dark"** -> Boost exposure only in dark areas.
- **"Edges are fuzzy"** -> Apply a Laplacian sharpen before the AI runs.

### 3. Conclusion:
By adding a **Rust Pre-processing Step**, you can offer users "Tweaking" sliders (like Intensity, Contrast, Sharpness) that actually help the AI do a better job.

> [!TIP]
> This makes your app feel much more "pro" because the user can actually fix a failed background removal by tweaking a few Rust-powered sliders!
