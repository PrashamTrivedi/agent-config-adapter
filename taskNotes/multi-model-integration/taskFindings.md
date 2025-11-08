# Multi-Model AI Integration

## Purpose

Implement multi-model support for OpenAI and Gemini with separate SDK integrations, AI Gateway observability, reasoning mode support, and comprehensive backend logging - all without exposing API keys in code.

## Original Ask

I need multi model without my code providing any secrets (And using secrets used in secrets store).

I am definitely looking for Gemini and OpenAI. BUT WITHOUT ANY COMMON ENDPOINT....

Also we need GPT-5-Mini and Gemini 2.5 Flash with low reasoning and reasoning responses logged (or Gemini's response logged) in backend and AI Gateway for observations....

## Complexity and the reason behind it

**Complexity Score: 4/5**

**Reasoning:**
- Multi-provider architecture requiring separate SDK integrations (OpenAI + Gemini)
- Complex reasoning mode configuration (GPT-5-Mini variants vs Gemini thinking budgets)
- Backend logging infrastructure for AI responses and thinking process
- AI Gateway integration for both providers (separate endpoints, not unified)
- Environment variable/secrets management for multiple API keys
- Backward compatibility with existing conversion and slash command services
- Testing both providers with various reasoning configurations
- Documentation for provider selection strategies

Not scored 5 because:
- Core architecture patterns already exist (AIConverterService, ConversionService)
- Logging patterns established (see LOGGING_IMPROVEMENTS.md)
- AI Gateway integration well-documented by Cloudflare
- No frontend changes required

## BYOK (Bring Your Own Key) Architecture - TRUE CLOUDFLARE MODEL

**Cloudflare AI Gateway BYOK: Keys stored in Cloudflare Dashboard (ONE TIME)**

```
┌─────────────────────────────────────────────────────────────────┐
│                TRUE BYOK Architecture Flow                       │
└─────────────────────────────────────────────────────────────────┘

1. ONE-TIME SETUP (Cloudflare Dashboard):
   ┌──────────────────────────────────────────────────┐
   │  Cloudflare Dashboard → AI Gateway → Provider Keys│
   │  ├─ Add OpenAI API Key (stored ONCE)            │
   │  └─ Add Gemini API Key (stored ONCE)            │
   │                                                   │
   │  Stored in: Cloudflare Secrets Store             │
   │  Encryption: AES, two-level key hierarchy        │
   │  Scope: Only accessible to AI Gateway service    │
   └──────────────────────────────────────────────────┘

2. Runtime (Every Request):
   ┌──────────────────────────────────────────────────┐
   │  Worker Code                                      │
   │  ├─ NO provider API keys in code                 │
   │  ├─ Only needs: GATEWAY_TOKEN                    │
   │  └─ Sends: cf-aig-authorization header           │
   └──────────────────────────────────────────────────┘
                 ↓
3. AI Gateway (retrieves stored keys):
   ┌──────────────────────────────────────────────────┐
   │  Cloudflare AI Gateway                            │
   │  ├─ Authenticates worker: cf-aig-authorization   │
   │  ├─ Retrieves provider key from Secrets Store    │
   │  ├─ Logs metadata (NO keys logged)               │
   │  ├─ Caches responses                              │
   │  └─ Forwards to provider WITH stored key         │
   └──────────────────────────────────────────────────┘
                 ↓
4. Provider API (OpenAI/Gemini):
   ┌──────────────────────────────────────────────────┐
   │  OpenAI API / Gemini API                          │
   │  └─ Receives: Authorization header (from Gateway)│
   │     (Gateway added stored key automatically)      │
   └──────────────────────────────────────────────────┘
```

**Key Points (CORRECTED):**
- ✅ **AI Gateway DOES store provider API keys** (in Cloudflare Secrets Store)
- ✅ **Keys configured ONCE in Cloudflare Dashboard, NOT in code**
- ✅ **Keys stored in Cloudflare Secrets Store (AES encrypted, scoped to AI Gateway)**
- ✅ **Worker code has NO provider API keys** (only gateway token)
- ✅ **Two-layer auth:**
  - Layer 1: Worker → Gateway (cf-aig-authorization)
  - Layer 2: Gateway → Provider (stored key, added by Gateway)
- ✅ **Billing goes directly to your OpenAI/Gemini accounts**
- ✅ **AI Gateway provides: observability, caching, rate limiting, routing, key management**

**Security Benefits (CORRECTED):**
1. **Centralized Key Management**: Store provider keys once in encrypted Secrets Store
2. **No Keys in Code**: Worker code never contains provider API keys
3. **Key Rotation**: Update keys in dashboard → propagates immediately (Quicksilver)
4. **Audit Trail**: Cloudflare logs all key operations (RBAC, admin-only access)
5. **Scoped Access**: Keys only accessible to AI Gateway service (not Workers, Pages, etc.)
6. **Role-Based Permissions**: Admins manage keys, developers only need "Deploy" permissions
7. **Cost Transparency**: Direct billing from providers shows actual usage

**This IS a traditional key vault approach - Cloudflare stores and manages keys centrally.**

## Architectural changes required

### 1. Multi-Provider AI Service Architecture

**Current:**
```
AIConverterService (single provider: OpenAI via AI Gateway)
  ├─ convert() - GPT-5 for config conversion
  └─ chatWithTools() - GPT-5-mini for slash commands
```

**Proposed:**
```
AIProviderFactory (new)
  ├─ createOpenAIProvider()
  └─ createGeminiProvider()

OpenAIProvider (new)
  ├─ convert() with reasoning mode support
  ├─ chatWithTools()
  └─ Models: gpt-5-mini (high/medium/low/minimal variants)

GeminiProvider (new)
  ├─ convert() with thinking budget support
  ├─ chatWithTools()
  └─ Model: gemini-2.5-flash (thinking budget: 0 to 24576)

AIConverter (refactored from AIConverterService)
  ├─ provider: OpenAIProvider | GeminiProvider
  ├─ convert()
  └─ chatWithTools()
```

### 2. Configuration Strategy (TRUE BYOK)

**Environment Variables (CORRECTED):**
```typescript
interface AIConfig {
  // NO provider API keys in code/environment!
  // Provider keys configured ONCE in Cloudflare Dashboard

  // Cloudflare Gateway Authentication
  ACCOUNT_ID: string
  GATEWAY_ID: string
  GATEWAY_TOKEN: string  // cf-aig-authorization token (REQUIRED for BYOK)

  // Provider Selection
  AI_PROVIDER?: 'openai' | 'gemini' | 'auto'  // Default: 'auto'
  AI_FALLBACK_PROVIDER?: 'openai' | 'gemini'  // Default: opposite of primary
}
```

**ONE-TIME SETUP (Cloudflare Dashboard):**
1. Visit Cloudflare Dashboard → AI → AI Gateway
2. Select your gateway (e.g., "ai-agent-adapter")
3. Navigate to "Provider Keys" tab
4. Click "Add API Key"
5. Select provider (OpenAI, Google AI Studio, etc.)
6. Enter your provider API key
7. Save (key stored in Cloudflare Secrets Store)

**Repeat for each provider you want to use (OpenAI, Gemini, etc.)**

**Provider Selection Logic:**
- `auto` - Use Gemini for cost savings (15x cheaper), fallback to OpenAI if Gemini fails
- Explicit provider selection for specific use cases
- Fallback provider for resilience

### 3. AI Gateway Routing (TRUE BYOK Model)

**IMPORTANT: TRUE BYOK - Keys stored in Cloudflare Dashboard**
- Provider API keys configured ONCE in Cloudflare Dashboard (AI Gateway → Provider Keys)
- Keys stored in Cloudflare Secrets Store (encrypted, scoped to AI Gateway only)
- Worker code authenticates to Gateway using `cf-aig-authorization` header
- Gateway retrieves stored provider key and forwards to provider
- Billing goes directly to your OpenAI/Gemini account

**OpenAI via AI Gateway (TRUE BYOK):**
```typescript
// NO OpenAI API key in Worker code!
// Key is stored in Cloudflare Dashboard → AI Gateway → Provider Keys

const openai = new OpenAI({
  apiKey: "",  // Empty string (SDK requirement, not used)
  baseURL: `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_ID}/${env.GATEWAY_ID}/openai`,
  defaultHeaders: {
    'cf-aig-authorization': `Bearer ${env.GATEWAY_TOKEN}`  // Cloudflare gateway token
  }
})

// Flow:
// 1. Worker sends request with cf-aig-authorization
// 2. Gateway authenticates the worker
// 3. Gateway retrieves OpenAI key from Secrets Store
// 4. Gateway adds Authorization header with stored OpenAI key
// 5. Gateway forwards to OpenAI
// 6. OpenAI bills YOUR account directly
```

