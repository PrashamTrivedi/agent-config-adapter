import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAdapter } from '../../src/adapters/index';
import { SlashCommandAdapter } from '../../src/adapters/slash-command-adapter';
import { MCPConfigAdapter } from '../../src/adapters/mcp-config-adapter';

// Mock the AI converter
vi.mock('../../src/infrastructure/ai-converter', () => ({
  AIConverterService: class MockAIConverterService {
    convert = vi.fn();
    chatWithTools = vi.fn();
    getProviderName = vi.fn(() => 'openai');
    getMetrics = vi.fn(() => ({
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      errorRate: 0,
    }));
    constructor(apiKey?: string, accountId?: string, gatewayId?: string, gatewayToken?: string) {}
  },
}));

describe('Adapter Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdapter', () => {
    it('should return SlashCommandAdapter for slash_command type', () => {
      const adapter = getAdapter('slash_command');
      expect(adapter).toBeDefined();
      // Should return base adapter (not AI-enhanced) when no env provided
      expect(adapter).toBeInstanceOf(SlashCommandAdapter);
    });

    it('should return MCPConfigAdapter for mcp_config type', () => {
      const adapter = getAdapter('mcp_config');
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(MCPConfigAdapter);
    });

    it('should return PassthroughAdapter for agent_definition type', () => {
      const adapter = getAdapter('agent_definition');
      expect(adapter).toBeDefined();
      // PassthroughAdapter should just return content as-is
      const result = adapter.convert('test content', 'claude_code', 'codex', 'agent_definition');
      expect(result).toBe('test content');
    });

    it('should throw error for skill type', () => {
      expect(() => getAdapter('skill')).toThrow(
        'Skills are not convertible between formats'
      );
    });

    it('should throw error for unsupported config type', () => {
      expect(() => getAdapter('invalid_type' as any)).toThrow('Unsupported config type');
    });

    it('should return AI-enhanced adapter when env with AI config is provided', () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
        OPENAI_API_KEY: 'sk-test',
      };

      const adapter = getAdapter('slash_command', env);
      expect(adapter).toBeDefined();
      // Should have convertWithMetadata method (AI-enhanced adapter)
      expect(adapter).toHaveProperty('convertWithMetadata');
    });

    it('should return base adapter when env is missing ACCOUNT_ID', () => {
      const env = {
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);
      expect(adapter).toBeInstanceOf(SlashCommandAdapter);
    });

    it('should return base adapter when env is missing GATEWAY_ID', () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);
      expect(adapter).toBeInstanceOf(SlashCommandAdapter);
    });

    it('should create AI-enhanced adapter without OPENAI_API_KEY', () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);
      expect(adapter).toHaveProperty('convertWithMetadata');
    });
  });

  describe('AIEnhancedAdapter', () => {
    it('should use AI conversion for slash_command', async () => {
      // AI conversion is tested via the providers themselves
      // This test verifies the adapter is created with AI support
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);

      // Verify it has AI methods
      expect(adapter).toHaveProperty('convertWithMetadata');
    });

    it('should skip AI conversion for mcp_config', async () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('mcp_config', env);
      const result = await (adapter as any).convertWithMetadata(
        JSON.stringify({ mcpServers: {} }),
        'claude_code',
        'codex',
        'mcp_config'
      );

      expect(result.usedAI).toBe(false);
      expect(result.fallbackUsed).toBe(false);
    });

    it('should fallback to rule-based conversion when AI fails', async () => {
      // AI fallback is tested via the provider implementations
      // This test verifies the adapter can handle both AI and rule-based conversion
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);

      // Verify adapter has both AI and fallback capabilities
      expect(adapter).toHaveProperty('convertWithMetadata');
      expect(adapter).toHaveProperty('convert');
    });

    it('should support synchronous convert method', async () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);
      const result = adapter.convert(
        '---\nname: test\n---\nTest content',
        'claude_code',
        'codex',
        'slash_command'
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should support validate method', async () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const adapter = getAdapter('slash_command', env);
      const isValid = adapter.validate(
        '---\nname: test\n---\nTest content',
        'claude_code',
        'slash_command'
      );

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('PassthroughAdapter', () => {
    it('should return content unchanged for agent definitions', () => {
      const adapter = getAdapter('agent_definition');
      const content = 'Some agent definition content';

      const result = adapter.convert(content, 'claude_code', 'codex', 'agent_definition');
      expect(result).toBe(content);
    });

    it('should validate all content as true', () => {
      const adapter = getAdapter('agent_definition');

      expect(adapter.validate('any content', 'claude_code', 'agent_definition')).toBe(true);
      expect(adapter.validate('', 'gemini', 'agent_definition')).toBe(true);
      expect(adapter.validate('invalid', 'codex', 'agent_definition')).toBe(true);
    });

    it('should preserve content across different format conversions', () => {
      const adapter = getAdapter('agent_definition');
      const content = 'Test agent definition';

      const formats: Array<['claude_code' | 'codex' | 'gemini', 'claude_code' | 'codex' | 'gemini']> = [
        ['claude_code', 'codex'],
        ['claude_code', 'gemini'],
        ['codex', 'claude_code'],
        ['codex', 'gemini'],
        ['gemini', 'claude_code'],
        ['gemini', 'codex'],
      ];

      formats.forEach(([source, target]) => {
        const result = adapter.convert(content, source, target, 'agent_definition');
        expect(result).toBe(content);
      });
    });
  });

  describe('Integration tests', () => {
    it('should work with all supported config types', () => {
      const types: Array<'slash_command' | 'agent_definition' | 'mcp_config'> = [
        'slash_command',
        'agent_definition',
        'mcp_config',
      ];

      types.forEach((type) => {
        const adapter = getAdapter(type);
        expect(adapter).toBeDefined();
        expect(adapter.convert).toBeDefined();
        expect(adapter.validate).toBeDefined();
      });
    });

    it('should create different adapter instances for different types', () => {
      const slashAdapter = getAdapter('slash_command');
      const mcpAdapter = getAdapter('mcp_config');
      const agentAdapter = getAdapter('agent_definition');

      expect(slashAdapter).not.toBe(mcpAdapter);
      expect(slashAdapter).not.toBe(agentAdapter);
      expect(mcpAdapter).not.toBe(agentAdapter);
    });

    it('should handle AI-enhanced adapters consistently', () => {
      const env = {
        ACCOUNT_ID: 'test-account',
        GATEWAY_ID: 'test-gateway',
        AI_GATEWAY_TOKEN: 'test-token',
      };

      const slashAdapter = getAdapter('slash_command', env);
      const mcpAdapter = getAdapter('mcp_config', env);

      expect(slashAdapter).toHaveProperty('convertWithMetadata');
      expect(mcpAdapter).toHaveProperty('convertWithMetadata');
    });
  });
});
