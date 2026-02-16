/**
 * Filesystem scanner
 * Scans .claude directories for commands, agents, and skills
 */

import { readdirSync, readFileSync, lstatSync, readlinkSync, realpathSync, statSync } from 'fs';
import { join, relative, basename, extname, dirname } from 'path';
import type { LocalConfigInput, CompanionFile, ConfigType } from './types';

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.ts', '.js', '.py', '.sh',
  '.toml', '.csv', '.xml', '.html', '.css', '.tsx', '.jsx',
]);

const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.py': 'text/x-python',
  '.sh': 'text/x-shellscript',
  '.toml': 'text/toml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export interface ScanWarning {
  path: string;
  reason: string;
}

export interface ScanResult {
  configs: LocalConfigInput[];
  warnings: ScanWarning[];
}

/**
 * Scan a .claude directory for all config types
 */
export function scanDirectory(basePath: string): ScanResult {
  const configs: LocalConfigInput[] = [];
  const warnings: ScanWarning[] = [];
  const visitedDirs = new Set<string>();

  // Scan commands
  const commandsDir = join(basePath, 'commands');
  scanConfigDir(commandsDir, 'slash_command', configs, warnings, visitedDirs);

  // Scan agents
  const agentsDir = join(basePath, 'agents');
  scanConfigDir(agentsDir, 'agent_definition', configs, warnings, visitedDirs);

  // Scan skills
  const skillsDir = join(basePath, 'skills');
  scanSkillsDir(skillsDir, configs, warnings, visitedDirs);

  return { configs, warnings };
}

/**
 * Scan a config directory recursively for .md files
 * Builds colon-separated names from subdirectory paths
 */
function scanConfigDir(
  dirPath: string,
  type: ConfigType,
  configs: LocalConfigInput[],
  warnings: ScanWarning[],
  visitedDirs: Set<string>,
  namePrefix: string = ''
): void {
  if (!dirExists(dirPath)) return;

  // Realpath deduplication
  const realDir = resolveRealPath(dirPath, warnings);
  if (!realDir) return;
  if (visitedDirs.has(realDir)) {
    warnings.push({ path: dirPath, reason: 'Already visited (circular symlink), skipping' });
    return;
  }
  visitedDirs.add(realDir);

  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch (err: any) {
    warnings.push({ path: dirPath, reason: `Permission denied: ${err.message}` });
    return;
  }

  if (entries.length === 0) {
    warnings.push({ path: dirPath, reason: 'Empty directory, skipping' });
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);

    // Check symlink validity
    if (!isValidEntry(fullPath, warnings)) continue;

    const stat = safeStat(fullPath);
    if (!stat) {
      warnings.push({ path: fullPath, reason: 'Cannot stat entry, skipping' });
      continue;
    }

    if (stat.isDirectory()) {
      const subPrefix = namePrefix ? `${namePrefix}:${entry}` : entry;
      scanConfigDir(fullPath, type, configs, warnings, visitedDirs, subPrefix);
    } else if (stat.isFile() && extname(entry).toLowerCase() === '.md') {
      const name = namePrefix
        ? `${namePrefix}:${basename(entry, '.md')}`
        : basename(entry, '.md');

      try {
        const content = readFileSync(fullPath, 'utf-8');
        configs.push({ name, type, content });
      } catch (err: any) {
        warnings.push({ path: fullPath, reason: `Cannot read file: ${err.message}` });
      }
    }
  }
}

/**
 * Scan skills directory
 * Each skill is a subdirectory with SKILL.md as main content
 */