**Gemini via AI Gateway (TRUE BYOK):**
```typescript
// NO Gemini API key in Worker code!
// Key is stored in Cloudflare Dashboard → AI Gateway → Provider Keys

const genai = new GoogleGenAI({
  apiKey: ""  // Empty string (SDK requirement, not used)
})

await genai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Your prompt',
  config: {
    httpOptions: {
      baseUrl: `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_ID}/${env.GATEWAY_ID}/google-ai-studio`,
      headers: {
        'cf-aig-authorization': `Bearer ${env.GATEWAY_TOKEN}`  // Cloudflare gateway token
      }
    }
  }
})

// Flow:
// 1. Worker sends request with cf-aig-authorization
// 2. Gateway authenticates the worker
// 3. Gateway retrieves Gemini key from Secrets Store
// 4. Gateway adds x-goog-api-key header with stored Gemini key
// 5. Gateway forwards to Google AI Studio
// 6. Google bills YOUR account directly
```

**AI Gateway Benefits (with TRUE BYOK):**
- ✅ Centralized key management (store keys once in dashboard)
- ✅ No keys in Worker code (only gateway token)
- ✅ Unified observability dashboard (requests, tokens, latency)
- ✅ Request/response logging (metadata only, keys never logged)
- ✅ Cost tracking per provider (passthrough billing)
- ✅ Rate limiting and throttling
- ✅ Response caching (reduces provider API calls)
- ✅ Provider routing and fallbacks
- ✅ Key rotation (update in dashboard, propagates immediately)
- ✅ RBAC (admin manages keys, developers only need deploy permissions)

### 4. Reasoning Mode Configuration

**OpenAI (Model-based):**
```typescript
type OpenAIReasoningMode = 'high' | 'medium' | 'low' | 'minimal'

// Maps to model variants:
// high -> gpt-5-mini-high
// medium -> gpt-5-mini-medium
// low -> gpt-5-mini-low
// minimal -> gpt-5-mini-minimal
```

**Gemini (Budget-based):**
```typescript
type GeminiThinkingBudget =
  | 0           // Disable thinking (fastest, cheapest)
  | -1          // Dynamic thinking (auto-adjust)
  | number      // Fixed budget (1-24576 tokens)

// Presets:
const THINKING_PRESETS = {
  none: 0,
  minimal: 512,
  low: 1024,
  medium: 2048,
  high: 4096,
  dynamic: -1
}
```

### 5. Backend Logging Infrastructure

**Log Levels:**
```typescript
enum AILogLevel {
  DEBUG = 'debug',    // Full request/response
  INFO = 'info',      // Metadata only
  WARN = 'warn',      // Errors/fallbacks
  ERROR = 'error'     // Failures
}
```

**Log Structure:**
```typescript
interface AIRequestLog {
  timestamp: string
  requestId: string
  provider: 'openai' | 'gemini'
  model: string
  operation: 'convert' | 'chatWithTools'

  // Request metadata
  inputTokens?: number
  promptLength: number

  // Reasoning configuration
  reasoningMode?: OpenAIReasoningMode
  thinkingBudget?: number

  // Performance
  durationMs: number

  // Response metadata
  outputTokens?: number
  thinkingTokens?: number  // Gemini only
  responseLength: number

  // Thinking process (if enabled)
  thoughts?: string  // Gemini thought summaries

  // Costs
  estimatedCost?: number

  // Error tracking
  error?: string
  fallbackUsed?: boolean
  retryCount?: number
}
```

**Logging Strategy:**
- Log all AI requests with structured metadata
- Include thinking/reasoning details when enabled
- Track costs per provider/model
- Store logs in Cloudflare Analytics Engine (optional future enhancement)
- Console logging with prefixes: `[OpenAI]`, `[Gemini]`

## Backend changes required

### 1. New Provider Interfaces and Implementations

**Files to create:**

**`src/infrastructure/ai/types.ts`**
```typescript
export interface AIProvider {
  convert(
    content: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): Promise<AIConversionResult>

  chatWithTools(
    messages: ChatMessage[],
    tools: Tool[]
  ): Promise<ChatResponse>

  getProviderName(): string
  getMetrics(): ProviderMetrics
}

export interface AIConversionResult {
  content: string
  usedAI: boolean
  fallbackUsed: boolean
  metadata: {
    provider: string
    model: string
    inputTokens?: number
    outputTokens?: number
    thinkingTokens?: number
    thoughts?: string
    durationMs: number
    estimatedCost?: number
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface Tool {
  type: string
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

export interface ChatResponse {
  content: string | null
  tool_calls?: ToolCall[]
  metadata: {
    provider: string
    model: string
    inputTokens?: number
    outputTokens?: number
    thinkingTokens?: number
    thoughts?: string
    durationMs: number
  }
}

export interface ProviderMetrics {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageLatency: number
  errorRate: number
}
```

