/**
 * Ownership middleware for protecting CUD operations
 * Ensures users can only modify their own resources
 */

import type { Context, Next } from 'hono';
import { ConfigRepository } from '../infrastructure/database';
import '../auth/types';

type ResourceType = 'config' | 'skill' | 'extension' | 'marketplace';

/**
 * Factory function to create ownership checking middleware
 * @param resourceType - The type of resource being accessed
 * @param getResourceId - Function to extract resource ID from request
 */
export function requireOwnership(
  resourceType: ResourceType,
  getResourceId: (c: Context) => string | null
) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const userId = c.get('userId');
    const resourceId = getResourceId(c);

    // If no resource ID, skip ownership check (for create operations)
    if (!resourceId) {
      return next();
    }

    // Get the owner of the resource
    let ownerId: string | null = null;

    try {
      if (resourceType === 'config' || resourceType === 'skill') {
        const repo = new ConfigRepository(c.env.DB);
        ownerId = await repo.getOwnerId(resourceId);
      } else if (resourceType === 'extension') {
        const db = c.env.DB as D1Database;
        const result = await db
          .prepare('SELECT user_id FROM extensions WHERE id = ?')
          .bind(resourceId)
          .first<{ user_id: string | null }>();
        ownerId = result?.user_id || null;
      } else if (resourceType === 'marketplace') {
        const db = c.env.DB as D1Database;
        const result = await db
          .prepare('SELECT user_id FROM marketplaces WHERE id = ?')
          .bind(resourceId)
          .first<{ user_id: string | null }>();
        ownerId = result?.user_id || null;
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
      return c.json({ error: 'Failed to verify ownership' }, 500);
    }

    // Legacy data (no owner) - anyone can modify
    if (ownerId === null) {
      return next();
    }

    // User must be authenticated and be the owner
    if (!userId) {
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json(
          { error: 'Authentication required to modify this resource', login_url: '/auth/login' },
          401
        );
      }
      const returnUrl = encodeURIComponent(c.req.url);
      return c.redirect(`/auth/login?return=${returnUrl}`);
    }

    if (ownerId !== userId) {
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json({ error: 'You do not have permission to modify this resource' }, 403);
      }
      return c.redirect('/?error=forbidden');
    }

    return next();
  };
}

/**
 * Helper to get resource ID from URL params
 */
export function getIdFromParams(c: Context): string | null {
  return c.req.param('id') || null;
}

/**
 * Helper to get config ID from URL params
 */
export function getConfigIdFromParams(c: Context): string | null {
  return c.req.param('configId') || c.req.param('id') || null;
}

/**
 * Helper to get extension ID from URL params
 */
export function getExtensionIdFromParams(c: Context): string | null {
  return c.req.param('extensionId') || c.req.param('id') || null;
}

/**
 * Helper to get marketplace ID from URL params
 */
export function getMarketplaceIdFromParams(c: Context): string | null {
  return c.req.param('marketplaceId') || c.req.param('id') || null;
}

/**
 * Middleware to attach user_id to request body for create operations
 * This should be used before the route handler
 */
export async function attachUserId(c: Context, next: Next): Promise<Response | void> {
  const userId = c.get('userId');

  // Store userId for later use in route handler
  if (userId) {
    // We'll use a custom context variable that handlers can access
    c.set('authenticatedUserId', userId);
  }

  return next();
}

// Extend Hono context to include authenticatedUserId
declare module 'hono' {
  interface ContextVariableMap {
    authenticatedUserId?: string;
  }
}
