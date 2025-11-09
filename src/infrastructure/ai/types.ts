import type { AgentFormat, ConfigType } from '../../domain/types'

/**
 * Core AI Provider interface
 * All AI providers (OpenAI, Gemini, etc.) must implement this interface
 */
export interface AIProvider {
	/**
	 * Convert content from one format to another using AI
	 */
	convert(
		content: string,
		sourceFormat: AgentFormat,
		targetFormat: AgentFormat,
		configType: ConfigType
	): Promise<AIConversionResult>

	/**
	 * Chat with tools (for slash command conversion and other tool-based interactions)
	 */
	chatWithTools(messages: ChatMessage[], tools: Tool[]): Promise<ChatResponse>

	/**
	 * Get provider name (e.g., 'openai', 'gemini')
	 */
	getProviderName(): string

	/**
	 * Get provider metrics (optional, for monitoring)
	 */
	getMetrics(): ProviderMetrics
}

/**
 * Result from AI conversion operation
 */
export interface AIConversionResult {
	/** Converted content */
	content: string

	/** Whether AI was used for conversion */
	usedAI: boolean

	/** Whether fallback conversion was used */
	fallbackUsed: boolean

	/** Metadata about the conversion */
	metadata: AIConversionMetadata
}

/**
 * Metadata about AI conversion
 */
export interface AIConversionMetadata {
	/** Provider name (openai, gemini) */
	provider: string

	/** Model used (gpt-5-mini, gemini-2.5-flash, etc.) */
	model: string

	/** Input tokens consumed */
	inputTokens?: number

	/** Output tokens generated */
	outputTokens?: number

	/** Thinking/reasoning tokens (Gemini only) */
	thinkingTokens?: number

	/** Thoughts/reasoning process (Gemini only) */
	thoughts?: string

	/** Duration in milliseconds */
	durationMs: number

	/** Estimated cost in USD */
	estimatedCost?: number
}

/**
 * Chat message for tool-based interactions
 */
export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content: string | null
	tool_calls?: ToolCall[]
	tool_call_id?: string
}

/**
 * Tool definition for function calling
 */
export interface Tool {
	type: string
	function: {
		name: string
		description: string
		parameters: Record<string, any>
	}
}

/**
 * Tool call result
 */
export interface ToolCall {
	id: string
	function: {
		name: string
		arguments: string
	}
}

/**
 * Response from chat with tools
 */
export interface ChatResponse {
	/** Response content (may be null if tool calls are present) */
	content: string | null

	/** Tool calls made by the model */
	tool_calls?: ToolCall[]

	/** Metadata about the chat operation */
	metadata: ChatMetadata
}

/**
 * Metadata about chat operation
 */
export interface ChatMetadata {
	/** Provider name */
	provider: string

	/** Model used */
	model: string

	/** Input tokens */
	inputTokens?: number

	/** Output tokens */
	outputTokens?: number

	/** Thinking tokens (Gemini only) */
	thinkingTokens?: number

	/** Thoughts (Gemini only) */
	thoughts?: string

	/** Duration in milliseconds */
	durationMs: number
}

/**
 * Provider metrics (for monitoring and analytics)
 */
export interface ProviderMetrics {
	/** Total requests made */
	totalRequests: number

	/** Total tokens consumed */
	totalTokens: number

	/** Total cost in USD */
	totalCost: number

	/** Average latency in milliseconds */
	averageLatency: number

	/** Error rate (0.0 to 1.0) */
	errorRate: number
}