**`src/infrastructure/ai/openai-provider.ts`**
```typescript
import OpenAI from 'openai'
import { AIProvider, AIConversionResult, ChatMessage, ChatResponse, Tool } from './types'
import { AgentFormat, ConfigType } from '../../domain/types'

export type OpenAIReasoningMode = 'high' | 'medium' | 'low' | 'minimal'

export interface OpenAIConfig {
  // NO apiKey - key stored in Cloudflare Dashboard
  accountId: string
  gatewayId: string
  gatewayToken: string  // cf-aig-authorization token (REQUIRED for BYOK)
  reasoningMode?: OpenAIReasoningMode
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private reasoningMode: OpenAIReasoningMode

  constructor(config: OpenAIConfig) {
    // TRUE BYOK: No provider API key in code
    // Gateway token authenticates to AI Gateway
    // Gateway retrieves OpenAI key from Secrets Store
    this.client = new OpenAI({
      apiKey: "",  // Empty string (SDK requirement, not used)
      baseURL: `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/openai`,
      defaultHeaders: {
        'cf-aig-authorization': `Bearer ${config.gatewayToken}`  // Authenticate to Gateway
      }
    })
    this.reasoningMode = config.reasoningMode || 'low'
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
        model: this.getModelForReasoningMode(this.reasoningMode),
        messages: [{ role: 'user', content: prompt }]
      })

      const durationMs = Date.now() - startTime
      const result = response.choices[0].message.content || ''

      console.log('[OpenAI] Conversion successful', {
        model: this.getModelForReasoningMode(this.reasoningMode),
        reasoningMode: this.reasoningMode,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        durationMs
      })

      return {
        content: result.trim(),
        usedAI: true,
        fallbackUsed: false,
        metadata: {
          provider: 'openai',
          model: this.getModelForReasoningMode(this.reasoningMode),
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
          durationMs,
          estimatedCost: this.calculateCost(response.usage)
        }
      }
    } catch (error) {
      console.error('[OpenAI] Conversion failed', { error, durationMs: Date.now() - startTime })
      throw error
    }
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: Tool[]
  ): Promise<ChatResponse> {
    const startTime = Date.now()

    try {
      const response = await this.client.chat.completions.create({
        model: this.getModelForReasoningMode(this.reasoningMode),
        messages: messages as any,
        tools: tools as any,
        tool_choice: 'auto'
      })

      const durationMs = Date.now() - startTime
      const message = response.choices[0].message

      console.log('[OpenAI] Chat with tools successful', {
        model: this.getModelForReasoningMode(this.reasoningMode),
        reasoningMode: this.reasoningMode,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        toolCallsCount: message.tool_calls?.length || 0,
        durationMs
      })

      return {
        content: message.content,
        tool_calls: message.tool_calls?.map(tc => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        })),
        metadata: {
          provider: 'openai',
          model: this.getModelForReasoningMode(this.reasoningMode),
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
          durationMs
        }
      }
    } catch (error) {
      console.error('[OpenAI] Chat with tools failed', { error, durationMs: Date.now() - startTime })
      throw error
    }
  }

  getProviderName(): string {
    return 'openai'
  }

  getMetrics(): any {
    // TODO: Implement metrics tracking
    return {}
  }

  private getModelForReasoningMode(mode: OpenAIReasoningMode): string {
    // Map reasoning mode to model variant
    const modelMap: Record<OpenAIReasoningMode, string> = {
      high: 'gpt-5-mini-high',
      medium: 'gpt-5-mini-medium',
      low: 'gpt-5-mini-low',
      minimal: 'gpt-5-mini-minimal'
    }
    return modelMap[mode]
  }

  private calculateCost(usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
    if (!usage) return 0

    // GPT-5-Mini pricing: $0.25/1M input, $2.00/1M output
    const inputCost = (usage.prompt_tokens || 0) * 0.25 / 1_000_000
    const outputCost = (usage.completion_tokens || 0) * 2.00 / 1_000_000
    return inputCost + outputCost
  }

  private buildConversionPrompt(
    content: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): string {
    // Same prompt logic as current AIConverterService
    // ... implementation omitted for brevity
    return ''
  }
}
```

