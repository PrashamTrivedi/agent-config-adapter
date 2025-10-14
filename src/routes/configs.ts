import { Hono } from 'hono';
import { ConfigService, ConversionService } from '../services';
import { AgentFormat, CreateConfigInput } from '../domain/types';
import { configListView, configDetailView, configCreateView, configEditView } from '../views/configs';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
};

export const configsRouter = new Hono<{ Bindings: Bindings }>();

// List all configs with optional filters
configsRouter.get('/', async (c) => {
  const service = new ConfigService(c.env);

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

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ configs });
  }

  // Return HTML for browser requests (will be used with HTMX)
  // Pass current filter values to the view
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

  return c.html(configEditView(config));
});

// Get single config
configsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  const config = await service.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

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

  try {
    const result = await service.convertWithMetadata(id, targetFormat);

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
    throw error;
  }
});

// Create new config
configsRouter.post('/', async (c) => {
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
configsRouter.put('/:id', async (c) => {
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
configsRouter.post('/:id/invalidate', async (c) => {
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

// Delete config
configsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const service = new ConfigService(c.env);
  const success = await service.deleteConfig(id);

  if (!success) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json({ success: true });
});
