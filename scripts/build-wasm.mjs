/**
 * PicEdit WASM Build Script
 *
 * Automatically installs wasm-pack if missing (requires cargo/Rust).
 * Builds all WASM crates and outputs to public/wasm/.
 *
 * Works everywhere:
 *  - Local dev          → installs wasm-pack via cargo, builds all crates
 *  - GitHub Actions     → same (Rust toolchain pre-installed by workflow)
 *  - Vercel / serverless → no Rust toolchain → falls back to pre-built artifacts
 *
 * Exit codes: always 0 (never blocks the overall Next.js build).
 */

import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync, unlinkSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Helpers ─────────────────────────────────────────────────────────────────

function hasCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasPrebuilt() {
  const required = ["pre-refinement", "post-refinement", "server"];
  return required.every(crate => {
    const name = crate.replace(/-/g, "_");
    return existsSync(resolve(root, "public", "wasm", crate, `${name}_bg.wasm`));
  });
}

/** Install wasm-pack using cargo. Returns true if successful. */
function installWasmPack() {
  console.log("[wasm] Installing wasm-pack via cargo...");
  try {
    execSync("cargo install wasm-pack", { stdio: "inherit", timeout: 300_000 });
    console.log("[wasm] ✓ wasm-pack installed successfully");
    return true;
  } catch (err) {
    console.error(`[wasm] ✗ Failed to install wasm-pack: ${err.message}`);
    return false;
  }
}

/** Clean wasm-pack junk files from output directory */
function cleanWasmPackJunk(outDir) {
  const junk = [".gitignore", "package.json", "README.md"];
  for (const file of junk) {
    const fp = resolve(outDir, file);
    try { if (existsSync(fp)) unlinkSync(fp); } catch { /* ignore */ }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const crates = ["pre-refinement", "post-refinement", "server", "compressor"];
const isRelease = !process.argv.includes("--dev");

// 1. Ensure wasm-pack is available — install if missing
if (!hasCommand("wasm-pack")) {
  if (!hasCommand("cargo")) {
    // No Rust toolchain at all (Vercel, etc.)
    if (hasPrebuilt()) {
      console.log("[wasm] No Rust toolchain — using pre-built WASM from public/wasm/");
    } else {
      console.warn("[wasm] WARNING: No Rust toolchain and no pre-built WASM files.");
      console.warn("[wasm] Install Rust from https://rustup.rs then re-run.");
    }
    process.exit(0);
  }

  // Cargo exists but wasm-pack doesn't — install it
  const installed = installWasmPack();
  if (!installed) {
    if (hasPrebuilt()) {
      console.log("[wasm] Falling back to pre-built WASM files.");
    } else {
      console.warn("[wasm] Cannot build WASM — no wasm-pack and no pre-built files.");
    }
    process.exit(0);
  }
}

// 2. Ensure wasm32-unknown-unknown target is installed
try {
  execSync("rustup target add wasm32-unknown-unknown", { stdio: "ignore" });
} catch { /* already installed or rustup not available */ }

// 3. Build each crate
let hasError = false;

for (const crate of crates) {
  const crateDir = resolve(root, "wasm", crate);
  const outDir = resolve(root, "public", "wasm", crate);

  if (!existsSync(crateDir)) {
    console.warn(`[wasm] Skipping ${crate} — directory not found`);
    continue;
  }

  mkdirSync(outDir, { recursive: true });

  const mode = isRelease ? "--release" : "--dev";
  const cmd = `wasm-pack build --target web --out-dir "${outDir}" ${mode}`;

  console.log(`\n[wasm] Building ${crate} (${isRelease ? "release" : "dev"})...`);

  try {
    execSync(cmd, { cwd: crateDir, stdio: "inherit" });
    cleanWasmPackJunk(outDir);
    console.log(`[wasm] ✓ ${crate}`);
  } catch (err) {
    const isOptional = crate === "compressor";
    if (isOptional) {
      console.warn(`[wasm] ⚠ ${crate} failed (optional — Canvas fallback used)`);
    } else {
      console.error(`[wasm] ✗ ${crate} failed: ${err.message}`);
      hasError = true;
    }
  }
}

// 4. Final cleanup — remove ALL wasm-pack junk from every output dir
for (const crate of crates) {
  const outDir = resolve(root, "public", "wasm", crate);
  if (existsSync(outDir)) cleanWasmPackJunk(outDir);
}

if (hasError) {
  console.error("\n[wasm] Some core crates failed. Check errors above.");
}

console.log("\n[wasm] WASM build complete.");
process.exit(0);
