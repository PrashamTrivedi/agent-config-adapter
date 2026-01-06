/**
 * MCP OAuth 2.0 module exports
 */

export { mcpOAuthRouter } from './routes';
export { mcpOAuthMiddleware, requireMCPAuth, requireScope, getMCPUser } from './middleware';
export { getOAuthMetadata, getMCPServerMetadata } from './metadata';
export { signAccessToken, verifyAccessToken, generateCodeChallenge, verifyCodeChallenge } from './jwt';
export type { MCPTokenPayload } from './jwt';
