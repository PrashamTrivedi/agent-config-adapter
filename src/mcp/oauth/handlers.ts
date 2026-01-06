/**
 * OAuth 2.0 authorization handlers
 * Implements authorization code flow with PKCE
 */

import type { Context } from 'hono';
import { generateAuthCode, signAccessToken, verifyCodeChallenge, generateRandomString } from './jwt';
import { authorizePage, errorPage, successPage } from './templates';
import { ApiKeyService } from '../../services/api-key-service';

// Store auth codes and PKCE challenges in KV with TTL
interface AuthCodeData {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  createdAt: number;
}

// Token response per RFC 6749
interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// Error response per RFC 6749
interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * Handle GET /mcp/oauth/authorize
 * Display authorization consent page
 */
export async function handleAuthorizeGet(c: Context): Promise<Response> {
  const user = c.get('user');

  // Required OAuth parameters
  const clientId = c.req.query('client_id');
  const redirectUri = c.req.query('redirect_uri');
  const responseType = c.req.query('response_type');
  const scope = c.req.query('scope') || 'read';
  const state = c.req.query('state') || '';

  // PKCE parameters (required for public clients)
  const codeChallenge = c.req.query('code_challenge');
  const codeChallengeMethod = c.req.query('code_challenge_method') || 'S256';

  // Validate required parameters
  if (!clientId) {
    return c.html(errorPage('Invalid Request', 'Missing client_id parameter'));
  }

  if (!redirectUri) {
    return c.html(errorPage('Invalid Request', 'Missing redirect_uri parameter'));
  }

  if (responseType !== 'code') {
    return c.html(errorPage('Unsupported Response Type', 'Only authorization code flow is supported'));
  }

  if (!codeChallenge) {
    return c.html(errorPage('Invalid Request', 'PKCE code_challenge is required'));
  }

  if (codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
    return c.html(
      errorPage('Invalid Request', 'code_challenge_method must be S256 or plain')
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    const currentUrl = new URL(c.req.url);
    const returnUrl = encodeURIComponent(currentUrl.pathname + currentUrl.search);
    return c.redirect(`/auth/login?return=${returnUrl}`);
  }

  // Display authorization page
  return c.html(
    authorizePage({
      clientId,
      scope,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      userName: user.name,
      userEmail: user.email,
    })
  );
}

/**
 * Handle POST /mcp/oauth/authorize
 * Process user's approval/denial
 */
export async function handleAuthorizePost(c: Context): Promise<Response> {
  const user = c.get('user');
  const kvStore = c.env.OAUTH_TOKENS as KVNamespace;

  if (!user) {
    return c.redirect('/auth/login');
  }

  const formData = await c.req.parseBody();
  const action = formData['action'] as string;
  const clientId = formData['client_id'] as string;
  const redirectUri = formData['redirect_uri'] as string;
  const scope = formData['scope'] as string;
  const state = formData['state'] as string;
  const codeChallenge = formData['code_challenge'] as string;
  const codeChallengeMethod = formData['code_challenge_method'] as string;

  // Build redirect URL
  const redirectUrl = new URL(redirectUri);

  if (action === 'deny') {
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'User denied the authorization request');
    if (state) redirectUrl.searchParams.set('state', state);
    return c.redirect(redirectUrl.toString());
  }

  // User approved - generate auth code
  const authCode = generateAuthCode();

  // Store auth code data with 10 minute TTL
  const codeData: AuthCodeData = {
    userId: user.id,
    clientId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    createdAt: Date.now(),
  };

  await kvStore.put(`auth_code:${authCode}`, JSON.stringify(codeData), {
    expirationTtl: 600, // 10 minutes
  });

  // Redirect back with auth code
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);

  // For native/CLI apps, show success page instead of redirecting
  if (redirectUri.startsWith('urn:ietf:wg:oauth:2.0:oob') || redirectUri === 'localhost') {
    return c.html(successPage(authCode));
  }

  return c.redirect(redirectUrl.toString());
}

/**
 * Handle POST /mcp/oauth/token
 * Exchange auth code for access token
 */