function scanSkillsDir(
  dirPath: string,
  configs: LocalConfigInput[],
  warnings: ScanWarning[],
  visitedDirs: Set<string>
): void {
  if (!dirExists(dirPath)) return;

  const realDir = resolveRealPath(dirPath, warnings);
  if (!realDir) return;
  if (visitedDirs.has(realDir)) {
    warnings.push({ path: dirPath, reason: 'Already visited (circular symlink), skipping' });
    return;
  }
  visitedDirs.add(realDir);

  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch (err: any) {
    warnings.push({ path: dirPath, reason: `Permission denied: ${err.message}` });
    return;
  }

  for (const entry of entries) {
    const skillDir = join(dirPath, entry);

    if (!isValidEntry(skillDir, warnings)) continue;

    const stat = safeStat(skillDir);
    if (!stat || !stat.isDirectory()) continue;

    const skillMdPath = join(skillDir, 'SKILL.md');
    if (!fileExists(skillMdPath)) {
      warnings.push({ path: skillDir, reason: 'Skill directory missing SKILL.md, skipping' });
      continue;
    }

    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const companionFiles = scanCompanionFiles(skillDir, warnings);

      configs.push({
        name: entry,
        type: 'skill',
        content,
        companionFiles: companionFiles.length > 0 ? companionFiles : undefined,
      });
    } catch (err: any) {
      warnings.push({ path: skillMdPath, reason: `Cannot read SKILL.md: ${err.message}` });
    }
  }
}

/**
 * Scan companion files within a skill directory
 * Excludes SKILL.md itself
 */
function scanCompanionFiles(
  skillDir: string,
  warnings: ScanWarning[]
): CompanionFile[] {
  const companions: CompanionFile[] = [];
  scanCompanionDir(skillDir, skillDir, companions, warnings);
  return companions;
}

function scanCompanionDir(
  baseDir: string,
  currentDir: string,
  companions: CompanionFile[],
  warnings: ScanWarning[]
): void {
  let entries: string[];
  try {
    entries = readdirSync(currentDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    const relativePath = relative(baseDir, fullPath);

    // Skip SKILL.md
    if (relativePath === 'SKILL.md') continue;

    const stat = safeStat(fullPath);
    if (!stat) continue;

    if (stat.isDirectory()) {
      scanCompanionDir(baseDir, fullPath, companions, warnings);
    } else if (stat.isFile()) {
      try {
        const ext = extname(entry).toLowerCase();
        const isText = TEXT_EXTENSIONS.has(ext);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        let content: string;
        if (isText) {
          content = readFileSync(fullPath, 'utf-8');
        } else {
          const buffer = readFileSync(fullPath);
          content = buffer.toString('base64');
        }

        companions.push({
          path: relativePath,
          content,
          mimeType,
        });
      } catch (err: any) {
        warnings.push({ path: fullPath, reason: `Cannot read companion file: ${err.message}` });
      }
    }
  }
}

/**
 * Check if a path is a valid entry (handles symlink rules)
 * - Regular files/dirs: always valid
 * - Symlinks: valid only if target is not itself a symlink (one-level only)
 */
function isValidEntry(fullPath: string, warnings: ScanWarning[]): boolean {
  try {
    const lstats = lstatSync(fullPath);

    if (!lstats.isSymbolicLink()) {
      return true; // Regular file or directory
    }

    // It's a symlink — check the target
    const target = readlinkSync(fullPath);
    const resolvedTarget = join(dirname(fullPath), target);

    try {
      const targetLstats = lstatSync(resolvedTarget);
      if (targetLstats.isSymbolicLink()) {
        // Chained symlink (symlink → symlink) — skip with warning
        warnings.push({
          path: fullPath,
          reason: `Chained symlink (target "${target}" is also a symlink), skipping`,
        });
        return false;
      }
      return true; // Single-level symlink to real file/dir
    } catch {
      warnings.push({
        path: fullPath,
        reason: `Broken symlink (target "${target}" not found), skipping`,
      });
      return false;
    }
  } catch {
    return false;
  }
}

function dirExists(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function safeStat(path: string): ReturnType<typeof statSync> | null {
  try {
    return statSync(path); // follows symlinks
  } catch {
    return null;
  }
}

function resolveRealPath(path: string, warnings: ScanWarning[]): string | null {
  try {
    return realpathSync(path);
  } catch (err: any) {
    warnings.push({ path, reason: `Cannot resolve real path: ${err.message}` });
    return null;
  }
}
