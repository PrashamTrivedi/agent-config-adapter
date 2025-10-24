import {
  Config,
  ExtensionWithConfigs,
  MarketplaceWithExtensions,
  GeminiExtensionManifest,
  ClaudeCodePluginManifest,
  ClaudeCodeMarketplaceManifest,
  MCPServerConfig,
  ConfigType,
} from '../domain/types';

export class ManifestService {
  /**
   * Generate Gemini CLI extension manifest
   * Format: gemini-extension.json with mcpServers, contextFileName, commands
   */
  async generateGeminiManifest(extension: ExtensionWithConfigs): Promise<GeminiExtensionManifest> {
    const manifest: GeminiExtensionManifest = {
      name: extension.name,
      version: extension.version,
    };

    // Extract MCP servers
    const mcpServers = this.consolidateMCPServers(
      extension.configs.filter((c) => c.type === 'mcp_config')
    );
    if (Object.keys(mcpServers).length > 0) {
      manifest.mcpServers = mcpServers;
    }

    // Extract slash commands
    const commands = this.extractGeminiCommands(
      extension.configs.filter((c) => c.type === 'slash_command')
    );
    if (Object.keys(commands).length > 0) {
      manifest.commands = commands;
    }

    // Extract skills
    const skills = this.extractGeminiSkills(
      extension.configs.filter((c) => c.type === 'skill' && c.original_format === 'gemini')
    );
    if (Object.keys(skills).length > 0) {
      manifest.skills = skills;
    }

    // Set context file name if description exists
    if (extension.description) {
      manifest.contextFileName = 'GEMINI.md';
    }

    return manifest;
  }

  /**
   * Generate Claude Code plugin manifest
   * Format: .claude-plugin/plugin.json with commands, agents, mcpServers
   */
  async generateClaudeCodePluginManifest(
    extension: ExtensionWithConfigs
  ): Promise<ClaudeCodePluginManifest> {
    const manifest: ClaudeCodePluginManifest = {
      name: this.toKebabCase(extension.name),
      version: extension.version,
    };

    if (extension.description) {
      manifest.description = extension.description;
    }

    if (extension.author) {
      manifest.author = {
        name: extension.author,
      };
    }

    // Extract MCP servers
    const mcpServers = this.consolidateMCPServers(
      extension.configs.filter((c) => c.type === 'mcp_config')
    );
    if (Object.keys(mcpServers).length > 0) {
      manifest.mcpServers = mcpServers;
    }

    // Extract slash commands (list specific command files)
    const slashCommands = extension.configs.filter((c) => c.type === 'slash_command');
    if (slashCommands.length > 0) {
      manifest.commands = slashCommands.map((cmd) => {
        const cmdName = this.sanitizeCommandName(cmd.name);
        return `./commands/${cmdName}.md`;
      });
    }

    // Extract agent definitions (list specific agent files ending with .md)
    const agents = extension.configs.filter((c) => c.type === 'agent_definition');
    if (agents.length > 0) {
      manifest.agents = agents.map((agent) => {
        const agentName = this.sanitizeCommandName(agent.name);
        return `./agents/${agentName}.md`;
      });
    }

    // Extract skills (list specific skill directories)
    const skills = extension.configs.filter((c) => c.type === 'skill' && c.original_format === 'claude_code');
    if (skills.length > 0) {
      manifest.skills = skills.map((skill) => {
        const skillName = this.sanitizeCommandName(skill.name);
        return `./skills/${skillName}`;
      });
    }

    return manifest;
  }

  /**
   * Generate Claude Code marketplace manifest with HTTP plugin sources
   * Format: marketplace.json with plugins collection using URL sources
   */
  async generateClaudeCodeMarketplaceManifestWithUrls(
    marketplace: MarketplaceWithExtensions,
    baseUrl: string
  ): Promise<ClaudeCodeMarketplaceManifest> {
    const manifest: ClaudeCodeMarketplaceManifest = {
      name: this.toKebabCase(marketplace.name),
      version: marketplace.version,
      owner: {
        name: marketplace.owner_name,
      },
      plugins: [],
    };

    if (marketplace.description) {
      manifest.description = marketplace.description;
    }

    if (marketplace.owner_email) {
      manifest.owner.email = marketplace.owner_email;
    }

    if (marketplace.homepage) {
      manifest.homepage = marketplace.homepage;
    }

    if (marketplace.repository) {
      manifest.repository = marketplace.repository;
    }

    // Convert each extension to a plugin manifest with HTTP URL source
    for (const extension of marketplace.extensions) {
      const pluginManifest = await this.generateClaudeCodePluginManifest(extension);

      // Use HTTP URL pointing to plugin directory
      // Claude Code will fetch files from this directory
      pluginManifest.source = {
        source: 'url',
        url: `${baseUrl}/plugins/${extension.id}/claude_code`,
      } as any; // TypeScript workaround - source can be string or object

      manifest.plugins.push(pluginManifest);
    }

    return manifest;
  }

