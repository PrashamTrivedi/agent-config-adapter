/**
 * Sync command
 * Scans local .claude directories and syncs to remote server.
 *
 * Fast path: per-scope memory (sync-state.json) records the content hashes of
 * what was last synced. On each run we re-hash local configs and:
 *   - if nothing changed (and not --force) → print "up to date" with NO server
 *     round-trip;
 *   - otherwise send only the changed configs (full content), plus the full
 *     local identity set as `local_keys` so the server can still compute
 *     deletion candidates. After applying, local memory is rebuilt.
 * --force ignores memory, sends everything, reconciles against the server, and
 * rebuilds memory from the result.
 */

import { homedir } from 'os';
import { join, resolve } from 'path';
import { getApiKey, getServerUrl, updateLastSync } from '../lib/config';
import { scanDirectory } from '../lib/scanner';
import { hashConfigs } from '../lib/hash';
import { getEntry, saveEntry, hasChanges, type Scope } from '../lib/sync-state';
import { ApiClient, ApiError } from '../lib/api-client';
import * as display from '../lib/display';
import type { SyncFlags, LocalConfigInput } from '../lib/types';

interface ScopeScan {
  scope: Scope;
  dir: string;
  configs: LocalConfigInput[];
  hashes: Record<string, string>;
  // `${type}:${name}` keys that are new or modified vs memory (need uploading)
  changedKeys: Set<string>;
  // true if anything changed at all (new/modified/removed) → contact server
  changed: boolean;
}

export async function syncCommand(flags: SyncFlags): Promise<void> {
  // Validate flags
  if (!flags.global && !flags.project) {
    display.error('Specify at least one of --global or --project');
    display.info('  aca sync --global     Sync from ~/.claude/');
    display.info('  aca sync --project    Sync from ./.claude/');
    display.info('  aca sync --global --project  Sync both');
    process.exit(1);
  }

  // Check auth
  const apiKey = getApiKey();
  if (!apiKey) {
    display.error('Not authenticated. Run "aca login" first.');
    process.exit(1);
  }

  const serverUrl = getServerUrl(flags.server);
  const client = new ApiClient(serverUrl, apiKey);

  display.info(`Server: ${serverUrl}`);

  // Scan each enabled scope independently (memory is per scope + dir).
  const scopes: ScopeScan[] = [];

  if (flags.global) {
    scopes.push(scanScope('global', join(homedir(), '.claude'), '~/.claude/ (global)', serverUrl, flags));
  }
  if (flags.project) {
    scopes.push(scanScope('project', join(resolve('.'), '.claude'), './.claude/ (project)', serverUrl, flags));
  }

  const allConfigs = scopes.flatMap((s) => s.configs);

  if (allConfigs.length === 0) {
    display.info('No configs found to sync.');
    return;
  }

  display.info(`Found ${allConfigs.length} config(s) across ${scopes.length} scope(s)`);

  // Fast path: nothing changed in any scope and not forcing → no server work.
  const anyChanged = scopes.some((s) => s.changed);
  if (!flags.force && !anyChanged) {
    display.success('Everything is up to date! (no changes since last sync)');
    return;
  }

  // Build the upload set.
  // - force: send everything, no local_keys (full server-side comparison).
  // - incremental: send only changed configs + local_keys (full local identity
  //   set) so deletion candidates stay correct.
  const configsToSend = flags.force
    ? allConfigs
    : scopes.flatMap((s) => s.configs.filter((c) => isChangedConfig(c, s)));

  const localKeys = flags.force
    ? undefined
    : allConfigs.map((c) => ({ name: c.name, type: c.type }));

  if (!flags.force) {
    display.info(`${configsToSend.length} changed config(s) to upload`);
  }

  try {
    // Step 1: dry-run preview (changed configs only, unless --force)
    display.info('Running preview...');
    const dryRunResult = await client.sync(configsToSend, flags.types, true, localKeys);
    display.displaySyncSummary(dryRunResult, true);

    if (flags.dryRun) {
      display.info('Dry run complete. No changes made.');
      return;
    }

    const { summary } = dryRunResult;
    if (summary.created === 0 && summary.updated === 0) {
      display.success('Everything is up to date!');
      if (summary.deletionCandidates > 0) {
        display.displayDeletionCandidates(dryRunResult.details.deletionCandidates);
      }
      // Server confirmed no changes — rebuild memory so future runs fast-path.
      persistState(scopes, serverUrl);
      return;
    }

    // Step 2: confirm
    const confirmed = await display.confirm('Apply these changes?');
    if (!confirmed) {
      display.info('Sync cancelled.');
      return;
    }

    // Step 3: apply
    display.info('Syncing...');
    const result = await client.sync(configsToSend, flags.types, false, localKeys);
    display.displaySyncSummary(result, false);
    display.success('Sync complete!');

    // Rebuild local memory from the configs we just synced.
    updateLastSync();
    persistState(scopes, serverUrl);

    // Step 4: deletion candidates
    if (result.details.deletionCandidates.length > 0) {
      display.displayDeletionCandidates(result.details.deletionCandidates);

      if (flags.delete) {
        const deleteConfirmed = await display.confirm(
          `Delete ${result.details.deletionCandidates.length} remote config(s) that have no local match?`
        );

        if (deleteConfirmed) {
          const ids = result.details.deletionCandidates.map((c) => c.id);
          const deleteResult = await client.deleteBatch(ids);
          display.success(`Deleted ${deleteResult.deleted.length} config(s)`);
          if (deleteResult.failed.length > 0) {
            display.warn(`Failed to delete ${deleteResult.failed.length} config(s)`);
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        display.error('Authentication failed. Run "aca login" to re-authenticate.');
      } else {
        display.error(`Server error (${err.status}): ${err.message}`);
      }
    } else {
      display.error(`Unexpected error: ${err}`);
    }
    process.exit(1);
  }
}

function scanScope(
  scope: Scope,
  dir: string,
  label: string,
  serverUrl: string,
  flags: SyncFlags
): ScopeScan {
  display.info(`Scanning ${scope} configs: ${dir}`);
  const result = scanDirectory(dir);

  if (flags.verbose) {
    display.displayScannedConfigs(result.configs, label);
    for (const warning of result.warnings) {
      display.warn(`${warning.path}: ${warning.reason}`);
    }
  } else if (result.warnings.length > 0) {
    display.warn(`${result.warnings.length} warning(s) during ${scope} scan (use --verbose to see)`);
  }

  const hashes = hashConfigs(result.configs);
  const entry = getEntry(serverUrl, scope, dir);
  const prev = entry?.configs ?? {};

  // New or modified keys (these carry full content on upload).
  const changedKeys = new Set<string>();
  for (const key of Object.keys(hashes)) {
    if (!entry || prev[key] !== hashes[key]) {
      changedKeys.add(key);
    }
  }

  // `changed` also accounts for local deletions (a key in memory but gone now),
  // so we still contact the server to surface deletion candidates.
  const changed = hasChanges(hashes, entry);

  return { scope, dir, configs: result.configs, hashes, changedKeys, changed };
}

/** True if this config is new or modified relative to the scope's memory. */
function isChangedConfig(config: LocalConfigInput, scan: ScopeScan): boolean {
  return scan.changedKeys.has(`${config.type}:${config.name}`);
}

/** Persist the current hash map for every scanned scope. */
function persistState(scopes: ScopeScan[], serverUrl: string): void {
  const now = new Date().toISOString();
  for (const scope of scopes) {
    saveEntry(serverUrl, scope.scope, scope.dir, scope.hashes, now);
  }
}
