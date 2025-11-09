import OpenAI from 'openai'
import type {
	AIProvider,
	AIConversionResult,
	ChatMessage,
	ChatResponse,
	Tool,
	ProviderMetrics,
} from './types'
import type { AgentFormat, ConfigType } from '../../domain/types'

export type OpenAIReasoningMode = 'high' | 'medium' | 'low' | 'minimal'

export interface OpenAIConfig {
	/** Cloudflare Account ID */
	accountId: string

	/** Cloudflare AI Gateway ID */
	gatewayId: string

	/** Cloudflare AI Gateway token (cf-aig-authorization) */
	gatewayToken: string

	/** Reasoning mode (maps to model variant) */
	reasoningMode?: OpenAIReasoningMode

	/** Direct API key for local development (still routes through AI Gateway) */
	directApiKey?: string
}

/**
 * OpenAI provider implementation with TRUE BYOK architecture
 *
 * ALL requests route through AI Gateway for logging, analytics, caching, and rate limiting.
 *
 * Local Development Authentication Flow:
 * 1. SDK includes actual API key (from .dev.vars) in Authorization header
 * 2. AI Gateway forwards the key to OpenAI
 * 3. Billing goes directly to YOUR OpenAI account
 *
 * Production BYOK Authentication Flow:
 * 1. Worker authenticates to AI Gateway using cf-aig-authorization header
 * 2. AI Gateway retrieves OpenAI API key from Cloudflare Secrets Store
 * 3. AI Gateway adds Authorization header with stored key
 * 4. AI Gateway forwards request to OpenAI
 * 5. Billing goes to YOUR OpenAI account
 */
export class OpenAIProvider implements AIProvider {
	private client: OpenAI
	private reasoningMode: OpenAIReasoningMode
	private modelName: string = 'gpt-5-mini' // Base model name - reasoning controlled via parameter

	constructor(config: OpenAIConfig) {
		this.reasoningMode = config.reasoningMode || 'low'

		// ALWAYS route through AI Gateway for logging, analytics, caching, and rate limiting
		const baseURL = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/openai`

		// Use direct API key if provided (local dev), otherwise use BYOK placeholder (production)
		if (config.directApiKey) {
			// Local development: SDK includes actual API key in Authorization header
			// AI Gateway forwards the key to OpenAI
			this.client = new OpenAI({
				apiKey: config.directApiKey,
				baseURL,
				defaultHeaders: { 'cf-aig-authorization': `Bearer ${config.gatewayToken}` },
			})
		} else {
			// Production BYOK: SDK uses empty key
			// AI Gateway adds Authorization header with stored key from Dashboard
			this.client = new OpenAI({
				apiKey: '',
				baseURL,
				defaultHeaders: { 'cf-aig-authorization': `Bearer ${config.gatewayToken}` },
			})
		}
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
			const response = await this.client.chat.completions.create({
				model: this.modelName,
				messages: [{ role: 'user', content: prompt }],
				reasoning_effort: this.reasoningMode, // Control reasoning depth via parameter
			})

			const durationMs = Date.now() - startTime
			const result = response.choices[0].message.content || ''

			// Extract reasoning tokens if available (GPT-5 specific)
			const reasoningTokens = (response.usage as any)?.completion_tokens_details?.reasoning_tokens

			console.log('[OpenAI] Conversion successful', {
				model: this.modelName,
				reasoningEffort: this.reasoningMode,
				inputTokens: response.usage?.prompt_tokens,
				outputTokens: response.usage?.completion_tokens,
				reasoningTokens,
				durationMs,
			})

			return {
				content: result.trim(),
				usedAI: true,
				fallbackUsed: false,
				metadata: {
					provider: 'openai',
					model: this.modelName,
					inputTokens: response.usage?.prompt_tokens,
					outputTokens: response.usage?.completion_tokens,
					durationMs,
					estimatedCost: this.calculateCost(response.usage, reasoningTokens),
				},
			}
		} catch (error) {
			console.error('[OpenAI] Conversion failed', { error, durationMs: Date.now() - startTime })
			throw error
		}
	}

	async chatWithTools(messages: ChatMessage[], tools: Tool[]): Promise<ChatResponse> {
		const startTime = Date.now()

		try {
			const response = await this.client.chat.completions.create({
				model: this.modelName,
				messages: messages as any,
				tools: tools as any,
				tool_choice: 'auto',
				reasoning_effort: this.reasoningMode, // Control reasoning depth via parameter
			})

			const durationMs = Date.now() - startTime
			const message = response.choices[0].message

			// Extract reasoning tokens if available (GPT-5 specific)
			const reasoningTokens = (response.usage as any)?.completion_tokens_details?.reasoning_tokens

			console.log('[OpenAI] Chat with tools successful', {
				model: this.modelName,
				reasoningEffort: this.reasoningMode,
				inputTokens: response.usage?.prompt_tokens,
				outputTokens: response.usage?.completion_tokens,
				reasoningTokens,
				toolCallsCount: message.tool_calls?.length || 0,
				durationMs,
			})

			return {
				content: message.content,
				tool_calls: message.tool_calls?.map((tc: any) => ({
					id: tc.id,
					function: {
						name: tc.function?.name || '',
						arguments: tc.function?.arguments || '{}',
					},
				})),
				metadata: {
					provider: 'openai',
					model: this.modelName,
					inputTokens: response.usage?.prompt_tokens,
					outputTokens: response.usage?.completion_tokens,
					durationMs,
				},
			}
		} catch (error) {
			console.error('[OpenAI] Chat with tools failed', { error, durationMs: Date.now() - startTime })
			throw error
		}
	}

	getProviderName(): string {
		return 'openai'
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
	 * Calculate estimated cost for OpenAI API usage
	 * GPT-5-Mini pricing: $0.25/1M input tokens, $2.00/1M output tokens
	 *
	 * Note: Reasoning tokens are included in completion_tokens count,
	 * so we don't double-count them. The reasoningTokens parameter is for logging only.
	 */
	private calculateCost(usage?: { prompt_tokens?: number; completion_tokens?: number }, reasoningTokens?: number): number {
		if (!usage) return 0

		const inputCost = (usage.prompt_tokens || 0) * 0.25 / 1_000_000
		const outputCost = (usage.completion_tokens || 0) * 2.00 / 1_000_000
		return inputCost + outputCost
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
