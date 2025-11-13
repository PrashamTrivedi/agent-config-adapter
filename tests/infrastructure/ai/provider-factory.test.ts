import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProviderFactory,
  type ProviderFactoryConfig,
} from '../../../src/infrastructure/ai/provider-factory';
import { OpenAIProvider } from '../../../src/infrastructure/ai/openai-provider';
import { GeminiProvider } from '../../../src/infrastructure/ai/gemini-provider';

// Mock the providers
vi.mock('../../../src/infrastructure/ai/openai-provider');
vi.mock('../../../src/infrastructure/ai/gemini-provider');
vi.mock('openai', () => ({
  default: vi.fn(),
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
}));

describe('ProviderFactory', () => {
  let factory: ProviderFactory;
  let mockConfig: ProviderFactoryConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      ACCOUNT_ID: 'test-account',
      GATEWAY_ID: 'test-gateway',
      GATEWAY_TOKEN: 'test-token',
    };
  });

  describe('Constructor', () => {
    it('should create factory with minimal config', () => {
      const factory = new ProviderFactory(mockConfig);
      expect(factory).toBeDefined();
    });

    it('should create factory with full config', () => {
      const fullConfig: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'openai',
        OPENAI_REASONING_MODE: 'high',
        GEMINI_THINKING_BUDGET: 2048,
        OPENAI_API_KEY: 'sk-test',
        GEMINI_API_KEY: 'gemini-test',
      };
      const factory = new ProviderFactory(fullConfig);
      expect(factory).toBeDefined();
    });
  });

  describe('createProvider', () => {
    it('should create Gemini provider in auto mode (default)', () => {
      const factory = new ProviderFactory(mockConfig);
      const provider = factory.createProvider();
      expect(provider).toBeDefined();
      // In auto mode, should prefer Gemini
      expect(GeminiProvider).toHaveBeenCalled();
    });

    it('should create OpenAI provider when explicitly requested', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'openai',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createProvider();
      expect(provider).toBeDefined();
      expect(OpenAIProvider).toHaveBeenCalled();
    });

    it('should create Gemini provider when explicitly requested', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'gemini',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createProvider();
      expect(provider).toBeDefined();
      expect(GeminiProvider).toHaveBeenCalled();
    });

    it('should create Gemini provider in auto mode', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'auto',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createProvider();
      expect(provider).toBeDefined();
      expect(GeminiProvider).toHaveBeenCalled();
    });
  });

  describe('createOpenAIProvider', () => {
    it('should create OpenAI provider with BYOK config', () => {
      const factory = new ProviderFactory(mockConfig);
      const provider = factory.createOpenAIProvider();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'test-account',
          gatewayId: 'test-gateway',
          gatewayToken: 'test-token',
          reasoningMode: 'low',
          directApiKey: undefined,
        })
      );
    });

    it('should create OpenAI provider with direct API key', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        OPENAI_API_KEY: 'sk-test-key',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createOpenAIProvider();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'test-account',
          gatewayId: 'test-gateway',
          gatewayToken: 'test-token',
          directApiKey: 'sk-test-key',
        })
      );
    });

    it('should create OpenAI provider with custom reasoning mode', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        OPENAI_REASONING_MODE: 'high',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createOpenAIProvider();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoningMode: 'high',
        })
      );
    });

    it('should use default reasoning mode when not specified', () => {
      const factory = new ProviderFactory(mockConfig);
      const provider = factory.createOpenAIProvider();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoningMode: 'low',
        })
      );
    });
  });

  describe('createGeminiProvider', () => {
    it('should create Gemini provider with BYOK config', () => {
      const factory = new ProviderFactory(mockConfig);
      const provider = factory.createGeminiProvider();

      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'test-account',
          gatewayId: 'test-gateway',
          gatewayToken: 'test-token',
          thinkingBudget: 0,
          includeThoughts: true,
          directApiKey: undefined,
        })
      );
    });

    it('should create Gemini provider with direct API key', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        GEMINI_API_KEY: 'gemini-test-key',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createGeminiProvider();

      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'test-account',
          gatewayId: 'test-gateway',
          gatewayToken: 'test-token',
          directApiKey: 'gemini-test-key',
        })
      );
    });

    it('should create Gemini provider with custom thinking budget', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        GEMINI_THINKING_BUDGET: 4096,
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createGeminiProvider();

      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingBudget: 4096,
        })
      );
    });

    it('should use default thinking budget when not specified', () => {
      const factory = new ProviderFactory(mockConfig);
      const provider = factory.createGeminiProvider();

      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingBudget: 0,
        })
      );
    });
  });

  describe('Auto mode with fallback', () => {
    it('should fallback to OpenAI when Gemini creation fails', () => {
      // Mock GeminiProvider constructor to throw an error
      vi.mocked(GeminiProvider).mockImplementationOnce(() => {
        throw new Error('Gemini initialization failed');
      });

      const config: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'auto',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createProvider();

      expect(provider).toBeDefined();
      // Should have tried Gemini first, then fallen back to OpenAI
      expect(GeminiProvider).toHaveBeenCalled();
      expect(OpenAIProvider).toHaveBeenCalled();
    });

    it('should prefer Gemini for cost savings in auto mode', () => {
      const config: ProviderFactoryConfig = {
        ...mockConfig,
        AI_PROVIDER: 'auto',
      };
      const factory = new ProviderFactory(config);
      const provider = factory.createProvider();

      // Should create Gemini provider (15x cheaper)
      expect(GeminiProvider).toHaveBeenCalled();
    });
  });

  describe('Integration with both providers', () => {
    it('should pass correct config to OpenAI provider', () => {
      const config: ProviderFactoryConfig = {
        ACCOUNT_ID: 'acc-123',
        GATEWAY_ID: 'gw-456',
        GATEWAY_TOKEN: 'token-789',
        AI_PROVIDER: 'openai',
        OPENAI_REASONING_MODE: 'medium',
        OPENAI_API_KEY: 'sk-openai-key',
      };
      const factory = new ProviderFactory(config);
      factory.createProvider();

      expect(OpenAIProvider).toHaveBeenCalledWith({
        accountId: 'acc-123',
        gatewayId: 'gw-456',
        gatewayToken: 'token-789',
        reasoningMode: 'medium',
        directApiKey: 'sk-openai-key',
      });
    });

    it('should pass correct config to Gemini provider', () => {
      const config: ProviderFactoryConfig = {
        ACCOUNT_ID: 'acc-123',
        GATEWAY_ID: 'gw-456',
        GATEWAY_TOKEN: 'token-789',
        AI_PROVIDER: 'gemini',
        GEMINI_THINKING_BUDGET: 2048,
        GEMINI_API_KEY: 'gemini-key',
      };
      const factory = new ProviderFactory(config);
      factory.createProvider();

      expect(GeminiProvider).toHaveBeenCalledWith({
        accountId: 'acc-123',
        gatewayId: 'gw-456',
        gatewayToken: 'token-789',
        thinkingBudget: 2048,
        includeThoughts: true,
        directApiKey: 'gemini-key',
      });
    });
  });
});
