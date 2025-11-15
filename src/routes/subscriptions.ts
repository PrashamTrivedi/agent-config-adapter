import { Hono } from 'hono';
import { SubscriptionService } from '../services/subscription-service';
import { EmailService } from '../services/email-service';

type Bindings = {
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  EMAIL: any; // Cloudflare send_email binding
  ADMIN_EMAIL: string;
};

/**
 * Email validation regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const subscriptionsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/subscriptions/subscribe
 * Subscribe a new email address
 */
subscriptionsRouter.post('/subscribe', async (c) => {
  try {
    // Parse request body
    const body = await c.req.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Check if already subscribed
    const subscriptionService = new SubscriptionService(
      c.env.EMAIL_SUBSCRIPTIONS
    );
    const existing = await subscriptionService.isSubscribed(email);

    if (existing) {
      return c.json({
        message: 'Email already subscribed',
        subscribed: true,
      });
    }

    // Subscribe
    const ipAddress = c.req.header('CF-Connecting-IP');
    const subscription = await subscriptionService.subscribe(email, ipAddress);

    // Send admin notification
    try {
      const emailService = new EmailService(
        c.env.EMAIL,
        c.env.ADMIN_EMAIL
      );
      await emailService.sendSubscriptionNotification(
        email,
        subscription.subscribedAt
      );
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the subscription if email fails
    }

    return c.json(
      {
        message: 'Subscribed successfully',
        subscription,
      },
      201
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return c.json(
      {
        error: 'Failed to subscribe',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/subscriptions/verify/:email
 * or GET /api/subscriptions/verify?email=xxx
 * Check if email is subscribed
 */
subscriptionsRouter.get('/verify/:email', async (c) => {
  try {
    const email = c.req.param('email') || c.req.query('email');

    if (!email) {
      return c.json({ error: 'Email parameter required' }, 400);
    }

    const subscriptionService = new SubscriptionService(
      c.env.EMAIL_SUBSCRIPTIONS
    );
    const isSubscribed = await subscriptionService.isSubscribed(email);

    return c.json({
      email,
      subscribed: isSubscribed,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return c.json(
      {
        error: 'Failed to verify subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/subscriptions/verify (without param)
 * Support both param and query string
 */
subscriptionsRouter.get('/verify', async (c) => {
  try {
    const email = c.req.query('email');

    if (!email) {
      return c.json({ error: 'Email query parameter required' }, 400);
    }

    const subscriptionService = new SubscriptionService(
      c.env.EMAIL_SUBSCRIPTIONS
    );
    const isSubscribed = await subscriptionService.isSubscribed(email);

    return c.json({
      email,
      subscribed: isSubscribed,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return c.json(
      {
        error: 'Failed to verify subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
