/**
 * HTML templates for OAuth 2.0 authorization flow
 */

import { icons } from '../../views/icons';

interface AuthorizeParams {
  clientId: string;
  scope: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  userName?: string;
  userEmail?: string;
  error?: string;
}

/**
 * OAuth authorization page template
 * Shows consent screen for users to approve MCP client access
 */
export function authorizePage(params: AuthorizeParams): string {
  const scopeDescriptions: Record<string, string> = {
    read: 'View your configurations, skills, and extensions',
    write: 'Create, modify, and delete your configurations',
    admin: 'Full administrative access to your account',
  };

  const scopes = params.scope.split(' ').filter(Boolean);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Application - Agent Config Adapter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e1a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      width: 100%;
    }
    .card {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .header .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
      border-radius: 16px;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 1.5em;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      color: #94a3b8;
    }
    .user-info {
      background: #1a2332;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5em;
      font-weight: 600;
    }
    .client-info {
      background: #1a2332;
      border-left: 3px solid #06b6d4;
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 0 8px 8px 0;
    }
    .client-info strong {
      color: #06b6d4;
    }
    .scopes-list {
      margin-bottom: 24px;
    }
    .scopes-list h3 {
      font-size: 0.9em;
      color: #94a3b8;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .scope-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #0f1419;
      border: 1px solid #1e293b;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .scope-icon {
      width: 20px;
      height: 20px;
      stroke: #06b6d4;
      fill: none;
    }
    .scope-name {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .scope-desc {
      font-size: 0.85em;
      color: #94a3b8;
    }
    .buttons {
      display: flex;
      gap: 12px;
    }
    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }
    .btn-secondary {
      background: #1a2332;
      color: #f1f5f9;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #202938;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      color: #ef4444;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.85em;
      color: #64748b;
    }
    .footer a {
      color: #06b6d4;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" stroke="white" fill="none" stroke-width="2">
            <path d="M21.5 2v6m-19-6v6m9-9v22m-8 2h16a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-16a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h1>Authorize Access</h1>
        <p>An application wants to access your account</p>
      </div>

      ${params.error ? `<div class="error">${params.error}</div>` : ''}

      ${
        params.userName
          ? `
      <div class="user-info">
        <div class="user-avatar">${params.userName.charAt(0).toUpperCase()}</div>
        <div>
          <strong>${params.userName}</strong>
          <p style="color: #94a3b8; font-size: 0.9em;">${params.userEmail || ''}</p>
        </div>
      </div>
      `
          : ''
      }

      <div class="client-info">
        <strong>${params.clientId}</strong> wants permission to access your Agent Config Adapter account.
      </div>

      <div class="scopes-list">
        <h3>This will allow the application to:</h3>
        ${scopes
          .map(
            (scope) => `
          <div class="scope-item">
            <svg class="scope-icon" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <div class="scope-name">${scope}</div>
              <div class="scope-desc">${scopeDescriptions[scope] || scope}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <form method="POST" action="/mcp/oauth/authorize">
        <input type="hidden" name="client_id" value="${params.clientId}">
        <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
        <input type="hidden" name="scope" value="${params.scope}">
        <input type="hidden" name="state" value="${params.state}">
        <input type="hidden" name="code_challenge" value="${params.codeChallenge}">
        <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}">
        <input type="hidden" name="response_type" value="code">

        <div class="buttons">
          <button type="submit" name="action" value="deny" class="btn btn-secondary">Deny</button>
          <button type="submit" name="action" value="approve" class="btn btn-primary">Approve</button>
        </div>
      </form>

      <div class="footer">
        <p>Make sure you trust this application before approving.</p>
        <p><a href="/">Learn more about Agent Config Adapter</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Error page template
 */
export function errorPage(error: string, description?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Agent Config Adapter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: #0a0e1a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #111827;
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
    }
    h1 { color: #ef4444; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: #1a2332;
      color: #f1f5f9;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${error}</h1>
    <p>${description || 'An error occurred during authorization.'}</p>
    <a href="/">Return to Home</a>
  </div>
</body>
</html>
`;
}

/**
 * Success page after authorization (redirect fallback)
 */
export function successPage(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Successful - Agent Config Adapter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: #0a0e1a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #111827;
      border: 1px solid #14b8a6;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
    }
    h1 { color: #14b8a6; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 24px; }
    .code {
      background: #0f1419;
      padding: 16px;
      border-radius: 8px;
      font-family: monospace;
      word-break: break-all;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: #1a2332;
      color: #f1f5f9;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorization Successful</h1>
    <p>Copy this code back to your MCP client:</p>
    <div class="code">${code}</div>
    <a href="/">Return to Home</a>
  </div>
</body>
</html>
`;
}
