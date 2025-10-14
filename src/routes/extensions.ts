import { Hono } from 'hono';
import { ExtensionService, ManifestService } from '../services';
import { CreateExtensionInput, UpdateExtensionInput } from '../domain/types';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
};

export const extensionsRouter = new Hono<{ Bindings: Bindings }>();

// List all extensions
extensionsRouter.get('/', async (c) => {
  const service = new ExtensionService(c.env);
  const extensions = await service.listExtensions();

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ extensions });
  }

  // TODO: Return HTML view for browser requests
  return c.json({ extensions });
});

// Get single extension
extensionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ExtensionService(c.env);
  const extension = await service.getExtensionWithConfigs(id);

  if (!extension) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ extension });
  }

  // TODO: Return HTML view for browser requests
  return c.json({ extension });
});

// Get extension manifest in specific format
extensionsRouter.get('/:id/manifest/:format', async (c) => {
  const id = c.req.param('id');
  const format = c.req.param('format') as 'gemini' | 'claude_code';

  if (format !== 'gemini' && format !== 'claude_code') {
    return c.json({ error: 'Invalid format. Must be gemini or claude_code' }, 400);
  }

  const extensionService = new ExtensionService(c.env);
  const manifestService = new ManifestService();

  const extension = await extensionService.getExtensionWithConfigs(id);
  if (!extension) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  try {
    let manifest;
    if (format === 'gemini') {
      manifest = await manifestService.generateGeminiManifest(extension);
    } else {
      manifest = await manifestService.generateClaudeCodePluginManifest(extension);
    }

    return c.json(manifest);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create new extension
extensionsRouter.post('/', async (c) => {
  let body: CreateExtensionInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<CreateExtensionInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      description: formData.description as string,
      author: formData.author as string,
      version: formData.version as string,
      icon_url: formData.icon_url as string,
      config_ids: formData.config_ids ? JSON.parse(formData.config_ids as string) : undefined,
    };
  }

  const service = new ExtensionService(c.env);

  try {
    const extension = await service.createExtension(body);
    return c.json({ extension }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Update extension
extensionsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  let body: UpdateExtensionInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<UpdateExtensionInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      description: formData.description as string,
      author: formData.author as string,
      version: formData.version as string,
      icon_url: formData.icon_url as string,
    };
  }

  const service = new ExtensionService(c.env);
  const extension = await service.updateExtension(id, body);

  if (!extension) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  return c.json({ extension });
});

// Delete extension
extensionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const service = new ExtensionService(c.env);
  const success = await service.deleteExtension(id);

  if (!success) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  return c.json({ success: true });
});

// Get configs for an extension
extensionsRouter.get('/:id/configs', async (c) => {
  const id = c.req.param('id');
  const service = new ExtensionService(c.env);

  try {
    const configs = await service.getExtensionConfigs(id);
    return c.json({ configs });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Add configs to extension
extensionsRouter.post('/:id/configs', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ config_ids: string[] }>();

  if (!body.config_ids || !Array.isArray(body.config_ids)) {
    return c.json({ error: 'config_ids array is required' }, 400);
  }

  const service = new ExtensionService(c.env);

  try {
    await service.addConfigsToExtension(id, body.config_ids);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Remove config from extension
extensionsRouter.delete('/:id/configs/:configId', async (c) => {
  const id = c.req.param('id');
  const configId = c.req.param('configId');

  const service = new ExtensionService(c.env);

  try {
    const success = await service.removeConfigFromExtension(id, configId);
    if (!success) {
      return c.json({ error: 'Config association not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Invalidate extension cache
extensionsRouter.post('/:id/invalidate', async (c) => {
  const id = c.req.param('id');
  const service = new ExtensionService(c.env);

  try {
    await service.invalidateExtensionCache(id);
    return c.json({ success: true, message: 'Extension cache invalidated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
