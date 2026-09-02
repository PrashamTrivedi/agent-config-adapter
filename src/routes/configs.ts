import { Hono } from 'hono';
import { ConfigService, ConversionService } from '../services';
import { AgentFormat, CreateConfigInput } from '../domain/types';
import { ProviderFactory, type ProviderType } from '../infrastructure/ai/provider-factory';
import type { OpenAIReasoningMode } from '../infrastructure/ai/openai-provider';
import { SlashCommandAnalyzerService } from '../services/slash-command-analyzer-service';
import { requireOwnership, getIdFromParams } from '../middleware/ownership';
import { requireAuth } from '../auth/session-middleware';
import { AnalyticsService } from '../services/analytics-service';
import type { AnalyticsEngineDataset } from '../domain/types';
import '../auth/types';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string; // BYOK gateway token
  AI_PROVIDER?: ProviderType;
  OPENAI_REASONING_MODE?: OpenAIReasoningMode;
  GEMINI_THINKING_BUDGET?: string; // String because env vars are strings
  OPENAI_API_KEY?: string; // For local dev
  GEMINI_API_KEY?: string; // For local dev
  ANALYTICS?: AnalyticsEngineDataset;
};

export const configsRouter = new Hono<{ Bindings: Bindings }>();

// List all configs with optional filters
configsRouter.get('/', async (c) => {
  const service = new ConfigService(c.env);
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track configs browse event
  await analytics.trackEvent(c.req.raw, 'configs_browse', {
    onboardingICP: c.req.query('icp') as any,
  });

  // Extract filter query parameters
  const type = c.req.query('type');
  const format = c.req.query('format');
  const search = c.req.query('search');

  // Build filters object
  const filters: {
    type?: string;
    originalFormat?: string;
    searchName?: string;
  } = {};

  if (type) filters.type = type;
  if (format) filters.originalFormat = format;
  if (search) filters.searchName = search;

  const configs = await service.listConfigs(Object.keys(filters).length > 0 ? filters : undefined);
  return c.json({ configs });
});

// Get single config
configsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  const config = await service.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Redirect skills to their specialized view
  if (config.type === 'skill') {
    return c.redirect(`/skills/${id}`);
  }

  // Track config view event
  await analytics.trackEvent(c.req.raw, 'config_view', {
    configFormat: config.original_format,
    configType: config.type,
    configName: config.name,
  });

  return c.json({ config });
});

// Get config in specific format
configsRouter.get('/:id/format/:format', async (c) => {
  const id = c.req.param('id');
  const targetFormat = c.req.param('format') as AgentFormat;

  const service = new ConversionService(c.env);
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  try {
    const result = await service.convertWithMetadata(id, targetFormat);

    // Track config conversion event
    const configService = new ConfigService(c.env);
    const config = await configService.getConfig(id);
    if (config) {
      await analytics.trackEvent(c.req.raw, 'config_conversion', {
        configFormat: targetFormat,
        configType: config.type,
        configName: config.name,
        conversionTarget: targetFormat,
      });
    }

    return c.json({
      content: result.content,
      cached: result.cached,
      usedAI: result.usedAI,
      fallbackUsed: result.fallbackUsed
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ error: 'Config not found' }, 404);
    }
    // Skills cannot be converted between formats
    if (error.message.includes('Skills cannot be converted')) {
      return c.json({
        error: 'Skills cannot be converted between formats',
        message: 'Skills are format-specific and must be used in their original format'
      }, 400);
    }
    throw error;
  }
});

// Create new config (requires authentication)
configsRouter.post('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  let body: CreateConfigInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<CreateConfigInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      type: formData.type as any,
      original_format: formData.original_format as any,
      content: formData.content as string,
    };
  }

  // Attach user_id to the input
  body.user_id = userId || undefined;

  const service = new ConfigService(c.env);

  try {
    const config = await service.createConfig(body);
    return c.json({ config }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Update config (requires authentication and ownership)
configsRouter.put('/:id', requireAuth, requireOwnership('config', getIdFromParams), async (c) => {
  const id = c.req.param('id');
  let body;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      type: formData.type as any,
      original_format: formData.original_format as any,
      content: formData.content as string,
    };
  }

  const service = new ConfigService(c.env);
  const config = await service.updateConfig(id, body);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json({ config });
});

// Manual cache invalidation (requires authentication and ownership)
configsRouter.post('/:id/invalidate', requireAuth, requireOwnership('config', getIdFromParams), async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  await service.invalidateCache(id);

  return c.json({ success: true, message: 'Cache invalidated' });
});

// Refresh analysis for slash commands (requires authentication and ownership)
configsRouter.post('/:id/refresh-analysis', requireAuth, requireOwnership('config', getIdFromParams), async (c) => {
  const id = c.req.param('id');

  // Initialize analyzer with ProviderFactory
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
    OPENAI_API_KEY: c.env.OPENAI_API_KEY,
    GEMINI_API_KEY: c.env.GEMINI_API_KEY,
  });
  const provider = factory.createProvider();
  const analyzer = new SlashCommandAnalyzerService(provider);
  const configService = new ConfigService(c.env, analyzer);

  const config = await configService.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  if (config.type !== 'slash_command') {
    return c.json({ error: 'Config is not a slash command' }, 400);
  }

  try {
    // Run analysis
    const analysis = await analyzer.analyze(config.content);

    // Update config with fresh analysis
    await configService.updateConfig(id, { content: config.content });

    return c.json({
      success: true,
      message: 'Analysis refreshed',
      analysis
    });
  } catch (error) {
    console.error('Analysis refresh failed:', error);
    return c.json({ error: 'Analysis refresh failed' }, 500);
  }
});

// Delete config (requires authentication and ownership)
configsRouter.delete('/:id', requireAuth, requireOwnership('config', getIdFromParams), async (c) => {
  const id = c.req.param('id');

  const service = new ConfigService(c.env);
  const success = await service.deleteConfig(id);

  if (!success) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json({ success: true });
});
