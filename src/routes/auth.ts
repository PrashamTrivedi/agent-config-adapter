/**
 * Authentication routes
 * Handles Better Auth endpoints and login/logout UI
 */

import { Hono } from 'hono';
import { createAuth } from '../auth/better-auth';
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

