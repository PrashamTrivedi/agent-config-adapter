import { Hono } from 'hono';
import { ConfigService, ConversionService } from '../services';
import { AgentFormat, CreateConfigInput } from '../domain/types';
import { configListView, configListContainerPartial, configDetailView, configCreateView, configEditView } from '../views/configs';
import { ProviderFactory, type ProviderType } from '../infrastructure/ai/provider-factory';
import type { OpenAIReasoningMode } from '../infrastructure/ai/openai-provider';
import type { GeminiThinkingBudget } from '../infrastructure/ai/gemini-provider';
import { SlashCommandAnalyzerService } from '../services/slash-command-analyzer-service';
import { lockdownMiddleware } from '../middleware/lockdown';
import { AnalyticsService } from '../services/analytics-service';
import type { AnalyticsEngineDataset } from '../domain/types';

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

  // Check if this is an HTMX request (partial update)
  const isHtmxRequest = c.req.header('HX-Request') === 'true';
  const hasActiveFilters = !!(type || format || search);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ configs });
  }

  // Return partial HTML for HTMX requests
  if (isHtmxRequest) {
    return c.html(configListContainerPartial(configs, hasActiveFilters));
  }

  // Return full HTML page for initial page load
  return c.html(configListView(configs, { type, format, search }));
});

// Route for creating new config (form) - MUST be before /:id route
configsRouter.get('/new', async (c) => {
  return c.html(configCreateView());
});

// Route for editing config (form) - MUST be before /:id route
configsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  const config = await service.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Redirect skills to their specialized editor
  if (config.type === 'skill') {
    return c.redirect(`/skills/${id}/edit`);
  }

  return c.html(configEditView(config));
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

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ config });
  }

  return c.html(configDetailView(config));
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

// Create new config
configsRouter.post('/', lockdownMiddleware, async (c) => {
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

  const service = new ConfigService(c.env);

  try {
    const config = await service.createConfig(body);
    return c.json({ config }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Update config
configsRouter.put('/:id', lockdownMiddleware, async (c) => {
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

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ config });
  }

  // Redirect to detail view after edit
  return c.redirect(`/configs/${id}`);
});

// Manual cache invalidation
configsRouter.post('/:id/invalidate', lockdownMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  await service.invalidateCache(id);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ success: true, message: 'Cache invalidated' });
  }

  // For HTMX: return success message
  return c.html('<p style="color: #4caf50; font-size: 0.875em;">✓ Cache invalidated successfully. Conversions will be re-processed.</p>');
});

// Refresh analysis for slash commands
configsRouter.post('/:id/refresh-analysis', lockdownMiddleware, async (c) => {
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

    // Check if request wants HTML (from HTMX) or JSON (from API)
    const accept = c.req.header('Accept') || '';
    const wantsHtml = accept.includes('text/html') || c.req.header('HX-Request') === 'true';

    if (wantsHtml) {
      return c.html(`
        <p style="color: #4caf50; font-size: 0.875em;">
          ✓ Analysis refreshed successfully.
          Detected: ${analysis.hasArguments ? 'Arguments required' : 'No arguments'},
          ${analysis.agentReferences.length} agent(s),
          ${analysis.skillReferences.length} skill(s)
        </p>
      `);
    }

    return c.json({
      success: true,
      message: 'Analysis refreshed',
      analysis
    });
  } catch (error) {
    console.error('Analysis refresh failed:', error);

    const accept = c.req.header('Accept') || '';
    const wantsHtml = accept.includes('text/html') || c.req.header('HX-Request') === 'true';

    if (wantsHtml) {
      return c.html(
        '<p style="color: var(--danger);">Analysis refresh failed. Please try again.</p>',
        500
      );
    }

    return c.json({ error: 'Analysis refresh failed' }, 500);
  }
});

// Delete config
configsRouter.delete('/:id', lockdownMiddleware, async (c) => {
  const id = c.req.param('id');

  const service = new ConfigService(c.env);
  const success = await service.deleteConfig(id);

  if (!success) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json({ success: true });
});
