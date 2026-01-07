/**
 * OAuth 2.0 Authorization Server Metadata
 * RFC 8414: https://datatracker.ietf.org/doc/html/rfc8414
 */

export interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  token_exchange_endpoint?: string; // Custom endpoint for web session to MCP token exchange
  registration_endpoint?: string;
  scopes_supported: string[];
  response_types_supported: string[];
  response_modes_supported: string[];
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
  service_documentation?: string;
}

/**
 * Generate OAuth metadata for the given base URL
 */
export function getOAuthMetadata(baseUrl: string): OAuthMetadata {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/mcp/oauth/authorize`,
    token_endpoint: `${baseUrl}/mcp/oauth/token`,
    token_exchange_endpoint: `${baseUrl}/mcp/oauth/exchange`, // Web session to MCP token exchange
    registration_endpoint: `${baseUrl}/mcp/oauth/register`,
    scopes_supported: [
      'read', // Read configs
      'write', // Create/update configs
      'admin', // Full access
    ],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'], // Public clients (PKCE)
    code_challenge_methods_supported: ['S256', 'plain'],
    service_documentation: 'https://github.com/PrashamTrivedi/agent-config-adapter',
  };
}

/**
 * MCP Server metadata for discovery
 */
export interface MCPServerMetadata {
  name: string;
  version: string;
  description: string;
  authentication: 'required' | 'optional';
  oauth_metadata_url: string;
  mcp_endpoint: string;
  token_exchange_endpoint: string;
  capabilities: string[];
}

/**
 * Generate MCP server metadata
 */
export function getMCPServerMetadata(baseUrl: string): MCPServerMetadata {
  return {
    name: 'Agent Config Adapter',
    version: '1.0.0',
    description: 'Universal configuration adapter for AI coding agents',
    authentication: 'required',
    oauth_metadata_url: `${baseUrl}/.well-known/oauth-authorization-server`,
    mcp_endpoint: `${baseUrl}/mcp`,
    token_exchange_endpoint: `${baseUrl}/mcp/oauth/exchange`,
    capabilities: ['configs', 'skills', 'extensions', 'marketplaces'],
  };
}
