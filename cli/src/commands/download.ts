/**
 * Download command
 * Downloads extensions from server and installs as Claude Code configs
 */

import { homedir } from 'os';
import { join, resolve, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { unzipSync } from 'fflate';
import { getServerUrl, getApiKey } from '../lib/config';
import { ApiClient, ApiError } from '../lib/api-client';
import * as display from '../lib/display';
import type { DownloadFlags, Extension } from '../lib/types';

export async function downloadCommand(flags: DownloadFlags): Promise<void> {
  const serverUrl = getServerUrl(flags.server);
  const apiKey = getApiKey() || '';
  const client = new ApiClient(serverUrl, apiKey);

  display.info(`Server: ${serverUrl}`);

  try {
    let extension: Extension;

    if (flags.id) {
      // Non-interactive: download by ID
      display.info(`Fetching extension ${flags.id}...`);
      const extensions = await client.listExtensions();
      const found = extensions.find((e) => e.id === flags.id);
      if (!found) {
        display.error(`Extension not found: ${flags.id}`);
        process.exit(1);
      }
      extension = found;
    } else if (flags.name) {
      // Non-interactive: search by name
      display.info(`Searching for "${flags.name}"...`);
      const extensions = await client.listExtensions();
      const query = flags.name.toLowerCase();
      const matches = extensions.filter(
        (e) => e.name.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        display.error(`No extensions matching "${flags.name}"`);
        process.exit(1);
      }

      if (matches.length > 1) {
        display.warn(`Multiple extensions match "${flags.name}":`);
        display.displayExtensionList(matches);
        display.error('Be more specific or use --id to select one.');
        process.exit(1);
      }

      extension = matches[0];
    } else {
      // Interactive: list and prompt
      display.info('Fetching extensions...');
      const extensions = await client.listExtensions();

      if (extensions.length === 0) {
        display.info('No extensions available on this server.');
        return;
      }

      display.displayExtensionList(extensions);
      const choice = await display.promptNumber('Select extension:', 1, extensions.length);
      extension = extensions[choice - 1];
    }

    display.info(`Selected: ${extension.name} v${extension.version}`);

    // Resolve target directory
    const targetDir = resolveTargetDir(flags);
    display.info(`Target: ${targetDir}`);

    // Download ZIP
    display.info('Downloading...');
    const zipData = await client.downloadPluginZip(extension.id);

    // Extract and write files
    const written = extractAndWrite(zipData, targetDir, flags.verbose);

    console.log('');
    display.success(`Installed ${written.length} file(s) from "${extension.name}"`);
    for (const file of written) {
      display.verbose(`  ${file}`, true);
    }

    if (written.length > 0 && !flags.verbose) {
      display.info('Use --verbose to see file details.');
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        display.error('Extension not found.');
      } else {
        display.error(`Server error (${err.status}): ${err.message}`);
      }
    } else if (err instanceof Error && err.message.includes('fetch')) {
      display.error(`Could not connect to server: ${serverUrl}`);
    } else {
      display.error(`Unexpected error: ${err}`);
    }
    process.exit(1);
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
