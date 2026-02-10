import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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
