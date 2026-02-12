import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Check if wasm-pack is available
function hasWasmPack() {
  try {
    execSync("wasm-pack --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasWasmPack()) {
  // Check if pre-built WASM files exist in public/wasm/
  const prebuilt = resolve(root, "public", "wasm", "pre-refinement", "pre_refinement_bg.wasm");
  if (existsSync(prebuilt)) {
    console.log("[wasm] wasm-pack not found, using pre-built WASM files from public/wasm/");
    process.exit(0);
  } else {
    console.error("[wasm] ERROR: wasm-pack not found and no pre-built WASM files exist.");
    console.error("[wasm] Install wasm-pack: cargo install wasm-pack");
    process.exit(1);
  }
}

const crates = ["pre-refinement", "post-refinement", "server"];
const isRelease = !process.argv.includes("--dev");

for (const crate of crates) {
  const crateDir = resolve(root, "wasm", crate);
  const outDir = resolve(root, "public", "wasm", crate);

  mkdirSync(outDir, { recursive: true });

  const mode = isRelease ? "--release" : "--dev";
  const cmd = `wasm-pack build --target web --out-dir "${outDir}" ${mode}`;

  console.log(`\n[wasm] Building ${crate} (${isRelease ? "release" : "dev"})...`);
  execSync(cmd, { cwd: crateDir, stdio: "inherit" });
}

console.log("\n[wasm] All modules built successfully.");
