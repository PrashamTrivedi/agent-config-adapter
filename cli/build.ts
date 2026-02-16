#!/usr/bin/env bun
/**
 * Build script for ACA CLI
 * Compiles to standalone binaries for multiple platforms
 */

import { $ } from 'bun';
import { mkdirSync, existsSync } from 'fs';

const targets = [
  { name: 'aca-linux-x64', target: 'bun-linux-x64' },
  { name: 'aca-darwin-arm64', target: 'bun-darwin-arm64' },
  { name: 'aca-darwin-x64', target: 'bun-darwin-x64' },
  { name: 'aca-windows-x64.exe', target: 'bun-windows-x64' },
] as const;

const distDir = './dist';

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

console.log('Building ACA CLI...\n');

for (const { name, target } of targets) {
  const outPath = `${distDir}/${name}`;
  console.log(`  Building ${name} (${target})...`);

  try {
    await $`bun build --compile --target=${target} --outfile=${outPath} ./src/index.ts`.quiet();
    console.log(`  ✓ ${outPath}`);
  } catch (err: any) {
    console.error(`  ✗ Failed to build ${name}: ${err.message}`);
  }
}

console.log('\nDone!');
