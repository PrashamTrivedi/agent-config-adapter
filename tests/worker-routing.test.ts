import { describe, expect, it } from 'vitest';
import { isApiRequest } from '../src/worker-routing';

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://example.test${path}`, init);
}

describe('isApiRequest', () => {
  it('sends REST, well-known, and MCP protocol traffic to Hono', () => {
    expect(isApiRequest(req('/api/configs'))).toBe(true);
    expect(isApiRequest(req('/.well-known/oauth-authorization-server'))).toBe(true);
    expect(isApiRequest(req('/mcp', { method: 'POST' }))).toBe(true);
    expect(isApiRequest(req('/mcp/admin', { method: 'POST' }))).toBe(true);
    expect(isApiRequest(req('/mcp/oauth/authorize'))).toBe(true);
  });

  it('sends JSON /mcp/info to Hono and HTML /mcp/info to Start', () => {
    expect(isApiRequest(req('/mcp/info', { headers: { Accept: 'application/json' } }))).toBe(true);
    expect(isApiRequest(req('/mcp/info', { headers: { Accept: 'text/html' } }))).toBe(false);
  });

  it('keeps catalog HTML on Start', () => {
    expect(isApiRequest(req('/'))).toBe(false);
    expect(isApiRequest(req('/configs'))).toBe(false);
    expect(isApiRequest(req('/auth/login'))).toBe(false);
  });

  it('sends GET /plugins/:id/:format browse UI to Start', () => {
    expect(isApiRequest(req('/plugins/ext-1/gemini'))).toBe(false);
    expect(isApiRequest(req('/plugins/ext-1/claude_code'))).toBe(false);
    expect(isApiRequest(req('/plugins/ext-1/codex'))).toBe(false);
  });

  it('sends plugin file, download, and definition paths to Hono', () => {
    expect(isApiRequest(req('/plugins/ext-1/gemini/download'))).toBe(true);
    expect(isApiRequest(req('/plugins/ext-1/gemini/definition'))).toBe(true);
    expect(isApiRequest(req('/plugins/ext-1/gemini/SKILL.md'))).toBe(true);
    expect(isApiRequest(req('/plugins/ext-1/gemini', { method: 'POST' }))).toBe(true);
    expect(
      isApiRequest(req('/plugins/ext-1/gemini', { headers: { Accept: 'application/json' } }))
    ).toBe(true);
    expect(isApiRequest(req('/plugins/marketplaces/m1/download'))).toBe(true);
    expect(isApiRequest(req('/plugins/marketplaces/m1/gemini/definition'))).toBe(true);
  });
});
