/**
 * Terminal output formatting
 * ANSI colors and structured display helpers
 */

import type { SyncResponse, SyncResultItem, ConfigType } from './types';

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

export function success(msg: string): void {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${c.red}✗${c.reset} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${c.yellow}!${c.reset} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${c.cyan}i${c.reset} ${msg}`);
}

export function verbose(msg: string, isVerbose: boolean): void {
  if (isVerbose) {
    console.log(`${c.gray}  ${msg}${c.reset}`);
  }
}

export function header(msg: string): void {
  console.log(`\n${c.bold}${msg}${c.reset}`);
}

function typeLabel(type: ConfigType): string {
  const labels: Record<ConfigType, string> = {
    slash_command: `${c.cyan}command${c.reset}`,
    agent_definition: `${c.magenta}agent${c.reset}`,
    skill: `${c.blue}skill${c.reset}`,
    mcp_config: `${c.yellow}mcp${c.reset}`,
  };
  return labels[type] || type;
}

function formatItem(item: { name: string; type: ConfigType }): string {
  return `  ${typeLabel(item.type)} ${c.bold}${item.name}${c.reset}`;
}

export function displaySyncSummary(response: SyncResponse, isDryRun: boolean): void {
  const { summary, details } = response;
  const label = isDryRun ? `${c.yellow}[DRY RUN]${c.reset} ` : '';

  header(`${label}Sync Summary`);
  console.log('');

  if (summary.created > 0) {
    console.log(`  ${c.green}+ Created:${c.reset}  ${summary.created}`);
    for (const item of details.created) {
      console.log(`    ${formatItem(item)}`);
    }
  }

  if (summary.updated > 0) {
    console.log(`  ${c.yellow}~ Updated:${c.reset}  ${summary.updated}`);
    for (const item of details.updated) {
      console.log(`    ${formatItem(item)}`);
    }
  }

  if (summary.unchanged > 0) {
    console.log(`  ${c.gray}= Unchanged:${c.reset} ${summary.unchanged}`);
  }

  if (summary.deletionCandidates > 0) {
    console.log(`  ${c.red}? Deletion candidates:${c.reset} ${summary.deletionCandidates}`);
    for (const item of details.deletionCandidates) {
      console.log(`    ${formatItem(item)} ${c.dim}(${item.id})${c.reset}`);
    }
  }

  const total = summary.created + summary.updated + summary.unchanged;
  if (total === 0 && summary.deletionCandidates === 0) {
    console.log(`  ${c.gray}Nothing to sync${c.reset}`);
  }

  console.log('');
}

export function displayDeletionCandidates(items: SyncResultItem[]): void {
  if (items.length === 0) return;

  warn(`${items.length} remote config(s) have no local match and could be deleted:`);
  for (const item of items) {
    console.log(`  ${c.red}-${c.reset} ${formatItem(item)} ${c.dim}(${item.id})${c.reset}`);
  }
  console.log(`\n  ${c.dim}Use --delete flag to remove these after confirmation${c.reset}`);
  console.log('');
}

export function displayScannedConfigs(
  configs: Array<{ name: string; type: ConfigType }>,
  source: string
): void {
  header(`Scanned from ${source}`);
  if (configs.length === 0) {
    console.log(`  ${c.gray}No configs found${c.reset}`);
  } else {
    for (const config of configs) {
      console.log(formatItem(config));
    }
  }
  console.log('');
}

export async function confirm(message: string): Promise<boolean> {
  process.stdout.write(`${message} ${c.dim}[y/N]${c.reset} `);

  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(false);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (data: string) => {
      stdin.removeListener('data', onData);
      stdin.pause();
      const answer = data.toString().trim().toLowerCase();
      console.log('');
      resolve(answer === 'y' || answer === 'yes');
    };

    stdin.on('data', onData);
  });
}

export async function prompt(message: string): Promise<string> {
  process.stdout.write(`${message} `);

  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(false);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (data: string) => {
      stdin.removeListener('data', onData);
      stdin.pause();
      resolve(data.toString().trim());
    };

    stdin.on('data', onData);
  });
}