  /**
   * Generate Claude Code marketplace manifest
   * Format: marketplace.json with plugins collection
   */
  async generateClaudeCodeMarketplaceManifest(
    marketplace: MarketplaceWithExtensions
  ): Promise<ClaudeCodeMarketplaceManifest> {
    const manifest: ClaudeCodeMarketplaceManifest = {
      name: this.toKebabCase(marketplace.name),
      version: marketplace.version,
      owner: {
        name: marketplace.owner_name,
      },
      plugins: [],
    };

    if (marketplace.description) {
      manifest.description = marketplace.description;
    }

    if (marketplace.owner_email) {
      manifest.owner.email = marketplace.owner_email;
    }

    if (marketplace.homepage) {
      manifest.homepage = marketplace.homepage;
    }

    if (marketplace.repository) {
      manifest.repository = marketplace.repository;
    }

    // Convert each extension to a plugin manifest with source
    for (const extension of marketplace.extensions) {
      const pluginManifest = await this.generateClaudeCodePluginManifest(extension);

      // IMPORTANT: source field must point to plugin directory, not file URLs
      // Claude Code will discover files by browsing the directory structure
      // This should be set by the caller based on deployment URL
      // For now, use relative path (suitable for git-based marketplaces)
      pluginManifest.source = `./plugins/${this.toKebabCase(extension.name)}`;

      manifest.plugins.push(pluginManifest);
    }

    return manifest;
  }

  /**
   * Consolidate multiple MCP configs into a single mcpServers object
   * Handles naming conflicts by appending numeric suffixes
   */
  consolidateMCPServers(mcpConfigs: Config[]): Record<string, MCPServerConfig> {
    const consolidated: Record<string, MCPServerConfig> = {};
    const serverNames = new Set<string>();

    for (const config of mcpConfigs) {
      try {
        const parsed = JSON.parse(config.content);
        if (!parsed.mcpServers) continue;

        for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
          let finalName = serverName;
          let counter = 2;

          // Handle naming conflicts
          while (serverNames.has(finalName)) {
            finalName = `${serverName}-${counter}`;
            counter++;
          }

          serverNames.add(finalName);
          consolidated[finalName] = serverConfig as MCPServerConfig;
        }
      } catch (error) {
        // Skip invalid configs
        console.warn(`Failed to parse MCP config ${config.id}:`, error);
      }
    }

    return consolidated;
  }

  /**
   * Extract Gemini CLI commands (command name -> command file path)
   */
  private extractGeminiCommands(slashCommands: Config[]): Record<string, string> {
    const commands: Record<string, string> = {};

    for (const config of slashCommands) {
      // Use config name as command name (sanitized)
      const commandName = this.sanitizeCommandName(config.name);
      // Command file path relative to extension root
      commands[commandName] = `commands/${commandName}.md`;
    }

    return commands;
  }

  /**
   * Extract Gemini skills (skill name -> skill directory path)
   */
  private extractGeminiSkills(skillConfigs: Config[]): Record<string, string> {
    const skills: Record<string, string> = {};

    for (const config of skillConfigs) {
      const skillName = this.sanitizeCommandName(config.name);
      skills[skillName] = `skills/${skillName}`;
    }

    return skills;
  }

  /**
   * Sanitize command name for file system usage
   */
  private sanitizeCommandName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Convert string to kebab-case (required by Claude Code)
   */
  private toKebabCase(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get MCP configs from an extension's configs
   */
  getMCPConfigs(configs: Config[]): Config[] {
    return configs.filter((c) => c.type === 'mcp_config');
  }

  /**
   * Get slash command configs from an extension's configs
   */
  getSlashCommandConfigs(configs: Config[]): Config[] {
    return configs.filter((c) => c.type === 'slash_command');
  }

  /**
   * Get agent definition configs from an extension's configs
   */
  getAgentDefinitionConfigs(configs: Config[]): Config[] {
    return configs.filter((c) => c.type === 'agent_definition');
  }

  /**
   * Get skill configs from an extension's configs
   */
  getSkillConfigs(configs: Config[]): Config[] {
    return configs.filter((c) => c.type === 'skill');
  }

  /**
   * Count configs by type
   */
  getConfigTypeCounts(configs: Config[]): Record<ConfigType, number> {
    const counts: Record<ConfigType, number> = {
      slash_command: 0,
      agent_definition: 0,
      mcp_config: 0,
      skill: 0,
    };

    for (const config of configs) {
      counts[config.type]++;
    }

    return counts;
  }
}
