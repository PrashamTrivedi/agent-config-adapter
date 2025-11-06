import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlashCommandConverterService } from '../../src/services/slash-command-converter-service';
import { ConfigService } from '../../src/services/config-service';
import { AIConverterService } from '../../src/infrastructure/ai-converter';
import { Config } from '../../src/domain/types';

describe('SlashCommandConverterService', () => {
  let mockAIConverter: AIConverterService;
  let mockConfigService: ConfigService;
  let service: SlashCommandConverterService;

  beforeEach(() => {
    // Mock AIConverterService
    mockAIConverter = {
      convert: vi.fn(),
      chatWithTools: vi.fn().mockResolvedValue({
        content: 'Converted command without frontmatter',
        tool_calls: undefined
      }),
    } as unknown as AIConverterService;

    // Mock ConfigService
    mockConfigService = {
      listConfigs: vi.fn().mockResolvedValue([]),
    } as unknown as ConfigService;

    service = new SlashCommandConverterService(mockAIConverter, mockConfigService);
  });

  describe('resolveReferences', () => {
    it('should fetch agent references from database', async () => {
      const mockAgentConfig: Config = {
        id: 'agent-1',
        name: 'triage',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'You are a triage agent. Analyze code for bugs.',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([mockAgentConfig]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test command content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify(['triage']),
        skill_references: JSON.stringify([]),
      };

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      expect(mockConfigService.listConfigs).toHaveBeenCalledWith({
        type: 'agent_definition',
        searchName: 'triage',
      });

      // The result should include the agent content (not a placeholder)
      // Since we're calling convert(), we need to mock the AI inlining strategy
      expect(result).toBeDefined();
    });

    it('should fetch skill references from database', async () => {
      const mockSkillConfig: Config = {
        id: 'skill-1',
        name: 'conventional-commit',
        type: 'skill',
        original_format: 'claude_code',
        content: 'Use conventional commit format: type(scope): message',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([mockSkillConfig]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test command content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify(['conventional-commit']),
      };

      await service.convert(testConfig, { configId: 'cmd-1' });

      expect(mockConfigService.listConfigs).toHaveBeenCalledWith({
        type: 'skill',
        searchName: 'conventional-commit',
      });
    });

    it('should handle missing references gracefully', async () => {
      // Mock empty result (config not found)
      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test command with **nonexistent-agent**',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify(['nonexistent-agent']),
        skill_references: JSON.stringify([]),
      };

      // Mock AI inlining strategy to inline the missing reference
      vi.mocked(mockAIConverter.convert).mockResolvedValue(
        JSON.stringify({ inline: ['agent:nonexistent-agent'], omit: [] })
      );

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      // Should not crash, and should return a placeholder
      expect(result).toBeDefined();
      expect(result.convertedContent).toContain('[Agent: nonexistent-agent - not found]');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.mocked(mockConfigService.listConfigs).mockRejectedValue(
        new Error('Database connection failed')
      );

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test command',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify(['triage']),
        skill_references: JSON.stringify([]),
      };

      // Mock AI inlining strategy
      vi.mocked(mockAIConverter.convert).mockResolvedValue(
        JSON.stringify({ inline: ['agent:triage'], omit: [] })
      );

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      // Should not crash, should return error placeholder
      expect(result).toBeDefined();
      expect(result.convertedContent).toContain('[Agent: triage - fetch error]');
    });

    it('should prefer exact name match over partial match', async () => {
      const exactMatchConfig: Config = {
        id: 'agent-1',
        name: 'triage',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'Exact match content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const partialMatchConfig: Config = {
        id: 'agent-2',
        name: 'triage-helper',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'Partial match content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      // Return both configs (database would return both for LIKE search)
      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([
        partialMatchConfig,
        exactMatchConfig,
      ]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test command',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify(['triage']),
        skill_references: JSON.stringify([]),
      };

      // Mock AI inlining strategy
      vi.mocked(mockAIConverter.convert).mockResolvedValue(
        JSON.stringify({ inline: ['agent:triage'], omit: [] })
      );

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      // Should use exact match content, not partial match
      expect(result.convertedContent).toContain('Exact match content');
      expect(result.convertedContent).not.toContain('Partial match content');
    });

    it('should fetch both agent and skill references', async () => {
      const mockAgentConfig: Config = {
        id: 'agent-1',
        name: 'triage',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'Triage agent content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const mockSkillConfig: Config = {
        id: 'skill-1',
        name: 'conventional-commit',
        type: 'skill',
        original_format: 'claude_code',
        content: 'Conventional commit skill content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      // Mock different responses for different config types
      vi.mocked(mockConfigService.listConfigs).mockImplementation(async (filters) => {
        if (filters?.type === 'agent_definition') {
          return [mockAgentConfig];
        }
        if (filters?.type === 'skill') {
          return [mockSkillConfig];
        }
        return [];
      });

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Use **triage** and **conventional-commit**',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify(['triage']),
        skill_references: JSON.stringify(['conventional-commit']),
      };

      // Mock AI inlining strategy to inline both
      vi.mocked(mockAIConverter.convert).mockResolvedValue(
        JSON.stringify({
          inline: ['agent:triage', 'skill:conventional-commit'],
          omit: [],
        })
      );

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      // Should include both agent and skill content
      expect(result.convertedContent).toContain('Triage agent content');
      expect(result.convertedContent).toContain('Conventional commit skill content');

      // Verify both types were queried
      expect(mockConfigService.listConfigs).toHaveBeenCalledWith({
        type: 'agent_definition',
        searchName: 'triage',
      });
      expect(mockConfigService.listConfigs).toHaveBeenCalledWith({
        type: 'skill',
        searchName: 'conventional-commit',
      });
    });
  });

  describe('findBestMatch', () => {
    it('should return null for empty array', () => {
      // Access private method through any cast (for testing purposes)
      const findBestMatch = (service as any).findBestMatch.bind(service);
      const result = findBestMatch([], 'test');
      expect(result).toBeNull();
    });

    it('should return exact match when available', () => {
      const configs: Config[] = [
        {
          id: '1',
          name: 'triage-helper',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'helper',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'triage',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'exact',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const findBestMatch = (service as any).findBestMatch.bind(service);
      const result = findBestMatch(configs, 'triage');

      expect(result).toBeDefined();
      expect(result.name).toBe('triage');
      expect(result.content).toBe('exact');
    });

    it('should be case-insensitive for exact match', () => {
      const configs: Config[] = [
        {
          id: '1',
          name: 'TRIAGE',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'uppercase',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const findBestMatch = (service as any).findBestMatch.bind(service);
      const result = findBestMatch(configs, 'triage');

      expect(result).toBeDefined();
      expect(result.content).toBe('uppercase');
    });

    it('should return first result when no exact match', () => {
      const configs: Config[] = [
        {
          id: '1',
          name: 'triage-agent',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'first',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'triage-helper',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'second',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const findBestMatch = (service as any).findBestMatch.bind(service);
      const result = findBestMatch(configs, 'triage');

      expect(result).toBeDefined();
      expect(result.content).toBe('first'); // Returns first result
    });
  });

  describe('convert with user arguments', () => {
    it('should replace $ARGUMENTS placeholder and inline references', async () => {
      const mockAgentConfig: Config = {
        id: 'agent-1',
        name: 'scaffolder',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'Scaffolding agent content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([mockAgentConfig]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: '---\nargument-hint: component\n---\n\nScaffold $ARGUMENTS component\n\nUse **scaffolder**',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        has_arguments: true,
        argument_hint: 'component',
        agent_references: JSON.stringify(['scaffolder']),
        skill_references: JSON.stringify([]),
      };

      // Mock AI inlining strategy
      vi.mocked(mockAIConverter.convert).mockResolvedValue(
        JSON.stringify({ inline: ['agent:scaffolder'], omit: [] })
      );

      const result = await service.convert(testConfig, {
        configId: 'cmd-1',
        userArguments: 'authentication',
      });

      expect(result.convertedContent).toContain('authentication');
      expect(result.convertedContent).not.toContain('$ARGUMENTS');
      expect(result.convertedContent).toContain('Scaffolding agent content');
    });
  });
});
