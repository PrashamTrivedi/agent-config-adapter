import { ConfigRepository } from '../infrastructure/database';
import { SkillFilesRepository } from '../infrastructure/skill-files-repository';
import { Config, ConfigType, CreateConfigInput } from '../domain/types';

export interface SyncServiceEnv {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
}

export interface LocalConfigInput {
  name: string;
  type: ConfigType;
  content: string;
  companionFiles?: Array<{
    path: string;
    content: string; // Base64 encoded for binary files
    mimeType?: string;
  }>;
}

export interface SyncResultItem {
  name: string;
  type: ConfigType;
  id: string;
}

export interface SyncResult {
  created: SyncResultItem[];
  updated: SyncResultItem[];
  unchanged: Array<{ name: string; type: ConfigType }>;
  deletionCandidates: SyncResultItem[];
}

/**
 * SyncService - Handles push-only synchronization of local configs to remote
 *
 * Sync operations:
 * - Create: Local exists, no remote match → create new config
 * - Update: Local exists, remote match exists → update remote (local wins)
 * - Delete candidates: Remote exists, no local match → collect for user confirmation
 */
export class SyncService {
  private configRepo: ConfigRepository;
  private skillFilesRepo: SkillFilesRepository;
  private r2: R2Bucket;

  constructor(env: SyncServiceEnv) {
    this.configRepo = new ConfigRepository(env.DB);
    this.skillFilesRepo = new SkillFilesRepository(env.DB);
    this.r2 = env.EXTENSION_FILES;
  }

  /**
   * Sync local configs to remote
   * @param localConfigs - Array of local config inputs
   * @param userId - User ID for ownership
   * @param types - Optional filter for config types
   * @param dryRun - If true, only preview changes without applying
   */
  async syncConfigs(
    localConfigs: LocalConfigInput[],
    userId: string,
    types?: ConfigType[],
    dryRun: boolean = false,
    localKeys?: Array<{ name: string; type: ConfigType }>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      created: [],
      updated: [],
      unchanged: [],
      deletionCandidates: [],
    };

    // Filter local configs by types if specified
    const filteredLocalConfigs = types
      ? localConfigs.filter((c) => types.includes(c.type))
      : localConfigs;

    // Get all remote configs for this user, filtered by types
    const remoteConfigs = await this.getRemoteConfigs(userId, types);

    // Build lookup map: `${name}:${type}` → remoteConfig
    const remoteMap = new Map<string, Config>();
    for (const config of remoteConfigs) {
      remoteMap.set(`${config.name}:${config.type}`, config);
    }

    // Track which remote configs were matched by a sent local config
    const matchedRemoteKeys = new Set<string>();

    // Process each local config in parallel — each is an independent write,
    // so a batch of N changes resolves in ~1 round-trip rather than N.
    const outcomes = await Promise.all(
      filteredLocalConfigs.map((localConfig) =>
        this.applyLocalConfig(localConfig, remoteMap, userId, dryRun)
      )
    );

    for (const outcome of outcomes) {
      if (outcome.matchedKey) matchedRemoteKeys.add(outcome.matchedKey);
      if (outcome.bucket === 'created') result.created.push(outcome.item!);
      else if (outcome.bucket === 'updated') result.updated.push(outcome.item!);
      else if (outcome.bucket === 'unchanged') result.unchanged.push(outcome.item!);
    }

    // Deletion candidates = remote configs with no local match.
    // When `localKeys` (the full local identity set) is supplied, the request
    // may carry only changed configs, so compare against that full set instead
    // of only the configs that were actually sent.
    const localKeySet = localKeys
      ? new Set(localKeys.map((k) => `${k.name}:${k.type}`))
      : null;

    for (const [key, config] of remoteMap) {
      const stillPresent = localKeySet ? localKeySet.has(key) : matchedRemoteKeys.has(key);
      if (!stillPresent) {
        result.deletionCandidates.push({
          name: config.name,
          type: config.type,
          id: config.id,
        });
      }
    }

