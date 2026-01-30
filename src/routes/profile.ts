/**
 * Profile routes
 * User profile and API key management
 */

import { Hono } from 'hono';
import { ApiKeyService } from '../services/api-key-service';
import { requireAuth } from '../auth/session-middleware';
import { layout } from '../views/layout';
import { icons } from '../views/icons';
import '../auth/types';

type Bindings = {
  DB: D1Database;
  WEB_ANALYTICS_TOKEN?: string;
};

export const profileRouter = new Hono<{ Bindings: Bindings }>();

// All profile routes require authentication
profileRouter.use('/*', requireAuth);

/**
 * Profile page - shows user info and API keys
 */
profileRouter.get('/', async (c) => {
  const user = c.get('user');
  const apiKeyService = new ApiKeyService(c.env.DB);
  const apiKeys = await apiKeyService.listByUser(user.id);

  const content = `
    <div class="fade-in" style="max-width: 800px; margin: 0 auto;">
      <h2 style="display: flex; align-items: center; gap: 12px;">
        ${icons.user('icon')} Your Profile
      </h2>

      <!-- User Info Card -->
      <div class="card" style="margin-bottom: 32px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${
            user.image
              ? `<img src="${user.image}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--border-accent);">`
              : `<div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-violet)); display: flex; align-items: center; justify-content: center; font-size: 2em; font-weight: 600; color: white;">${user.name?.charAt(0)?.toUpperCase() || '?'}</div>`
          }
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 1.4em;">${user.name || 'Unknown'}</h3>
            <p style="margin: 0; color: var(--text-secondary);">${user.email}</p>
            <span class="badge" style="margin-top: 8px; display: inline-flex; align-items: center; gap: 4px;">
              ${user.emailVerified ? `${icons.checkCircle('icon')} Verified` : `${icons.alert('icon')} Unverified`}
            </span>
          </div>
        </div>
      </div>

      <!-- API Keys Section -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
          ${icons.key('icon')} API Keys
        </h3>
        <button type="button" class="btn ripple" onclick="showCreateKeyModal()">
          ${icons.plus('icon')} Create New Key
        </button>
      </div>

      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        API keys allow MCP clients to authenticate without browser login. Keep your keys secure!
      </p>

      <!-- API Keys List -->
      <div id="api-keys-list">
        ${
          apiKeys.length === 0
            ? `
          <div class="card" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <p>No API keys yet. Create one to use with MCP clients.</p>
          </div>
        `
            : apiKeys
                .map(
                  (key) => `
          <div class="card card-hover" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong>${key.name}</strong>
                ${key.is_active ? `<span class="badge" style="background: rgba(20, 184, 166, 0.15); color: var(--success); border-color: var(--success);">Active</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: var(--danger);">Revoked</span>`}
              </div>
              <p style="margin: 4px 0 0 0; color: var(--text-tertiary); font-size: 0.85em; font-family: 'JetBrains Mono', monospace;">
                ${key.prefix}...
              </p>
              <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.8em;">
                Created: ${new Date(key.created_at).toLocaleDateString()}
                ${key.last_used_at ? ` | Last used: ${new Date(key.last_used_at).toLocaleDateString()}` : ''}
                ${key.expires_at ? ` | Expires: ${new Date(key.expires_at).toLocaleDateString()}` : ''}
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              ${
                key.is_active
                  ? `<button type="button" class="btn btn-secondary" style="padding: 8px 12px;" onclick="revokeKey('${key.id}', '${key.name}')" title="Revoke">
                  ${icons.x('icon')}
                </button>`
                  : `<button type="button" class="btn btn-secondary" style="padding: 8px 12px;" onclick="reactivateKey('${key.id}', '${key.name}')" title="Reactivate">
                  ${icons.check('icon')}
                </button>`
              }
              <button type="button" class="btn btn-danger" style="padding: 8px 12px;" onclick="deleteKey('${key.id}', '${key.name}')" title="Delete">
                ${icons.trash('icon')}
              </button>
            </div>
          </div>
        `
                )
                .join('')
        }
      </div>

      <!-- MCP Configuration Help -->
      <div class="card" style="margin-top: 32px; background: var(--bg-tertiary);">
        <h4 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.info('icon')} Using API Keys with MCP Clients
        </h4>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">
          Add your API key to your MCP client configuration:
        </p>
        <pre style="background: var(--pre-bg); padding: 12px; border-radius: 6px; overflow-x: auto;">
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "https://agent-config-adapter.workers.dev/mcp/oauth",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}</pre>
      </div>

      <!-- Account Actions -->
      <div class="card" style="margin-top: 32px;">
        <h4 style="margin: 0 0 12px 0;">Account Actions</h4>
        <form action="/auth/logout" method="POST" style="display: inline-block;">
          <button type="submit" class="btn btn-secondary">
            ${icons.logout('icon')} Sign Out
          </button>
        </form>
      </div>
    </div>

    <!-- Create Key Modal -->
    <div id="create-key-modal" class="modal-overlay" style="display: none;">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${icons.key('icon')} Create API Key</h3>
          <button class="btn btn-secondary" onclick="closeCreateKeyModal()" style="padding: 4px 10px; margin: 0;">×</button>
        </div>
        <div class="modal-body">
          <form id="create-key-form" onsubmit="createKey(event)">
            <div class="form-group">
              <label for="key-name">Key Name *</label>
              <input type="text" id="key-name" name="name" required placeholder="e.g., Claude Code Desktop">
              <span class="help-text">A descriptive name to identify this key</span>
            </div>
            <div class="form-group">
              <label for="key-expiry">Expiration (days)</label>
              <select id="key-expiry" name="expires_in_days">
                <option value="">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <div id="create-key-result"></div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button type="submit" class="btn ripple" style="flex: 1;">Create Key</button>
              <button type="button" class="btn btn-secondary" onclick="closeCreateKeyModal()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Key Created Modal -->
    <div id="key-created-modal" class="modal-overlay" style="display: none;">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--success);">${icons.checkCircle('icon')} Key Created!</h3>
        </div>
        <div class="modal-body">
          <div style="background: rgba(20, 184, 166, 0.1); border: 1px solid rgba(20, 184, 166, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: var(--text-primary);">
              Copy your API key now - it won't be shown again!
            </p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="new-key-value" readonly style="flex: 1; font-family: 'JetBrains Mono', monospace; background: var(--pre-bg);">
              <button type="button" class="btn btn-secondary copy-btn" onclick="copyNewKey(this)">
                ${icons.clipboard('icon')} Copy
              </button>
            </div>
          </div>
          <button type="button" class="btn" style="width: 100%;" onclick="closeKeyCreatedModal()">Done</button>
        </div>
      </div>
    </div>

    <script>
      window.showCreateKeyModal = function() {
        document.getElementById('create-key-modal').style.display = 'flex';
        document.getElementById('key-name').focus();
      };

      window.closeCreateKeyModal = function() {
        document.getElementById('create-key-modal').style.display = 'none';
        document.getElementById('create-key-form').reset();
        document.getElementById('create-key-result').innerHTML = '';
      };

      window.closeKeyCreatedModal = function() {
        document.getElementById('key-created-modal').style.display = 'none';
        window.location.reload(); // Refresh to show new key in list
      };

      window.createKey = async function(event) {
        event.preventDefault();
        const name = document.getElementById('key-name').value.trim();
        const expiresInDays = document.getElementById('key-expiry').value;
        const resultDiv = document.getElementById('create-key-result');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        if (!name) {
          resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Please enter a key name</div>';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating...';
        resultDiv.innerHTML = '';

        try {
          const response = await fetch('/api/profile/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, expires_in_days: expiresInDays ? parseInt(expiresInDays) : null }),
          });

          const data = await response.json();

          if (response.ok && data.key) {
            window.closeCreateKeyModal();
            document.getElementById('new-key-value').value = data.key;
            document.getElementById('key-created-modal').style.display = 'flex';
          } else {
            resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">' + (data.error || 'Failed to create key') + '</div>';
          }
        } catch (error) {
          resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Failed to create key</div>';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Create Key';
        }
      };

      window.copyNewKey = function(button) {
        const keyInput = document.getElementById('new-key-value');
        navigator.clipboard.writeText(keyInput.value).then(() => {
          button.textContent = '✓ Copied!';
          button.classList.add('copied');
          setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        });
      };

      window.revokeKey = async function(id, name) {
        if (!confirm('Revoke API key "' + name + '"? This key will no longer work.')) return;

        const response = await fetch('/api/profile/keys/' + id + '/revoke', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          window.showToast('API key revoked', 'success');
          window.location.reload();
        } else {
          window.showToast('Failed to revoke key', 'error');
        }
      };

      window.reactivateKey = async function(id, name) {
        if (!confirm('Reactivate API key "' + name + '"?')) return;

        const response = await fetch('/api/profile/keys/' + id + '/reactivate', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          window.showToast('API key reactivated', 'success');
          window.location.reload();
        } else {
          window.showToast('Failed to reactivate key', 'error');
        }
      };

      window.deleteKey = async function(id, name) {
        if (!confirm('Permanently delete API key "' + name + '"? This cannot be undone.')) return;

        const response = await fetch('/api/profile/keys/' + id, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          window.showToast('API key deleted', 'success');
          window.location.reload();
        } else {
          window.showToast('Failed to delete key', 'error');
        }
      };
    </script>
  `;

  return c.html(layout('Profile', content, c));
});

/**
 * API: Create new API key
 */
profileRouter.post('/keys', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; expires_in_days?: number | null }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'Key name is required' }, 400);
  }

  const apiKeyService = new ApiKeyService(c.env.DB);

  // Limit keys per user
  const count = await apiKeyService.countByUser(user.id);
  if (count >= 10) {
    return c.json({ error: 'Maximum of 10 API keys per user' }, 400);
  }

  const result = await apiKeyService.create(
    user.id,
    body.name.trim(),
    body.expires_in_days || undefined
  );

  return c.json(result, 201);
});

/**
 * API: List user's API keys
 */
profileRouter.get('/keys', async (c) => {
  const user = c.get('user');
  const apiKeyService = new ApiKeyService(c.env.DB);
  const keys = await apiKeyService.listByUser(user.id);

  return c.json({ keys });
});

/**
 * API: Revoke an API key
 */
profileRouter.post('/keys/:id/revoke', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.revoke(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found or already revoked' }, 404);
  }

  return c.json({ success: true });
});

/**
 * API: Reactivate an API key
 */
profileRouter.post('/keys/:id/reactivate', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.reactivate(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * API: Delete an API key permanently
 */
profileRouter.delete('/keys/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.delete(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ success: true });
});
