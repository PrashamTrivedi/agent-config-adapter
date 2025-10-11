import { Hono } from 'hono';
import { configsRouter } from './routes/configs';
import { layout } from './views/layout';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

// Home page
app.get('/', (c) => {
  const content = `
    <h2>Welcome to Agent Config Adapter</h2>
    <p>
      Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once,
      deploy across Codex, Jules, and other agents.
    </p>

    <h3>Features</h3>
    <ul style="margin-left: 20px; margin-top: 10px;">
      <li>Store agent configurations (slash commands, agent definitions, MCP configs)</li>
      <li>Convert between different agent formats</li>
      <li>Fast retrieval with caching</li>
    </ul>

    <div style="margin-top: 30px;">
      <a href="/configs" class="btn">View All Configs</a>
      <a href="/configs/new" class="btn">Add New Config</a>
    </div>
  `;
  return c.html(layout('Home', content));
});

// Mount API routes
app.route('/api/configs', configsRouter);

// Mount UI routes (same routes without /api prefix for HTML)
app.route('/configs', configsRouter);

export default app;
