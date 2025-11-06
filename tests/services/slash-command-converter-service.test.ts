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
        tool_calls: undefined,
        reasoning_tokens: 42,
        output_tokens: 100
      }),
    } as unknown as AIConverterService;

    // Mock ConfigService
    mockConfigService = {
      listConfigs: vi.fn().mockResolvedValue([]),
    } as unknown as ConfigService;

    service = new SlashCommandConverterService(mockAIConverter, mockConfigService);
  });

  describe('convert with tool-based approach', () => {
    it('should call chatWithTools with system and user prompts', async () => {
      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: '---\nname: test\n---\nTest content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify([]),
      };

      await service.convert(testConfig, { configId: 'cmd-1' });

      // Verify chatWithTools was called
      expect(mockAIConverter.chatWithTools).toHaveBeenCalled();

      // Verify first call arguments
      const callArgs = vi.mocked(mockAIConverter.chatWithTools).mock.calls[0];
      const messages = callArgs[0];
      const tools = callArgs[1];

      // Check messages structure
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('slash command converter');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Test content');

      // Check tools structure
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe('read_configs');
    });

    it('should build reference context with all agents and skills', async () => {
      const mockAgents: Config[] = [
        {
          id: 'agent-1',
          name: 'triage',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'Agent content',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockSkills: Config[] = [
        {
          id: 'skill-1',
          name: 'conventional-commit',
          type: 'skill',
          original_format: 'claude_code',
          content: 'Skill content',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      vi.mocked(mockConfigService.listConfigs)
        .mockResolvedValueOnce(mockAgents) // First call for agents
        .mockResolvedValueOnce(mockSkills); // Second call for skills

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test content',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify([]),
      };

      await service.convert(testConfig, { configId: 'cmd-1' });

      // Verify context building
      const callArgs = vi.mocked(mockAIConverter.chatWithTools).mock.calls[0];
      const systemPrompt = callArgs[0][0].content as string;

      expect(systemPrompt).toContain('Agents: triage');
      expect(systemPrompt).toContain('Skills: conventional-commit');
    });

    it('should handle tool calls and execute read_configs', async () => {
      const mockAgentConfig: Config = {
        id: 'agent-1',
        name: 'triage',
        type: 'agent_definition',
        original_format: 'claude_code',
        content: 'Triage agent instructions',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      // Mock AI to return tool calls first, then final content
      vi.mocked(mockAIConverter.chatWithTools)
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              function: {
                name: 'read_configs',
                arguments: JSON.stringify({
                  references: [{ name: 'triage', type: 'agent' }],
                }),
              },
            },
          ],
          reasoning_tokens: 30,
          output_tokens: 50
        })
        .mockResolvedValueOnce({
          content: 'Final converted output with inlined agent',
          tool_calls: undefined,
          reasoning_tokens: 45,
          output_tokens: 120
        });

      vi.mocked(mockConfigService.listConfigs)
        .mockResolvedValueOnce([]) // agents list
        .mockResolvedValueOnce([]) // skills list
        .mockResolvedValueOnce([mockAgentConfig]); // read_configs call

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Use **triage** agent',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        agent_references: JSON.stringify(['triage']),
        skill_references: JSON.stringify([]),
      };

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      // Verify tool iteration happened
      expect(mockAIConverter.chatWithTools).toHaveBeenCalledTimes(2);

      // Verify final output
      expect(result.convertedContent).toBe('Final converted output with inlined agent');
    });

    it('should include user arguments in the prompt', async () => {
      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Debug $ARGUMENTS',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        has_arguments: true,
        argument_hint: 'component name',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify([]),
      };

      await service.convert(testConfig, {
        configId: 'cmd-1',
        userArguments: 'authentication module',
      });

      const callArgs = vi.mocked(mockAIConverter.chatWithTools).mock.calls[0];
      const userPrompt = callArgs[0][1].content as string;

      expect(userPrompt).toContain('authentication module');
      expect(userPrompt).toContain('Replace $ARGUMENTS');
    });

    it('should stop after max iterations to prevent infinite loops', async () => {
      // Mock AI to keep requesting tools
      vi.mocked(mockAIConverter.chatWithTools).mockResolvedValue({
        content: null,
        tool_calls: [
          {
            id: 'call_loop',
            function: {
              name: 'read_configs',
              arguments: JSON.stringify({
                references: [{ name: 'test', type: 'agent' }],
              }),
            },
          },
        ],
        reasoning_tokens: 25,
        output_tokens: 40
      });

      vi.mocked(mockConfigService.listConfigs).mockResolvedValue([]);

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify([]),
      };

      await service.convert(testConfig, { configId: 'cmd-1' });

      // Should stop after 3 iterations (max) = 3 total calls
      // iteration 0, 1, 2 (then breaks at iteration 3)
      expect(mockAIConverter.chatWithTools).toHaveBeenCalledTimes(3);
    });

    it('should return final output when AI does not use tools', async () => {
      vi.mocked(mockAIConverter.chatWithTools).mockResolvedValueOnce({
        content: 'Simple converted command',
        tool_calls: undefined,
        reasoning_tokens: 38,
        output_tokens: 95
      });

      const testConfig: Config = {
        id: 'cmd-1',
        name: 'simple-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: '---\nname: simple\n---\nSimple command',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        agent_references: JSON.stringify([]),
        skill_references: JSON.stringify([]),
      };

      const result = await service.convert(testConfig, { configId: 'cmd-1' });

      expect(result.convertedContent).toBe('Simple converted command');
      expect(result.needsUserInput).toBe(false);
      expect(mockAIConverter.chatWithTools).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBestMatch (helper method)', () => {
    it('should return null for empty array', () => {
      // Access private method via type assertion for testing
      const result = (service as any).findBestMatch([], 'test');
      expect(result).toBeNull();
    });

    it('should prefer exact name match (case-insensitive)', () => {
      const configs: Config[] = [
        {
          id: '1',
          name: 'test-helper',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'Helper content',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          name: 'test',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'Exact match content',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = (service as any).findBestMatch(configs, 'test');
      expect(result.id).toBe('2');
    });

    it('should fallback to first result when no exact match', () => {
      const configs: Config[] = [
        {
          id: '1',
          name: 'test-agent',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'First result',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          name: 'test-helper',
          type: 'agent_definition',
          original_format: 'claude_code',
          content: 'Second result',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = (service as any).findBestMatch(configs, 'test');
      expect(result.id).toBe('1');
    });
  });
});
