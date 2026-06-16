/**
 * Download command
 * Downloads one or more extensions from the server and installs them as Claude
 * Code configs. Multiple extensions (via --id a,b / --name x,y / interactive
 * multi-select) are fetched in parallel with a concurrency cap; each reports
 * its own success/failure and one failure never aborts the others.
 */

import { homedir } from 'os';
import { join, resolve, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { unzipSync } from 'fflate';
import { getServerUrl, getApiKey } from '../lib/config';
import { ApiClient, ApiError } from '../lib/api-client';
import * as display from '../lib/display';
import type { DownloadFlags, DownloadResult, Extension } from '../lib/types';

const MAX_CONCURRENT_DOWNLOADS = 4;

export async function downloadCommand(flags: DownloadFlags): Promise<void> {
  const serverUrl = getServerUrl(flags.server);
  const apiKey = getApiKey() || '';
  const client = new ApiClient(serverUrl, apiKey);

  display.info(`Server: ${serverUrl}`);

  try {
    const extensions = await client.listExtensions();
    const selected = await selectExtensions(flags, extensions);

    if (selected.length === 0) {
      display.info('Nothing selected to download.');
      return;
    }

    // Resolve target directory once — applies to the whole batch.
    const targetDir = resolveTargetDir(flags);
    display.info(`Target: ${targetDir}`);
    display.info(`Downloading ${selected.length} extension(s) (max ${MAX_CONCURRENT_DOWNLOADS} in parallel)...`);

    const results = await downloadAll(client, selected, targetDir, flags.verbose);

    console.log('');
    display.displayBatchSummary(results);

    const anyFailed = results.some((r) => !r.ok);
    if (anyFailed) {
      process.exit(1);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      display.error(`Server error (${err.status}): ${err.message}`);
    } else if (err instanceof Error && err.message.includes('fetch')) {
      display.error(`Could not connect to server: ${serverUrl}`);
    } else {
      display.error(`Unexpected error: ${err}`);
    }
    process.exit(1);
  }
}

/**
 * Resolve the set of extensions to download from flags (ids/names) or, when
 * none are given, an interactive multi-select prompt.
 */
async function selectExtensions(flags: DownloadFlags, extensions: Extension[]): Promise<Extension[]> {
  const hasIds = flags.ids && flags.ids.length > 0;
  const hasNames = flags.names && flags.names.length > 0;

  if (hasIds || hasNames) {
    const selected: Extension[] = [];
    const seen = new Set<string>();

    for (const id of flags.ids ?? []) {
      const found = extensions.find((e) => e.id === id);
      if (!found) {
        display.error(`Extension not found: ${id}`);
        process.exit(1);
      }
      if (!seen.has(found.id)) {
        seen.add(found.id);
        selected.push(found);
      }
    }

    for (const name of flags.names ?? []) {
      const query = name.toLowerCase();
      const matches = extensions.filter((e) => e.name.toLowerCase().includes(query));
      if (matches.length === 0) {
        display.error(`No extensions matching "${name}"`);
        process.exit(1);
      }
      if (matches.length > 1) {
        display.warn(`Multiple extensions match "${name}":`);
        display.displayExtensionList(matches);
        display.error('Be more specific or use --id to select one.');
        process.exit(1);
      }
      if (!seen.has(matches[0].id)) {
        seen.add(matches[0].id);
        selected.push(matches[0]);
      }
    }

    return selected;
  }

  // Interactive: list and multi-select
  if (extensions.length === 0) {
    display.info('No extensions available on this server.');
    return [];
  }

  display.displayExtensionList(extensions);
  const choices = await display.promptMultiSelect('Select extension(s):', extensions.length);
  return choices.map((i) => extensions[i - 1]);
}

/**
 * Download a batch of extensions with a fixed concurrency limit. Results are
 * returned in the same order as `extensions`.
 */
async function downloadAll(
  client: ApiClient,
  extensions: Extension[],
  targetDir: string,
  verbose: boolean
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = new Array(extensions.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= extensions.length) return;
      results[index] = await downloadOne(client, extensions[index], targetDir, verbose);
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT_DOWNLOADS, extensions.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}

/** Download and install a single extension, capturing its own success/failure. */
async function downloadOne(
  client: ApiClient,
  extension: Extension,
  targetDir: string,
  verbose: boolean
): Promise<DownloadResult> {
  try {
    const zipData = await client.downloadPluginZip(extension.id);
    const written = extractAndWrite(zipData, targetDir, verbose);
    return { name: extension.name, ok: true, written: written.length };
  } catch (err) {
    const message =
      err instanceof ApiError ? `${err.status}: ${err.message}` : err instanceof Error ? err.message : String(err);
    return { name: extension.name, ok: false, error: message };
  }
}

function resolveTargetDir(flags: DownloadFlags): string {
  if (flags.path) {
    return resolve(flags.path);
  }
  if (flags.global) {
    return join(homedir(), '.claude');
  }
  // Default to project
  return join(resolve('.'), '.claude');
}

function extractAndWrite(zipData: Uint8Array, targetDir: string, verbose: boolean): string[] {
  const files = unzipSync(zipData);
  const written: string[] = [];

  for (const [path, content] of Object.entries(files)) {
    // Skip plugin metadata directory
    if (path.startsWith('.claude-plugin/') || path === '.claude-plugin') {
      display.verbose(`  skip: ${path} (plugin metadata)`, verbose);
      continue;
    }

    // Skip directory entries (zero-length with trailing slash)
    if (path.endsWith('/')) {
      continue;
    }

    const fullPath = join(targetDir, path);
    const dir = dirname(fullPath);

    // Create directory structure
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Warn about .mcp.json conflicts
    if (path === '.mcp.json' && existsSync(fullPath)) {
      display.warn(`${fullPath} already exists — skipping. Merge manually if needed.`);
      continue;
    }

    // Write file
    writeFileSync(fullPath, Buffer.from(content));
    written.push(path);
    display.verbose(`  write: ${path} (${content.length} bytes)`, verbose);
  }

  return written;
}
