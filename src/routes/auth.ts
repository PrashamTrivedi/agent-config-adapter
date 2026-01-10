/**
 * Authentication routes
 * Handles Better Auth endpoints and login/logout UI
 */

import { Hono } from 'hono';
import { createAuth } from '../auth/better-auth';
import { layout } from '../views/layout';
import { icons } from '../views/icons';
import { AnalyticsService } from '../services/analytics-service';
import { EmailService } from '../services/email-service';
import type { AnalyticsEngineDataset } from '../domain/types';

type Bindings = {
  DB: D1Database;
  EMAIL_API_KEY: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  WEB_ANALYTICS_TOKEN?: string;
  ANALYTICS?: AnalyticsEngineDataset;
  ADMIN_EMAIL: string;
};

export const authRouter = new Hono<{ Bindings: Bindings }>();

/**
 * Better Auth handler - handles all /api/auth/* routes
 * This includes OAuth callbacks, session management, etc.
 * Includes analytics tracking for login attempts and outcomes.
 */
authRouter.all('/*', async (c) => {
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  const url = new URL(c.req.url);
  const pathname = url.pathname.replace('/api/auth', '');

  try {
    const auth = createAuth(c.env);

    // Track login attempts before processing
    if (pathname === '/sign-in/social' && c.req.method === 'POST') {
      try {
        const clonedReq = c.req.raw.clone();
        const body = await clonedReq.json() as { provider?: string };
        if (body.provider === 'github') {
          await analytics.trackLoginAttempt(c.req.raw, 'github');
        }
      } catch {
        // Ignore body parse errors
      }
    }

    if (pathname === '/email-otp/send-verification-otp' && c.req.method === 'POST') {
      await analytics.trackLoginAttempt(c.req.raw, 'email_otp');
    }

    // Create a new Request with the base URL that matches Better Auth's baseURL config
    const authRequest = new Request(url, c.req.raw);
    console.log('Better Auth handler - URL:', url.toString());

    const response = await auth.handler(authRequest);
    console.log('Better Auth response:', response.status);

    // Track outcomes after processing - GitHub OAuth callback
    if (pathname.startsWith('/callback/github')) {
      if (response.status === 302) {
        const location = response.headers.get('location');
        if (location && !location.includes('error')) {
          // Successful OAuth - try to get session to track user
          try {
            const session = await auth.api.getSession({ headers: c.req.raw.headers });
            if (session?.user) {
              await analytics.trackLoginSuccess(c.req.raw, 'github', session.user.id);

              // Send admin notification (non-blocking)
              const emailService = new EmailService(c.env.EMAIL_API_KEY, c.env.ADMIN_EMAIL);
              emailService.sendLoginNotification(
                session.user.email,
                session.user.name,
                'github',
                new Date().toISOString()
              ).catch(err => console.error('Failed to send login notification:', err));
            }
          } catch {
            // Session not available yet in callback, tracking will happen on next request
          }
        } else {
          await analytics.trackLoginFail(c.req.raw, 'github', 'oauth_callback_error');
        }
      }
    }

    // Track Email OTP verification outcome
    if (pathname === '/sign-in/email-otp' && c.req.method === 'POST') {
      if (response.status === 200) {
        try {
          const clonedResponse = response.clone();
          const responseData = await clonedResponse.json() as { user?: { id: string; email: string; name: string | null } };
          if (responseData.user) {
            await analytics.trackLoginSuccess(c.req.raw, 'email_otp', responseData.user.id);

            // Send admin notification (non-blocking)
            const emailService = new EmailService(c.env.EMAIL_API_KEY, c.env.ADMIN_EMAIL);
            emailService.sendLoginNotification(
              responseData.user.email,
              responseData.user.name,
              'email_otp',
              new Date().toISOString()
            ).catch(err => console.error('Failed to send login notification:', err));
          }
        } catch {
          // Ignore response parse errors
        }
      } else {
        await analytics.trackLoginFail(c.req.raw, 'email_otp', 'invalid_otp');
      }
    }

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
  const referrer = c.req.header('Referer') || 'direct';

  // Track login page view
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  await analytics.trackLoginPageView(c.req.raw, {
    referrer,
    returnUrl,
  });

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

      // Abandoned login tracking
      const loginEntryTime = Date.now();
      let loginCompleted = false;

      // Best-effort abandoned tracking via sendBeacon
      window.addEventListener('beforeunload', () => {
        if (!loginCompleted) {
          const timeSpent = Math.floor((Date.now() - loginEntryTime) / 1000);
          navigator.sendBeacon('/api/analytics/track', JSON.stringify({
            event: 'login_abandoned',
            metadata: { timeSpent }
          }));
        }
      });

      // Mark login as started when auth flow begins
      function markLoginStarted() {
        loginCompleted = true;
      }

      async function signInWithGitHub(callbackURL) {
        markLoginStarted();
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
            loginCompleted = false; // Allow abandoned tracking if failed
            alert('Failed to initiate GitHub sign-in. Please try again.');
          }
        } catch (error) {
          loginCompleted = false; // Allow abandoned tracking if failed
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
          // Verify OTP - mark as started
          markLoginStarted();
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
              loginCompleted = false; // Allow abandoned tracking if failed
              resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">' + (data.error || 'Invalid code. Please try again.') + '</div>';
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'Verify Code';
            }
          } catch (error) {
            loginCompleted = false; // Allow abandoned tracking if failed
            resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">Verification failed. Please try again.</div>';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Verify Code';
          }
          return;
        }

        // Send OTP - mark as started
        markLoginStarted();
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
            loginCompleted = false; // Allow abandoned tracking if failed
            resultDiv.innerHTML = '<div class="status-indicator status-error" style="padding: 10px;">' + (data.error || 'Failed to send code. Please try again.') + '</div>';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send Code';
          }
        } catch (error) {
          loginCompleted = false; // Allow abandoned tracking if failed
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
