import { GoogleGenAI } from '@google/genai'
import type {
	AIProvider,
	AIConversionResult,
	ChatMessage,
	ChatResponse,
	Tool,
	ProviderMetrics,
} from './types'
import type { AgentFormat, ConfigType } from '../../domain/types'

export type GeminiThinkingBudget = number // 0 to 24576, or -1 for dynamic

/**
 * Thinking budget presets for common use cases
 * NOTE: Thinking features are planned but may not be fully supported by SDK yet
 */
export const THINKING_PRESETS = {
	none: 0, // Disable thinking (fastest, cheapest)
	minimal: 512, // Minimal thinking for simple tasks
	low: 1024, // Low thinking for moderate complexity
	medium: 2048, // Medium thinking for complex tasks
	high: 4096, // High thinking for very complex tasks
	dynamic: -1, // Dynamic thinking (auto-adjust based on task)
} as const

export interface GeminiConfig {
	// TRUE BYOK: NO provider API key in code
	// Provider keys configured ONCE in Cloudflare Dashboard (AI Gateway → Provider Keys)
	// Worker code only needs gateway token for authentication

	/** Cloudflare Account ID */
	accountId: string

	/** Cloudflare AI Gateway ID */
	gatewayId: string

	/** Cloudflare AI Gateway token (cf-aig-authorization) */
	gatewayToken: string

	/** Thinking budget (0 to 24576, or -1 for dynamic) - Reserved for future use */
	thinkingBudget?: GeminiThinkingBudget

	/** Include thoughts in response - Reserved for future use */
	includeThoughts?: boolean
}

/**
 * Gemini provider implementation with TRUE BYOK architecture
 *
 * Authentication Flow:
 * 1. Worker authenticates to AI Gateway using cf-aig-authorization header
 * 2. AI Gateway retrieves Gemini API key from Cloudflare Secrets Store
 * 3. AI Gateway adds x-goog-api-key header with stored key
 * 4. AI Gateway forwards request to Google AI Studio
 * 5. Billing goes to YOUR Google account
 *
 * NOTE: Thinking features are configured but may not be fully supported by SDK yet
 */
export class GeminiProvider implements AIProvider {
	private client: GoogleGenAI
	private baseUrl: string
	private gatewayToken: string
	private thinkingBudget: GeminiThinkingBudget

