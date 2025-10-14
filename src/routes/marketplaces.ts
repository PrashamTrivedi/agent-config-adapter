import { Hono } from 'hono';
import { MarketplaceService, ManifestService } from '../services';
import { CreateMarketplaceInput, UpdateMarketplaceInput } from '../domain/types';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
};

export const marketplacesRouter = new Hono<{ Bindings: Bindings }>();

// List all marketplaces
marketplacesRouter.get('/', async (c) => {
  const service = new MarketplaceService(c.env);
  const marketplaces = await service.listMarketplaces();

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ marketplaces });
  }

  // TODO: Return HTML view for browser requests
  return c.json({ marketplaces });
});

// Get single marketplace
marketplacesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new MarketplaceService(c.env);
  const marketplace = await service.getMarketplaceWithExtensions(id);

  if (!marketplace) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ marketplace });
  }

  // TODO: Return HTML view for browser requests
  return c.json({ marketplace });
});

// Get marketplace manifest (Claude Code format only)
marketplacesRouter.get('/:id/manifest', async (c) => {
  const id = c.req.param('id');

  const marketplaceService = new MarketplaceService(c.env);
  const manifestService = new ManifestService();

  const marketplace = await marketplaceService.getMarketplaceWithExtensions(id);
  if (!marketplace) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  try {
    const manifest = await manifestService.generateClaudeCodeMarketplaceManifest(marketplace);
    return c.json(manifest);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create new marketplace
marketplacesRouter.post('/', async (c) => {
  let body: CreateMarketplaceInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<CreateMarketplaceInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      description: formData.description as string,
      owner_name: formData.owner_name as string,
      owner_email: formData.owner_email as string,
      version: formData.version as string,
      homepage: formData.homepage as string,
      repository: formData.repository as string,
      extension_ids: formData.extension_ids
        ? JSON.parse(formData.extension_ids as string)
        : undefined,
    };
  }

  const service = new MarketplaceService(c.env);

  try {
    const marketplace = await service.createMarketplace(body);
    return c.json({ marketplace }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Update marketplace
marketplacesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  let body: UpdateMarketplaceInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<UpdateMarketplaceInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      description: formData.description as string,
      owner_name: formData.owner_name as string,
      owner_email: formData.owner_email as string,
      version: formData.version as string,
      homepage: formData.homepage as string,
      repository: formData.repository as string,
    };
  }

  const service = new MarketplaceService(c.env);
  const marketplace = await service.updateMarketplace(id, body);

  if (!marketplace) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  return c.json({ marketplace });
});

// Delete marketplace
marketplacesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const service = new MarketplaceService(c.env);
  const success = await service.deleteMarketplace(id);

  if (!success) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  return c.json({ success: true });
});

// Add extensions to marketplace
marketplacesRouter.post('/:id/extensions', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ extension_ids: string[] }>();

  if (!body.extension_ids || !Array.isArray(body.extension_ids)) {
    return c.json({ error: 'extension_ids array is required' }, 400);
  }

  const service = new MarketplaceService(c.env);

  try {
    await service.addExtensionsToMarketplace(id, body.extension_ids);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Remove extension from marketplace
marketplacesRouter.delete('/:id/extensions/:extensionId', async (c) => {
  const id = c.req.param('id');
  const extensionId = c.req.param('extensionId');

  const service = new MarketplaceService(c.env);

  try {
    const success = await service.removeExtensionFromMarketplace(id, extensionId);
    if (!success) {
      return c.json({ error: 'Extension association not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Invalidate marketplace cache
marketplacesRouter.post('/:id/invalidate', async (c) => {
  const id = c.req.param('id');
  const service = new MarketplaceService(c.env);

  try {
    await service.invalidateMarketplaceCache(id);
    return c.json({ success: true, message: 'Marketplace cache invalidated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
