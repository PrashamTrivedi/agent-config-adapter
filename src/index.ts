import { Hono } from 'hono';
import { configsRouter } from './routes/configs';
import { extensionsRouter } from './routes/extensions';
import { marketplacesRouter } from './routes/marketplaces';
import { skillsRouter } from './routes/skills';
import { filesRouter } from './routes/files';
import { pluginsRouter } from './routes/plugins';
import { slashCommandConverterRouter } from './routes/slash-command-converter';
import { layout } from './views/layout';
import { handleMCPStreamable } from './mcp/transport';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;

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
};

const app = new Hono<{ Bindings: Bindings }>();

// Home page
app.get('/', (c) => {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Unified agent operations</p>
        <h2>Operate every agent format from one control center</h2>
        <p class="lead">
          Build, convert, and ship Claude Code, Codex, and Gemini configurations without context switching. Real-time feedback,
          rich previews, and HTMX-driven interactivity keep your team in flow.
        </p>
        <div class="chip-group" style="margin-top: 18px;">
          <span class="badge status-success">Live MCP endpoint</span>
          <span class="badge">Multi-provider AI gateway</span>
          <span class="badge status-info">HTMX enhanced</span>
        </div>
      </div>
      <div class="action-bar" style="align-self: flex-end;">
        <a href="/configs" class="btn btn-primary">Launch console</a>
        <a href="/slash-commands/convert" class="btn btn-secondary">Convert commands</a>
        <a href="/mcp/info" class="btn btn-tertiary">View MCP contract</a>
      </div>
    </section>

    <section class="card-grid" aria-label="Key capabilities">
      <article class="card">
        <header class="toolbar" style="justify-content: space-between;">
          <div>
            <h3>Configuration vault</h3>
            <p>Centralize slash commands, MCP configs, and agent definitions with versioned history.</p>
          </div>
          <span class="badge">Configs</span>
        </header>
        <div class="card-meta">
          <span class="chip">Instant conversions</span>
          <span class="chip">AI + rule based</span>
        </div>
        <footer class="action-bar" style="margin-top: 18px;">
          <a href="/configs/new" class="btn btn-sm btn-primary">Create config</a>
          <button class="btn btn-sm btn-ghost" type="button" data-copy="${escapeHtmlForHome(
            `${c.req.url.replace(/\/$/, '')}/mcp`
          )}" title="Copy MCP endpoint">Copy MCP endpoint</button>
        </footer>
      </article>

      <article class="card">
        <header class="toolbar" style="justify-content: space-between;">
          <div>
            <h3>Modern skill workspace</h3>
            <p>Tabbed previews, multi-file uploads, and ZIP exports make reusable skills effortless.</p>
          </div>
          <span class="badge">Skills</span>
        </header>
        <div class="card-meta">
          <span class="chip">Drag & drop uploads</span>
          <span class="chip">Companion files</span>
        </div>
        <footer class="action-bar" style="margin-top: 18px;">
          <a href="/skills" class="btn btn-sm btn-secondary">Browse skills</a>
          <a href="/skills/new" class="btn btn-sm btn-ghost">New skill</a>
        </footer>
      </article>

      <article class="card">
        <header class="toolbar" style="justify-content: space-between;">
          <div>
            <h3>Extension marketplaces</h3>
            <p>Bundle curated plugins, share marketplace manifests, and publish multi-agent collections.</p>
          </div>
          <span class="badge">Extensions</span>
        </header>
        <div class="card-meta">
          <span class="chip">Gemini + Claude ready</span>
          <span class="chip">Automated packaging</span>
        </div>
        <footer class="action-bar" style="margin-top: 18px;">
          <a href="/extensions" class="btn btn-sm btn-secondary">View extensions</a>
          <a href="/marketplaces" class="btn btn-sm btn-ghost">Explore marketplaces</a>
        </footer>
      </article>

      <article class="card">
        <header class="toolbar" style="justify-content: space-between;">
          <div>
            <h3>Plugin file browser</h3>
            <p>Inspect generated plugin artifacts, copy install URLs, and download bundles instantly.</p>
          </div>
          <span class="badge">Plugins</span>
        </header>
        <div class="card-meta">
          <span class="chip">ZIP + JSON outputs</span>
          <span class="chip">Structure aware</span>
        </div>
        <footer class="action-bar" style="margin-top: 18px;">
          <a href="/extensions" class="btn btn-sm btn-secondary">Open from extension</a>
          <a href="/marketplaces" class="btn btn-sm btn-ghost">Marketplace assets</a>
        </footer>
      </article>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Workflow highlights</h3>
        <span class="form-helper">Every action streams back progress with HTMX indicators.</span>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Real-time feedback</h4>
          <p>Inline skeletons, progress bars, and toast notifications keep operators in sync with conversions and uploads.</p>
        </article>
        <article class="card">
          <h4>Accessible by design</h4>
          <p>Keyboard-friendly navigation, WCAG AA contrast, and ARIA live regions ship out of the box.</p>
        </article>
        <article class="card">
          <h4>AI assisted conversions</h4>
          <p>Hybrid AI + deterministic pipelines ensure safe migrations between Claude Code, Codex, and Gemini formats.</p>
        </article>
      </div>
      <div class="divider"></div>
      <div class="toolbar">
        <div>
          <h4 style="margin: 0;">Get started</h4>
          <p style="margin: 4px 0 0; color: var(--text-muted);">Provision configs, package extensions, and publish marketplaces in minutes.</p>
        </div>
        <div class="action-bar">
          <a href="/configs/new" class="btn btn-primary">Create configuration</a>
          <a href="/mcp/info" class="btn btn-secondary">Review MCP info</a>
        </div>
      </div>
    </section>
  `;
  return c.html(layout('Home', content));
});

// Mount API routes
app.route('/api/configs', configsRouter);
app.route('/api/extensions', extensionsRouter);
app.route('/api/marketplaces', marketplacesRouter);
app.route('/api/skills', skillsRouter);
app.route('/api/files', filesRouter);
app.route('/api/slash-commands', slashCommandConverterRouter);

// Mount UI routes (same routes without /api prefix for HTML)
app.route('/configs', configsRouter);
app.route('/extensions', extensionsRouter);
app.route('/marketplaces', marketplacesRouter);
app.route('/skills', skillsRouter);
app.route('/slash-commands', slashCommandConverterRouter);

// Mount plugins routes (for serving plugin files and downloads)
app.route('/plugins', pluginsRouter);

// MCP Server endpoints
app.post('/mcp', async (c) => {
  return handleMCPStreamable(c.req.raw, c.env);
});

// MCP Server info endpoint
app.get('/mcp/info', (c) => {
  const accept = c.req.header('Accept') || '';

  const mcpInfo = {
    name: 'agent-config-adapter',
    version: '1.0.0',
    description: 'Universal configuration adapter for AI coding agents',
    transport: 'streamable-http',
    endpoint: '/mcp',
    capabilities: {
      tools: [
        'create_config - Create a new agent configuration',
        'update_config - Update an existing configuration',
        'delete_config - Delete a configuration',
        'invalidate_cache - Invalidate cached format conversions',
        'convert_config - Convert config to different format (on-demand, with caching)'
      ],
      resources: [
        'config://list - List all configurations from database',
        'config://{configId} - Get single configuration from database',
        'config://{configId}/cached/{format} - Get cached conversion (null if not cached, pure read only)'
      ],
      prompts: [
        'migrate_config_format - Migrate configuration between agent formats',
        'batch_convert - Bulk convert multiple configs to target format',
        'sync_config_versions - Synchronize cached format conversions'
      ]
    },
    usage: {
      connection: 'POST requests to /mcp endpoint',
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
      resources_behavior: 'Resources are pure reads (no conversion processing)',
      tools_behavior: 'Tools perform operations with side effects (conversions, cache updates)',
      prompts_workflow: 'Prompts provide guided workflows for complex operations'
    }
  };

  if (accept.includes('application/json')) {
    return c.json(mcpInfo);
  }

  // HTML view for browser
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Machine Coordination Protocol</p>
        <h2>MCP server capabilities</h2>
        <p class="lead">Discover tools, resources, and prompts exposed by the adapter's Streamable HTTP endpoint.</p>
      </div>
      <div class="action-bar">
        <button class="btn btn-secondary" type="button" data-copy="${escapeHtmlForHome(
          `${c.req.url.replace('/mcp/info', '')}/mcp`
        )}" title="Copy endpoint URL">Copy endpoint</button>
        <a href="/" class="btn btn-tertiary">Back to home</a>
      </div>
    </section>

    <section class="panel" data-loading-target>
      <div class="panel-header">
        <h3 class="panel-title">Server details</h3>
        <span class="badge status-success">Online</span>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Name</h4>
          <p>${mcpInfo.name}</p>
        </article>
        <article class="card">
          <h4>Version</h4>
          <p>${mcpInfo.version}</p>
        </article>
        <article class="card">
          <h4>Transport</h4>
          <p>${mcpInfo.transport}</p>
        </article>
        <article class="card">
          <h4>Endpoint</h4>
          <p><code>${mcpInfo.endpoint}</code></p>
        </article>
      </div>
      <div class="divider"></div>
      <div class="resource-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <article class="card">
          <h4>Tools</h4>
          <ul style="margin: 0; padding-left: 18px; color: var(--text-muted);">
            ${mcpInfo.capabilities.tools.map((tool) => `<li><code>${tool}</code></li>`).join('')}
          </ul>
        </article>
        <article class="card">
          <h4>Resources</h4>
          <ul style="margin: 0; padding-left: 18px; color: var(--text-muted);">
            ${mcpInfo.capabilities.resources.map((resource) => `<li><code>${resource}</code></li>`).join('')}
          </ul>
        </article>
        <article class="card">
          <h4>Prompts</h4>
          <ul style="margin: 0; padding-left: 18px; color: var(--text-muted);">
            ${mcpInfo.capabilities.prompts.map((prompt) => `<li><code>${prompt}</code></li>`).join('')}
          </ul>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Client configuration</h3>
        <button class="btn btn-ghost btn-sm" type="button" data-copy-target="#mcp-config-snippet">Copy JSON</button>
      </div>
      <pre id="mcp-config-snippet" style="margin: 0; max-height: 320px; overflow: auto;">${escapeHtmlForHome(
        JSON.stringify(mcpInfo.usage.example_client_config, null, 2)
      )}</pre>
      <div class="divider"></div>
      <div class="resource-grid">
        <article class="card">
          <h4>Usage notes</h4>
          <p>${mcpInfo.documentation.resources_behavior}</p>
        </article>
        <article class="card">
          <h4>Side effects</h4>
          <p>${mcpInfo.documentation.tools_behavior}</p>
        </article>
        <article class="card">
          <h4>Workflow prompts</h4>
          <p>${mcpInfo.documentation.prompts_workflow}</p>
        </article>
      </div>
      <div class="divider"></div>
      <div class="toolbar">
        <div>
          <h4 style="margin: 0;">Next steps</h4>
          <p style="margin: 4px 0 0; color: var(--text-muted);">Register the endpoint with your MCP-ready IDE or client.</p>
        </div>
        <div class="action-bar">
          <a href="/configs" class="btn btn-primary">Manage configs</a>
          <a href="/slash-commands/convert" class="btn btn-secondary">Convert commands</a>
        </div>
      </div>
    </section>
  `;

  return c.html(layout('MCP Server Info', content));
});

export default app;

function escapeHtmlForHome(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
