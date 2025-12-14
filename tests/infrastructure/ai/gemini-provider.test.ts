import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GeminiProvider,
  type GeminiConfig,
  THINKING_PRESETS,
} from '../../../src/infrastructure/ai/gemini-provider';

// Mock Google GenAI module
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
      constructor(public config: any) {}
    },
    FunctionCallingConfigMode: {
      AUTO: 'AUTO',
    },
  };
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockConfig: GeminiConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    mockConfig = {
      accountId: 'test-account',
      gatewayId: 'test-gateway',
      gatewayToken: 'test-token',
      thinkingBudget: THINKING_PRESETS.none,
    };
  });

  describe('Constructor', () => {
    it('should create provider with local dev config (direct API key)', () => {
      const config: GeminiConfig = {
        ...mockConfig,
        directApiKey: 'test-api-key',
      };
      const provider = new GeminiProvider(config);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('should create provider with production BYOK config (no API key)', () => {
      const provider = new GeminiProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('should use default thinking budget if not provided', () => {
      const config: GeminiConfig = {
        accountId: 'test-account',
        gatewayId: 'test-gateway',
        gatewayToken: 'test-token',
      };
      const provider = new GeminiProvider(config);
      expect(provider).toBeDefined();
    });

    it('should accept all thinking budget presets', () => {
      Object.values(THINKING_PRESETS).forEach((budget) => {
        const config: GeminiConfig = {
          ...mockConfig,
          thinkingBudget: budget,
        };
        const provider = new GeminiProvider(config);
        expect(provider).toBeDefined();
      });
    });

    it('should handle custom thinking budget values', () => {
      const config: GeminiConfig = {
        ...mockConfig,
        thinkingBudget: 2048,
      };
      const provider = new GeminiProvider(config);
      expect(provider).toBeDefined();
    });
  });

  describe('convert', () => {
    beforeEach(() => {
      provider = new GeminiProvider(mockConfig);
    });

    it('should successfully convert content', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Converted content' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'codex',
        'slash_command'
      );

      expect(result.content).toBe('Converted content');
      expect(result.usedAI).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.metadata?.provider).toBe('gemini');
      expect(result.metadata?.model).toBe('gemini-3-pro-preview');
      expect(result.metadata?.inputTokens).toBe(100);
      expect(result.metadata?.outputTokens).toBe(50);
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle responses with thinking tokens', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                { thought: 'Internal thinking process' },
                { text: 'Converted content' },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'gemini',
        'slash_command'
      );

      // Should only include non-thought text parts
      expect(result.content).toBe('Converted content');
      expect(result.usedAI).toBe(true);
    });

    it('should trim converted content', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '  \n  Converted content with whitespace  \n  ' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'codex',
        'claude_code',
        'slash_command'
      );

      expect(result.content).toBe('Converted content with whitespace');
    });

    it('should throw error when conversion fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        provider.convert('test content', 'claude_code', 'codex', 'slash_command')
      ).rejects.toThrow('API Error');
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 0,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.convert(
        'test content',
        'claude_code',
        'codex',
        'slash_command'
      );

      expect(result.content).toBe('');
    });

    it('should call Gemini with correct configuration', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'test' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      });

      await provider.convert('test content', 'claude_code', 'codex', 'slash_command');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro-preview',
          contents: expect.any(String),
          config: expect.objectContaining({
            httpOptions: expect.objectContaining({
              baseUrl: expect.stringContaining('gateway.ai.cloudflare.com'),
              headers: expect.objectContaining({
                'cf-aig-authorization': expect.stringContaining('Bearer'),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('chatWithTools', () => {
    beforeEach(() => {
      provider = new GeminiProvider(mockConfig);
    });

    it('should successfully chat with tools', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Response content' },
                {
                  functionCall: {
                    name: 'test_function',
                    args: { param: 'value' },
                  },
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 75,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

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
      expect(result.metadata?.provider).toBe('gemini');
    });

    it('should handle MALFORMED_FUNCTION_CALL error', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'error' }],
            },
            finishReason: 'MALFORMED_FUNCTION_CALL',
          },
        ],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 10,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(
        provider.chatWithTools([{ role: 'user', content: 'test' }], [])
      ).rejects.toThrow('MALFORMED_FUNCTION_CALL');
    });

    it('should handle chat without tool calls', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Response without tools' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 25,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.chatWithTools([{ role: 'user', content: 'Hello' }], []);

      expect(result.content).toBe('Response without tools');
      expect(result.tool_calls).toHaveLength(0);
    });

    it('should throw error when chat fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Chat API Error'));

      await expect(
        provider.chatWithTools([{ role: 'user', content: 'Hello' }], [])
      ).rejects.toThrow('Chat API Error');
    });
  });

  describe('getProviderName', () => {
    it('should return "gemini"', () => {
      provider = new GeminiProvider(mockConfig);
      expect(provider.getProviderName()).toBe('gemini');
    });
  });

  describe('getMetrics', () => {
    it('should return default metrics', () => {
      provider = new GeminiProvider(mockConfig);
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

  describe('THINKING_PRESETS', () => {
    it('should have all preset values', () => {
      expect(THINKING_PRESETS.none).toBe(0);
      expect(THINKING_PRESETS.minimal).toBe(512);
      expect(THINKING_PRESETS.low).toBe(1024);
      expect(THINKING_PRESETS.medium).toBe(2048);
      expect(THINKING_PRESETS.high).toBe(4096);
      expect(THINKING_PRESETS.dynamic).toBe(-1);
    });
  });
});
