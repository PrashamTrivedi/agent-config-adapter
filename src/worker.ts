import handler from '@tanstack/react-start/server-entry';
import app from './index';

/**
 * API / protocol traffic stays on Hono.
 * Browser HTML routes are served by TanStack Start.
 */
function isApiRequest(request: Request): boolean {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const accept = request.headers.get('Accept') || '';

  if (path.startsWith('/api/')) return true;
  if (path.startsWith('/.well-known/')) return true;
  if (path === '/mcp' || path === '/mcp/admin' || path.startsWith('/mcp/oauth')) return true;
  if (path === '/mcp/info' && accept.includes('application/json')) return true;

  if (path.startsWith('/plugins/')) {
    if (method !== 'GET') return true;
    if (accept.includes('application/json')) return true;
    const parts = path.split('/').filter(Boolean);
    // GET /plugins/:id/:format → Start UI; deeper paths are file/download APIs
    if (parts.length > 3) return true;
    return false;
  }

  return false;
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    if (isApiRequest(request)) {
      return app.fetch(request, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
};
