import { Hono } from 'hono';
import { MarketplaceService, ManifestService, ExtensionService } from '../services';
import { CreateMarketplaceInput, UpdateMarketplaceInput } from '../domain/types';
import {
  marketplaceListView,
  marketplaceDetailView,
  marketplaceCreateView,
  marketplaceEditView,
} from '../views/marketplaces';
import { lockdownMiddleware } from '../middleware/lockdown';
import { AnalyticsService } from '../services/analytics-service';
import type { AnalyticsEngineDataset } from '../domain/types';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  ANALYTICS?: AnalyticsEngineDataset;
};

export const marketplacesRouter = new Hono<{ Bindings: Bindings }>();

// Show create marketplace form
marketplacesRouter.get('/new', async (c) => {
  const extensionService = new ExtensionService(c.env);
  const availableExtensions = await extensionService.listExtensionsWithConfigs();
  const view = marketplaceCreateView(availableExtensions);
  return c.html(view);
});

// Show edit marketplace form
marketplacesRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const marketplaceService = new MarketplaceService(c.env);
  const extensionService = new ExtensionService(c.env);

  const marketplace = await marketplaceService.getMarketplaceWithExtensions(id);
  if (!marketplace) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  const availableExtensions = await extensionService.listExtensionsWithConfigs();
  const view = marketplaceEditView(marketplace, availableExtensions);
  return c.html(view);
});

// List all marketplaces
marketplacesRouter.get('/', async (c) => {
  const service = new MarketplaceService(c.env);
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track marketplace browse event
  await analytics.trackPageView(c.req.raw);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    const marketplaces = await service.listMarketplaces();
    return c.json({ marketplaces });
  }

  // For HTML views, get marketplaces with extensions
  const marketplaces = await service.listMarketplacesWithExtensions();
  const view = marketplaceListView(marketplaces);
  return c.html(view);
});

// Get single marketplace
marketplacesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new MarketplaceService(c.env);
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  const marketplace = await service.getMarketplaceWithExtensions(id);

  if (!marketplace) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  // Track marketplace view event
  await analytics.trackEvent(c.req.raw, 'marketplace_browse');

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ marketplace });
  }

  // Extract origin from request URL for server-side rendering
  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;

  const view = marketplaceDetailView(marketplace, origin);
  return c.html(view);
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
    // Get base URL for HTTP plugin sources
    const baseUrl = new URL(c.req.url).origin;
    const manifest = await manifestService.generateClaudeCodeMarketplaceManifestWithUrls(
      marketplace,
      baseUrl
    );

    // Check if requesting raw/text format for easy copying
    const accept = c.req.header('Accept') || '';
    const format = c.req.query('format');

    if (format === 'text' || accept.includes('text/plain')) {
      // Return as formatted JSON text for easy copy-paste
      return c.text(JSON.stringify(manifest, null, 2), 200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${marketplace.name}-marketplace.json"`,
      });
    }

    return c.json(manifest);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create new marketplace
marketplacesRouter.post('/', lockdownMiddleware, async (c) => {
  let body: CreateMarketplaceInput;

  // Handle both JSON and form data
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<CreateMarketplaceInput>();
  } else {
    // Parse form data
    const formData = await c.req.parseBody();

    // Handle multiple checkbox values
    let extensionIds: string[] | undefined;
    if (formData.extension_ids) {
      // If multiple checkboxes, parseBody returns an array
      extensionIds = Array.isArray(formData.extension_ids)
        ? formData.extension_ids as string[]
        : [formData.extension_ids as string];
    }

    body = {
      name: formData.name as string,
      description: (formData.description as string) || undefined,
      owner_name: formData.owner_name as string,
      owner_email: (formData.owner_email as string) || undefined,
      version: formData.version as string,
      homepage: (formData.homepage as string) || undefined,
      repository: (formData.repository as string) || undefined,
      extension_ids: extensionIds,
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
marketplacesRouter.put('/:id', lockdownMiddleware, async (c) => {
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
marketplacesRouter.delete('/:id', lockdownMiddleware, async (c) => {
  const id = c.req.param('id');

  const service = new MarketplaceService(c.env);
  const success = await service.deleteMarketplace(id);

  if (!success) {
    return c.json({ error: 'Marketplace not found' }, 404);
  }

  // Check if request expects HTML redirect
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/html')) {
    const allMarketplaces = await service.listMarketplacesWithExtensions();
    const view = marketplaceListView(allMarketplaces);
    return c.html(view);
  }

  return c.json({ success: true });
});

// Add single extension to marketplace
marketplacesRouter.post('/:id/extensions/:extensionId', lockdownMiddleware, async (c) => {
  const id = c.req.param('id');
  const extensionId = c.req.param('extensionId');

  const service = new MarketplaceService(c.env);

  try {
    await service.addExtensionsToMarketplace(id, [extensionId]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Add multiple extensions to marketplace (batch operation)
marketplacesRouter.post('/:id/extensions', lockdownMiddleware, async (c) => {
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
marketplacesRouter.delete('/:id/extensions/:extensionId', lockdownMiddleware, async (c) => {
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
marketplacesRouter.post('/:id/invalidate', lockdownMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new MarketplaceService(c.env);

  try {
    await service.invalidateMarketplaceCache(id);
    return c.json({ success: true, message: 'Marketplace cache invalidated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
