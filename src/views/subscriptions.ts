import { layout } from './layout';
import { icons } from './icons';

/**
 * HTML escape helper
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Subscription form view with marketing copy
 */
export function subscriptionFormView(returnUrl?: string, c?: any): string {
  return layout(
    'Subscribe for Upload Access',
    `
    <div class="fade-in">
      <div class="card" style="max-width: 700px; margin: 40px auto;">
        <h2 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 12px;">
          ${icons.mail('icon')} Get Early Access to Uploads
        </h2>

        <!-- Marketing Banner -->
        <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%); border-left: 4px solid var(--accent-primary); padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <div style="font-size: 1.5em;">🚀</div>
            <div>
              <h3 style="margin: 0 0 8px 0; color: var(--accent-primary); font-size: 1.1em;">
                Create, Edit, and Delete Features Coming Soon!
              </h3>
              <p style="margin: 0; color: var(--text-primary); line-height: 1.6;">
                We're building a full authentication system with user accounts. When it's ready, you'll be able to securely create, update, delete, and manage your agent configurations, skills, and extensions.
              </p>
              <p style="margin: 8px 0 0 0; color: var(--text-secondary); font-size: 0.95em;">
                <strong>Want early access?</strong> Sign up below to be notified when user accounts and editing features launch!
              </p>
            </div>
          </div>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95em;">
          Browse and explore all configs, skills, and extensions freely. Sign up to be notified when editing features are available!
        </p>

        <form
          hx-post="/api/subscriptions/subscribe"
          hx-target="#subscription-result"
          hx-swap="innerHTML">

          <div class="form-group">
            <label for="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com"
              style="width: 100%; padding: 12px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 6px; color: var(--text-primary); font-size: 1em;">
            <span class="help-text" style="display: block; margin-top: 6px; font-size: 0.85em; color: var(--text-secondary);">
              We'll send a confirmation to this address
            </span>
          </div>

          <div class="form-group" style="margin-top: 16px;">
            <label for="referral_source">How did you find us?</label>
            <select
              id="referral_source"
              name="referral_source"
              style="width: 100%; padding: 12px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 6px; color: var(--text-primary); font-size: 1em; cursor: pointer;"
              onchange="document.getElementById('referral-other-container').style.display = this.value === 'other' ? 'block' : 'none'">
              <option value="">Select an option...</option>
              <option value="prasham">Straight from Prasham</option>
              <option value="reddit">Reddit</option>
              <option value="x">X (Twitter)</option>
              <option value="friend">Friend</option>
              <option value="other">Somewhere else...</option>
            </select>
          </div>

          <div id="referral-other-container" class="form-group" style="margin-top: 16px; display: none;">
            <label for="referral_other">Please specify:</label>
            <input
              type="text"
              id="referral_other"
              name="referral_other"
              placeholder="Where did you hear about us?"
              style="width: 100%; padding: 12px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 6px; color: var(--text-primary); font-size: 1em;">
          </div>

          <div id="subscription-result" style="margin-bottom: 16px;"></div>

          <button type="submit" class="btn ripple" style="width: 100%; padding: 14px; background: var(--accent-primary); color: white; border: none; border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${icons.check('icon')} Subscribe
          </button>
          ${
            returnUrl
              ? `
            <input type="hidden" name="return_url" value="${escapeHtml(returnUrl)}">
          `
              : ''
          }
        </form>

        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-dim); font-size: 0.9em; color: var(--text-secondary);">
          <p style="margin: 0 0 8px 0;">
            <strong style="color: var(--text-primary);">What you'll get:</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Notification when user accounts launch</li>
            <li>Early access to create, edit, and delete features</li>
            <li>Ability to upload and manage your own configs</li>
            <li>Updates about new features and improvements</li>
          </ul>
          <p style="margin: 16px 0 0 0; font-size: 0.85em; color: var(--text-secondary);">
            By subscribing, you agree to receive notifications about platform updates and feature launches.
          </p>
        </div>
      </div>
    </div>

    <script>
      document.body.addEventListener('htmx:afterRequest', function(evt) {
        if (evt.detail.successful && evt.detail.target.id === 'subscription-result') {
          const result = JSON.parse(evt.detail.xhr.responseText)
          const container = document.getElementById('subscription-result')

          if (result.subscription || result.subscribed) {
            // Store email in localStorage
            const email = document.getElementById('email').value
            localStorage.setItem('subscriberEmail', email)
            localStorage.setItem('subscribedAt', new Date().toISOString())

            container.innerHTML = \`
              <div class="status-indicator status-success" style="padding: 12px; background: rgba(20, 184, 166, 0.1); border-radius: 6px; border: 1px solid rgba(20, 184, 166, 0.3); display: flex; align-items: center; gap: 10px;">
                <span style="width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: inline-block;"></span>
                <span style="color: var(--text-primary);">\${result.message}</span>
              </div>
            \`

            // Redirect after 2 seconds if return_url exists
            const formData = new FormData(evt.detail.target)
            const returnUrl = formData.get('return_url')
            if (returnUrl) {
              setTimeout(() => {
                window.location.href = returnUrl
              }, 2000)
            }
          }
        } else if (!evt.detail.successful && evt.detail.target.id === 'subscription-result') {
          const container = document.getElementById('subscription-result')
          let errorMsg = 'Failed to subscribe'
          try {
            const result = JSON.parse(evt.detail.xhr.responseText)
            errorMsg = result.error || errorMsg
          } catch (e) {
            // Use default error message
          }

          container.innerHTML = \`
            <div class="status-indicator status-error" style="padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; gap: 10px;">
              <span style="width: 8px; height: 8px; background: var(--danger); border-radius: 50%; display: inline-block;"></span>
              <span style="color: var(--text-primary);">\${errorMsg}</span>
            </div>
          \`
        }
      })

      // Auto-populate email from localStorage if exists
      document.addEventListener('DOMContentLoaded', function() {
        const storedEmail = localStorage.getItem('subscriberEmail')
        if (storedEmail) {
          document.getElementById('email').value = storedEmail
        }
      })
    </script>
  `,
    c
  );
}
