import { Hono } from 'hono';
import { configsRouter } from './routes/configs';
import { extensionsRouter } from './routes/extensions';
import { marketplacesRouter } from './routes/marketplaces';
import { skillsRouter } from './routes/skills';
import { filesRouter } from './routes/files';
import { pluginsRouter } from './routes/plugins';
import { slashCommandConverterRouter } from './routes/slash-command-converter';
import { subscriptionsRouter } from './routes/subscriptions';
import { authUIRouter } from './routes/auth';
import { createAuth } from './auth/better-auth';
import { profileRouter } from './routes/profile';
import onboardingRoutes from './routes/onboarding';
import { layout } from './views/layout';
import { icons } from './views/icons';
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

// Home page
app.get('/', async (c) => {
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  // UTM cookie is set by middleware - analytics will read from cookie for attribution
  await analytics.trackEvent(c.req.raw, 'landing');

  const content = `
    <div class="fade-in">
      <!-- Hero Section - New Value Proposition -->
      <div style="text-align: center; margin-bottom: 48px; padding: 20px 0;">
        <h2 style="font-size: 2.8em; margin: 0 0 20px 0; background: linear-gradient(135deg, var(--accent-primary), #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2;">
          Find Working Prompts & Configs<br>for Your Coding Agent
        </h2>
        <p style="font-size: 1.25em; color: var(--text-secondary); max-width: 700px; margin: 0 auto 24px auto; line-height: 1.6;">
          Discover ready-to-use workflows, slash commands, and configurations for
          <strong style="color: var(--agent-claude);">Claude Code</strong>,
          <strong style="color: var(--agent-gemini);">Gemini CLI</strong>,
          <strong style="color: var(--agent-codex);">Codex</strong>, and more.
        </p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/skills" class="btn ripple" style="padding: 14px 28px; font-size: 1.05em;">
            ${icons.star('icon')} Browse Skills & Prompts
          </a>
          <a href="/configs" class="btn btn-secondary ripple" style="padding: 14px 28px; font-size: 1.05em;">
            ${icons.file('icon')} View All Configs
          </a>
        </div>
      </div>

      <!-- What's Here - Section Navigator -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%); border: 1px solid var(--border-accent);">
        <h3 style="margin: 0 0 8px 0; display: flex; align-items: center; gap: 10px; color: var(--accent-primary);">
          ${icons.compass('icon')}
          <span>What You'll Find Here</span>
        </h3>
        <p style="margin: 0 0 24px 0; color: var(--text-secondary); font-size: 0.95em;">
          Not sure where to start? Here's a quick guide to what's available:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">

          <!-- Skills Section -->
          <a href="/skills" class="card" style="background: var(--bg-primary); padding: 20px; text-decoration: none; border: 1px solid var(--border-dim); transition: all 0.3s ease; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="padding: 10px; background: rgba(139, 92, 246, 0.15); border-radius: 10px; color: var(--accent-violet);">
                ${icons.star('icon-lg')}
              </div>
              <div>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1em;">Skills</h4>
                <span style="font-size: 0.8em; color: var(--accent-violet);">Most Popular</span>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary); line-height: 1.5;">
              <strong>Reusable prompt templates</strong> that teach your coding agent new capabilities.
              Like "code review", "refactor", or "write tests" - copy and use directly.
            </p>
          </a>

          <!-- Slash Commands Section -->
          <a href="/configs" class="card" style="background: var(--bg-primary); padding: 20px; text-decoration: none; border: 1px solid var(--border-dim); transition: all 0.3s ease; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="padding: 10px; background: rgba(6, 182, 212, 0.15); border-radius: 10px; color: var(--accent-primary);">
                ${icons.terminal('icon-lg')}
              </div>
              <div>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1em;">Slash Commands</h4>
                <span style="font-size: 0.8em; color: var(--accent-primary);">Quick Actions</span>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary); line-height: 1.5;">
              <strong>Type /command to trigger workflows</strong>. Things like <code>/review</code>, <code>/deploy</code>,
              or <code>/test</code>. Works in Claude Code, Codex, and other agents.
            </p>
          </a>

          <!-- Converter Section -->
          <a href="/slash-commands/convert" class="card" style="background: var(--bg-primary); padding: 20px; text-decoration: none; border: 1px solid var(--border-dim); transition: all 0.3s ease; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="padding: 10px; background: rgba(245, 158, 11, 0.15); border-radius: 10px; color: var(--accent-amber);">
                ${icons.repeat('icon-lg')}
              </div>
              <div>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1em;">Converter</h4>
                <span style="font-size: 0.8em; color: var(--accent-amber);">Cross-Platform</span>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary); line-height: 1.5;">
              <strong>Convert configs between agents</strong>. Take a Claude Code slash command and convert it
              to work in Gemini CLI, Codex, Jules, Lovable, v0, or other web-based coding agents.
            </p>
          </a>

          <!-- Extensions Section -->
          <a href="/extensions" class="card" style="background: var(--bg-primary); padding: 20px; text-decoration: none; border: 1px solid var(--border-dim); transition: all 0.3s ease; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="padding: 10px; background: rgba(20, 184, 166, 0.15); border-radius: 10px; color: var(--success);">
                ${icons.package('icon-lg')}
              </div>
              <div>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1em;">Extensions</h4>
                <span style="font-size: 0.8em; color: var(--success);">Bundles</span>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary); line-height: 1.5;">
              <strong>Curated collections</strong> of commands and skills bundled together.
              Download a complete "React Development" or "Backend API" extension pack.
            </p>
          </a>

        </div>
      </div>

      <!-- Supported Agents -->
      <div class="card slide-up" style="margin-bottom: 32px; text-align: center; padding: 32px;">
        <h3 style="margin: 0 0 20px 0; color: var(--text-primary); font-size: 1.1em;">
          Works With Your Favorite Coding Agents
        </h3>
        <div style="display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(230, 126, 34, 0.1); border-radius: 8px; border: 1px solid rgba(230, 126, 34, 0.3);">
            <span style="font-size: 1.5em;">🟠</span>
            <span style="font-weight: 600; color: var(--agent-claude);">Claude Code</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
            <span style="font-size: 1.5em;">💎</span>
            <span style="font-weight: 600; color: var(--agent-gemini);">Gemini CLI</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(6, 182, 212, 0.1); border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">
            <span style="font-size: 1.5em;">🔷</span>
            <span style="font-weight: 600; color: var(--agent-codex);">OpenAI Codex</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(100, 116, 139, 0.1); border-radius: 8px; border: 1px solid rgba(100, 116, 139, 0.3);">
            <span style="font-size: 1.5em;">🌐</span>
            <span style="font-weight: 600; color: var(--text-secondary);">Jules, Lovable, v0...</span>
          </div>
        </div>
      </div>

      <!-- Quick Start Actions -->
      <div class="card slide-up" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid var(--border-accent);">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          ${icons.zap('icon')} Quick Start
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <a href="/skills" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.star('icon')} Browse Skills
          </a>
          <a href="/configs" class="btn btn-secondary ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.file('icon')} All Configs
          </a>
          <a href="/slash-commands/convert" class="btn btn-secondary ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.repeat('icon')} Convert
          </a>
          <a href="/extensions" class="btn btn-secondary ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.package('icon')} Extensions
          </a>
          <a href="/marketplaces" class="btn btn-secondary ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.store('icon')} Marketplaces
          </a>
          <a href="/mcp/info" class="btn ripple" style="text-align: center; padding: 16px; background: #6366f1; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.link('icon')} MCP Server
          </a>
        </div>
      </div>

      <!-- Coming Soon Notice (smaller, less prominent) -->
      <div style="text-align: center; margin-top: 40px; padding: 20px;">
        <p style="margin: 0 0 12px 0; color: var(--text-tertiary); font-size: 0.9em;">
          Want to contribute your own prompts and configs?
        </p>
        <a href="/subscriptions/form" class="btn btn-secondary" style="font-size: 0.9em;">
          ${icons.mail('icon')} Get Notified When Uploads Launch
        </a>
      </div>
    </div>
  `;
  return c.html(layout('Home', content, c));
});

