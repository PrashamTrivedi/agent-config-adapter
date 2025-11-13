import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider, type OpenAIConfig } from '../../../src/infrastructure/ai/openai-provider';
import type { AIConversionResult, ChatResponse } from '../../../src/infrastructure/ai/types';

// Mock OpenAI module
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      constructor(public config: any) {}
    },
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockConfig: OpenAIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    mockConfig = {
      accountId: 'test-account',
      gatewayId: 'test-gateway',
      gatewayToken: 'test-token',
      reasoningMode: 'low',
    };
  });

  describe('Constructor', () => {
    it('should create provider with local dev config (direct API key)', () => {
      const config: OpenAIConfig = {
        ...mockConfig,
        directApiKey: 'sk-test-key',
      };
      const provider = new OpenAIProvider(config);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should create provider with production BYOK config (no API key)', () => {
      const provider = new OpenAIProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should use default reasoning mode if not provided', () => {
      const config: OpenAIConfig = {
        accountId: 'test-account',
        gatewayId: 'test-gateway',
        gatewayToken: 'test-token',
      };
      const provider = new OpenAIProvider(config);
      expect(provider).toBeDefined();
    });

    it('should accept custom reasoning modes', () => {
      const modes: Array<OpenAIConfig['reasoningMode']> = ['high', 'medium', 'low', 'minimal'];
      modes.forEach((mode) => {
        const config: OpenAIConfig = {
          ...mockConfig,
          reasoningMode: mode,
        };
        const provider = new OpenAIProvider(config);
        expect(provider).toBeDefined();
      });
    });
  });

  describe('convert', () => {
    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should successfully convert content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Converted content',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'codex',
        'slash_command'
      );

      expect(result.content).toBe('Converted content');
      expect(result.usedAI).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.metadata?.provider).toBe('openai');
      expect(result.metadata?.model).toBe('gpt-5-mini');
      expect(result.metadata?.inputTokens).toBe(100);
      expect(result.metadata?.outputTokens).toBe(50);
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle responses with reasoning tokens', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Converted content with reasoning',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          completion_tokens_details: {
            reasoning_tokens: 25,
          },
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'gemini',
        'slash_command'
      );

      expect(result.content).toBeDefined();
      expect(result.usedAI).toBe(true);
    });

    it('should trim converted content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '  \n  Converted content with whitespace  \n  ',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'codex',
        'claude_code',
        'slash_command'
      );

      expect(result.content).toBe('Converted content with whitespace');
    });

    it('should throw error when conversion fails', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(
        provider.convert('test content', 'claude_code', 'codex', 'slash_command')
      ).rejects.toThrow('API Error');
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 0,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'codex',
        'slash_command'
      );

      expect(result.content).toBe('');
    });

    it('should call OpenAI with correct parameters', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'test' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      await provider.convert('test content', 'claude_code', 'codex', 'slash_command');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
          reasoning_effort: 'low',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
            }),
          ]),
        })
      );
    });
  });

  describe('chatWithTools', () => {
    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should successfully chat with tools', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response content',
              tool_calls: [
                {
                  id: 'call_123',
                  function: {
                    name: 'test_function',
                    arguments: '{"param": "value"}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_function',
            description: 'A test function',
            parameters: {
              type: 'object',
              properties: {
                param: { type: 'string' },
              },
            },
          },
        },
      ];

      const result = await provider.chatWithTools(messages, tools);

      expect(result.content).toBe('Response content');
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls?.[0].function.name).toBe('test_function');
      expect(result.metadata?.provider).toBe('openai');
    });

    it('should handle chat without tool calls', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response without tools',
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.chatWithTools([{ role: 'user', content: 'Hello' }], []);

      expect(result.content).toBe('Response without tools');
      expect(result.tool_calls).toBeUndefined();
    });

    it('should throw error when chat fails', async () => {
      mockCreate.mockRejectedValue(new Error('Chat API Error'));

      await expect(
        provider.chatWithTools([{ role: 'user', content: 'Hello' }], [])
      ).rejects.toThrow('Chat API Error');
    });
  });

  describe('getProviderName', () => {
    it('should return "openai"', () => {
      provider = new OpenAIProvider(mockConfig);
      expect(provider.getProviderName()).toBe('openai');
    });
  });

  describe('getMetrics', () => {
    it('should return default metrics', () => {
      provider = new OpenAIProvider(mockConfig);
      const metrics = provider.getMetrics();

      expect(metrics).toEqual({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        errorRate: 0,
      });
    });
  });
});
