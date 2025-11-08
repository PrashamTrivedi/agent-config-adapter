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
  GATEWAY_TOKEN?: string; // BYOK authentication token (preferred)

  // Multi-Provider Configuration
  AI_PROVIDER?: 'openai' | 'gemini' | 'auto';
  OPENAI_REASONING_MODE?: 'high' | 'medium' | 'low' | 'minimal';
  GEMINI_THINKING_BUDGET?: string;

  // Legacy Configuration (Deprecated - For Backward Compatibility)
  OPENAI_API_KEY?: string; // Deprecated: Use GATEWAY_TOKEN instead
  AI_GATEWAY_TOKEN?: string; // Deprecated: Renamed to GATEWAY_TOKEN
};

const app = new Hono<{ Bindings: Bindings }>();

// Home page
app.get('/', (c) => {
  const content = `
    <h2>Welcome to Agent Config Adapter</h2>
    <p>
      Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once,
      deploy across Codex, Gemini, and other agents.
    </p>

    <h3>Features</h3>
    <ul style="margin-left: 20px; margin-top: 10px;">
      <li>Store agent configurations (slash commands, agent definitions, MCP configs, skills)</li>
      <li>Convert between different agent formats</li>
      <li>Fast retrieval with caching</li>
      <li><strong>NEW:</strong> Multi-file Skills with ZIP upload/download</li>
      <li><strong>NEW:</strong> MCP Server support for AI agent integration</li>
      <li><strong>NEW:</strong> Extension Marketplace - Bundle and share configs</li>
    </ul>

    <div style="margin-top: 30px;">
      <a href="/configs" class="btn">View All Configs</a>
      <a href="/configs/new" class="btn">Add New Config</a>
      <a href="/slash-commands/convert" class="btn">Slash Command Converter</a>
      <a href="/skills" class="btn">Browse Skills</a>
      <a href="/extensions" class="btn">Browse Extensions</a>
      <a href="/marketplaces" class="btn">Browse Marketplaces</a>
      <a href="/mcp/info" class="btn" style="background: #4f46e5;">MCP Server Info</a>
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
    <h2>MCP Server Information</h2>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Server Details</h3>
      <p><strong>Name:</strong> ${mcpInfo.name}</p>
      <p><strong>Version:</strong> ${mcpInfo.version}</p>
      <p><strong>Transport:</strong> ${mcpInfo.transport}</p>
      <p><strong>Endpoint:</strong> <code>${mcpInfo.endpoint}</code></p>
    </div>

    <h3>Tools (Write Operations)</h3>
    <ul style="margin-left: 20px;">
      ${mcpInfo.capabilities.tools.map(tool => `<li><code>${tool}</code></li>`).join('')}
    </ul>

    <h3>Resources (Pure Read Operations)</h3>
    <ul style="margin-left: 20px;">
      ${mcpInfo.capabilities.resources.map(res => `<li><code>${res}</code></li>`).join('')}
    </ul>

    <h3>Prompts (Workflow Automation)</h3>
    <ul style="margin-left: 20px;">
      ${mcpInfo.capabilities.prompts.map(prompt => `<li><code>${prompt}</code></li>`).join('')}
    </ul>

    <h3>Client Connection</h3>
    <p>Add this to your MCP client configuration:</p>
    <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; overflow-x: auto;"><code>{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "${c.req.url.replace('/mcp/info', '')}/mcp"
    }
  }
}</code></pre>

    <h3>Important Notes</h3>
    <ul style="margin-left: 20px;">
      <li><strong>Resources</strong> are pure reads - they never trigger conversions or processing</li>
      <li><strong>Tools</strong> perform operations with side effects - use them for conversions and updates</li>
      <li><strong>Prompts</strong> provide guided workflows for complex multi-step operations</li>
    </ul>

    <div style="margin-top: 30px;">
      <a href="/" class="btn">Back to Home</a>
      <a href="/configs" class="btn">View Configs</a>
    </div>
  `;

  return c.html(layout('MCP Server Info', content));
});

export default app;
