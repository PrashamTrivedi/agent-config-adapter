import { Hono } from 'hono';
import { ExtensionService, ManifestService, ConfigService } from '../services';
import { CreateExtensionInput, UpdateExtensionInput } from '../domain/types';
import {
  extensionListView,
  extensionDetailView,
  extensionCreateView,
  extensionEditView,
} from '../views/extensions';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
};

export const extensionsRouter = new Hono<{ Bindings: Bindings }>();

// Show create extension form
extensionsRouter.get('/new', async (c) => {
  const configService = new ConfigService(c.env);
  const availableConfigs = await configService.listConfigs();
  const view = extensionCreateView(availableConfigs);
  return c.html(view);
});

// Show edit extension form
extensionsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const extensionService = new ExtensionService(c.env);
  const configService = new ConfigService(c.env);

  const extension = await extensionService.getExtensionWithConfigs(id);
  if (!extension) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  const availableConfigs = await configService.listConfigs();
  const view = extensionEditView(extension, availableConfigs);
  return c.html(view);
});

// List all extensions
extensionsRouter.get('/', async (c) => {
  const service = new ExtensionService(c.env);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    const extensions = await service.listExtensions();
    return c.json({ extensions });
  }

  // For HTML views, get extensions with configs
  const extensions = await service.listExtensionsWithConfigs();
  const view = extensionListView(extensions);
  return c.html(view);
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

  const view = extensionDetailView(extension);
  return c.html(view);
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

    // Handle multiple checkbox values
    let configIds: string[] | undefined;
    if (formData.config_ids) {
      // If multiple checkboxes, parseBody returns an array
      configIds = Array.isArray(formData.config_ids)
        ? formData.config_ids as string[]
        : [formData.config_ids as string];
    }

    body = {
      name: formData.name as string,
      description: (formData.description as string) || undefined,
      author: (formData.author as string) || undefined,
      version: formData.version as string,
      icon_url: (formData.icon_url as string) || undefined,
      config_ids: configIds,
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

  // Check if request expects HTML redirect
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/html')) {
    const allExtensions = await service.listExtensionsWithConfigs();
    const view = extensionListView(allExtensions);
    return c.html(view);
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

// Add single config to extension
extensionsRouter.post('/:id/configs/:configId', async (c) => {
  const id = c.req.param('id');
  const configId = c.req.param('configId');

  const service = new ExtensionService(c.env);

  try {
    await service.addConfigsToExtension(id, [configId]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Add multiple configs to extension (batch operation)
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
