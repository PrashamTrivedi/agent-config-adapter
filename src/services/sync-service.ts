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
    dryRun: boolean = false
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

    // Track which remote configs were matched
    const matchedRemoteKeys = new Set<string>();

    // Process each local config
    for (const localConfig of filteredLocalConfigs) {
      const key = `${localConfig.name}:${localConfig.type}`;
      const remoteConfig = remoteMap.get(key);

      if (!remoteConfig) {
        // Create new config
        if (!dryRun) {
          const created = await this.createConfig(localConfig, userId);
          result.created.push({
            name: created.name,
            type: created.type,
            id: created.id,
          });
        } else {
          result.created.push({
            name: localConfig.name,
            type: localConfig.type,
            id: 'dry-run',
          });
        }
      } else {
        matchedRemoteKeys.add(key);

        // Check if content differs
        if (this.contentDiffers(localConfig.content, remoteConfig.content)) {
          // Update existing config
          if (!dryRun) {
            const updated = await this.updateConfig(remoteConfig.id, localConfig);
            if (updated) {
              result.updated.push({
                name: updated.name,
                type: updated.type,
                id: updated.id,
              });
            }
          } else {
            result.updated.push({
              name: localConfig.name,
              type: localConfig.type,
              id: remoteConfig.id,
            });
          }
        } else {
          // Content is the same, but check companion files for skills
          if (localConfig.type === 'skill' && localConfig.companionFiles) {
            const filesChanged = await this.companionFilesChanged(
              remoteConfig.id,
              localConfig.companionFiles
            );
            if (filesChanged) {
              if (!dryRun) {
                await this.syncCompanionFiles(remoteConfig.id, localConfig.companionFiles);
                result.updated.push({
                  name: remoteConfig.name,
                  type: remoteConfig.type,
                  id: remoteConfig.id,
                });
              } else {
                result.updated.push({
                  name: localConfig.name,
                  type: localConfig.type,
                  id: remoteConfig.id,
                });
              }
            } else {
              result.unchanged.push({
                name: localConfig.name,
                type: localConfig.type,
              });
            }
          } else {
            result.unchanged.push({
              name: localConfig.name,
              type: localConfig.type,
            });
          }
        }
      }
    }

    // Find deletion candidates (remote-only configs)
    for (const [key, config] of remoteMap) {
      if (!matchedRemoteKeys.has(key)) {
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
    // Get all configs for the user
    const allConfigs = await this.configRepo.findAll();

    // Filter by user_id and optionally by types
    return allConfigs.filter((c) => {
      const ownerMatch = c.user_id === userId;
      const typeMatch = !types || types.includes(c.type);
      return ownerMatch && typeMatch;
    });
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

    // Check if all local files exist remotely (by path)
    const remotePaths = new Set(remoteFiles.map((f) => f.file_path));
    for (const localFile of localFiles) {
      if (!remotePaths.has(localFile.path)) {
        return true;
      }
    }

    // For now, assume content may differ if paths match
    // Full content comparison would require downloading from R2
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

    // Upload or update each local file
    for (const localFile of localFiles) {
      processedPaths.add(localFile.path);

      // Decode base64 content
      const contentBytes = this.decodeBase64(localFile.content);
      const r2Key = `skills/${skillId}/files/${localFile.path}`;
      const mimeType = localFile.mimeType || this.guessMimeType(localFile.path);

      // Upload to R2
      await this.r2.put(r2Key, contentBytes, {
        httpMetadata: {
          contentType: mimeType,
        },
      });

      const existing = existingPaths.get(localFile.path);
      if (!existing) {
        // Create new file record
        await this.skillFilesRepo.create({
          skill_id: skillId,
          file_path: localFile.path,
          r2_key: r2Key,
          file_size: contentBytes.byteLength,
          mime_type: mimeType,
        });
      }
    }

    // Delete files that exist remotely but not locally
    for (const [path, file] of existingPaths) {
      if (!processedPaths.has(path)) {
        await this.r2.delete(file.r2_key);
        await this.skillFilesRepo.delete(file.id);
      }
    }
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