export async function handleTokenExchange(c: Context): Promise<Response> {
  const kvStore = c.env.OAUTH_TOKENS as KVNamespace;
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  if (!jwtSecret) {
    return c.json<TokenErrorResponse>(
      { error: 'server_error', error_description: 'JWT secret not configured' },
      500
    );
  }

  // Parse request body (support both form and JSON)
  let body: Record<string, string>;
  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('application/json')) {
    body = await c.req.json();
  } else {
    const formData = await c.req.parseBody();
    body = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, String(v)])
    );
  }

  const grantType = body.grant_type;
  const code = body.code;
  const redirectUri = body.redirect_uri;
  const clientId = body.client_id;
  const codeVerifier = body.code_verifier;

  // Validate grant type
  if (grantType !== 'authorization_code' && grantType !== 'refresh_token') {
    return c.json<TokenErrorResponse>(
      { error: 'unsupported_grant_type', error_description: 'Only authorization_code and refresh_token are supported' },
      400
    );
  }

  // Handle refresh token grant
  if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token;
    if (!refreshToken) {
      return c.json<TokenErrorResponse>(
        { error: 'invalid_request', error_description: 'refresh_token is required' },
        400
      );
    }

    const refreshData = await kvStore.get(`refresh_token:${refreshToken}`);
    if (!refreshData) {
      return c.json<TokenErrorResponse>(
        { error: 'invalid_grant', error_description: 'Invalid or expired refresh token' },
        400
      );
    }

    const { userId, scope, clientId: storedClientId } = JSON.parse(refreshData);

    // Generate new access token
    const accessToken = await signAccessToken(
      {
        sub: userId,
        scope,
        client_id: storedClientId,
        jti: generateRandomString(16),
      },
      jwtSecret,
      3600
    );

    return c.json<TokenResponse>({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope,
    });
  }

  // Handle authorization code grant
  if (!code) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_request', error_description: 'code is required' },
      400
    );
  }

  if (!codeVerifier) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_request', error_description: 'code_verifier is required for PKCE' },
      400
    );
  }

  // Retrieve and delete auth code (one-time use)
  const codeDataStr = await kvStore.get(`auth_code:${code}`);
  if (!codeDataStr) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
      400
    );
  }

  await kvStore.delete(`auth_code:${code}`);

  const codeData: AuthCodeData = JSON.parse(codeDataStr);

  // Validate redirect_uri matches
  if (redirectUri && redirectUri !== codeData.redirectUri) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_grant', error_description: 'redirect_uri does not match' },
      400
    );
  }

  // Validate client_id matches
  if (clientId && clientId !== codeData.clientId) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_grant', error_description: 'client_id does not match' },
      400
    );
  }

  // Verify PKCE code challenge
  const challengeMethod = codeData.codeChallengeMethod as 'S256' | 'plain';
  const isValidChallenge = await verifyCodeChallenge(
    codeVerifier,
    codeData.codeChallenge,
    challengeMethod
  );

  if (!isValidChallenge) {
    return c.json<TokenErrorResponse>(
      { error: 'invalid_grant', error_description: 'PKCE code verification failed' },
      400
    );
  }

  // Generate access token
  const accessToken = await signAccessToken(
    {
      sub: codeData.userId,
      scope: codeData.scope,
      client_id: codeData.clientId,
      jti: generateRandomString(16),
    },
    jwtSecret,
    3600 // 1 hour
  );

  // Generate refresh token (valid for 30 days)
  const refreshToken = generateRandomString(64);
  await kvStore.put(
    `refresh_token:${refreshToken}`,
    JSON.stringify({
      userId: codeData.userId,
      scope: codeData.scope,
      clientId: codeData.clientId,
    }),
    { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
  );

  return c.json<TokenResponse>({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: codeData.scope,
  });
}

/**
 * Handle dynamic client registration (RFC 7591)
 * POST /mcp/oauth/register
 */
export async function handleClientRegistration(c: Context): Promise<Response> {
  const body = await c.req.json<{
    client_name: string;
    redirect_uris?: string[];
    grant_types?: string[];
    token_endpoint_auth_method?: string;
  }>();

  if (!body.client_name) {
    return c.json({ error: 'invalid_client_metadata', error_description: 'client_name is required' }, 400);
  }

  // For public clients with PKCE, we don't need stored client secrets
  // Just return a client_id that can be used for tracking
  const clientId = `mcp_${generateRandomString(16)}`;

  return c.json({
    client_id: clientId,
    client_name: body.client_name,
    redirect_uris: body.redirect_uris || [],
    grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none', // Public client with PKCE
    registration_client_uri: `${new URL(c.req.url).origin}/mcp/oauth/register/${clientId}`,
  }, 201);
}