// Mount onboarding routes
app.route('/', onboardingRoutes);

// Mount Better Auth API routes
// Using wildcard route to catch all /api/auth/* paths
app.all('/api/auth/*', async (c) => {
  console.log('Better Auth handler called:', c.req.method, c.req.url);
  const auth = createAuth(c.env);
  const response = await auth.handler(c.req.raw);
  console.log('Better Auth response:', response.status);
  return response;
});

// Mount auth UI routes
app.route('/auth', authUIRouter);

// Mount profile routes (handles /profile/* and /api/profile/*)
app.route('/profile', profileRouter);
app.route('/api/profile', profileRouter);

// Mount API routes
app.route('/api/configs', configsRouter);
app.route('/api/extensions', extensionsRouter);
app.route('/api/marketplaces', marketplacesRouter);
app.route('/api/skills', skillsRouter);
app.route('/api/files', filesRouter);
app.route('/api/slash-commands', slashCommandConverterRouter);
app.route('/api/subscriptions', subscriptionsRouter);

// Client-side analytics tracking endpoint
app.post('/api/analytics/track', async (c) => {
  try {
    const analytics = new AnalyticsService(c.env.ANALYTICS);
    const { event, metadata } = await c.req.json();

    await analytics.trackEvent(c.req.raw, event, metadata);

    return c.json({ success: true });
  } catch (error) {
    // Silent fail for analytics
    return c.json({ success: false }, 500);
  }
});

