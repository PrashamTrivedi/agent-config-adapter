import { Hono } from 'hono';
import { configsRouter } from './routes/configs';
import { extensionsRouter } from './routes/extensions';
import { marketplacesRouter } from './routes/marketplaces';
import { skillsRouter } from './routes/skills';
import { filesRouter } from './routes/files';
import { pluginsRouter } from './routes/plugins';
import { slashCommandConverterRouter } from './routes/slash-command-converter';
import { subscriptionsRouter } from './routes/subscriptions';
import { syncRouter } from './routes/sync';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { handleMCPStreamable } from './mcp/transport';
import { createMCPServer } from './mcp/server';
import { validateMCPAdminToken } from './mcp/auth';
import { mcpOAuthRouter, getOAuthMetadata } from './mcp/oauth';
import { verifyAccessToken } from './mcp/oauth/jwt';
import { ApiKeyService } from './services/api-key-service';
import type { AnalyticsEngineDataset } from './domain/types';
import { AnalyticsService } from './services/analytics-service';
import { utmPersistenceMiddleware } from './middleware/utm-persistence';
import { sessionMiddleware } from './auth/session-middleware';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  OAUTH_TOKENS: KVNamespace; // OAuth auth codes and refresh tokens

  // Cloudflare Configuration
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string; // BYOK authentication token

  // Multi-Provider Configuration
  AI_PROVIDER?: 'openai' | 'gemini' | 'auto';
  OPENAI_REASONING_MODE?: 'high' | 'medium' | 'low' | 'minimal';
  GEMINI_THINKING_BUDGET?: string;

  // API Keys for Local Development (still routes through AI Gateway)
  OPENAI_API_KEY?: string; // For local dev
  GEMINI_API_KEY?: string; // For local dev

  // Email Configuration
  EMAIL_API_KEY: string; // Custom email service API key
  ADMIN_EMAIL: string;

  // MCP Admin Token (SHA-256 hash)
  // Temporary security measure until full user auth is implemented
  MCP_ADMIN_TOKEN_HASH?: string;

  // Better Auth Configuration
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  JWT_SECRET?: string;

  // Analytics Configuration
  ANALYTICS?: AnalyticsEngineDataset; // Workers Analytics Engine dataset
  WEB_ANALYTICS_TOKEN?: string; // Web Analytics beacon token
};

const app = new Hono<{ Bindings: Bindings }>();

// UTM persistence middleware - captures first-touch attribution from marketing links
// This runs on all requests to set/read UTM cookies for journey tracking
app.use('*', utmPersistenceMiddleware);

// Session middleware - attaches user session to context on all requests
app.use('*', sessionMiddleware);

// Landing analytics is recorded by the TanStack Start home route via /api/analytics/track

// Mount Better Auth API routes (with login analytics)
app.route('/api/auth', authRouter);

// Profile + REST APIs (JSON only; HTML is served by TanStack Start)
app.route('/api/profile', profileRouter);
app.route('/api/configs', configsRouter);
app.route('/api/extensions', extensionsRouter);
app.route('/api/marketplaces', marketplacesRouter);
app.route('/api/skills', skillsRouter);
app.route('/api/files', filesRouter);
app.route('/api/slash-commands', slashCommandConverterRouter);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/sync', syncRouter);

app.post('/api/analytics/track', async (c) => {
  try {
    const analytics = new AnalyticsService(c.env.ANALYTICS);
    const { event, metadata } = await c.req.json();
    await analytics.trackEvent(c.req.raw, event, metadata);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false }, 500);
  }
});

app.get('/api/mcp/info', (c) => {
  return c.json(buildMcpInfo(c.req.url, !!c.get('userId')));
});

// Plugin file serving / downloads / JSON browse
app.route('/plugins', pluginsRouter);

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json(getOAuthMetadata(baseUrl));
});

// MCP OAuth 2.0 endpoints
app.route('/mcp/oauth', mcpOAuthRouter);

// MCP Server endpoints

// CORS preflight for MCP endpoints (required for MCP Inspector and other clients)
// CORS headers for MCP endpoints
const mcpCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

app.options('/mcp', (c) => {
  return new Response(null, { status: 204, headers: mcpCorsHeaders });
});

app.options('/mcp/admin', (c) => {
  return new Response(null, { status: 204, headers: mcpCorsHeaders });
});

