/**
 * Authentication routes
 * Handles Better Auth endpoints and login/logout UI
 */

import { Hono } from 'hono';
import { createAuth } from '../auth/better-auth';
import { layout } from '../views/layout';
import { icons } from '../views/icons';

type Bindings = {
  DB: D1Database;
  EMAIL_API_KEY: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  WEB_ANALYTICS_TOKEN?: string;
};

export const authRouter = new Hono<{ Bindings: Bindings }>();

/**
 * Better Auth handler - handles all /api/auth/* routes
 * This includes OAuth callbacks, session management, etc.
 */
authRouter.all('/*', async (c) => {
  try {
    const auth = createAuth(c.env);

    // Create a new Request with the base URL that matches Better Auth's baseURL config
    // This ensures Better Auth can properly route the request
    const url = new URL(c.req.url);
    const authRequest = new Request(url, c.req.raw);

    console.log('Better Auth handler - URL:', url.toString());

    const response = await auth.handler(authRequest);
    console.log('Better Auth response:', response.status);

    return response;
  } catch (error) {
    console.error('Better Auth handler error:', error);
    return c.json({ error: 'Authentication error' }, 500);
  }
});

/**
 * Login page UI
 */
export const authUIRouter = new Hono<{ Bindings: Bindings }>();

authUIRouter.get('/login', async (c) => {
  const returnUrl = c.req.query('return') || '/';
  const error = c.req.query('error');

  const errorMessages: Record<string, string> = {
    ownership: 'You do not have permission to modify this resource.',
    session: 'Your session has expired. Please log in again.',
    forbidden: 'You are not authorized to perform this action.',
  };

  const errorMessage = error ? errorMessages[error] || 'An error occurred.' : null;

  const content = `
    <div class="fade-in" style="max-width: 480px; margin: 60px auto;">
      <div class="card" style="padding: 40px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-violet) 100%); border-radius: 16px; margin-bottom: 16px;">
            ${icons.user('icon-lg')}
          </div>
          <h2 style="margin: 0 0 8px 0; border: none; padding: 0; background: linear-gradient(135deg, var(--accent-primary), var(--accent-violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Welcome Back
          </h2>
          <p style="margin: 0; color: var(--text-secondary);">
            Sign in to manage your configurations
          </p>
        </div>

        ${
          errorMessage
            ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: var(--danger); font-size: 0.9em; display: flex; align-items: center; gap: 8px;">
            ${icons.alert('icon')} ${errorMessage}
          </p>
        </div>
        `
            : ''
        }

        <!-- GitHub OAuth Button -->
        <button
          onclick="signInWithGitHub('${returnUrl}')"
          type="button"
          class="btn ripple"
          style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; font-size: 1em; margin-bottom: 16px; background: #24292e;">
          ${icons.github('icon')}
          <span>Continue with GitHub</span>
        </button>

        <div style="display: flex; align-items: center; gap: 16px; margin: 24px 0;">
          <div style="flex: 1; height: 1px; background: var(--border-dim);"></div>
          <span style="color: var(--text-tertiary); font-size: 0.9em;">or</span>
          <div style="flex: 1; height: 1px; background: var(--border-dim);"></div>
        </div>

        <!-- Email OTP Form -->
        <form id="email-otp-form" onsubmit="sendOTP(event)">
          <input type="hidden" name="return" value="${returnUrl}">

          <div class="form-group" style="margin-bottom: 16px;">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com"
              style="padding: 14px;">
          </div>

          <div id="otp-section" style="display: none;">
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="otp">Verification Code</label>
              <input
                type="text"
                id="otp"
                name="otp"
                placeholder="Enter 6-digit code"
                maxlength="6"
                pattern="[0-9]{6}"
                style="padding: 14px; font-size: 1.2em; letter-spacing: 0.3em; text-align: center;">
              <span class="help-text">Check your email for the verification code</span>
            </div>
          </div>

          <div id="otp-result" style="margin-bottom: 16px;"></div>

          <button type="submit" id="otp-submit-btn" class="btn btn-secondary ripple" style="width: 100%; padding: 14px;">
            ${icons.mail('icon')} Send Code
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; font-size: 0.85em; color: var(--text-tertiary);">
          <p style="margin: 0;">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="/" style="color: var(--text-secondary); text-decoration: none; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px;">
          ${icons.arrowLeft('icon')} Back to Home
        </a>
      </div>
    </div>

    <script>
      let otpSent = false;
      const returnUrl = '${returnUrl}';

      async function signInWithGitHub(callbackURL) {
        try {
          const response = await fetch('/api/auth/sign-in/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'github', callbackURL }),
            credentials: 'include'
          });

          const data = await response.json();

          if (response.ok && data.url) {
            // Redirect to GitHub OAuth page
            window.location.href = data.url;
          } else {
            alert('Failed to initiate GitHub sign-in. Please try again.');
          }
        } catch (error) {
          console.error('GitHub sign-in error:', error);
          alert('An error occurred. Please try again.');
        }
      }

      async function sendOTP(event) {
        event.preventDefault();
        const email = document.getElementById('email').value.trim();
        const resultDiv = document.getElementById('otp-result');
        const submitBtn = document.getElementById('otp-submit-btn');
        const otpSection = document.getElementById('otp-section');
        const otpInput = document.getElementById('otp');

        if (!email) {
          resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Please enter your email address</div>';
          return;
        }

        if (otpSent && otpInput.value.length === 6) {
          // Verify OTP
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner"></span> Verifying...';
          resultDiv.innerHTML = '';

          try {
            const response = await fetch('/api/auth/sign-in/email-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, otp: otpInput.value }),
              credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.user) {
              resultDiv.innerHTML = '<div class="status-indicator status-success" style="padding: 10px;">Success! Redirecting...</div>';
              window.location.href = returnUrl;
            } else {
              resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">' + (data.error || 'Invalid code. Please try again.') + '</div>';
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'Verify Code';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Verification failed. Please try again.</div>';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Verify Code';
          }
          return;
        }

        // Send OTP
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending code...';
        resultDiv.innerHTML = '';

        try {
          const response = await fetch('/api/auth/email-otp/send-verification-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'sign-in' }),
          });

          const data = await response.json();

          if (response.ok) {
            otpSent = true;
            otpSection.style.display = 'block';
            document.getElementById('email').readOnly = true;
            otpInput.focus();
            submitBtn.innerHTML = 'Verify Code';
            submitBtn.disabled = false;
            resultDiv.innerHTML = '<div class="status-indicator status-success" style="padding: 10px;">Code sent! Check your email.</div>';
          } else {
            resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">' + (data.error || 'Failed to send code. Please try again.') + '</div>';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send Code';
          }
        } catch (error) {
          resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Failed to send code. Please try again.</div>';
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Code';
        }
      }
    </script>
  `;

  return c.html(layout('Login', content, c));
});

/**
 * Logout handler
 */
authUIRouter.post('/logout', async (c) => {
  const auth = createAuth(c.env);

  try {
    // Sign out via Better Auth
    await auth.api.signOut({
      headers: c.req.raw.headers,
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Redirect to home
  return c.redirect('/');
});

/**
 * Logout page (GET - for link clicks)
 */
authUIRouter.get('/logout', async (c) => {
  const content = `
    <div class="fade-in" style="max-width: 480px; margin: 60px auto;">
      <div class="card" style="padding: 40px; text-align: center;">
        <h2 style="margin: 0 0 16px 0; border: none; padding: 0;">Sign Out</h2>
        <p style="margin: 0 0 24px 0; color: var(--text-secondary);">
          Are you sure you want to sign out?
        </p>
        <form action="/auth/logout" method="POST" style="display: inline-block;">
          <button type="submit" class="btn ripple" style="margin-right: 12px;">
            ${icons.logout('icon')} Sign Out
          </button>
          <a href="/" class="btn btn-secondary">Cancel</a>
        </form>
      </div>
    </div>
  `;

  return c.html(layout('Sign Out', content, c));
});
