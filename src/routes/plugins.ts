import { Hono } from 'hono';
import {
  ExtensionService,
  FileGenerationService,
  ZipGenerationService,
  MarketplaceService,
} from '../services';
import { pluginBrowserView } from '../views/plugin-browser';
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

export const pluginsRouter = new Hono<{ Bindings: Bindings }>();

// ===== CORS PREFLIGHT HANDLERS =====
pluginsRouter.options('*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
});

// ===== MARKETPLACE ROUTES (must come before generic extension routes) =====

// Download marketplace Gemini JSON collection (all extension definitions)
pluginsRouter.get('/marketplaces/:marketplaceId/gemini/definition', async (c) => {
  const marketplaceId = c.req.param('marketplaceId');
  const startTime = Date.now();
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track marketplace browse event
  await analytics.trackEvent(c.req.raw, 'marketplace_browse');

  console.log('[Marketplace Gemini] Starting Gemini definition request', {
    marketplaceId,
    timestamp: new Date().toISOString(),
  });

  const marketplaceService = new MarketplaceService(c.env);

  try {
    const marketplace = await marketplaceService.getMarketplaceWithExtensions(marketplaceId);
    if (!marketplace) {
      console.error('[Marketplace Gemini] Marketplace not found', { marketplaceId });
      return c.json(
        {
          error: 'Marketplace not found',
          details: {
            marketplace_id: marketplaceId,
            suggestion: 'Verify the marketplace ID exists',
          },
        },
        404
      );
    }

    console.log('[Marketplace Gemini] Marketplace found, generating manifests', {
      marketplaceId,
      extensionCount: marketplace.extensions.length,
    });

    // Generate Gemini manifests for all extensions
    const { ManifestService } = await import('../services/manifest-service');
    const manifestService = new ManifestService();

    const geminiMarketplace = {
      name: marketplace.name,
      version: marketplace.version,
      description: marketplace.description,
      extensions: await Promise.all(
        marketplace.extensions.map(async (ext) => {
          console.log('[Marketplace Gemini] Generating manifest for extension', {
            extensionId: ext.id,
            extensionName: ext.name,
          });
          return await manifestService.generateGeminiManifest(ext);
        })
      ),
    };

    // Create filename
    const sanitizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const filename = `${sanitizeName(marketplace.name)}-gemini-marketplace.json`;

    const duration = Date.now() - startTime;
    console.log('[Marketplace Gemini] Definition generated successfully', {
      filename,
      extensionCount: geminiMarketplace.extensions.length,
      durationMs: duration,
    });

    return new Response(JSON.stringify(geminiMarketplace, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Marketplace Gemini] Error generating definition', {
      marketplaceId,
      error: error.message,
      stack: error.stack,
      durationMs: duration,
    });

    return c.json(
      {
        error: 'Failed to generate Gemini marketplace definition',
        message: error.message,
        details: {
          marketplace_id: marketplaceId,
          timestamp: new Date().toISOString(),
          duration_ms: duration,
        },
      },
      500
    );
  }
});

