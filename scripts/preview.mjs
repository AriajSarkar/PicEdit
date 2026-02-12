/**
 * Preview the production build locally.
 *
 * The build uses basePath: "/PicEdit" so all asset URLs start with /PicEdit/.
 * `npx serve out` serves at "/" which breaks every asset link.
 *
 * This script creates a temp directory with the out folder nested under /PicEdit
 * so `serve` matches the same URL structure as GitHub Pages.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const outDir = path.resolve("out");

if (!fs.existsSync(outDir)) {
  console.error("No 'out' directory found. Run `pnpm build` first.");
  process.exit(1);
}

// Create temp dir with /PicEdit symlink (or junction on Windows)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "picedit-preview-"));
const linkTarget = path.join(tmpDir, "PicEdit");

try {
  // Use junction on Windows (no admin needed), symlink on Unix
  if (process.platform === "win32") {
    execSync(`mklink /J "${linkTarget}" "${outDir}"`, { shell: "cmd.exe", stdio: "ignore" });
  } else {
    fs.symlinkSync(outDir, linkTarget);
  }

  console.log("");
  console.log("  Preview ready — open http://localhost:3000/PicEdit");
  console.log("");

  execSync(`npx serve@latest "${tmpDir}" -l 3000`, { stdio: "inherit" });
} finally {
  // Cleanup
  try {
    if (process.platform === "win32") {
      execSync(`rmdir "${linkTarget}"`, { shell: "cmd.exe", stdio: "ignore" });
    } else {
      fs.unlinkSync(linkTarget);
    }
    fs.rmdirSync(tmpDir);
  } catch {}
}
