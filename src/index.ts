import { Hono } from 'hono';
import { configsRouter } from './routes/configs';
import { extensionsRouter } from './routes/extensions';
import { marketplacesRouter } from './routes/marketplaces';
import { skillsRouter } from './routes/skills';
import { filesRouter } from './routes/files';
import { pluginsRouter } from './routes/plugins';
import { slashCommandConverterRouter } from './routes/slash-command-converter';
import { layout } from './views/layout';
import { icons } from './views/icons';
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
    <div class="fade-in">
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="font-size: 2.5em; margin: 0 0 16px 0; background: linear-gradient(135deg, var(--accent-primary), #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: flex; align-items: center; justify-content: center; gap: 12px;">
          ${icons.refresh('icon-lg')} Agent Config Adapter
        </h2>
        <p style="font-size: 1.15em; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6;">
          Universal adapter for AI coding agent configurations. Store once, deploy everywhere.
        </p>
      </div>

      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          ${icons.sparkles('icon')}
          <span>Features</span>
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--accent-primary);">${icons.file('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Config Management</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Store slash commands, agents, and MCP configs
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--accent-primary);">${icons.refresh('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Format Conversion</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Convert between Claude Code, Codex, and Gemini
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--accent-primary);">${icons.target('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Multi-file Skills</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Skills with ZIP upload/download support
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--accent-violet);">${icons.store('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Marketplace</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Bundle and share extension collections
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--success);">${icons.refresh('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Fast Caching</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Optimized retrieval with KV caching
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px;">
            <div style="margin-bottom: 8px; color: var(--accent-blue);">${icons.code('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">MCP Server</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              AI agent integration via MCP protocol
            </p>
          </div>
        </div>
      </div>

      <div class="card slide-up">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          ${icons.target('icon')} Quick Actions
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <a href="/configs" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.file('icon')} View Configs
          </a>
          <a href="/configs/new" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.plus('icon')} New Config
          </a>
          <a href="/slash-commands/convert" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.refresh('icon')} Converter
          </a>
          <a href="/skills" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.star('icon')} Skills
          </a>
          <a href="/extensions" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.package('icon')} Extensions
          </a>
          <a href="/marketplaces" class="btn ripple" style="text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.store('icon')} Marketplaces
          </a>
          <a href="/mcp/info" class="btn ripple" style="text-align: center; padding: 16px; background: #6366f1; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.code('icon')} MCP Server
          </a>
        </div>
      </div>
    </div>
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
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Endpoint</div>
            <div style="font-family: 'Courier New', monospace; font-weight: 600;">${mcpInfo.endpoint}</div>
          </div>
        </div>
      </div>

      <!-- Tools -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.wrench('icon')}
          <span>Tools (Write Operations)</span>
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
          <span>Resources (Pure Read Operations)</span>
        </h3>
        <div style="display: grid; gap: 8px;">
          ${mcpInfo.capabilities.resources.map(res => `
            <div class="card" style="background: var(--bg-tertiary); padding: 12px; font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--accent-primary);">
              ${res}
            </div>
          `).join('')}
        </div>
      </div>

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
      </div>

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
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Prompts</div>
              <div style="font-size: 0.9em; color: var(--text-secondary);">
                Guided workflows for complex multi-step operations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return c.html(layout('MCP Server Info', content));
});

export default app;
