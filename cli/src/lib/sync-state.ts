/**
 * Per-machine sync memory
 * Records the content hashes of what was last synced, keyed by server + scope
 * + absolute directory. Lives in ~/.config/aca/sync-state.json (separate from
 * config.json). Override the path with ACA_STATE_FILE (used by tests).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { SyncStateFile, SyncStateEntry } from './types';

const STATE_VERSION = 1;

export type Scope = 'global' | 'project';

function stateFilePath(): string {
  return process.env.ACA_STATE_FILE || join(homedir(), '.config', 'aca', 'sync-state.json');
}

/** Memory key — isolates scope, server, and project directory from each other. */
export function stateKey(serverUrl: string, scope: Scope, absDir: string): string {
  return `${serverUrl.replace(/\/+$/, '')}::${scope}::${absDir}`;
}

export function loadState(): SyncStateFile {
  const file = stateFilePath();
  if (!existsSync(file)) {
    return { version: STATE_VERSION, entries: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as SyncStateFile;
    if (!parsed || typeof parsed !== 'object' || !parsed.entries) {
      return { version: STATE_VERSION, entries: {} };
    }
    return parsed;
  } catch {
    // Corrupt state behaves like no memory (full sync, then rebuild).
    return { version: STATE_VERSION, entries: {} };
  }
}

export function getEntry(serverUrl: string, scope: Scope, absDir: string): SyncStateEntry | null {
  const state = loadState();
  return state.entries[stateKey(serverUrl, scope, absDir)] ?? null;
}

export function saveEntry(
  serverUrl: string,
  scope: Scope,
  absDir: string,
  configs: Record<string, string>,
  lastSync: string
): void {
  const state = loadState();
  state.version = STATE_VERSION;
  state.entries[stateKey(serverUrl, scope, absDir)] = { lastSync, configs };

  const file = stateFilePath();
  const dir = dirname(file);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(file, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

/**
 * Compare a freshly-computed hash map against a stored entry.
 * Returns true if anything was added, removed, or modified (or no entry yet).
 */
export function hasChanges(current: Record<string, string>, entry: SyncStateEntry | null): boolean {
  if (!entry) return true;
  const prev = entry.configs || {};
  const currentKeys = Object.keys(current);
  const prevKeys = Object.keys(prev);
  if (currentKeys.length !== prevKeys.length) return true;
  for (const key of currentKeys) {
    if (prev[key] !== current[key]) return true;
  }
  return false;
}
