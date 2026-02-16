/**
 * Sync command
 * Scans local .claude directories and syncs to remote server
 */

import { homedir } from 'os';
import { join, resolve } from 'path';
import { loadConfig, getApiKey, getServerUrl, updateLastSync } from '../lib/config';
import { scanDirectory } from '../lib/scanner';
import { ApiClient, ApiError } from '../lib/api-client';
import * as display from '../lib/display';
import type { SyncFlags, LocalConfigInput } from '../lib/types';

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

  // Scan directories
  const allConfigs: LocalConfigInput[] = [];

  if (flags.global) {
    const globalDir = join(homedir(), '.claude');
    display.info(`Scanning global configs: ${globalDir}`);
    const result = scanDirectory(globalDir);
    allConfigs.push(...result.configs);

    if (flags.verbose) {
      display.displayScannedConfigs(result.configs, '~/.claude/ (global)');
      for (const warning of result.warnings) {
        display.warn(`${warning.path}: ${warning.reason}`);
      }
    } else if (result.warnings.length > 0) {
      display.warn(`${result.warnings.length} warning(s) during global scan (use --verbose to see)`);
    }
  }

  if (flags.project) {
    const projectDir = join(resolve('.'), '.claude');
    display.info(`Scanning project configs: ${projectDir}`);
    const result = scanDirectory(projectDir);
    allConfigs.push(...result.configs);

    if (flags.verbose) {
      display.displayScannedConfigs(result.configs, './.claude/ (project)');
      for (const warning of result.warnings) {
        display.warn(`${warning.path}: ${warning.reason}`);
      }
    } else if (result.warnings.length > 0) {
      display.warn(`${result.warnings.length} warning(s) during project scan (use --verbose to see)`);
    }
  }

  if (allConfigs.length === 0) {
    display.info('No configs found to sync.');
    return;
  }

  display.info(`Found ${allConfigs.length} config(s) to sync`);

  // Step 1: Always run dry-run first
  try {
    display.info('Running preview...');
    const dryRunResult = await client.sync(allConfigs, flags.types, true);
    display.displaySyncSummary(dryRunResult, true);

    // If --dry-run flag, stop here
    if (flags.dryRun) {
      display.info('Dry run complete. No changes made.');
      return;
    }

    // Check if there's anything to do
    const { summary } = dryRunResult;
    if (summary.created === 0 && summary.updated === 0) {
      display.success('Everything is up to date!');

      if (summary.deletionCandidates > 0) {
        display.displayDeletionCandidates(dryRunResult.details.deletionCandidates);
      }
      return;
    }

    // Step 2: Ask for confirmation
    const confirmed = await display.confirm('Apply these changes?');
    if (!confirmed) {
      display.info('Sync cancelled.');
      return;
    }

    // Step 3: Execute actual sync
    display.info('Syncing...');
    const result = await client.sync(allConfigs, flags.types, false);
    display.displaySyncSummary(result, false);
    display.success('Sync complete!');

    // Update last_sync timestamp
    updateLastSync();

    // Step 4: Handle deletion candidates
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