// Download marketplace as ZIP (all plugins)
pluginsRouter.get('/marketplaces/:marketplaceId/download', async (c) => {
  const marketplaceId = c.req.param('marketplaceId');
  const format = (c.req.query('format') || 'claude_code') as 'claude_code' | 'gemini';
  const startTime = Date.now();

  console.log('[Marketplace Download] Starting download request', {
    marketplaceId,
    format,
    timestamp: new Date().toISOString(),
  });

  if (format !== 'claude_code' && format !== 'gemini') {
    console.error('[Marketplace Download] Invalid format requested', { format });
    return c.json(
      {
        error: 'Invalid format. Must be claude_code or gemini',
        details: {
          provided_format: format,
          valid_formats: ['claude_code', 'gemini'],
        },
      },
      400
    );
  }

  const marketplaceService = new MarketplaceService(c.env);
  const zipService = new ZipGenerationService(c.env);

  try {
    // Step 1: Get marketplace with extensions
    console.log('[Marketplace Download] Step 1: Fetching marketplace from database', {
      marketplaceId,
    });
    const marketplace = await marketplaceService.getMarketplaceWithExtensions(marketplaceId);

    if (!marketplace) {
      console.error('[Marketplace Download] Marketplace not found', { marketplaceId });
      return c.json(
        {
          error: 'Marketplace not found',
          details: {
            marketplace_id: marketplaceId,
            step: 'database_fetch',
            suggestion: 'Verify the marketplace ID exists in the database',
          },
        },
        404
      );
    }

    console.log('[Marketplace Download] Marketplace fetched successfully', {
      marketplaceId,
      name: marketplace.name,
      extensionCount: marketplace.extensions.length,
      extensions: marketplace.extensions.map((e) => ({ id: e.id, name: e.name })),
    });

    // Step 2: Generate ZIP containing all plugins
    console.log('[Marketplace Download] Step 2: Generating ZIP archive', {
      format,
      extensionCount: marketplace.extensions.length,
    });

    const zipData = await zipService.generateMarketplaceZip(marketplace, format);
    const filename = zipService.getZipFilename(marketplace.name, format, 'marketplace');

    const duration = Date.now() - startTime;
    console.log('[Marketplace Download] ZIP generated successfully', {
      filename,
      sizeBytes: zipData.length,
      durationMs: duration,
    });

    // Return ZIP with proper headers
    return new Response(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Marketplace Download] Error occurred', {
      marketplaceId,
      format,
      error: error.message,
      stack: error.stack,
      durationMs: duration,
    });

    return c.json(
      {
        error: 'Failed to generate marketplace ZIP',
        message: error.message,
        details: {
          marketplace_id: marketplaceId,
          format,
          step: 'zip_generation',
          timestamp: new Date().toISOString(),
          duration_ms: duration,
        },
        troubleshooting: {
          check_logs: 'Review server logs for detailed error information',
          verify_extensions: 'Ensure all extensions in marketplace have valid configs',
          check_r2: 'Verify R2 bucket (EXTENSION_FILES) is accessible',
        },
      },
      500
    );
  }
});

// ===== EXTENSION ROUTES =====