    return result;
  }

  /**
   * Apply a single local config against the remote map, returning how it should
   * be bucketed. Performs the create/update/companion-sync write unless dryRun.
   */
  private async applyLocalConfig(
    localConfig: LocalConfigInput,
    remoteMap: Map<string, Config>,
    userId: string,
    dryRun: boolean
  ): Promise<{
    bucket: 'created' | 'updated' | 'unchanged' | 'skipped';
    matchedKey?: string;
    item?: SyncResultItem | { name: string; type: ConfigType };
  }> {
    const key = `${localConfig.name}:${localConfig.type}`;
    const remoteConfig = remoteMap.get(key);

    if (!remoteConfig) {
      if (!dryRun) {
        const created = await this.createConfig(localConfig, userId);
        return { bucket: 'created', item: { name: created.name, type: created.type, id: created.id } };
      }
      return { bucket: 'created', item: { name: localConfig.name, type: localConfig.type, id: 'dry-run' } };
    }

    // Matched remote config
    if (this.contentDiffers(localConfig.content, remoteConfig.content)) {
      if (!dryRun) {
        const updated = await this.updateConfig(remoteConfig.id, localConfig);
        if (updated) {
          return { bucket: 'updated', matchedKey: key, item: { name: updated.name, type: updated.type, id: updated.id } };
        }
        return { bucket: 'skipped', matchedKey: key };
      }
      return { bucket: 'updated', matchedKey: key, item: { name: localConfig.name, type: localConfig.type, id: remoteConfig.id } };
    }

    // SKILL.md content is identical — for skills, check companion files
    if (localConfig.type === 'skill' && localConfig.companionFiles) {
      const filesChanged = await this.companionFilesChanged(remoteConfig.id, localConfig.companionFiles);
      if (filesChanged) {
        if (!dryRun) {
          await this.syncCompanionFiles(remoteConfig.id, localConfig.companionFiles);
        }
        return { bucket: 'updated', matchedKey: key, item: { name: remoteConfig.name, type: remoteConfig.type, id: remoteConfig.id } };
      }
    }

    return { bucket: 'unchanged', matchedKey: key, item: { name: localConfig.name, type: localConfig.type } };
  }

  /**
   * Delete multiple configs by ID
   */
  async deleteConfigs(configIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of configIds) {
      try {
        // For skills, delete companion files first
        const config = await this.configRepo.findById(id);
        if (config?.type === 'skill') {
          await this.deleteCompanionFiles(id);
        }

        const success = await this.configRepo.delete(id);
        if (success) {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      } catch {
        failed.push(id);
      }
    }

    return { deleted, failed };
  }

  private async getRemoteConfigs(userId: string, types?: ConfigType[]): Promise<Config[]> {
    // Query by user_id directly so this scales with the user's config count,
    // not the size of the whole configs table.
    return this.configRepo.findByUserId(userId, types);
  }

  /**
   * SHA-256 hex digest of raw bytes. Used to detect companion-file content
   * changes (path-match alone is not enough).
   */
  private async hashBytes(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private contentDiffers(localContent: string, remoteContent: string): boolean {
    // Normalize whitespace for comparison
    const normalizeContent = (s: string) => s.trim().replace(/\r\n/g, '\n');
    return normalizeContent(localContent) !== normalizeContent(remoteContent);
  }

  private async createConfig(input: LocalConfigInput, userId: string): Promise<Config> {
    const createInput: CreateConfigInput = {
      name: input.name,
      type: input.type,
      original_format: 'claude_code', // Local configs are always Claude Code format
      content: input.content,
      user_id: userId,
    };

    const config = await this.configRepo.create(createInput);

    // Handle companion files for skills
    if (input.type === 'skill' && input.companionFiles && input.companionFiles.length > 0) {
      await this.syncCompanionFiles(config.id, input.companionFiles);
    }

    return config;
  }

  private async updateConfig(configId: string, input: LocalConfigInput): Promise<Config | null> {
    const updated = await this.configRepo.update(configId, {
      content: input.content,
    });

    // Handle companion files for skills
    if (input.type === 'skill' && input.companionFiles) {
      await this.syncCompanionFiles(configId, input.companionFiles);
    }

    return updated;
  }

  private async companionFilesChanged(
    skillId: string,
    localFiles: Array<{ path: string; content: string; mimeType?: string }>
  ): Promise<boolean> {
    const remoteFiles = await this.skillFilesRepo.findBySkillId(skillId);

    // Quick check: different number of files
    if (remoteFiles.length !== localFiles.length) {
      return true;
    }

    const remoteByPath = new Map(remoteFiles.map((f) => [f.file_path, f]));

    // Compare each local file's content hash against the stored hash.
    for (const localFile of localFiles) {
      const remote = remoteByPath.get(localFile.path);
      if (!remote) return true; // path added/renamed locally
      if (!remote.file_hash) return true; // legacy row without a hash — re-sync to backfill
      const localHash = await this.hashBytes(this.decodeBase64(localFile.content));
      if (localHash !== remote.file_hash) return true; // content changed
    }

    return false;
  }

  private async syncCompanionFiles(
    skillId: string,
    localFiles: Array<{ path: string; content: string; mimeType?: string }>
  ): Promise<void> {
    // Get existing companion files
    const existingFiles = await this.skillFilesRepo.findBySkillId(skillId);
    const existingPaths = new Map(existingFiles.map((f) => [f.file_path, f]));

    // Track which paths we've processed
    const processedPaths = new Set<string>();

    // Upload/update each local file in parallel. Unchanged files (matching
    // hash) are skipped entirely — no R2 write, no DB write.
    await Promise.all(
      localFiles.map(async (localFile) => {
        processedPaths.add(localFile.path);

        const contentBytes = this.decodeBase64(localFile.content);
        const hash = await this.hashBytes(contentBytes);
        const existing = existingPaths.get(localFile.path);

        // Skip files whose content is unchanged
        if (existing && existing.file_hash === hash) {
          return;
        }

        const r2Key = `skills/${skillId}/files/${localFile.path}`;
        const mimeType = localFile.mimeType || this.guessMimeType(localFile.path);

        await this.r2.put(r2Key, contentBytes, {
          httpMetadata: { contentType: mimeType },
        });

        if (!existing) {
          await this.skillFilesRepo.create({
            skill_id: skillId,
            file_path: localFile.path,
            r2_key: r2Key,
            file_size: contentBytes.byteLength,
            mime_type: mimeType,
            file_hash: hash,
          });
        } else {
          await this.skillFilesRepo.updateHash(existing.id, hash, contentBytes.byteLength);
        }
      })
    );

    // Delete files that exist remotely but not locally (in parallel)
    await Promise.all(
      Array.from(existingPaths.entries()).map(async ([path, file]) => {
        if (!processedPaths.has(path)) {
          await this.r2.delete(file.r2_key);
          await this.skillFilesRepo.delete(file.id);
        }
      })
    );
  }

  private async deleteCompanionFiles(skillId: string): Promise<void> {
    const files = await this.skillFilesRepo.findBySkillId(skillId);
    for (const file of files) {
      await this.r2.delete(file.r2_key);
      await this.skillFilesRepo.delete(file.id);
    }
  }

  private decodeBase64(content: string): Uint8Array {
    // Check if content is base64 encoded
    // If it looks like plain text (starts with # or contains newlines early), treat as text
    if (content.startsWith('#') || content.startsWith('---') || /^[\w\s]/.test(content)) {
      return new TextEncoder().encode(content);
    }

    try {
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      // If base64 decode fails, treat as plain text
      return new TextEncoder().encode(content);
    }
  }

  private guessMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      md: 'text/markdown',
      txt: 'text/plain',
      json: 'application/json',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      js: 'text/javascript',
      ts: 'text/typescript',
      py: 'text/x-python',
      sh: 'text/x-shellscript',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
