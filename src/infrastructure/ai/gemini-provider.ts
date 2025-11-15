import {GoogleGenAI, FunctionCallingConfigMode} from '@google/genai'
import type {
	AIProvider,
	AIConversionResult,
	ChatMessage,
	ChatResponse,
	Tool,
	ProviderMetrics,
} from './types'
import type {AgentFormat, ConfigType} from '../../domain/types'
import {buildFormatConversionPrompt} from '../../prompts'

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

	/** Direct API key for local development (still routes through AI Gateway) */
	directApiKey?: string
}

/**
 * Gemini provider implementation with TRUE BYOK architecture
 *
 * ALL requests route through AI Gateway for logging, analytics, caching, and rate limiting.
 *
 * Local Development Authentication Flow:
 * 1. SDK includes actual API key (from .dev.vars) in x-goog-api-key header
 * 2. AI Gateway forwards the key to Google AI Studio
 * 3. Billing goes directly to YOUR Google account
 *
 * Production BYOK Authentication Flow:
 * 1. Worker authenticates to AI Gateway using cf-aig-authorization header
 * 2. AI Gateway retrieves Gemini API key from Cloudflare Secrets Store
 * 3. AI Gateway replaces placeholder x-goog-api-key with stored key
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
		this.thinkingBudget = config.thinkingBudget ?? THINKING_PRESETS.none

		// ALWAYS route through AI Gateway for logging, analytics, caching, and rate limiting
		this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/google-ai-studio`
		this.gatewayToken = config.gatewayToken

		// Use direct API key if provided (local dev), otherwise use BYOK placeholder (production)
		if (config.directApiKey) {
			// Local development: SDK includes actual API key in x-goog-api-key header
			// AI Gateway forwards the key to Google
			this.client = new GoogleGenAI({apiKey: config.directApiKey})
		} else {
			// Production BYOK: SDK uses placeholder key
			// AI Gateway replaces x-goog-api-key with stored key from Dashboard
			this.client = new GoogleGenAI({apiKey: 'placeholder-for-byok'})
		}
	}

	async convert(
		content: string,
		sourceFormat: AgentFormat,
		targetFormat: AgentFormat,
		configType: ConfigType
	): Promise<AIConversionResult> {
		const startTime = Date.now()
		const prompt = buildFormatConversionPrompt({
			sourceContent: content,
			sourceFormat,
			targetFormat,
			configType,
		})

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

			// Parse response to extract text and thinking parts
			const {textContent, thinkingTokens} = this.parseResponse(response)

			console.log('[Gemini] Conversion successful', {
				model: 'gemini-2.5-flash',
				thinkingBudget: this.thinkingBudget,
				inputTokens: response.usageMetadata?.promptTokenCount,
				outputTokens: response.usageMetadata?.candidatesTokenCount,
				thinkingTokens,
				durationMs,
			})

			return {
				content: textContent.trim(),
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
						response.usageMetadata?.candidatesTokenCount,
						thinkingTokens
					),
				},
			}
		} catch (error) {
			console.error('[Gemini] Conversion failed', {error, durationMs: Date.now() - startTime})
			throw error
		}
	}

	async chatWithTools(messages: ChatMessage[], tools: Tool[]): Promise<ChatResponse> {
		const startTime = Date.now()

		try {

			// Extract system message for systemInstruction (Gemini doesn't support system role in contents)
			const systemMessage = messages.find((m) => m.role === 'system')
			const conversationMessages = messages.filter((m) => m.role !== 'system')

			// Convert messages to Gemini format
			const geminiMessages = this.convertMessagesToGeminiFormat(conversationMessages)
			const geminiTools = this.convertToolsToGeminiFormat(tools)

			console.log('[Gemini] Chat request:', {
				systemMessageLength: systemMessage?.content?.length || 0,
				conversationMessagesCount: conversationMessages.length,
				geminiMessagesCount: geminiMessages.length,
				toolsCount: geminiTools.length,
				toolNames: geminiTools.map(t => t.name),
			})

			const response = await this.client.models.generateContent({
				model: 'gemini-2.5-pro',
				contents: geminiMessages,
				config: {
					httpOptions: {
						baseUrl: this.baseUrl,
						headers: {
							'cf-aig-authorization': `Bearer ${this.gatewayToken}`, // Authenticate to Gateway
						},
					},
					thinkingConfig: {
						thinkingBudget: THINKING_PRESETS.dynamic
					},
					systemInstruction: systemMessage?.content
						? {
							role: 'user',
							parts: [{text: systemMessage.content}],
						}
						: undefined,
					tools: geminiTools.length > 0 ? [{functionDeclarations: geminiTools}] : undefined,
					toolConfig: geminiTools.length > 0
						? {
							functionCallingConfig: {
								mode: FunctionCallingConfigMode.AUTO, // Enable automatic function calling
							},
						}
						: undefined,
				},
			})

			const durationMs = Date.now() - startTime

			// Check for errors first
			const candidate = response.candidates?.[0]
			const finishReason = candidate?.finishReason

			if (finishReason === 'MALFORMED_FUNCTION_CALL') {
				const finishMessage = 'Malformed function call detected'
				console.error('[Gemini] Malformed function call detected:', {
					finishReason,
					finishMessage,
					response: JSON.stringify(response, null, 2),
				})
				throw new Error(`Gemini MALFORMED_FUNCTION_CALL: ${finishMessage}`)
			}

			// Parse response to extract text and thinking parts
			const {textContent, thinkingTokens} = this.parseResponse(response)

			// Extract function calls from parts array
			const functionCalls = this.extractFunctionCalls(response)

			console.log('[Gemini] Chat with tools successful', {
				model: 'gemini-2.5-flash',
				thinkingBudget: this.thinkingBudget,
				inputTokens: response.usageMetadata?.promptTokenCount,
				outputTokens: response.usageMetadata?.candidatesTokenCount,
				thinkingTokens,
				functionCallsCount: functionCalls.length,
				finishReason,
				durationMs,
			})

			return {
				content: textContent || null,
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
			console.error('[Gemini] Chat with tools failed', {error, durationMs: Date.now() - startTime})
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
	 * Extract function calls from Gemini response
	 */
	private extractFunctionCalls(response: any): any[] {
		const functionCalls: any[] = []

		try {
			const parts = response.candidates?.[0]?.content?.parts || []
			for (const part of parts) {
				// Check if part has functionCall
				if (part.functionCall) {
					functionCalls.push(part.functionCall)
				}
			}
		} catch (error) {
			console.error('[Gemini] Failed to extract function calls:', error)
		}

		return functionCalls
	}

	/**
	 * Parse Gemini response to extract text content and thinking tokens
	 * Handles responses with thinking parts (thoughtSignature) properly
	 */
	private parseResponse(response: any): {textContent: string; thinkingTokens: number} {
		// Check for thinking tokens in usage metadata
		const thinkingTokens = response.usageMetadata?.thoughtsTokenCount || 0

		// Extract text from non-thought parts
		let textContent = ''
		try {
			const parts = response.candidates?.[0]?.content?.parts || []
			for (const part of parts) {
				// Only include non-thought text parts in output
				if (!part.thought && part.text) {
					textContent += part.text
				}
			}
		} catch (error) {
			// Fallback to response.text if parsing fails
			textContent = response.text || ''
		}

		return {textContent, thinkingTokens}
	}

	/**
	 * Calculate estimated cost for Gemini API usage
	 *
	 * Gemini 2.5 Flash pricing:
	 * - Input: $0.15/1M tokens
	 * - Regular output: $0.60/1M tokens
	 * - Thinking output: $3.50/1M tokens
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
	 * Handles user, assistant, and tool messages properly
	 */
	private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
		const geminiMessages: any[] = []

		for (const m of messages) {
			// Skip system messages (handled separately via systemInstruction)
			if (m.role === 'system') continue

			// Handle tool/function response messages
			if (m.role === 'tool') {
				// Tool responses should be added to the previous model message or as a new user message
				const toolCallId = (m as any).tool_call_id
				let responseContent: any

				try {
					// Try to parse as JSON first
					responseContent = JSON.parse(m.content || '{}')
				} catch {
					// If not JSON, wrap in object
					responseContent = {result: m.content}
				}

				geminiMessages.push({
					role: 'user', // Tool responses come from user perspective in Gemini
					parts: [
						{
							functionResponse: {
								name: this.extractFunctionNameFromToolCallId(toolCallId, messages),
								response: responseContent,
							},
						},
					],
				})
				continue
			}

			// Handle user messages
			if (m.role === 'user') {
				geminiMessages.push({
					role: 'user',
					parts: [{text: m.content || ''}],
				})
				continue
			}

			// Handle assistant messages
			if (m.role === 'assistant') {
				const parts: any[] = []

				// Add text content if present
				if (m.content) {
					parts.push({text: m.content})
				}

				// Add function calls if present
				if (m.tool_calls && m.tool_calls.length > 0) {
					for (const toolCall of m.tool_calls) {
						parts.push({
							functionCall: {
								name: toolCall.function.name,
								args: JSON.parse(toolCall.function.arguments),
							},
						})
					}
				}

				// Only add if there are parts (avoid empty messages)
				if (parts.length > 0) {
					geminiMessages.push({
						role: 'model',
						parts,
					})
				}
			}
		}

		return geminiMessages
	}

	/**
	 * Extract function name from tool call ID by finding the corresponding tool call
	 */
	private extractFunctionNameFromToolCallId(toolCallId: string | undefined, messages: ChatMessage[]): string {
		if (!toolCallId) return 'unknown_function'

		// Find the assistant message with this tool call
		for (const msg of messages) {
			if (msg.role === 'assistant' && msg.tool_calls) {
				const toolCall = msg.tool_calls.find((tc) => tc.id === toolCallId)
				if (toolCall) {
					return toolCall.function.name
				}
			}
		}

		return 'unknown_function'
	}

	/**
	 * Convert OpenAI-style tools to Gemini function declarations
	 * Gemini requires uppercase type names (STRING, OBJECT, ARRAY, etc.)
	 */
	private convertToolsToGeminiFormat(tools: Tool[]): any[] {
		return tools.map((t) => ({
			name: t.function.name,
			description: t.function.description,
			parameters: this.convertSchemaToGeminiFormat(t.function.parameters),
		}))
	}

	/**
	 * Convert JSON Schema from OpenAI format (lowercase types) to Gemini format (uppercase types)
	 */
	private convertSchemaToGeminiFormat(schema: any): any {
		if (!schema) return schema

		const converted: any = {...schema}

		// Convert type to uppercase
		if (converted.type) {
			converted.type = converted.type.toUpperCase()
		}

		// Convert enum values if present
		if (converted.enum && Array.isArray(converted.enum)) {
			converted.enum = converted.enum
		}

		// Recursively convert properties
		if (converted.properties) {
			converted.properties = Object.fromEntries(
				Object.entries(converted.properties).map(([key, value]) => [
					key,
					this.convertSchemaToGeminiFormat(value),
				])
			)
		}

		// Recursively convert items (for arrays)
		if (converted.items) {
			converted.items = this.convertSchemaToGeminiFormat(converted.items)
		}

		// Recursively convert additionalProperties
		if (converted.additionalProperties && typeof converted.additionalProperties === 'object') {
			converted.additionalProperties = this.convertSchemaToGeminiFormat(converted.additionalProperties)
		}

		return converted
	}
}
