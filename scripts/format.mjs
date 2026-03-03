#!/usr/bin/env node

/**
 * Unified formatter — runs Prettier (TS/JS/CSS/JSON) and cargo fmt (Rust) in parallel.
 * Usage: node scripts/format.mjs [--check]
 */

import { execSync, exec } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const checkMode = process.argv.includes('--check');

/** Run a command, return { ok, stdout, stderr } */
function run(cmd, label) {
	return new Promise((res) => {
		const child = exec(
			cmd,
			{ cwd: root, maxBuffer: 10 * 1024 * 1024 },
			(err, stdout, stderr) => {
				if (err) {
					console.error(`\x1b[31m✗ ${label} failed\x1b[0m`);
					if (stderr) console.error(stderr.toString().trim());
					if (stdout) console.log(stdout.toString().trim());
					res({ ok: false, label });
				} else {
					console.log(`\x1b[32m✓ ${label}\x1b[0m`);
					res({ ok: true, label });
				}
			},
		);
	});
}

async function main() {
	console.log(`\n\x1b[36m▸ Running formatters${checkMode ? ' (check mode)' : ''}…\x1b[0m\n`);

	const tasks = [];

	// ── Prettier ─────────────────────────────────────────────────────────
	const prettierCmd = checkMode
		? 'npx prettier --check "src/**/*.{ts,tsx,css,json}" "*.{json,mjs}" "scripts/**/*.mjs"'
		: 'npx prettier --write "src/**/*.{ts,tsx,css,json}" "*.{json,mjs}" "scripts/**/*.mjs"';
	tasks.push(run(prettierCmd, 'Prettier (TS/JS/CSS/JSON)'));

	// ── Cargo fmt ────────────────────────────────────────────────────────
	const cargoToml = resolve(root, 'wasm', 'Cargo.toml');
	if (existsSync(cargoToml)) {
		try {
			execSync('cargo --version', { stdio: 'ignore' });
			const cargoCmd = checkMode
				? 'cargo fmt --manifest-path wasm/Cargo.toml --all -- --check'
				: 'cargo fmt --manifest-path wasm/Cargo.toml --all';
			tasks.push(run(cargoCmd, 'cargo fmt (Rust/WASM)'));
		} catch {
			console.log('\x1b[33m⚠ cargo not found — skipping Rust formatting\x1b[0m');
		}
	} else {
		console.log('\x1b[33m⚠ wasm/Cargo.toml not found — skipping Rust formatting\x1b[0m');
	}

	const results = await Promise.all(tasks);
	const failed = results.filter((r) => !r.ok);

	console.log('');
	if (failed.length > 0) {
		console.error(
			`\x1b[31m${failed.length} formatter(s) failed: ${failed.map((f) => f.label).join(', ')}\x1b[0m`,
		);
		process.exit(1);
	} else {
		console.log('\x1b[32m✓ All formatters passed\x1b[0m\n');
	}
}

main();
