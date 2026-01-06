/**
 * Session middleware for Better Auth
 * Attaches session and user data to Hono context
 */

import type { Context, Next } from 'hono';
import { createAuth } from './better-auth';
import './types'; // Import type augmentations

/**
 * Session middleware - runs on all routes
 * Attaches session, user, and userId to context (may be null for anonymous requests)
 */
export const sessionMiddleware = async (c: Context, next: Next) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    // Attach session data to context
    c.set('session', session);
    c.set('user', session?.user || null);
    c.set('userId', session?.user?.id || null);
    c.set('authType', session ? 'session' : null);
  } catch (error) {
    // Log error but don't fail the request
    console.error('Session middleware error:', error);
    c.set('session', null);
    c.set('user', null);
    c.set('userId', null);
    c.set('authType', null);
  }

  await next();
};

/**
 * Require authentication middleware
 * Returns 401 for unauthenticated requests
 */
export const requireAuth = async (c: Context, next: Next) => {
  const user = c.get('user');

  if (!user) {
    // Check if this is an API request (JSON) or HTML request
    const accept = c.req.header('Accept') || '';

    if (accept.includes('application/json')) {
      return c.json(
        {
          error: 'Authentication required',
          login_url: '/auth/login',
        },
        401
      );
    }

    // Redirect to login for HTML requests
    const returnUrl = encodeURIComponent(c.req.url);
    return c.redirect(`/auth/login?return=${returnUrl}`);
  }

  await next();
};

/**
 * Optional auth middleware - doesn't require auth but uses it if available
 * Useful for routes that work for both anonymous and authenticated users
 */
export const optionalAuth = async (c: Context, next: Next) => {
  // Session middleware already ran, just continue
  await next();
};

/**
 * Require ownership middleware
 * Checks if the authenticated user owns a resource
 * Must be used after requireAuth
 */
export function requireOwnership(getOwnerId: (c: Context) => Promise<string | null>) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const ownerId = await getOwnerId(c);

    // Allow if resource has no owner (orphaned/legacy data)
    if (!ownerId) {
      // For orphaned data, only allow read operations
      const method = c.req.method.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const accept = c.req.header('Accept') || '';
        if (accept.includes('application/json')) {
          return c.json(
            {
              error: 'This resource has no owner and cannot be modified',
            },
            403
          );
        }
        return c.redirect('/auth/login?error=ownership');
      }
    }

    // Check ownership
    if (ownerId && ownerId !== userId) {
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json(
          {
            error: 'Not authorized to modify this resource',
          },
          403
        );
      }
      return c.redirect('/?error=forbidden');
    }

    await next();
  };
}
