import type { AIProvider } from './types'
import { OpenAIProvider, type OpenAIReasoningMode } from './openai-provider'
import { GeminiProvider, type GeminiThinkingBudget, THINKING_PRESETS } from './gemini-provider'

export type ProviderType = 'openai' | 'gemini' | 'auto'

export interface ProviderFactoryConfig {
	// TRUE BYOK: NO provider API keys in config
	// Provider keys configured ONCE in Cloudflare Dashboard (AI Gateway → Provider Keys)
	// Worker code only needs gateway token for authentication

	/** Cloudflare Account ID */
	ACCOUNT_ID: string

	/** Cloudflare AI Gateway ID */
	GATEWAY_ID: string

	/** Cloudflare AI Gateway token (cf-aig-authorization) - REQUIRED for BYOK */
	GATEWAY_TOKEN: string

	/** Provider selection (auto = prefer Gemini for cost savings, fallback to OpenAI) */
	AI_PROVIDER?: ProviderType

	/** OpenAI reasoning mode configuration */
	OPENAI_REASONING_MODE?: OpenAIReasoningMode

	/** Gemini thinking budget configuration */
	GEMINI_THINKING_BUDGET?: GeminiThinkingBudget

	/** Direct API keys for local development (still routes through AI Gateway) */
	OPENAI_API_KEY?: string
	GEMINI_API_KEY?: string
}

/**
 * Factory for creating AI providers
 *
 * TRUE BYOK Architecture:
 * - ALL requests route through AI Gateway for logging, analytics, caching, and rate limiting
 * - Local dev: Direct API keys passed through AI Gateway
 * - Production: Provider keys stored in Cloudflare Dashboard (NOT in Worker code/secrets)
 * - Worker authenticates to AI Gateway using GATEWAY_TOKEN
 * - AI Gateway retrieves provider keys from Secrets Store (production) or forwards provided keys (local dev)
 * - Direct billing to YOUR provider accounts (OpenAI/Google)
 */
export class ProviderFactory {
	private config: ProviderFactoryConfig

	constructor(config: ProviderFactoryConfig) {
		this.config = config
	}

	/**
	 * Create provider based on configuration
	 * Auto mode: prefer Gemini for cost savings, fallback to OpenAI on error
	 */
	createProvider(): AIProvider {
		const providerType = this.config.AI_PROVIDER || 'auto'

		if (providerType === 'auto') {
			// Auto mode: prefer Gemini for cost savings (15x cheaper than OpenAI)
			// Both providers use same gateway token, no need for API key checks
			return this.createGeminiOrFallback()
		} else if (providerType === 'openai') {
			return this.createOpenAIProvider()
		} else {
			return this.createGeminiProvider()
		}
	}

	/**
	 * Create OpenAI provider with TRUE BYOK architecture
	 * Uses direct API key if provided (local dev), otherwise uses BYOK (production)
	 */
	createOpenAIProvider(): OpenAIProvider {
		return new OpenAIProvider({
			accountId: this.config.ACCOUNT_ID,
			gatewayId: this.config.GATEWAY_ID,
			gatewayToken: this.config.GATEWAY_TOKEN,
			reasoningMode: this.config.OPENAI_REASONING_MODE || 'low',
			directApiKey: this.config.OPENAI_API_KEY,
		})
	}

	/**
	 * Create Gemini provider with TRUE BYOK architecture
	 * Uses direct API key if provided (local dev), otherwise uses BYOK (production)
	 */
	createGeminiProvider(): GeminiProvider {
		return new GeminiProvider({
			accountId: this.config.ACCOUNT_ID,
			gatewayId: this.config.GATEWAY_ID,
			gatewayToken: this.config.GATEWAY_TOKEN,
			thinkingBudget: this.config.GEMINI_THINKING_BUDGET ?? THINKING_PRESETS.none,
			includeThoughts: true,
			directApiKey: this.config.GEMINI_API_KEY,
		})
	}

	/**
	 * Create Gemini provider with fallback to OpenAI on error
	 * Used in auto mode for cost optimization
	 */
	private createGeminiOrFallback(): AIProvider {
		try {
			return this.createGeminiProvider()
		} catch (error) {
			console.warn(
				'[ProviderFactory] Failed to create Gemini provider, falling back to OpenAI',
				error
			)
			return this.createOpenAIProvider()
		}
	}
}