// Download Gemini JSON definition (manifest only) - must come before /:extensionId/:format
pluginsRouter.get('/:extensionId/gemini/definition', async (c) => {
  const extensionId = c.req.param('extensionId');
  const extensionService = new ExtensionService(c.env);

  try {
    const extension = await extensionService.getExtensionWithConfigs(extensionId);
    if (!extension) {
      return c.json({ error: 'Extension not found' }, 404);
    }

    // Generate Gemini manifest using ManifestService
    const { ManifestService } = await import('../services/manifest-service');
    const manifestService = new ManifestService();
    const manifest = await manifestService.generateGeminiManifest(extension);

    // Create filename
    const sanitizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const filename = `${sanitizeName(extension.name)}-gemini.json`;

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Download complete plugin as ZIP - must come before /:extensionId/:format
pluginsRouter.get('/:extensionId/:format/download', async (c) => {
  const extensionId = c.req.param('extensionId');
  const format = c.req.param('format') as 'claude_code' | 'gemini';
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track extension download event
  await analytics.trackEvent(c.req.raw, 'extension_download', {
    configFormat: format as any,
  });

  if (format !== 'claude_code' && format !== 'gemini') {
    return c.json({ error: 'Invalid format. Must be claude_code or gemini' }, 400);
  }

  const extensionService = new ExtensionService(c.env);
  const zipService = new ZipGenerationService(c.env);

  try {
    // Get extension
    const extension = await extensionService.getExtensionWithConfigs(extensionId);
    if (!extension) {
      return c.json({ error: 'Extension not found' }, 404);
    }

    // Generate ZIP
    const zipData = await zipService.generatePluginZip(extension, format);
    const filename = zipService.getZipFilename(extension.name, format, 'plugin');

    // Return ZIP with proper headers
    return new Response(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Serve individual plugin files (wildcard route) - must come before /:extensionId/:format
pluginsRouter.get('/:extensionId/:format/*', async (c) => {
  const extensionId = c.req.param('extensionId');
  const format = c.req.param('format') as 'claude_code' | 'gemini';
  const filePath = c.req.param('*'); // Everything after format/

  if (format !== 'claude_code' && format !== 'gemini') {
    return c.json({ error: 'Invalid format. Must be claude_code or gemini' }, 400);
  }

  // Remove 'download' from path if present (to avoid conflict with download route)
  if (filePath === 'download') {
    return c.json({ error: 'Invalid file path' }, 400);
  }

  const extensionService = new ExtensionService(c.env);
  const fileGenService = new FileGenerationService(c.env);

  try {
    // Get extension
    const extension = await extensionService.getExtensionWithConfigs(extensionId);
    if (!extension) {
      return c.json({ error: 'Extension not found' }, 404);
    }

    // Ensure files are generated
    const hasFiles = await fileGenService.hasGeneratedFiles(extensionId, format);
    if (!hasFiles) {
      await fileGenService.generateExtensionFiles(extension, format);
    }

    // Get file info
    const files = await fileGenService.getGeneratedFiles(extensionId, format);
    const fileInfo = files.find((f) => f.path === filePath);

    if (!fileInfo) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Fetch file from R2
    const r2Bucket = c.env.EXTENSION_FILES;
    const object = await r2Bucket.get(fileInfo.r2Key);

    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }

    // Return file with proper content type
    return new Response(object.body, {
      headers: {
        'Content-Type': fileInfo.mimeType || 'application/octet-stream',
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Invalidate/regenerate plugin files
pluginsRouter.post('/:extensionId/:format/invalidate', async (c) => {
  const extensionId = c.req.param('extensionId');
  const format = c.req.param('format') as 'claude_code' | 'gemini';

  if (format !== 'claude_code' && format !== 'gemini') {
    return c.json({ error: 'Invalid format. Must be claude_code or gemini' }, 400);
  }

  const fileGenService = new FileGenerationService(c.env);

  try {
    await fileGenService.deleteExtensionFiles(extensionId, format);
    return c.json({ success: true, message: `Plugin files invalidated for ${format} format` });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Serve plugin directory listing (browsable file explorer)
pluginsRouter.get('/:extensionId/:format', async (c) => {
  const extensionId = c.req.param('extensionId');
  const format = c.req.param('format') as 'claude_code' | 'gemini';
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Track plugin browse event
  await analytics.trackEvent(c.req.raw, 'plugin_browse', {
    configFormat: format as any,
  });

  if (format !== 'claude_code' && format !== 'gemini') {
    return c.json({ error: 'Invalid format. Must be claude_code or gemini' }, 400);
  }

  const extensionService = new ExtensionService(c.env);
  const fileGenService = new FileGenerationService(c.env);

  try {
    // Get extension
    const extension = await extensionService.getExtensionWithConfigs(extensionId);
    if (!extension) {
      return c.json({ error: 'Extension not found' }, 404);
    }

    // Ensure files are generated (lazy generation)
    const hasFiles = await fileGenService.hasGeneratedFiles(extensionId, format);
    if (!hasFiles) {
      await fileGenService.generateExtensionFiles(extension, format);
    }

    // Get file list
    const files = await fileGenService.getGeneratedFiles(extensionId, format);

    // Check if requesting JSON or HTML
    const accept = c.req.header('Accept') || '';
    if (accept.includes('application/json')) {
      return c.json({ extension, format, files });
    }

    // Return HTML file browser view
    const baseUrl = new URL(c.req.url).origin;
    const view = pluginBrowserView(extension, format, files, baseUrl);
    return c.html(view);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
