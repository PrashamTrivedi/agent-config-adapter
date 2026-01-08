import { Hono } from 'hono';
import { SubscriptionService } from '../services/subscription-service';
import { EmailService } from '../services/email-service';
import { subscriptionFormView } from '../views/subscriptions';
import { AnalyticsService } from '../services/analytics-service';
import type { AnalyticsEngineDataset, ReferralSource } from '../domain/types';

type Bindings = {
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  EMAIL_API_KEY: string; // Custom email service API key
  ADMIN_EMAIL: string;
  ANALYTICS?: AnalyticsEngineDataset;
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
 * GET /subscriptions/form
 * Show subscription form (HTML view)
 */
subscriptionsRouter.get('/form', async (c) => {
  const returnUrl = c.req.query('return');
  return c.html(subscriptionFormView(returnUrl, c));
});

/**
 * Valid referral sources
 */
const VALID_REFERRAL_SOURCES: ReferralSource[] = ['prasham', 'reddit', 'x', 'friend', 'other'];

/**
 * POST /api/subscriptions/subscribe
 * Subscribe a new email address
 */
subscriptionsRouter.post('/subscribe', async (c) => {
  try {
    // Parse request body (handle both JSON and form data)
    let email: string;
    let referralSource: ReferralSource | undefined;
    let referralOther: string | undefined;
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      email = body.email;
      referralSource = body.referral_source;
      referralOther = body.referral_other;
    } else {
      // Form data
      const formData = await c.req.parseBody();
      email = formData.email as string;
      referralSource = formData.referral_source as ReferralSource | undefined;
      referralOther = formData.referral_other as string | undefined;
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate referral source if provided
    if (referralSource && !VALID_REFERRAL_SOURCES.includes(referralSource)) {
      referralSource = undefined;
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

    // Track email submit event
    const analytics = new AnalyticsService(c.env.ANALYTICS);
    await analytics.trackEvent(c.req.raw, 'email_submit');

    // Subscribe
    const ipAddress = c.req.header('CF-Connecting-IP');
    const subscription = await subscriptionService.subscribe(
      email,
      ipAddress,
      referralSource,
      referralOther
    );

    // Send emails (admin notification + welcome email to user)
    try {
      const emailService = new EmailService(
        c.env.EMAIL_API_KEY,
        c.env.ADMIN_EMAIL
      );

      console.log(`[Email] Sending admin notification to ${c.env.ADMIN_EMAIL}`);
      // Send admin notification about new subscriber
      await emailService.sendSubscriptionNotification(
        email,
        subscription.subscribedAt,
        subscription.referralSource,
        subscription.referralOther
      );
      console.log('[Email] Admin notification sent successfully');

      console.log(`[Email] Sending welcome email to ${email}`);
      // Send welcome email to the user
      await emailService.sendWelcomeEmail(email);
      console.log('[Email] Welcome email sent successfully');
    } catch (emailError) {
      console.error('[Email] Failed to send emails:', emailError);
      if (emailError instanceof Error) {
        console.error('[Email] Error details:', {
          message: emailError.message,
          stack: emailError.stack,
        });
      }
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
