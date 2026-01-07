/**
 * JWT utilities for MCP OAuth 2.0
 * Uses jose library for JWT operations
 */

import * as jose from 'jose';

export interface MCPTokenPayload {
  sub: string; // user_id
  scope: string;
  client_id: string;
  iat: number;
  exp: number;
  jti: string; // unique token id
}

/**
 * Sign a JWT access token
 */
export async function signAccessToken(
  payload: Omit<MCPTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 3600 // 1 hour default
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new jose.SignJWT({
    ...payload,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(secretKey);

  return jwt;
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<MCPTokenPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    return payload as unknown as MCPTokenPayload;
  } catch (error) {
    // Token invalid, expired, or tampered
    return null;
  }
}

/**
 * Generate a random string for PKCE code verifier and other tokens
 */
export function generateRandomString(length: number = 43): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  // Base64url encode
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}

/**
 * Generate a SHA-256 code challenge from code verifier (for PKCE)
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify PKCE code challenge
 */
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256'
): Promise<boolean> {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  const computed = await generateCodeChallenge(codeVerifier);
  return computed === codeChallenge;
}

/**
 * Generate a secure random authorization code
 */
export function generateAuthCode(): string {
  return generateRandomString(32);
}
