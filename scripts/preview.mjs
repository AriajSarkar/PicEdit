/**
 * Preview the production build locally.
 *
 * When built with PAGES_BASE_PATH="/PicEdit" (GitHub Pages), all asset URLs
 * start with /PicEdit/. Plain `npx serve out` serves at "/" which breaks them.
 *
 * This script detects whether the build used a basePath:
 *   - If yes → creates a temp directory with a /PicEdit junction so `serve`
 *     matches the same URL structure as GitHub Pages.
 *   - If no  → serves `out/` directly (local / Vercel builds).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const outDir = path.resolve('out');

if (!fs.existsSync(outDir)) {
	console.error("No 'out' directory found. Run `pnpm build` first.");
	process.exit(1);
}

/**
 * Next.js 16 static export generates RSC payload files in nested directories:
 *   out/img-compressor/__next.img-compressor/__PAGE__.txt
 *
 * But the browser requests them with dot notation:
 *   /img-compressor/__next.img-compressor.__PAGE__.txt
 *
 * Plain static servers like `serve` can't map these, so we create flat copies
 * alongside the nested originals.
 */
function flattenRscPayloads(dir) {
	let count = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const routeDir = path.join(dir, entry.name);
		for (const sub of fs.readdirSync(routeDir, { withFileTypes: true })) {
			if (!sub.isDirectory() || !sub.name.startsWith('__next.')) continue;
			const nestedDir = path.join(routeDir, sub.name);
			for (const file of fs.readdirSync(nestedDir)) {
				const dest = path.join(routeDir, `${sub.name}.${file}`);
				if (!fs.existsSync(dest)) {
					fs.copyFileSync(path.join(nestedDir, file), dest);
					count++;
				}
			}
		}
	}
	if (count) console.log(`  Flattened ${count} RSC payload file(s) for static serving.`);
}

flattenRscPayloads(outDir);

// Detect if the build used a basePath by checking for the basePath folder or
// looking at the HTML for asset references starting with /PicEdit.
const indexHtml = path.join(outDir, 'index.html');
let basePath = '';

if (fs.existsSync(indexHtml)) {
	const html = fs.readFileSync(indexHtml, 'utf-8');
	// Detect basePath by looking for a prefix BEFORE /_next/ in asset URLs.
	// No basePath: href="/_next/static/..."  →  no match
	// With basePath: href="/PicEdit/_next/static/..."  →  match "/PicEdit"
	const match = html.match(/(?:href|src)="(\/[^/"]+)\/_next\//);
	if (match) basePath = match[1]; // e.g. "/PicEdit"
}

if (basePath) {
	// Build has basePath — need junction/symlink so serve matches the URL structure
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'picedit-preview-'));
	const linkTarget = path.join(tmpDir, basePath.replace(/^\//, ''));

	try {
		if (process.platform === 'win32') {
			execSync(`mklink /J "${linkTarget}" "${outDir}"`, {
				shell: 'cmd.exe',
				stdio: 'ignore',
			});
		} else {
			fs.symlinkSync(outDir, linkTarget);
		}

		console.log('');
		console.log(`  Preview ready — open http://localhost:3000${basePath}`);
		console.log('');

		execSync(`npx serve@latest "${tmpDir}" -l 3000`, { stdio: 'inherit' });
	} finally {
		try {
			if (process.platform === 'win32') {
				if (fs.existsSync(linkTarget))
					execSync(`rmdir "${linkTarget}"`, { shell: 'cmd.exe', stdio: 'ignore' });
			} else {
				if (fs.existsSync(linkTarget)) fs.unlinkSync(linkTarget);
			}
		} catch {
			/* ignore cleanup errors */
		}
		try {
			if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
		} catch {
			/* ignore cleanup errors */
		}
	}
} else {
	// No basePath — serve directly (local dev / Vercel build)
	console.log('');
	console.log('  Preview ready — open http://localhost:3000');
	console.log('');

	execSync(`npx serve@latest "${outDir}" -l 3000`, { stdio: 'inherit' });
}