**`src/infrastructure/ai/gemini-provider.ts`**
```typescript
import { GoogleGenAI } from '@google/genai'
import { AIProvider, AIConversionResult, ChatMessage, ChatResponse, Tool } from './types'
import { AgentFormat, ConfigType } from '../../domain/types'

export type GeminiThinkingBudget = number // 0 to 24576, or -1 for dynamic

export const THINKING_PRESETS = {
  none: 0,
  minimal: 512,
  low: 1024,
  medium: 2048,
  high: 4096,
  dynamic: -1
}

export interface GeminiConfig {
  // NO apiKey - key stored in Cloudflare Dashboard
  accountId: string
  gatewayId: string
  gatewayToken: string  // cf-aig-authorization token (REQUIRED for BYOK)
  thinkingBudget?: GeminiThinkingBudget
  includeThoughts?: boolean
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI
  private baseUrl: string
  private gatewayToken: string
  private thinkingBudget: GeminiThinkingBudget
  private includeThoughts: boolean

  constructor(config: GeminiConfig) {
    // TRUE BYOK: No provider API key in code
    // Gateway token authenticates to AI Gateway
    // Gateway retrieves Gemini key from Secrets Store
    this.client = new GoogleGenAI({ apiKey: "" })  // Empty string (SDK requirement, not used)
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/google-ai-studio`
    this.gatewayToken = config.gatewayToken
    this.thinkingBudget = config.thinkingBudget ?? THINKING_PRESETS.none
    this.includeThoughts = config.includeThoughts ?? true
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
              'cf-aig-authorization': `Bearer ${this.gatewayToken}`  // Authenticate to Gateway
            }
          },
          thinkingConfig: {
            thinkingBudget: this.thinkingBudget
          },
          includeThoughts: this.includeThoughts
        }
      })

      const durationMs = Date.now() - startTime
      const result = response.text

      console.log('[Gemini] Conversion successful', {
        model: 'gemini-2.5-flash',
        thinkingBudget: this.thinkingBudget,
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        thinkingTokens: response.thoughtsTokenCount,
        hasThoughts: !!response.thoughts,
        durationMs
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
          thinkingTokens: response.thoughtsTokenCount,
          thoughts: response.thoughts,
          durationMs,
          estimatedCost: this.calculateCost(
            response.usageMetadata?.promptTokenCount,
            response.usageMetadata?.candidatesTokenCount,
            response.thoughtsTokenCount
          )
        }
      }
    } catch (error) {
      console.error('[Gemini] Conversion failed', { error, durationMs: Date.now() - startTime })
      throw error
    }
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: Tool[]
  ): Promise<ChatResponse> {
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
              'cf-aig-authorization': `Bearer ${this.gatewayToken}`  // Authenticate to Gateway
            }
          },
          tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
          thinkingConfig: {
            thinkingBudget: this.thinkingBudget
          },
          includeThoughts: this.includeThoughts
        }
      })

      const durationMs = Date.now() - startTime
      const functionCalls = response.functionCalls()

      console.log('[Gemini] Chat with tools successful', {
        model: 'gemini-2.5-flash',
        thinkingBudget: this.thinkingBudget,
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        thinkingTokens: response.thoughtsTokenCount,
        functionCallsCount: functionCalls?.length || 0,
        durationMs
      })

      return {
        content: response.text || null,
        tool_calls: functionCalls?.map((fc, idx) => ({
          id: `call_${idx}`,
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args)
          }
        })),
        metadata: {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          inputTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
          thinkingTokens: response.thoughtsTokenCount,
          thoughts: response.thoughts,
          durationMs
        }
      }
    } catch (error) {
      console.error('[Gemini] Chat with tools failed', { error, durationMs: Date.now() - startTime })
      throw error
    }
  }

  getProviderName(): string {
    return 'gemini'
  }

  getMetrics(): any {
    // TODO: Implement metrics tracking
    return {}
  }

  private calculateCost(
    inputTokens?: number,
    outputTokens?: number,
    thinkingTokens?: number
  ): number {
    // Gemini 2.5 Flash pricing
    const inputCost = (inputTokens || 0) * 0.15 / 1_000_000

    // Different pricing for thinking vs regular output
    const regularOutputCost = (outputTokens || 0) * 0.60 / 1_000_000
    const thinkingOutputCost = (thinkingTokens || 0) * 3.50 / 1_000_000

    return inputCost + regularOutputCost + thinkingOutputCost
  }

  private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
    // Convert OpenAI-style messages to Gemini format
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || '' }]
      }))
  }

  private convertToolsToGeminiFormat(tools: Tool[]): any[] {
    return tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }))
  }

  private buildConversionPrompt(
    content: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): string {
    // Same prompt logic as current AIConverterService
    // ... implementation omitted for brevity
    return ''
  }
}
```

**`src/infrastructure/ai/provider-factory.ts`**
```typescript
import { AIProvider } from './types'
import { OpenAIProvider, OpenAIReasoningMode } from './openai-provider'
import { GeminiProvider, GeminiThinkingBudget, THINKING_PRESETS } from './gemini-provider'

export type ProviderType = 'openai' | 'gemini' | 'auto'

export interface ProviderFactoryConfig {
  // NO provider API keys! Keys stored in Cloudflare Dashboard

  // Cloudflare Gateway Authentication
  ACCOUNT_ID: string
  GATEWAY_ID: string
  GATEWAY_TOKEN: string  // cf-aig-authorization token (REQUIRED)

  // Provider selection
  AI_PROVIDER?: ProviderType
  AI_FALLBACK_PROVIDER?: 'openai' | 'gemini'

  // Reasoning configuration
  OPENAI_REASONING_MODE?: OpenAIReasoningMode
  GEMINI_THINKING_BUDGET?: GeminiThinkingBudget
}

export class ProviderFactory {
  private config: ProviderFactoryConfig

  constructor(config: ProviderFactoryConfig) {
    this.config = config
  }

  createProvider(): AIProvider {
    const providerType = this.config.AI_PROVIDER || 'auto'

    if (providerType === 'auto') {
      // Auto mode: prefer Gemini for cost savings, fallback to OpenAI
      return this.createGeminiOrFallback()
    } else if (providerType === 'openai') {
      return this.createOpenAIProvider()
    } else {
      return this.createGeminiProvider()
    }
  }

  createOpenAIProvider(): OpenAIProvider {
    // NO API key check - key is stored in Cloudflare Dashboard
    // Only need gateway token for authentication

    return new OpenAIProvider({
      accountId: this.config.ACCOUNT_ID,
      gatewayId: this.config.GATEWAY_ID,
      gatewayToken: this.config.GATEWAY_TOKEN,  // cf-aig-authorization token
      reasoningMode: this.config.OPENAI_REASONING_MODE || 'low'
    })
  }

  createGeminiProvider(): GeminiProvider {
    // NO API key check - key is stored in Cloudflare Dashboard
    // Only need gateway token for authentication

    return new GeminiProvider({
      accountId: this.config.ACCOUNT_ID,
      gatewayId: this.config.GATEWAY_ID,
      gatewayToken: this.config.GATEWAY_TOKEN,  // cf-aig-authorization token
      thinkingBudget: this.config.GEMINI_THINKING_BUDGET ?? THINKING_PRESETS.none,
      includeThoughts: true
    })
  }

  private createGeminiOrFallback(): AIProvider {
    // In auto mode, try Gemini first (cost savings)
    // Both providers use same gateway token, so no need for API key checks
    try {
      return this.createGeminiProvider()
    } catch (error) {
      console.warn('[ProviderFactory] Failed to create Gemini provider, falling back to OpenAI', error)
      return this.createOpenAIProvider()
    }
  }
}
```

### 2. Refactor Existing Services

**`src/infrastructure/ai-converter.ts` (deprecated - kept for backward compatibility)**
```typescript
// Mark as deprecated, delegate to new provider architecture
import { ProviderFactory } from './ai/provider-factory'
import { AgentFormat, ConfigType } from '../domain/types'

export class AIConverterService {
  private provider: any

  constructor(apiKey: string, accountId: string, gatewayId: string, gatewayToken?: string) {
    console.warn('[DEPRECATED] AIConverterService is deprecated. Use ProviderFactory instead.')

    const factory = new ProviderFactory({
      OPENAI_API_KEY: apiKey,
      ACCOUNT_ID: accountId,
      GATEWAY_ID: gatewayId,
      AI_GATEWAY_TOKEN: gatewayToken,
      AI_PROVIDER: 'openai' // Keep backward compatibility with OpenAI
    })

    this.provider = factory.createProvider()
  }

  async convert(
    sourceContent: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): Promise<string> {
    const result = await this.provider.convert(sourceContent, sourceFormat, targetFormat, configType)
    return result.content
  }

  async chatWithTools(messages: any[], tools: any[]): Promise<any> {
    return this.provider.chatWithTools(messages, tools)
  }
}
```

**`src/services/conversion-service.ts`** - Update to use new provider architecture
```typescript
import { CacheService } from '../infrastructure/cache'
import { ConfigRepository } from '../infrastructure/database'
import { ProviderFactory } from '../infrastructure/ai/provider-factory'
import { getAdapter } from '../adapters'
import { AgentFormat, ConfigType } from '../domain/types'

