const PLUGIN_FORMATS = new Set(['claude_code', 'gemini', 'codex']);

/**
 * Decide whether a request belongs to Hono (JSON / protocol / files) or TanStack Start (HTML).
 *
 * Hono:
 * - `/api/*`
 * - `/.well-known/*`
 * - `/mcp`, `/mcp/admin`, `/mcp/oauth*`
 * - `/mcp/info` when Accept includes application/json (MCP clients)
 * - plugin file, download, definition, invalidate, and JSON browse APIs
 *
 * Start:
 * - GET `/plugins/:extensionId/:format` when format is claude_code | gemini | codex
 *   (the in-browser plugin file listing)
 * - every other non-API path
 */
export function isApiRequest(request: Request): boolean {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const accept = request.headers.get('Accept') || '';

  if (path.startsWith('/api/')) return true;
  if (path.startsWith('/.well-known/')) return true;
  if (path === '/mcp' || path === '/mcp/admin' || path.startsWith('/mcp/oauth')) return true;
  if (path === '/mcp/info' && accept.includes('application/json')) return true;

  if (path.startsWith('/plugins/')) {
    return isPluginApiRequest(path, method, accept);
  }

  return false;
}

function isPluginApiRequest(path: string, method: string, accept: string): boolean {
  if (method !== 'GET') return true;
  if (accept.includes('application/json')) return true;

  const parts = path.split('/').filter(Boolean);
  // GET /plugins/:extensionId/:format → Start browse UI
  if (parts.length === 3 && parts[0] === 'plugins' && PLUGIN_FORMATS.has(parts[2])) {
    return false;
  }

  return true;
}
