import { Config, ExtensionWithConfigs } from '../domain/types';
import { FileStorageRepository } from '../infrastructure/file-storage-repository';
import { ManifestService } from './manifest-service';

export interface FileGenerationServiceEnv {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
}

interface GeneratedFile {
  path: string; // Logical path (e.g., "commands/code-review.md")
  content: string;
  mimeType: string;
}

/**
 * FileGenerationService - Generates actual plugin files from database configs
 * Uploads generated files to R2 for HTTP serving
 */
export class FileGenerationService {
  private fileRepo: FileStorageRepository;
  private r2: R2Bucket;
  private manifestService: ManifestService;

  constructor(env: FileGenerationServiceEnv) {
    this.fileRepo = new FileStorageRepository(env.DB);
    this.r2 = env.EXTENSION_FILES;
    this.manifestService = new ManifestService();
  }

  /**
   * Generate all files for an extension and upload to R2
   * Returns map of logical paths to R2 keys
   */
  async generateExtensionFiles(
    extension: ExtensionWithConfigs,
    format: 'claude_code' | 'gemini'
  ): Promise<Map<string, string>> {
    const files =
      format === 'claude_code'
        ? await this.generateClaudeCodeFiles(extension)
        : await this.generateGeminiFiles(extension);

    const fileMap = new Map<string, string>();

    // Upload each file to R2
    for (const file of files) {
      const r2Key = `extensions/${extension.id}/${format}/${file.path}`;

      await this.r2.put(r2Key, file.content, {
        httpMetadata: {
          contentType: file.mimeType,
        },
      });

      // Store metadata in database
      await this.fileRepo.create({
        extension_id: extension.id,
        file_path: `${format}/${file.path}`,
        r2_key: r2Key,
        file_size: new Blob([file.content]).size,
        mime_type: file.mimeType,
      });

      fileMap.set(file.path, r2Key);
    }

    return fileMap;
  }

  /**
   * Generate Claude Code plugin files
   * Structure:
   * - .claude-plugin/plugin.json
   * - commands/*.md (from slash_command configs)
   * - agents/*.md (from agent_definition configs)
   * - .mcp.json (consolidated from mcp_config configs)
   */
  private async generateClaudeCodeFiles(extension: ExtensionWithConfigs): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate plugin.json manifest
    const manifest = await this.manifestService.generateClaudeCodePluginManifest(extension);
    files.push({
      path: '.claude-plugin/plugin.json',
      content: JSON.stringify(manifest, null, 2),
      mimeType: 'application/json',
    });

    // Generate command files
    const commandConfigs = extension.configs.filter((c) => c.type === 'slash_command');
    for (const config of commandConfigs) {
      const commandName = this.sanitizeFileName(config.name);
      files.push({
        path: `commands/${commandName}.md`,
        content: this.generateCommandFile(config, 'claude_code'),
        mimeType: 'text/markdown',
      });
    }

    // Generate agent files
    const agentConfigs = extension.configs.filter((c) => c.type === 'agent_definition');
    for (const config of agentConfigs) {
      const agentName = this.sanitizeFileName(config.name);
      files.push({
        path: `agents/${agentName}.md`,
        content: this.generateAgentFile(config),
        mimeType: 'text/markdown',
      });
    }

    // Generate consolidated MCP config
    const mcpConfigs = extension.configs.filter((c) => c.type === 'mcp_config');
    if (mcpConfigs.length > 0) {
      files.push({
        path: '.mcp.json',
        content: this.generateMCPFile(mcpConfigs, 'claude_code'),
        mimeType: 'application/json',
      });
    }

