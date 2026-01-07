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
  // Validate environment bindings
  if (!env.DB) {
    throw new Error('DB binding is required for Better Auth');
  }
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required for Better Auth');
  }
  if (!env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL is required for Better Auth');
  }

  console.log('Creating Better Auth instance with:', {
    hasDB: !!env.DB,
    hasSecret: !!env.BETTER_AUTH_SECRET,
    hasURL: !!env.BETTER_AUTH_URL,
    hasGitHubClient: !!env.GITHUB_CLIENT_ID,
    hasGitHubSecret: !!env.GITHUB_CLIENT_SECRET,
  });

  // Check if GitHub OAuth is properly configured
  const hasValidGitHubConfig =
    env.GITHUB_CLIENT_ID &&
    env.GITHUB_CLIENT_SECRET &&
    env.GITHUB_CLIENT_ID !== 'placeholder-client-id' &&
    env.GITHUB_CLIENT_SECRET !== 'placeholder-client-secret';

  try {
    const adapter = d1Adapter(env.DB);
    console.log('D1 Adapter created successfully');

    const authInstance = betterAuth({
      database: adapter,
      baseURL: env.BETTER_AUTH_URL,
      basePath: '/api/auth', // Must match the Hono route prefix
      secret: env.BETTER_AUTH_SECRET,

    // Disable email/password login - only OAuth and OTP
    emailAndPassword: {
      enabled: false,
    },

    // GitHub OAuth provider (only if credentials are valid)
    socialProviders: hasValidGitHubConfig
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            scopes: ['read:user', 'user:email'], // Required to get user email
          },
        }
      : {},

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

    console.log('Better Auth instance created. Available routes:', {
      hasGitHub: hasValidGitHubConfig,
      baseURL: env.BETTER_AUTH_URL,
      basePath: '/api/auth',
    });

    return authInstance;
  } catch (error) {
    console.error('Failed to create Better Auth instance:', error);
    throw error;
  }
}

// Export type for the auth instance
export type Auth = ReturnType<typeof createAuth>;
