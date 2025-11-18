import type { Context, Next } from 'hono';

/**
 * Lockdown middleware - blocks all CUD operations until login is implemented
 *
 * This middleware serves as a placeholder while we collect emails for early access.
 * Once user authentication is implemented, this will be replaced with proper auth middleware.
 */
export const lockdownMiddleware = async (c: Context, _next: Next) => {
  return c.json(
    {
      error: 'Feature coming soon',
      message:
        'Create, update, and delete operations are not yet available. Sign up to be notified when user accounts launch!',
      subscription_url: '/subscriptions/form',
      coming_soon: true,
    },
    403
  );
};
