import type { Context, Next } from 'hono';
import { SubscriptionService } from '../services/subscription-service';

/**
 * Email validation regex
 * Basic validation - checks for @ and domain
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Middleware to protect upload endpoints with email subscription gate
 * Checks if user has subscribed before allowing uploads
 */
export const emailGateMiddleware = async (c: Context, next: Next) => {
  // 1. Check for email in request (header or query parameter)
  const email =
    c.req.header('X-Subscriber-Email') || c.req.query('email') || '';

  if (!email) {
    return c.json(
      {
        error: 'Email required for uploads',
        subscription_required: true,
        subscription_url: '/subscriptions/form',
      },
      401
    );
  }

  // 2. Validate email format
  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // 3. Check subscription status in KV
  const subscriptionService = new SubscriptionService(
    c.env.EMAIL_SUBSCRIPTIONS
  );
  const isSubscribed = await subscriptionService.isSubscribed(email);

  if (!isSubscribed) {
    return c.json(
      {
        error: 'Email not subscribed',
        subscription_required: true,
        subscription_url: '/subscriptions/form',
      },
      403
    );
  }

  // 4. Store email in context for logging/tracking
  c.set('subscriberEmail', email);

  await next();
};