export interface ConversionServiceEnv {
  DB: D1Database
  CONFIG_CACHE: KVNamespace

  // NO provider API keys! Keys stored in Cloudflare Dashboard

  // Cloudflare Gateway Authentication
  ACCOUNT_ID: string
  GATEWAY_ID: string
  GATEWAY_TOKEN: string  // cf-aig-authorization token (REQUIRED)

  // Provider configuration
  AI_PROVIDER?: 'openai' | 'gemini' | 'auto'
  OPENAI_REASONING_MODE?: string
  GEMINI_THINKING_BUDGET?: string
}

export interface ConversionResult {
  content: string
  cached: boolean
  usedAI: boolean
  fallbackUsed: boolean
  metadata?: {
    provider?: string
    model?: string
    inputTokens?: number
    outputTokens?: number
    thinkingTokens?: number
    thoughts?: string
    durationMs?: number
    estimatedCost?: number
  }
}

export class ConversionService {
  private repo: ConfigRepository
  private cache: CacheService
  private env: ConversionServiceEnv
  private providerFactory: ProviderFactory

  constructor(env: ConversionServiceEnv) {
    this.repo = new ConfigRepository(env.DB)
    this.cache = new CacheService(env.CONFIG_CACHE)
    this.env = env

    // Initialize provider factory (TRUE BYOK - no provider API keys)
    this.providerFactory = new ProviderFactory({
      // NO provider API keys - stored in Cloudflare Dashboard
      ACCOUNT_ID: env.ACCOUNT_ID,
      GATEWAY_ID: env.GATEWAY_ID,
      GATEWAY_TOKEN: env.GATEWAY_TOKEN,  // cf-aig-authorization token
      AI_PROVIDER: env.AI_PROVIDER as any,
      OPENAI_REASONING_MODE: env.OPENAI_REASONING_MODE as any,
      GEMINI_THINKING_BUDGET: env.GEMINI_THINKING_BUDGET ? parseInt(env.GEMINI_THINKING_BUDGET) : undefined
    })
  }

  async convertWithMetadata(
    configId: string,
    targetFormat: AgentFormat
  ): Promise<ConversionResult> {
    // Try cache first
    const cached = await this.cache.get(configId, targetFormat)
    if (cached) {
      return {
        content: cached,
        cached: true,
        usedAI: true,
        fallbackUsed: false
      }
    }

    // Get config from database
    const config = await this.repo.findById(configId)
    if (!config) {
      throw new Error(`Config not found: ${configId}`)
    }

    // Skills cannot be converted
    if (config.type === 'skill') {
      throw new Error('Skills cannot be converted between formats')
    }

    // Same format - return original
    if (config.original_format === targetFormat) {
      return {
        content: config.content,
        cached: false,
        usedAI: false,
        fallbackUsed: false
      }
    }

    // Try AI conversion with new provider architecture
    try {
      const provider = this.providerFactory.createProvider()
      const result = await provider.convert(
        config.content,
        config.original_format,
        targetFormat,
        config.type
      )

      // Cache the result
      await this.cache.set(configId, result.content, targetFormat)

      return {
        content: result.content,
        cached: false,
        usedAI: result.usedAI,
        fallbackUsed: result.fallbackUsed,
        metadata: result.metadata
      }
    } catch (error) {
      console.error('[ConversionService] AI conversion failed, falling back to rule-based', error)

      // Fallback to rule-based adapter
      const adapter = getAdapter(config.type, {})
      const converted = adapter.convert(
        config.content,
        config.original_format,
        targetFormat,
        config.type
      )

      await this.cache.set(configId, converted, targetFormat)

      return {
        content: converted,
        cached: false,
        usedAI: false,
        fallbackUsed: true
      }
    }
  }

  async convert(configId: string, targetFormat: AgentFormat): Promise<string> {
    const result = await this.convertWithMetadata(configId, targetFormat)
    return result.content
  }
}
```

**`src/services/slash-command-converter-service.ts`** - Update to use new provider
```typescript
// Update constructor to accept AIProvider instead of AIConverterService
import { AIProvider } from '../infrastructure/ai/types'
import { ConfigService } from './config-service'

export class SlashCommandConverterService {
  constructor(
    private provider: AIProvider,
    private configService: ConfigService
  ) {}

  // Rest of the implementation stays the same, replace this.aiConverter with this.provider
  // ...
}
```

### 3. Environment Variables and Secrets (TRUE BYOK Implementation)

**CRITICAL: TRUE BYOK means keys stored in Cloudflare Dashboard, NOT Workers secrets**
- Provider API keys configured ONCE in Cloudflare Dashboard (AI Gateway → Provider Keys)
- AI Gateway stores keys in Cloudflare Secrets Store (AES encrypted)
- Worker code has NO provider API keys
- Worker only needs GATEWAY_TOKEN for authentication to AI Gateway
- Billing goes to YOUR provider accounts

**Update `.dev.vars.example`:**
```bash
# ============================================================================
# TRUE BYOK (Bring Your Own Key) Configuration
# ============================================================================
# IMPORTANT: Provider API keys (OpenAI, Gemini) are stored in Cloudflare
# Dashboard, NOT in this file or Workers secrets!
#
# Setup Steps:
# 1. Get provider API keys from OpenAI/Google
# 2. Store them in: Cloudflare Dashboard → AI → AI Gateway → Provider Keys
# 3. Configure only the GATEWAY_TOKEN below (for Worker → Gateway auth)
#
# You are billed directly by OpenAI/Google, not through Cloudflare
# ============================================================================

# ============================================================================
# Cloudflare Configuration (NO provider keys here!)
# ============================================================================

# Cloudflare Account ID (find in dashboard URL)
ACCOUNT_ID=b286748abb233ddf7bf942f876f11eac

# AI Gateway ID (created in AI Gateway dashboard)
# This is NOT an API key - it's an identifier for your gateway
GATEWAY_ID=ai-agent-adapter

# AI Gateway Token (REQUIRED for BYOK authentication)
# This token authenticates your Worker to AI Gateway
# Create in: Cloudflare Dashboard → AI Gateway → Settings → Create Token
# This is a Cloudflare token, NOT a provider API key
GATEWAY_TOKEN=your-gateway-token-here

# ============================================================================
# Provider Selection and Configuration
# ============================================================================

# Provider Selection: 'openai' | 'gemini' | 'auto' (default: auto)
# auto = prefer Gemini for cost, fallback to OpenAI
AI_PROVIDER=auto

