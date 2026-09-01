import { Hono } from 'hono';
import { ConfigService } from '../services/config-service';
import { SlashCommandConverterService } from '../services/slash-command-converter-service';
import { SlashCommandAnalyzerService } from '../services/slash-command-analyzer-service';
import { ProviderFactory, type ProviderType } from '../infrastructure/ai/provider-factory';
import type { OpenAIReasoningMode } from '../infrastructure/ai/openai-provider';
import type { GeminiThinkingBudget } from '../infrastructure/ai/gemini-provider';
import { AnalyticsService } from '../services/analytics-service';
import type { AnalyticsEngineDataset } from '../domain/types';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;

  // Multi-provider configuration
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string; // BYOK gateway token
  AI_PROVIDER?: ProviderType; // 'openai' | 'gemini' | 'auto'
  OPENAI_REASONING_MODE?: OpenAIReasoningMode;
  GEMINI_THINKING_BUDGET?: string; // String because env vars are strings

  // Direct API keys for local development
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;

  ANALYTICS?: AnalyticsEngineDataset;
};

export const slashCommandConverterRouter = new Hono<{ Bindings: Bindings }>();

// POST /api/slash-commands/:id/convert
// Convert a slash command config using pre-computed metadata
// Request body: { "userArguments": "optional arguments" }
// Response: { "convertedContent": "...", "needsUserInput": false, "analysis": {...} }
slashCommandConverterRouter.post('/:id/convert', async (c) => {
  const configId = c.req.param('id');
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track slash command conversion event
  await analytics.trackEvent(c.req.raw, 'slash_command_convert', {
    configName: configId,
  });

  // Get user arguments from request body (handle both JSON and form data)
  let userArguments: string | undefined;
  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    userArguments = body.userArguments;
  } else {
    // Handle form-urlencoded data
    const formData = await c.req.parseBody();
    userArguments = formData.userArguments as string;
  }

  // Initialize provider factory for multi-provider support
  const gatewayToken = c.env.AI_GATEWAY_TOKEN;
  if (!gatewayToken) {
    return c.json({ error: 'AI Gateway not configured' }, 500);
  }

  const factory = new ProviderFactory({
    ACCOUNT_ID: c.env.ACCOUNT_ID,
    GATEWAY_ID: c.env.GATEWAY_ID,
    GATEWAY_TOKEN: gatewayToken,
    AI_PROVIDER: c.env.AI_PROVIDER,
    OPENAI_REASONING_MODE: c.env.OPENAI_REASONING_MODE,
    GEMINI_THINKING_BUDGET: c.env.GEMINI_THINKING_BUDGET ? parseInt(c.env.GEMINI_THINKING_BUDGET) : undefined,
    OPENAI_API_KEY: c.env.OPENAI_API_KEY, // For local dev
    GEMINI_API_KEY: c.env.GEMINI_API_KEY, // For local dev
  });

  const provider = factory.createProvider();
  const analyzer = new SlashCommandAnalyzerService(provider);

  // Initialize services with analyzer for lazy analysis
  const configService = new ConfigService(c.env, analyzer);

  // Get config (will trigger lazy analysis if needed)
  const config = await configService.getConfig(configId);
  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Verify it's a slash command
  if (config.type !== 'slash_command') {
    return c.json({ error: 'Config is not a slash command' }, 400);
  }

  // Create converter service (pass both provider and configService)
  const converterService = new SlashCommandConverterService(provider, configService);

  // Convert the slash command
  try {
    const result = await converterService.convert(config, {
      configId,
      userArguments,
    });

    if (result.needsUserInput) {
      return c.json(
        {
          message: 'User input required',
          convertedContent: result.convertedContent,
          needsUserInput: result.needsUserInput,
          analysis: result.analysis,
        },
        400
      );
    }

    return c.json({
      convertedContent: result.convertedContent,
      needsUserInput: result.needsUserInput,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error('Conversion failed:', error);
    return c.json({ error: 'Conversion failed' }, 500);
  }
});

// GET /api/slash-commands
// List all slash commands with metadata
slashCommandConverterRouter.get('/', async (c) => {
  const configService = new ConfigService(c.env);
  const search = c.req.query('search');
  const configs = await configService.listConfigs({
    type: 'slash_command',
    searchName: search || undefined,
  });

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ configs });
  }

  // For HTML requests, could return a view (not implemented in this checkpoint)
  return c.json({ configs });
});

// GET /api/slash-commands/:id
// Get specific slash command with metadata (triggers lazy analysis if needed)
slashCommandConverterRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  // Initialize provider factory for multi-provider support
  const gatewayToken = c.env.AI_GATEWAY_TOKEN;
  if (!gatewayToken) {
    return c.json({ error: 'AI Gateway not configured' }, 500);
  }

  const factory = new ProviderFactory({
    ACCOUNT_ID: c.env.ACCOUNT_ID,
    GATEWAY_ID: c.env.GATEWAY_ID,
    GATEWAY_TOKEN: gatewayToken,
    AI_PROVIDER: c.env.AI_PROVIDER,
    OPENAI_REASONING_MODE: c.env.OPENAI_REASONING_MODE,
    GEMINI_THINKING_BUDGET: c.env.GEMINI_THINKING_BUDGET ? parseInt(c.env.GEMINI_THINKING_BUDGET) : undefined,
    OPENAI_API_KEY: c.env.OPENAI_API_KEY, // For local dev
    GEMINI_API_KEY: c.env.GEMINI_API_KEY, // For local dev
  });

  const provider = factory.createProvider();
  const analyzer = new SlashCommandAnalyzerService(provider);
  const configService = new ConfigService(c.env, analyzer);

  const config = await configService.getConfig(id);

  if (!config || config.type !== 'slash_command') {
    return c.json({ error: 'Slash command not found' }, 404);
  }

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ config });
  }

  // For HTML requests, could return a view (not implemented in this checkpoint)
  return c.json({ config });
});