// MCP server (full access for authenticated users, read-only for anonymous)
app.post('/mcp', async (c) => {
  // Check if user is authenticated via session
  const userId = c.get('userId');

  // Authenticated users get full access, anonymous users get read-only
  const accessLevel = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env, accessLevel, userId || undefined);

  return handleMCPStreamable(c, server);
});

// Admin MCP server (full access, token-protected)
// NOTE: This endpoint is UNDOCUMENTED and SECRET (not shown in /mcp/info)
// Supports multiple auth methods: admin token, JWT, or API key
app.post('/mcp/admin', async (c) => {
  let userId: string | undefined;
  let isAuthorized = false;

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (token) {
    // Try admin token hash first (legacy auth)
    const isAdminToken = await validateMCPAdminToken(c.req.raw, c.env.MCP_ADMIN_TOKEN_HASH);
    if (isAdminToken) {
      isAuthorized = true;
      // Admin token doesn't have user context - use session userId if available
      userId = c.get('userId') || undefined;
    }

    // Try JWT access token
    if (!isAuthorized) {
      const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;
      if (jwtSecret) {
        const payload = await verifyAccessToken(token, jwtSecret);
        if (payload) {
          isAuthorized = true;
          userId = payload.sub;
        }
      }
    }

    // Try API key
    if (!isAuthorized && token.startsWith('aca_')) {
      const apiKeyService = new ApiKeyService(c.env.DB);
      const result = await apiKeyService.validate(token);
      if (result) {
        isAuthorized = true;
        userId = result.userId;
      }
    }
  }

  if (!isAuthorized) {
    return c.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Unauthorized: Valid admin token, JWT, or API key required'
        }
      },
      401
    );
  }

  const server = createMCPServer(c.env, 'full', userId);
  return handleMCPStreamable(c, server);
});

// MCP Server info endpoint
// JSON only. Browser UI lives at the TanStack Start /mcp/info route.
app.get('/mcp/info', (c) => {
  return c.json(buildMcpInfo(c.req.url, !!c.get('userId')));
});

function buildMcpInfo(requestUrl: string, isAuthenticated: boolean) {
  const endpointUrl = requestUrl.replace('/mcp/info', '') + '/mcp';
  if (isAuthenticated) {
    return {
      name: 'agent-config-adapter',
      version: '1.0.0',
      description: 'Universal configuration adapter for AI coding agents',
      transport: 'streamable-http',
      endpoint: '/mcp',
      access: 'Authenticated - Full Access',
      capabilities: {
        tools: [
          'get_config - Get a single configuration by ID',
          'create_config - Create a new configuration',
          'update_config - Update an existing configuration',
          'delete_config - Delete a configuration',
          'convert_config - Convert configuration between formats',
          'invalidate_cache - Invalidate cached conversions'
        ],
        resources: [
          'config://list - List all configurations from database',
          'config://{id} - Get a specific configuration',
          'config://{id}/cached/{format} - Get cached conversion'
        ],
        prompts: [
          'migrate_config_format - Migrate configurations between formats',
          'batch_convert - Batch convert multiple configurations',
          'sync_config_versions - Sync configurations across formats'
        ]
      },
      usage: {
        connection: 'POST requests to /mcp endpoint with session cookie',
        authentication: 'Automatic via browser session (OAuth)',
        example_client_config: {
          mcpServers: {
            'agent-config-adapter': {
              type: 'http',
              url: endpointUrl
            }
          }
        }
      },
      documentation: {
        access_level: 'Full access (authenticated user)',
        resources_behavior: 'Resources provide context data for AI agents',
        tools_behavior: 'All CRUD operations available for authenticated users'
      }
    };
  }

  return {
    name: 'agent-config-adapter',
    version: '1.0.0',
    description: 'Universal configuration adapter for AI coding agents',
    transport: 'streamable-http',
    endpoint: '/mcp',
    access: 'Public read-only',
    capabilities: {
      tools: [
        'get_config - Get a single configuration by ID'
      ],
      resources: [
        'config://list - List all configurations from database'
      ],
      prompts: [] as string[]
    },
    usage: {
      connection: 'POST requests to /mcp endpoint (no authentication required)',
      authentication: 'None (read-only access)',
      example_client_config: {
        mcpServers: {
          'agent-config-adapter': {
            type: 'http',
            url: endpointUrl
          }
        }
      }
    },
    documentation: {
      access_level: 'Public read-only access (no write operations)',
      resources_behavior: 'Resources provide context data for AI agents',
      tools_behavior: 'Only read operations are available. Sign in for full access.'
    }
  };
}

export default app;