# OpenAI Reasoning Mode: 'high' | 'medium' | 'low' | 'minimal' (default: low)
OPENAI_REASONING_MODE=low

# Gemini Thinking Budget: 0 (disable) to 24576 (max), or -1 (dynamic) (default: 0)
# Presets: 0=none, 512=minimal, 1024=low, 2048=medium, 4096=high, -1=dynamic
GEMINI_THINKING_BUDGET=0
```

**ONE-TIME Dashboard Setup (Store Provider Keys):**
```bash
# DO THIS ONCE in Cloudflare Dashboard (web UI):

# 1. Visit https://dash.cloudflare.com
# 2. Navigate to: AI → AI Gateway
# 3. Select your gateway (e.g., "ai-agent-adapter")
# 4. Click "Provider Keys" tab
# 5. Click "Add API Key" button

# For OpenAI:
# - Select provider: "OpenAI"
# - Enter your OpenAI API key (get from https://platform.openai.com/api-keys)
# - Save

# For Gemini:
# - Click "Add API Key" again
# - Select provider: "Google AI Studio"
# - Enter your Gemini API key (get from https://aistudio.google.com/app/apikey)
# - Save

# Keys are now stored in Cloudflare Secrets Store (encrypted, scoped to AI Gateway)
# You will NEVER need to configure these keys in Workers secrets or code
```

**Production Workers Secret Setup (ONLY Gateway Token):**
```bash
# Set ONLY the gateway token in Workers secrets
# Provider keys are stored in Cloudflare Dashboard (see above)

# Set Cloudflare AI Gateway token
npx wrangler secret put GATEWAY_TOKEN
# Enter your gateway token when prompted
```

**Gateway Token Creation:**
```bash
# Create gateway token in Cloudflare Dashboard:
# 1. Visit Cloudflare Dashboard → AI → AI Gateway
# 2. Select your gateway
# 3. Navigate to "Settings" tab
# 4. Click "Create Token" button
# 5. Copy the token and add to Workers secrets (see above)
```

**Key Management Best Practices:**
```bash
# Rotate provider keys (in Dashboard):
# 1. Visit Cloudflare Dashboard → AI → AI Gateway → Provider Keys
# 2. Click on the key you want to rotate
# 3. Click "Edit" or "Replace"
# 4. Enter new key
# 5. Save (propagates immediately via Quicksilver)

# Rotate gateway token (in Workers secrets):
npx wrangler secret put GATEWAY_TOKEN  # Updates existing secret

# Verify Workers secrets are set (doesn't show values):
npx wrangler secret list
# Should show: GATEWAY_TOKEN (provider keys are NOT here!)

# Delete secret if needed:
npx wrangler secret delete GATEWAY_TOKEN
```

**Update `wrangler.jsonc` vars:**
```jsonc
{
  "vars": {
    "ACCOUNT_ID": "b286748abb233ddf7bf942f876f11eac",
    "GATEWAY_ID": "ai-agent-adapter",
    "AI_PROVIDER": "auto",
    "OPENAI_REASONING_MODE": "low",
    "GEMINI_THINKING_BUDGET": "0"
  }
}
```

### 4. Package Dependencies

**Add Gemini SDK:**
```bash
npm install @google/genai
```

**Update `package.json` dependencies:**
```json
{
  "dependencies": {
    "@google/genai": "^1.x.x",
    "openai": "^6.3.0"
  }
}
```

### 5. Database Migration (Optional - for logging)

**Create `migrations/0008_add_ai_request_logs.sql`** (optional future enhancement):
```sql
-- AI Request Logs table for tracking AI provider usage
CREATE TABLE IF NOT EXISTS ai_request_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,

  -- Request metadata
  config_id TEXT,
  input_tokens INTEGER,
  prompt_length INTEGER,

  -- Reasoning configuration
  reasoning_mode TEXT,
  thinking_budget INTEGER,

  -- Performance
  duration_ms INTEGER NOT NULL,

  -- Response metadata
  output_tokens INTEGER,
  thinking_tokens INTEGER,
  response_length INTEGER,

  -- Costs
  estimated_cost REAL,

  -- Error tracking
  error TEXT,
  fallback_used INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,

  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE SET NULL
);

CREATE INDEX idx_ai_logs_provider ON ai_request_logs(provider);
CREATE INDEX idx_ai_logs_timestamp ON ai_request_logs(timestamp);
CREATE INDEX idx_ai_logs_config_id ON ai_request_logs(config_id);
```

## Frontend changes required

**None required.**

The changes are purely backend/infrastructure. The existing REST API endpoints will continue to work with the same interface, but will now:
- Use the configured AI provider (OpenAI, Gemini, or auto)
- Include additional metadata in responses (provider, model, tokens, costs)
- Support reasoning mode configuration via environment variables

## Acceptance Criteria

1. **Multi-Provider Support:**
   - ✅ Both OpenAI and Gemini providers implemented
   - ✅ Provider selection via environment variable (auto/openai/gemini)
   - ✅ Auto mode defaults to Gemini with OpenAI fallback

2. **Reasoning Mode Configuration:**
   - ✅ OpenAI supports 4 reasoning modes (high/medium/low/minimal)
   - ✅ Gemini supports thinking budget (0 to 24576, -1 for dynamic)
   - ✅ Configurable via environment variables

3. **AI Gateway Integration:**
   - ✅ Both providers route through AI Gateway
   - ✅ Separate endpoints (OpenAI vs Google AI Studio)
   - ✅ Unified observability dashboard

4. **Backend Logging:**
   - ✅ Structured logging for all AI requests
   - ✅ Include provider, model, tokens, thinking process
   - ✅ Cost estimation per request
   - ✅ Performance metrics (duration, error rate)

5. **Security (TRUE BYOK Model):**
   - ✅ TRUE BYOK: Provider keys stored ONCE in Cloudflare Dashboard
   - ✅ Keys stored in Cloudflare Secrets Store (AES encrypted, scoped to AI Gateway)
   - ✅ Worker code has NO provider API keys (only GATEWAY_TOKEN)
   - ✅ cf-aig-authorization header for Worker → Gateway auth
   - ✅ Gateway retrieves provider keys from Secrets Store at runtime
   - ✅ No API keys in Worker code or Workers secrets
   - ✅ Direct billing from providers (OpenAI/Google accounts)
   - ✅ Key rotation in dashboard (propagates immediately via Quicksilver)
   - ✅ RBAC (admin manages keys, developers need only deploy permissions)

6. **Backward Compatibility:**
   - ✅ Existing conversion endpoints work unchanged
   - ✅ Slash command converter works with both providers
   - ✅ Fallback to rule-based conversion if AI fails

7. **Documentation:**
   - ✅ Updated CLAUDE.md with multi-provider setup
   - ✅ Provider selection strategies documented
   - ✅ Reasoning mode configuration examples
   - ✅ Cost comparison table

## Validation

### 1. Local Development Testing

**Setup:**
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .dev.vars.example .dev.vars

# Edit .dev.vars:
# - Add OPENAI_API_KEY
# - Add GEMINI_API_KEY
# - Set AI_PROVIDER=auto
# - Set OPENAI_REASONING_MODE=low
# - Set GEMINI_THINKING_BUDGET=0

# 3. Start dev server
npm run dev
```

