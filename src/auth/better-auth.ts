/**
 * Better Auth configuration for GitHub OAuth and Email OTP
 */

import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { d1Adapter } from './d1-adapter';

// Bindings type for environment
interface AuthBindings {
  DB: D1Database;
  EMAIL_API_KEY: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

/**
 * Send OTP email using the email service
 */
async function sendOTPEmail(apiKey: string, email: string, otp: string): Promise<void> {
  const subject = 'Your Agent Config Adapter Login Code';
  const body = `
Hello,

Your verification code is: ${otp}

This code will expire in 5 minutes.

If you did not request this code, please ignore this email.

Best,
Agent Config Adapter Team
  `.trim();

  // Use the existing email service endpoint pattern
  await fetch('https://email-api.prashamhtrivedi.app/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: email,
      subject,
      body,
    }),
  });
}

/**
 * Create Better Auth instance for a request
 * Must be called with environment bindings on each request
 */
export function createAuth(env: AuthBindings) {
  return betterAuth({
    database: d1Adapter(env.DB),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    // Disable email/password login - only OAuth and OTP
    emailAndPassword: {
      enabled: false,
    },

    // GitHub OAuth provider
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },

    // Email OTP plugin for passwordless login
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300, // 5 minutes
        sendVerificationOTP: async ({ email, otp }) => {
          await sendOTPEmail(env.EMAIL_API_KEY, email, otp);
        },
      }),
    ],

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes cache
      },
    },

    // Advanced settings
    advanced: {
      useSecureCookies: true, // HTTPS in production
      cookiePrefix: 'agent-config',
    },

    // Trusted origins for CORS
    trustedOrigins: [
      'http://localhost:9090',
      'http://localhost:8787',
      'https://agent-config-adapter.workers.dev',
      'https://agent-config-adapter.prashamhtrivedi.workers.dev',
    ],
  });
}

// Export type for the auth instance
export type Auth = ReturnType<typeof createAuth>;