	constructor(config: GeminiConfig) {
		// TRUE BYOK: No provider API key in Worker code
		// Gateway token authenticates Worker → AI Gateway
		// AI Gateway retrieves Gemini key from Secrets Store
		this.client = new GoogleGenAI({ apiKey: '' }) // Empty string (SDK requirement, not used)
		this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/google-ai-studio`
		this.gatewayToken = config.gatewayToken
		this.thinkingBudget = config.thinkingBudget ?? THINKING_PRESETS.none
	}

	async convert(
		content: string,
		sourceFormat: AgentFormat,
		targetFormat: AgentFormat,
		configType: ConfigType
	): Promise<AIConversionResult> {
		const startTime = Date.now()
		const prompt = this.buildConversionPrompt(content, sourceFormat, targetFormat, configType)

		try {
			const response = await this.client.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: prompt,
				config: {
					httpOptions: {
						baseUrl: this.baseUrl,
						headers: {
							'cf-aig-authorization': `Bearer ${this.gatewayToken}`, // Authenticate to Gateway
						},
					},
					// NOTE: Thinking config reserved for future SDK support
					// thinkingConfig: {
					// 	thinkingBudget: this.thinkingBudget,
					// },
				},
			})

			const durationMs = Date.now() - startTime
			const result = response.text || ''

			console.log('[Gemini] Conversion successful', {
				model: 'gemini-2.5-flash',
				thinkingBudget: this.thinkingBudget,
				inputTokens: response.usageMetadata?.promptTokenCount,
				outputTokens: response.usageMetadata?.candidatesTokenCount,
				durationMs,
			})

			return {
				content: result.trim(),
				usedAI: true,
				fallbackUsed: false,
				metadata: {
					provider: 'gemini',
					model: 'gemini-2.5-flash',
					inputTokens: response.usageMetadata?.promptTokenCount,
					outputTokens: response.usageMetadata?.candidatesTokenCount,
					durationMs,
					estimatedCost: this.calculateCost(
						response.usageMetadata?.promptTokenCount,
						response.usageMetadata?.candidatesTokenCount
					),
				},
			}
		} catch (error) {
			console.error('[Gemini] Conversion failed', { error, durationMs: Date.now() - startTime })
			throw error
		}
	}

	async chatWithTools(messages: ChatMessage[], tools: Tool[]): Promise<ChatResponse> {
		const startTime = Date.now()

		try {
			// Convert messages to Gemini format
			const geminiMessages = this.convertMessagesToGeminiFormat(messages)
			const geminiTools = this.convertToolsToGeminiFormat(tools)

			const response = await this.client.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: geminiMessages,
				config: {
					httpOptions: {
						baseUrl: this.baseUrl,
						headers: {
							'cf-aig-authorization': `Bearer ${this.gatewayToken}`, // Authenticate to Gateway
						},
					},
					tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
				},
			})

			const durationMs = Date.now() - startTime

			// functionCalls is a property, not a method
			const functionCalls = response.functionCalls || []

			console.log('[Gemini] Chat with tools successful', {
				model: 'gemini-2.5-flash',
				thinkingBudget: this.thinkingBudget,
				inputTokens: response.usageMetadata?.promptTokenCount,
				outputTokens: response.usageMetadata?.candidatesTokenCount,
				functionCallsCount: functionCalls.length,
				durationMs,
			})

			return {
				content: response.text || null,
				tool_calls: functionCalls.map((fc: any, idx: number) => ({
					id: `call_${idx}`,
					function: {
						name: fc.name,
						arguments: JSON.stringify(fc.args),
					},
				})),
				metadata: {
					provider: 'gemini',
					model: 'gemini-2.5-flash',
					inputTokens: response.usageMetadata?.promptTokenCount,
					outputTokens: response.usageMetadata?.candidatesTokenCount,
					durationMs,
				},
			}
		} catch (error) {
			console.error('[Gemini] Chat with tools failed', { error, durationMs: Date.now() - startTime })
			throw error
		}
	}

	getProviderName(): string {
		return 'gemini'
	}

	getMetrics(): ProviderMetrics {
		// TODO: Implement metrics tracking
		return {
			totalRequests: 0,
			totalTokens: 0,
			totalCost: 0,
			averageLatency: 0,
			errorRate: 0,
		}
	}

	/**
	 * Calculate estimated cost for Gemini API usage
	 *
	 * Gemini 2.5 Flash pricing:
	 * - Input: $0.15/1M tokens
	 * - Regular output: $0.60/1M tokens
	 * - Thinking output: $3.50/1M tokens (reserved for future use)
	 */
	private calculateCost(
		inputTokens?: number,
		outputTokens?: number,
		thinkingTokens?: number
	): number {
		const inputCost = (inputTokens || 0) * 0.15 / 1_000_000
		const regularOutputCost = (outputTokens || 0) * 0.60 / 1_000_000
		const thinkingOutputCost = (thinkingTokens || 0) * 3.50 / 1_000_000

		return inputCost + regularOutputCost + thinkingOutputCost
	}

	/**
	 * Convert OpenAI-style messages to Gemini format
	 */
	private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
		return messages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => ({
				role: m.role === 'user' ? 'user' : 'model',
				parts: [{ text: m.content || '' }],
			}))
	}

	/**
	 * Convert OpenAI-style tools to Gemini function declarations
	 */
	private convertToolsToGeminiFormat(tools: Tool[]): any[] {
		return tools.map((t) => ({
			name: t.function.name,
			description: t.function.description,
			parameters: t.function.parameters,
		}))
	}

	/**
	 * Build conversion prompt with format specifications
	 */
	private buildConversionPrompt(
		sourceContent: string,
		sourceFormat: AgentFormat,
		targetFormat: AgentFormat,
		configType: ConfigType
	): string {
		const systemContext = `You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks, no preamble
5. If the source has parameters/arguments, preserve them in the target format's convention
6. Follow these convention for memory files, Claude Code has CLAUDE.md, Gemini has GEMINI.md and Codex has AGENTS.md. So when you encounter one in the source file, replace it for Destination.
    - e.g. If you encounter CLAUDE.md and are converting it to Gemini, Replace CLAUDE.md with GEMINI.md

${this.getFormatSpec(sourceFormat, 'SOURCE')}

${this.getFormatSpec(targetFormat, 'TARGET')}`

		const userPrompt = `Convert the following ${configType} configuration from ${sourceFormat} format to ${targetFormat} format:

${sourceContent}

Remember: Output ONLY the converted configuration in ${targetFormat} format. No explanations.`

		return systemContext + '\n\n' + userPrompt
	}

	/**
	 * Get format specification for a given agent format
	 */
	private getFormatSpec(format: AgentFormat, label: string): string {
		switch (format) {
			case 'claude_code':
				return `${label} FORMAT: Claude Code
Claude Code slash commands use Markdown with YAML frontmatter:
---
name: command-name
description: Brief description of what the command does
allowed-tools: List of allowed tools
---

The actual prompt content goes here.
It can be multiple lines.

Parameters can be referenced as $ARGUMENTS in the prompt.`

			case 'codex':
				return `${label} FORMAT: Codex
Codex uses AGENTS.md style with markdown sections:
# command-name

Brief description of what the command does

## Prompt

The actual prompt content goes here.
It can be multiple lines.

Parameters are referenced as {{args}} in the prompt.`

			case 'gemini':
				return `${label} FORMAT: Gemini
Gemini uses TOML files (.toml) with this structure:
Parameters are referenced as {{args}} in the prompt.
description = "Brief description of what the command does"
prompt = """
The actual prompt content goes here.
It can be multiple lines.
"""

Note: Use triple-quoted strings for multi-line prompts.
If there are no parameters, omit the args field entirely.`

			default:
				return ''
		}
	}
}
