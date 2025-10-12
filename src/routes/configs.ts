import { Hono } from 'hono';
import { ConfigRepository } from '../infrastructure/database';
import { CacheService } from '../infrastructure/cache';
import { getAdapter } from '../adapters';
import { AgentFormat, CreateConfigInput } from '../domain/types';
import { configListView, configDetailView, configCreateView, configEditView } from '../views/configs';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
};

export const configsRouter = new Hono<{ Bindings: Bindings }>();

// List all configs
configsRouter.get('/', async (c) => {
  const repo = new ConfigRepository(c.env.DB);
  const configs = await repo.findAll();

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ configs });
  }

  // Return HTML for browser requests (will be used with HTMX)
  return c.html(configListView(configs));
});

// Route for creating new config (form) - MUST be before /:id route
configsRouter.get('/new', async (c) => {
  return c.html(configCreateView());
});

// Route for editing config (form) - MUST be before /:id route
configsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.findById(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.html(configEditView(config));
});

// Get single config
configsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.findById(id);

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

  const cache = new CacheService(c.env.CONFIG_CACHE);

  // Try cache first
  const cached = await cache.get(id, targetFormat);
  if (cached) {
    return c.json({ content: cached, cached: true, usedAI: true, fallbackUsed: false });
  }

  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.findById(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Use AI-enhanced adapter
  const adapter = getAdapter(config.type, {
    OPENAI_API_KEY: c.env.OPENAI_API_KEY,
    ACCOUNT_ID: c.env.ACCOUNT_ID,
    GATEWAY_ID: c.env.GATEWAY_ID
  });

  // Check if adapter supports AI conversion
  if ('convertWithMetadata' in adapter) {
    const result = await adapter.convertWithMetadata(
      config.content,
      config.original_format,
      targetFormat,
      config.type
    );

    // Cache the result
    await cache.set(id, result.content, targetFormat);

    return c.json({
      content: result.content,
      cached: false,
      usedAI: result.usedAI,
      fallbackUsed: result.fallbackUsed
    });
  } else {
    // Fallback to regular conversion (should not happen if AI binding exists)
    const converted = adapter.convert(
      config.content,
      config.original_format,
      targetFormat,
      config.type
    );

    await cache.set(id, converted, targetFormat);

    return c.json({
      content: converted,
      cached: false,
      usedAI: false,
      fallbackUsed: false
    });
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

  // Validate input
  if (!body.name || !body.type || !body.original_format || !body.content) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.create(body);

  return c.json({ config }, 201);
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

  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.update(id, body);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Invalidate cache
  const cache = new CacheService(c.env.CONFIG_CACHE);
  await cache.invalidate(id);

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
  const cache = new CacheService(c.env.CONFIG_CACHE);
  await cache.invalidate(id);

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

  const repo = new ConfigRepository(c.env.DB);
  const success = await repo.delete(id);

  if (!success) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Invalidate cache
  const cache = new CacheService(c.env.CONFIG_CACHE);
  await cache.invalidate(id);

  return c.json({ success: true });
});
