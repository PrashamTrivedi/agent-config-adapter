import { Hono } from 'hono';
import { ConfigService } from '../services/config-service';
import { SlashCommandConverterService } from '../services/slash-command-converter-service';
import { SlashCommandAnalyzerService } from '../services/slash-command-analyzer-service';
import { AIConverterService } from '../infrastructure/ai-converter';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
};

export const slashCommandConverterRouter = new Hono<{ Bindings: Bindings }>();

// POST /api/slash-commands/:id/convert
// Convert a slash command config using pre-computed metadata
// Request body: { "userArguments": "optional arguments" }
// Response: { "convertedContent": "...", "needsUserInput": false, "analysis": {...} }
slashCommandConverterRouter.post('/:id/convert', async (c) => {
  const configId = c.req.param('id');

  // Get user arguments from request body
  const body = await c.req.json().catch(() => ({}));
  const userArguments = body.userArguments;

  // Initialize AI services
  const apiKey = c.env.OPENAI_API_KEY || '';
  const accountId = c.env.ACCOUNT_ID;
  const gatewayId = c.env.GATEWAY_ID;
  const aiGatewayToken = c.env.AI_GATEWAY_TOKEN;

  const aiConverter = new AIConverterService(apiKey, accountId, gatewayId, aiGatewayToken);
  const analyzer = new SlashCommandAnalyzerService(aiConverter);

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

  // Create converter service (aiConverter already initialized above)
  const converterService = new SlashCommandConverterService(aiConverter);

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

  // Filter for slash_command type
  const configs = await configService.listConfigs({ type: 'slash_command' });

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

  // Initialize analyzer for lazy analysis
  const apiKey = c.env.OPENAI_API_KEY || '';
  const accountId = c.env.ACCOUNT_ID;
  const gatewayId = c.env.GATEWAY_ID;
  const aiGatewayToken = c.env.AI_GATEWAY_TOKEN;

  const aiConverter = new AIConverterService(apiKey, accountId, gatewayId, aiGatewayToken);
  const analyzer = new SlashCommandAnalyzerService(aiConverter);
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