**Test Cases:**

**Test 1: Gemini Conversion (Default)**
```bash
# Create a test config
curl -X POST http://localhost:9090/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Command",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: test\ndescription: Test command\n---\n\nThis is a test command."
  }'

# Get config ID from response, then convert
CONFIG_ID="<id-from-response>"

curl -X GET "http://localhost:9090/api/configs/${CONFIG_ID}/format/gemini"

# Verify:
# - Response includes converted content
# - Console logs show [Gemini] provider
# - Logs include thinkingBudget: 0 (disabled)
# - Response metadata includes provider: "gemini"
```

**Test 2: OpenAI Conversion (Explicit)**
```bash
# Update .dev.vars: AI_PROVIDER=openai
# Restart dev server

curl -X GET "http://localhost:9090/api/configs/${CONFIG_ID}/format/codex"

# Verify:
# - Console logs show [OpenAI] provider
# - Logs include reasoningMode: "low"
# - Model is gpt-5-mini-low
```

**Test 3: Slash Command Converter with Gemini**
```bash
# Update .dev.vars: AI_PROVIDER=gemini, GEMINI_THINKING_BUDGET=1024
# Restart dev server

curl -X POST "http://localhost:9090/api/slash-commands/${CONFIG_ID}/convert" \
  -H "Content-Type: application/json" \
  -d '{"userArguments": "test argument"}'

# Verify:
# - Conversion includes tool calls if needed
# - Console logs show thinking budget: 1024
# - Response includes thoughts if thinking enabled
```

**Test 4: Reasoning Mode Comparison**
```bash
# Test OpenAI with different reasoning modes
for mode in minimal low medium high; do
  echo "Testing OpenAI with $mode reasoning..."
  # Update .dev.vars: OPENAI_REASONING_MODE=$mode
  # Restart and test conversion
  # Compare response quality and cost
done

# Test Gemini with different thinking budgets
for budget in 0 512 1024 2048 4096 -1; do
  echo "Testing Gemini with thinking budget $budget..."
  # Update .dev.vars: GEMINI_THINKING_BUDGET=$budget
  # Restart and test conversion
  # Compare response quality and cost
done
```

**Test 5: Fallback Behavior**
```bash
# Test with invalid Gemini API key
# Update .dev.vars: GEMINI_API_KEY=invalid, AI_PROVIDER=auto

curl -X GET "http://localhost:9090/api/configs/${CONFIG_ID}/format/gemini"

# Verify:
# - Console shows Gemini error
# - Falls back to OpenAI
# - Response includes fallbackUsed: true
```

**Test 6: Cost Tracking**
```bash
# Make multiple conversions and check console logs
for i in {1..5}; do
  curl -X GET "http://localhost:9090/api/configs/${CONFIG_ID}/format/codex"
done

# Verify console logs include:
# - estimatedCost for each request
# - Token counts (input/output/thinking)
# - Provider name
```

### 2. Production Deployment Testing

**Setup:**
```bash
# 1. Set production secrets
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put AI_GATEWAY_TOKEN  # if using authenticated gateway

# 2. Update wrangler.jsonc vars
# - AI_PROVIDER: "auto"
# - OPENAI_REASONING_MODE: "low"
# - GEMINI_THINKING_BUDGET: "0"

# 3. Deploy
npm run deploy
```

**Test Cases:**

**Test 1: BYOK Security Validation**
```bash
# Verify BYOK architecture is working correctly

# 1. Confirm keys are NOT stored in AI Gateway
# - Visit Cloudflare dashboard > AI Gateway > ai-agent-adapter > Settings
# - Verify NO provider API keys are configured in AI Gateway
# - AI Gateway should show NO key storage fields

# 2. Verify keys are in Workers secrets
npx wrangler secret list
# Should show: OPENAI_API_KEY, GEMINI_API_KEY (values hidden)

# 3. Make test requests and verify billing
# - Make several API calls to production
# - Check OpenAI usage dashboard: https://platform.openai.com/usage
# - Check Google AI Studio usage: https://aistudio.google.com/app/billing
# - Verify charges appear in YOUR accounts (not Cloudflare)

# 4. Verify keys are passed through (not stored)
npx wrangler tail --format pretty
# Look for request logs - should NOT show API keys in logs
# AI Gateway should log metadata only
```

**Test 2: AI Gateway Observability**
```bash
# 1. Make several API calls to production endpoint
# 2. Visit Cloudflare dashboard > AI Gateway > ai-agent-adapter
# 3. Verify:
#    - Both OpenAI and Gemini providers appear
#    - Request counts are accurate
#    - Token usage tracked
#    - Cost estimates visible (passthrough, not charged by CF)
#    - Cache hit rate displayed
#    - NO API keys visible in dashboard
```

**Test 2: Provider Selection**
```bash
# Test auto mode (default)
PROD_URL="https://agent-config-adapter.your-domain.workers.dev"

curl -X GET "$PROD_URL/api/configs/${CONFIG_ID}/format/gemini"

# Check wrangler tail logs
npx wrangler tail

# Verify:
# - Default provider is Gemini (for cost savings)
# - Logs show [Gemini] prefix
```

**Test 3: Production Performance**
```bash
# Measure latency for both providers
time curl -X GET "$PROD_URL/api/configs/${CONFIG_ID}/format/gemini"  # Gemini
time curl -X GET "$PROD_URL/api/configs/${CONFIG_ID}/format/codex"   # Same provider

# Compare response times
# Verify both are within acceptable range (< 5s)
```

### 3. Unit Tests

**Test Suite Structure:**
```
tests/
  infrastructure/
    ai/
      openai-provider.test.ts
      gemini-provider.test.ts
      provider-factory.test.ts
  services/
    conversion-service.test.ts (update)
    slash-command-converter-service.test.ts (update)
```

**Key Test Cases:**

1. **OpenAI Provider Tests:**
   - ✅ Converts config correctly
   - ✅ Uses correct model for each reasoning mode
   - ✅ Calculates costs accurately
   - ✅ Handles errors gracefully
   - ✅ Logs requests with metadata

2. **Gemini Provider Tests:**
   - ✅ Converts config correctly
   - ✅ Applies thinking budget correctly
   - ✅ Includes thoughts when enabled
   - ✅ Calculates costs with thinking tokens
   - ✅ Converts tool calls correctly

