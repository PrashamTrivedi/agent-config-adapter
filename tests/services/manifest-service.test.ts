import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestService } from '../../src/services/manifest-service';
import type { Config, ExtensionWithConfigs, MarketplaceWithExtensions } from '../../src/domain/types';

describe('ManifestService', () => {
  let service: ManifestService;

  beforeEach(() => {
    service = new ManifestService();
  });

  // Sample configs for testing
  const sampleMCPConfig: Config = {
    id: 'mcp-1',
    name: 'Test MCP Server',
    type: 'mcp_config',
    original_format: 'claude_code',
    content: JSON.stringify({
      mcpServers: {
        'test-server': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'test-package'],
        },
      },
    }),
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const sampleSlashCommand: Config = {
    id: 'cmd-1',
    name: 'Test Command',
    type: 'slash_command',
    original_format: 'claude_code',
    content: '# Test Command',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const sampleAgentDefinition: Config = {
    id: 'agent-1',
    name: 'Test Agent',
    type: 'agent_definition',
    original_format: 'claude_code',
    content: '# Test Agent',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const sampleSkillClaudeCode: Config = {
    id: 'skill-1',
    name: 'Test Skill',
    type: 'skill',
    original_format: 'claude_code',
    content: '# Test Skill',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const sampleSkillGemini: Config = {
    id: 'skill-2',
    name: 'Gemini Skill',
    type: 'skill',
    original_format: 'gemini',
    content: '# Gemini Skill',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  describe('generateGeminiManifest', () => {
    it('should generate basic Gemini manifest with name and version', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.name).toBe('Test Extension');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.mcpServers).toBeUndefined();
      expect(manifest.commands).toBeUndefined();
      expect(manifest.skills).toBeUndefined();
    });

    it('should include MCP servers in manifest', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleMCPConfig],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.mcpServers).toBeDefined();
      expect(manifest.mcpServers?.['test-server']).toBeDefined();
      expect(manifest.mcpServers?.['test-server'].type).toBe('stdio');
    });

    it('should include commands in manifest', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSlashCommand],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.commands).toBeDefined();
      expect(manifest.commands?.['test-command']).toBe('commands/test-command.md');
    });

    it('should include Gemini skills in manifest', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSkillGemini],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.skills).toBeDefined();
      expect(manifest.skills?.['gemini-skill']).toBe('skills/gemini-skill');
    });

    it('should not include Claude Code skills in Gemini manifest', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSkillClaudeCode],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.skills).toBeUndefined();
    });

    it('should set contextFileName when description exists', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension',
        configs: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.contextFileName).toBe('GEMINI.md');
    });

    it('should include all config types in manifest', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        configs: [sampleMCPConfig, sampleSlashCommand, sampleSkillGemini],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateGeminiManifest(extension);

      expect(manifest.mcpServers).toBeDefined();
      expect(manifest.commands).toBeDefined();
      expect(manifest.skills).toBeDefined();
      expect(manifest.contextFileName).toBe('GEMINI.md');
    });
  });

  describe('generateClaudeCodePluginManifest', () => {
    it('should generate basic plugin manifest with kebab-case name', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension Name',
        version: '1.0.0',
        configs: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.name).toBe('test-extension-name');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should include description when provided', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension',
        configs: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.description).toBe('A test extension');
    });

    it('should include author when provided', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        author: 'Test Author',
        configs: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.author).toBeDefined();
      expect(manifest.author?.name).toBe('Test Author');
    });

    it('should include MCP servers', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleMCPConfig],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.mcpServers).toBeDefined();
      expect(manifest.mcpServers?.['test-server']).toBeDefined();
    });

    it('should include command file paths', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSlashCommand],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.commands).toBeDefined();
      expect(manifest.commands).toContain('./commands/test-command.md');
    });

    it('should include agent file paths', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleAgentDefinition],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.agents).toBeDefined();
      expect(manifest.agents).toContain('./agents/test-agent.md');
    });

    it('should include Claude Code skill directories', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSkillClaudeCode],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.skills).toBeDefined();
      expect(manifest.skills).toContain('./skills/test-skill');
    });

    it('should not include Gemini skills', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSkillGemini],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.skills).toBeUndefined();
    });

    it('should include all config types', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleMCPConfig, sampleSlashCommand, sampleAgentDefinition, sampleSkillClaudeCode],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodePluginManifest(extension);

      expect(manifest.mcpServers).toBeDefined();
      expect(manifest.commands).toBeDefined();
      expect(manifest.agents).toBeDefined();
      expect(manifest.skills).toBeDefined();
    });
  });

  describe('generateClaudeCodeMarketplaceManifest', () => {
    it('should generate marketplace manifest with basic fields', async () => {
      const marketplace: MarketplaceWithExtensions = {
        id: 'mkt-1',
        name: 'Test Marketplace',
        version: '1.0.0',
        owner_name: 'Test Owner',
        extensions: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodeMarketplaceManifest(marketplace);

      expect(manifest.name).toBe('test-marketplace');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.owner.name).toBe('Test Owner');
      expect(manifest.plugins).toEqual([]);
    });

    it('should include optional fields when provided', async () => {
      const marketplace: MarketplaceWithExtensions = {
        id: 'mkt-1',
        name: 'Test Marketplace',
        version: '1.0.0',
        owner_name: 'Test Owner',
        owner_email: 'owner@test.com',
        description: 'A test marketplace',
        homepage: 'https://test.com',
        repository: 'https://github.com/test/repo',
        extensions: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodeMarketplaceManifest(marketplace);

      expect(manifest.description).toBe('A test marketplace');
      expect(manifest.owner.email).toBe('owner@test.com');
      expect(manifest.homepage).toBe('https://test.com');
      expect(manifest.repository).toBe('https://github.com/test/repo');
    });

    it('should generate plugin manifests for extensions', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSlashCommand],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const marketplace: MarketplaceWithExtensions = {
        id: 'mkt-1',
        name: 'Test Marketplace',
        version: '1.0.0',
        owner_name: 'Test Owner',
        extensions: [extension],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodeMarketplaceManifest(marketplace);

      expect(manifest.plugins).toHaveLength(1);
      expect(manifest.plugins[0].name).toBe('test-extension');
      expect(manifest.plugins[0].source).toBe('./plugins/test-extension');
    });
  });

  describe('generateClaudeCodeMarketplaceManifestWithUrls', () => {
    it('should generate marketplace manifest with URL sources', async () => {
      const extension: ExtensionWithConfigs = {
        id: 'ext-1',
        name: 'Test Extension',
        version: '1.0.0',
        configs: [sampleSlashCommand],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const marketplace: MarketplaceWithExtensions = {
        id: 'mkt-1',
        name: 'Test Marketplace',
        version: '1.0.0',
        owner_name: 'Test Owner',
        extensions: [extension],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const manifest = await service.generateClaudeCodeMarketplaceManifestWithUrls(
        marketplace,
        'https://api.example.com'
      );

      expect(manifest.plugins).toHaveLength(1);
      expect(manifest.plugins[0].source).toEqual({
        source: 'url',
        url: 'https://api.example.com/plugins/ext-1/claude_code',
      });
    });
  });

  describe('consolidateMCPServers', () => {
    it('should consolidate MCP servers from multiple configs', () => {
      const config1: Config = {
        id: 'mcp-1',
        name: 'MCP 1',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({
          mcpServers: {
            'server-1': { type: 'stdio', command: 'cmd1' },
          },
        }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const config2: Config = {
        id: 'mcp-2',
        name: 'MCP 2',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({
          mcpServers: {
            'server-2': { type: 'stdio', command: 'cmd2' },
          },
        }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const result = service.consolidateMCPServers([config1, config2]);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['server-1']).toBeDefined();
      expect(result['server-2']).toBeDefined();
    });

    it('should handle naming conflicts with numeric suffixes', () => {
      const config1: Config = {
        id: 'mcp-1',
        name: 'MCP 1',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({
          mcpServers: {
            'server': { type: 'stdio', command: 'cmd1' },
          },
        }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const config2: Config = {
        id: 'mcp-2',
        name: 'MCP 2',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({
          mcpServers: {
            'server': { type: 'stdio', command: 'cmd2' },
          },
        }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const result = service.consolidateMCPServers([config1, config2]);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['server']).toBeDefined();
      expect(result['server-2']).toBeDefined();
    });

    it('should skip invalid JSON configs', () => {
      const config1: Config = {
        id: 'mcp-1',
        name: 'MCP 1',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: 'invalid json',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const config2: Config = {
        id: 'mcp-2',
        name: 'MCP 2',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({
          mcpServers: {
            'server': { type: 'stdio', command: 'cmd' },
          },
        }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const result = service.consolidateMCPServers([config1, config2]);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['server']).toBeDefined();
    });

    it('should skip configs without mcpServers field', () => {
      const config: Config = {
        id: 'mcp-1',
        name: 'MCP 1',
        type: 'mcp_config',
        original_format: 'claude_code',
        content: JSON.stringify({ someOtherField: 'value' }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const result = service.consolidateMCPServers([config]);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return empty object for empty array', () => {
      const result = service.consolidateMCPServers([]);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Filter methods', () => {
    const configs: Config[] = [
      sampleMCPConfig,
      sampleSlashCommand,
      sampleAgentDefinition,
      sampleSkillClaudeCode,
      sampleSkillGemini,
    ];

    it('getMCPConfigs should filter MCP configs', () => {
      const result = service.getMCPConfigs(configs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('mcp_config');
    });

    it('getSlashCommandConfigs should filter slash commands', () => {
      const result = service.getSlashCommandConfigs(configs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('slash_command');
    });

    it('getAgentDefinitionConfigs should filter agent definitions', () => {
      const result = service.getAgentDefinitionConfigs(configs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('agent_definition');
    });

    it('getSkillConfigs should filter skills', () => {
      const result = service.getSkillConfigs(configs);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('skill');
      expect(result[1].type).toBe('skill');
    });
  });

  describe('getConfigTypeCounts', () => {
    it('should count configs by type', () => {
      const configs: Config[] = [
        sampleMCPConfig,
        sampleSlashCommand,
        sampleSlashCommand,
        sampleAgentDefinition,
        sampleSkillClaudeCode,
      ];

      const result = service.getConfigTypeCounts(configs);

      expect(result.mcp_config).toBe(1);
      expect(result.slash_command).toBe(2);
      expect(result.agent_definition).toBe(1);
      expect(result.skill).toBe(1);
    });

    it('should return zero counts for empty array', () => {
      const result = service.getConfigTypeCounts([]);

      expect(result.mcp_config).toBe(0);
      expect(result.slash_command).toBe(0);
      expect(result.agent_definition).toBe(0);
      expect(result.skill).toBe(0);
    });
  });
});
