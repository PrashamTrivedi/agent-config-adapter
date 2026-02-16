#!/usr/bin/env bun
/**
 * aca - Agent Config Adapter CLI
 * Syncs local Claude Code configurations to the server
 */

import { syncCommand } from './commands/sync';
import { loginCommand } from './commands/login';
import { statusCommand } from './commands/status';
import type { SyncFlags, ConfigType } from './lib/types';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`
aca v${VERSION} - Agent Config Adapter CLI

Usage:
  aca <command> [flags]

Commands:
  sync      Sync local configs to the remote server
  login     Authenticate with the server
  status    Show current auth and sync status

Sync Flags:
  --global       Sync from ~/.claude/ (global configs)
  --project      Sync from ./.claude/ (project configs)
  --dry-run      Preview changes without applying
  --types <t>    Filter config types (comma-separated: slash_command,agent_definition,skill)
  --delete       Allow deletion of remote configs with no local match
  --verbose      Show detailed output

Global Flags:
  --server <url> Override server URL
  --help, -h     Show this help
  --version, -v  Show version
`);
}

function parseArgs(args: string[]): { command: string; flags: Record<string, string | boolean> } {
  const command = args[0] || '';
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }

  return { command, flags };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`aca v${VERSION}`);
    process.exit(0);
  }

  const { command, flags } = parseArgs(args);

  switch (command) {
    case 'sync': {
      const typesStr = flags.types as string | undefined;
      const validTypes = ['slash_command', 'agent_definition', 'skill', 'mcp_config'];
      let types: ConfigType[] | undefined;

      if (typesStr) {
        types = typesStr.split(',').map((t) => t.trim()) as ConfigType[];
        const invalid = types.filter((t) => !validTypes.includes(t));
        if (invalid.length > 0) {
          console.error(`Invalid type(s): ${invalid.join(', ')}`);
          console.error(`Valid types: ${validTypes.join(', ')}`);
          process.exit(1);
        }
      }

      const syncFlags: SyncFlags = {
        global: !!flags.global,
        project: !!flags.project,
        dryRun: !!flags['dry-run'],
        types,
        server: flags.server as string | undefined,
        verbose: !!flags.verbose,
        delete: !!flags.delete,
      };

      await syncCommand(syncFlags);
      break;
    }

    case 'login':
      await loginCommand(flags.server as string | undefined);
      break;

    case 'status':
      await statusCommand();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