// Mount UI routes (same routes without /api prefix for HTML)
app.route('/configs', configsRouter);
app.route('/extensions', extensionsRouter);
app.route('/marketplaces', marketplacesRouter);
app.route('/skills', skillsRouter);
app.route('/slash-commands', slashCommandConverterRouter);
app.route('/subscriptions', subscriptionsRouter);

// Mount plugins routes (for serving plugin files and downloads)
app.route('/plugins', pluginsRouter);

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json(getOAuthMetadata(baseUrl));
});

// MCP OAuth 2.0 endpoints
app.route('/mcp/oauth', mcpOAuthRouter);

// MCP Server endpoints

// MCP server (full access for authenticated users, read-only for anonymous)
app.post('/mcp', async (c) => {
  // Check if user is authenticated via session
  const userId = c.get('userId');

  // Authenticated users get full access, anonymous users get read-only
  const accessLevel = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env, accessLevel, userId || undefined);

  return handleMCPStreamable(c.req.raw, server);
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
  return handleMCPStreamable(c.req.raw, server);
});

// MCP Server info endpoint
// Shows dynamic capabilities based on authentication status
// Admin endpoint (/mcp/admin) is SECRET and undocumented
app.get('/mcp/info', (c) => {
  const accept = c.req.header('Accept') || '';
  const userId = c.get('userId');
  const isAuthenticated = !!userId;

  // Dynamic capabilities based on authentication
  const mcpInfo = isAuthenticated ? {
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
            url: `${c.req.url.replace('/mcp/info', '')}/mcp`
          }
        }
      }
    },
    documentation: {
      access_level: 'Full access (authenticated user)',
      resources_behavior: 'Resources provide context data for AI agents',
      tools_behavior: 'All CRUD operations available for authenticated users'
    }
  } : {
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
      prompts: []
    },
    usage: {
      connection: 'POST requests to /mcp endpoint (no authentication required)',
      authentication: 'None (read-only access)',
      example_client_config: {
        mcpServers: {
          'agent-config-adapter': {
            type: 'http',
            url: `${c.req.url.replace('/mcp/info', '')}/mcp`
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

  if (accept.includes('application/json')) {
    return c.json(mcpInfo);
  }

  // HTML view for browser
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.link('icon')} MCP Server Information
          </h2>
          <p style="margin-top: 8px; color: var(--text-secondary);">
            Model Context Protocol server for AI agent integration
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="/" class="btn btn-secondary">← Home</a>
        </div>
      </div>

      <!-- Access Level -->
      ${isAuthenticated ? `
        <div class="card slide-up" style="margin-bottom: 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-left: 4px solid #34d399;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2em;">🔓</div>
            <div>
              <h3 style="margin: 0 0 4px 0; color: white;">Full Access Enabled</h3>
              <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
                You're authenticated! All CRUD operations available via MCP.
              </p>
            </div>
          </div>
        </div>
      ` : `
        <div class="card slide-up" style="margin-bottom: 24px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-left: 4px solid #fbbf24;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2em;">🔒</div>
            <div>
              <h3 style="margin: 0 0 4px 0; color: white;">Read-Only Access</h3>
              <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
                <a href="/auth/login" style="color: white; text-decoration: underline;">Sign in</a> to unlock full CRUD operations via MCP.
              </p>
            </div>
          </div>
        </div>
      `}

      <!-- Server Details -->
      <div class="card slide-up" style="margin-bottom: 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;">
        <h3 style="margin: 0 0 16px 0; color: white; display: flex; align-items: center; gap: 8px;">
          ${icons.barChart('icon')} Server Details
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Name</div>
            <div style="font-weight: 600;">${mcpInfo.name}</div>
          </div>
          <div>
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Version</div>
            <div style="font-weight: 600;">${mcpInfo.version}</div>
          </div>
          <div>
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Transport</div>
            <div style="font-weight: 600;">${mcpInfo.transport}</div>
          </div>
          <div>
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Access Level</div>
            <div style="font-weight: 600;">${mcpInfo.access}</div>
          </div>
        </div>
      </div>

      <!-- Tools -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.wrench('icon')}
          <span>Tools ${isAuthenticated ? '(Full CRUD Access)' : '(Read-Only)'}</span>
        </h3>
        <div style="display: grid; gap: 8px;">
          ${mcpInfo.capabilities.tools.map(tool => `
            <div class="card" style="background: var(--bg-tertiary); padding: 12px; font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--accent-primary);">
              ${tool}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Resources -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.book('icon')}
          <span>Resources (Context Data)</span>
        </h3>
        <div style="display: grid; gap: 8px;">
          ${mcpInfo.capabilities.resources.map(res => `
            <div class="card" style="background: var(--bg-tertiary); padding: 12px; font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--accent-primary);">
              ${res}
            </div>
          `).join('')}
        </div>
      </div>

      ${mcpInfo.capabilities.prompts.length > 0 ? `
      <!-- Prompts -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.zap('icon')}
          <span>Prompts (Workflow Automation)</span>
        </h3>
        <div style="display: grid; gap: 8px;">
          ${mcpInfo.capabilities.prompts.map(prompt => `
            <div class="card" style="background: var(--bg-tertiary); padding: 12px; font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--accent-primary);">
              ${prompt}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Client Connection -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.link('icon')} Client Connection
        </h3>
        <p style="margin-bottom: 12px; color: var(--text-secondary);">
          Add this to your MCP client configuration:
        </p>
        <pre style="background: var(--bg-primary); padding: 16px; border-radius: 6px; overflow-x: auto; border: 1px solid var(--border-color); position: relative;"><code>{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "${c.req.url.replace('/mcp/info', '')}/mcp"
    }
  }
}</code></pre>
        <button
          class="btn btn-secondary ripple copy-btn"
          style="margin-top: 12px; display: inline-flex; align-items: center; gap: 6px;"
          onclick="copyToClipboard(\`${`{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "${c.req.url.replace('/mcp/info', '')}/mcp"
    }
  }
}`}\`, this)">
          ${icons.clipboard('icon')} Copy Configuration
        </button>
      </div>

      <!-- Important Notes -->
      <div class="card slide-up" style="background: rgba(88, 166, 255, 0.05); border: 2px solid rgba(88, 166, 255, 0.2);">
        <h3 style="margin: 0 0 16px 0; color: var(--accent-primary); display: flex; align-items: center; gap: 8px;">
          ${icons.info('icon')} Important Notes
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="margin-top: 2px; color: var(--accent-primary);">${icons.book('icon-lg')}</div>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Resources</div>
              <div style="font-size: 0.9em; color: var(--text-secondary);">
                Pure reads - never trigger conversions or processing
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="margin-top: 2px; color: var(--accent-primary);">${icons.wrench('icon-lg')}</div>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Tools</div>
              <div style="font-size: 0.9em; color: var(--text-secondary);">
                Perform operations with side effects - use for conversions and updates
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="margin-top: 2px; color: var(--accent-primary);">${icons.zap('icon-lg')}</div>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                Prompts
                <span style="display: inline-block; padding: 2px 8px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-radius: 12px; font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Coming Soon</span>
              </div>
              <div style="font-size: 0.9em; color: var(--text-secondary);">
                Guided workflows for complex multi-step operations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return c.html(layout('MCP Server Info', content, c));
});

export default app;