3. **Provider Factory Tests:**
   - ✅ Creates OpenAI provider when specified
   - ✅ Creates Gemini provider when specified
   - ✅ Auto mode prefers Gemini
   - ✅ Falls back to OpenAI if Gemini unavailable
   - ✅ Throws error if no valid provider

4. **Conversion Service Tests:**
   - ✅ Uses configured provider
   - ✅ Includes metadata in response
   - ✅ Falls back to rule-based on error
   - ✅ Caches converted results

5. **Integration Tests:**
   - ✅ End-to-end conversion with both providers
   - ✅ Slash command conversion with tool calls
   - ✅ Provider switching works correctly

### 4. Documentation Validation

**Checklist:**
- ✅ CLAUDE.md updated with multi-provider setup
- ✅ README.md updated with new features
- ✅ .dev.vars.example includes all new variables
- ✅ Provider selection strategies documented
- ✅ Cost comparison table included
- ✅ Reasoning mode guide with examples
- ✅ Troubleshooting section for common issues

### 5. Success Metrics

**After implementation, verify:**

1. **Cost Reduction:**
   - Gemini usage reduces costs by ~70% for non-thinking conversions
   - Thinking mode costs are tracked and logged

2. **Performance:**
   - Both providers respond within acceptable latency (< 5s)
   - Auto mode successfully falls back on errors
   - AI Gateway caching improves repeat request performance

3. **Observability:**
   - All requests appear in AI Gateway dashboard
   - Provider usage split visible
   - Token and cost tracking accurate
   - Error rates monitored

4. **Developer Experience:**
   - Easy provider switching via environment variables
   - Clear logging helps debug issues
   - Backward compatibility maintained
   - Documentation is comprehensive

### Command Summary (TRUE BYOK)

```bash
# Step 1: Setup dependencies
npm install
cp .dev.vars.example .dev.vars

# Step 2: Configure provider keys in Cloudflare Dashboard (ONE TIME)
# Visit: https://dash.cloudflare.com → AI → AI Gateway → Provider Keys
# - Add OpenAI API key (get from https://platform.openai.com/api-keys)
# - Add Gemini API key (get from https://aistudio.google.com/app/apikey)
# Keys stored in Cloudflare Secrets Store (encrypted, scoped to AI Gateway)

# Step 3: Create Gateway Token (ONE TIME)
# Visit: Cloudflare Dashboard → AI Gateway → Settings → Create Token
# Copy token and add to .dev.vars as GATEWAY_TOKEN

# Step 4: Edit .dev.vars
# - Set GATEWAY_TOKEN (from step 3)
# - Set ACCOUNT_ID, GATEWAY_ID
# - DO NOT set OPENAI_API_KEY or GEMINI_API_KEY (already in dashboard)

# Step 5: Local testing
npm run dev

# Step 6: Run tests
npm test

# Step 7: Deploy to production (TRUE BYOK)
# Provider keys already in dashboard - only need to set gateway token
npx wrangler secret put GATEWAY_TOKEN  # Cloudflare gateway token
npm run deploy

# Step 8: Monitor production
npx wrangler tail
# Visit Cloudflare AI Gateway dashboard (view usage, manage keys)
```

---

## BYOK Security Summary (CORRECTED)

**What is TRUE BYOK in Cloudflare AI Gateway?**
BYOK (Bring Your Own Key) means YOU provide provider API keys ONCE in Cloudflare Dashboard. Cloudflare AI Gateway stores them securely in Cloudflare Secrets Store and retrieves them at runtime. Your Worker code authenticates to the gateway (not to providers directly).

**Key Flow in TRUE BYOK Architecture:**
1. **You** create OpenAI and Gemini API keys from provider websites
2. **You** store keys ONCE in Cloudflare Dashboard (AI Gateway → Provider Keys)
3. **Cloudflare** encrypts and stores keys in Cloudflare Secrets Store (AES, scoped to AI Gateway)
4. **Your Worker** authenticates to AI Gateway using `cf-aig-authorization` header (gateway token)
5. **AI Gateway** retrieves provider key from Secrets Store
6. **AI Gateway** forwards requests to providers WITH stored key
7. **Providers** authenticate with YOUR keys and bill YOUR accounts
8. **AI Gateway** logs metadata (tokens, latency, costs) WITHOUT keys

**Security Guarantees (CORRECTED):**
- ✅ **Cloudflare stores your provider keys** (in encrypted Secrets Store, NOT Workers secrets)
- ✅ **Keys stored with AES encryption** (two-level key hierarchy)
- ✅ **Keys scoped to AI Gateway only** (not accessible to Workers, Pages, etc.)
- ✅ **Worker code has NO provider keys** (only gateway token for auth)
- ✅ **RBAC**: Admins manage keys, developers only need deploy permissions
- ✅ **Direct billing** - OpenAI and Gemini charge your accounts directly
- ✅ **Key rotation** - update in dashboard, propagates immediately (Quicksilver)
- ✅ **Audit logging** - All key operations logged (who accessed, when, etc.)
- ✅ **Centralized management** - One place to manage all provider keys

**What AI Gateway IS:**
- **Key vault** (stores provider keys in Cloudflare Secrets Store)
- **Observability platform** (see requests, tokens, costs)
- **Caching layer** (reduce provider API calls)
- **Rate limiting** (control request throttling)
- **Routing layer** (fallbacks, load balancing)
- **Authentication proxy** (adds provider auth automatically)

**What AI Gateway IS NOT:**
- Billing intermediary (providers bill you directly, not through Cloudflare)
- Request modifier (passes through requests as-is, adds only auth headers)

**Key Differences from "Request Headers" Method:**

| Aspect | TRUE BYOK (Store Keys) | Request Headers (Old Method) |
|--------|------------------------|------------------------------|
| **Provider Keys** | Stored in Cloudflare Dashboard | Passed with every request from Worker |
| **Worker Secrets** | Only GATEWAY_TOKEN | OPENAI_API_KEY, GEMINI_API_KEY, etc. |
| **Authentication** | cf-aig-authorization header | Provider-specific headers (Authorization, x-goog-api-key) |
| **Key Rotation** | Update in dashboard → immediate | Update Workers secrets → redeploy |
| **Key Access** | RBAC (admin-only) | Anyone with Workers access |
| **Security** | Keys isolated to AI Gateway | Keys in Workers environment |

**Why Cloudflare Calls It BYOK:**
You "bring" your own provider keys (not using Cloudflare's unified billing). You "own" the keys (they're YOUR OpenAI/Gemini accounts, billing goes to YOU). But Cloudflare DOES store them for you in a secure key vault.