    return files;
  }

  /**
   * Generate Gemini extension files
   * Structure:
   * - gemini.json (manifest)
   * - commands/*.md (from slash_command configs)
   * - GEMINI.md (context file from extension description)
   * - .mcp.json (consolidated from mcp_config configs)
   */
  private async generateGeminiFiles(extension: ExtensionWithConfigs): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate gemini.json manifest
    const manifest = await this.manifestService.generateGeminiManifest(extension);
    files.push({
      path: 'gemini.json',
      content: JSON.stringify(manifest, null, 2),
      mimeType: 'application/json',
    });

    // Generate command files
    const commandConfigs = extension.configs.filter((c) => c.type === 'slash_command');
    for (const config of commandConfigs) {
      const commandName = this.sanitizeFileName(config.name);
      files.push({
        path: `commands/${commandName}.md`,
        content: this.generateCommandFile(config, 'gemini'),
        mimeType: 'text/markdown',
      });
    }

    // Generate GEMINI.md context file if description exists
    if (extension.description) {
      files.push({
        path: 'GEMINI.md',
        content: this.generateContextFile(extension),
        mimeType: 'text/markdown',
      });
    }

    // Generate consolidated MCP config
    const mcpConfigs = extension.configs.filter((c) => c.type === 'mcp_config');
    if (mcpConfigs.length > 0) {
      files.push({
        path: '.mcp.json',
        content: this.generateMCPFile(mcpConfigs, 'gemini'),
        mimeType: 'application/json',
      });
    }

    return files;
  }

  /**
   * Generate command markdown file from slash_command config
   * Converts database content to proper .md file format
   */
  private generateCommandFile(config: Config, format: 'claude_code' | 'gemini'): string {
    // For Claude Code, the content is already in markdown format
    // For Gemini, we need to ensure it follows their format (TOML frontmatter)
    if (format === 'claude_code') {
      return config.content;
    } else {
      // Gemini format - simple markdown
      return config.content;
    }
  }

  /**
   * Generate agent markdown file from agent_definition config
   * Only for Claude Code (Gemini doesn't support agents)
   */
  private generateAgentFile(config: Config): string {
    // Agent content is already in markdown format
    return config.content;
  }

  /**
   * Generate context file from extension description
   */
  private generateContextFile(extension: ExtensionWithConfigs): string {
    return `# ${extension.name}

${extension.description}

## Version

${extension.version}

${extension.author ? `## Author\n\n${extension.author}\n` : ''}
## Components

This extension includes:

${extension.configs.filter((c) => c.type === 'slash_command').length > 0 ? `- **Commands**: ${extension.configs.filter((c) => c.type === 'slash_command').length} slash command(s)` : ''}
${extension.configs.filter((c) => c.type === 'agent_definition').length > 0 ? `- **Agents**: ${extension.configs.filter((c) => c.type === 'agent_definition').length} agent(s)` : ''}
${extension.configs.filter((c) => c.type === 'mcp_config').length > 0 ? `- **MCP Servers**: ${extension.configs.filter((c) => c.type === 'mcp_config').length} MCP server(s)` : ''}
`;
  }

  /**
   * Generate consolidated MCP JSON from multiple mcp_config configs
   * Merges all MCP server configs into single .mcp.json file
   */
  private generateMCPFile(configs: Config[], format: 'claude_code' | 'gemini'): string {
    const consolidated = this.manifestService.consolidateMCPServers(configs);

    // Both formats use the same MCP JSON structure
    const mcpConfig = {
      mcpServers: consolidated,
    };

    return JSON.stringify(mcpConfig, null, 2);
  }

  /**
   * Delete all generated files for an extension
   * Used for cache invalidation
   */
  async deleteExtensionFiles(extensionId: string, format?: 'claude_code' | 'gemini'): Promise<void> {
    const prefix = format
      ? `extensions/${extensionId}/${format}/`
      : `extensions/${extensionId}/`;

    // List all objects with this prefix
    const listed = await this.r2.list({ prefix });

    // Delete all objects
    const deletePromises = listed.objects.map((obj) => this.r2.delete(obj.key));
    await Promise.all(deletePromises);

    // Delete metadata from database
    const files = await this.fileRepo.findByExtensionId(extensionId);
    const dbDeletePromises = files
      .filter((f) => !format || f.file_path.startsWith(`${format}/`))
      .map((f) => this.fileRepo.delete(f.id));
    await Promise.all(dbDeletePromises);
  }

  /**
   * Check if files have been generated for an extension
   */
  async hasGeneratedFiles(extensionId: string, format: 'claude_code' | 'gemini'): Promise<boolean> {
    const files = await this.fileRepo.findByExtensionId(extensionId);
    return files.some((f) => f.file_path.startsWith(`${format}/`));
  }

  /**
   * Get all generated files for an extension
   */
  async getGeneratedFiles(
    extensionId: string,
    format: 'claude_code' | 'gemini'
  ): Promise<Array<{ path: string; r2Key: string; size: number | null; mimeType: string | null }>> {
    const files = await this.fileRepo.findByExtensionId(extensionId);
    return files
      .filter((f) => f.file_path.startsWith(`${format}/`))
      .map((f) => ({
        path: f.file_path.replace(`${format}/`, ''),
        r2Key: f.r2_key,
        size: f.file_size,
        mimeType: f.mime_type,
      }));
  }

  /**
   * Sanitize filename for file system usage
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
