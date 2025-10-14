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

      // Add required source field for marketplace plugins
      // Claude Code requires specific format - must be a valid git URL
      pluginManifest.source = {
        type: 'git',
        url: marketplace.repository
          ? `${marketplace.repository}/tree/main/plugins/${this.toKebabCase(extension.name)}`
          : `https://github.com/marketplace-owner/${this.toKebabCase(marketplace.name)}/tree/main/plugins/${this.toKebabCase(extension.name)}`,
      };

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
   * Count configs by type
   */
  getConfigTypeCounts(configs: Config[]): Record<ConfigType, number> {
    const counts: Record<ConfigType, number> = {
      slash_command: 0,
      agent_definition: 0,
      mcp_config: 0,
    };

    for (const config of configs) {
      counts[config.type]++;
    }

    return counts;
  }
}
