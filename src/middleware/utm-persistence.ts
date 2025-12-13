import type { Context, Next } from 'hono';
import type { AnalyticsEngineDataset } from '../domain/types';
import { AnalyticsService } from '../services/analytics-service';

type Env = {
  ANALYTICS?: AnalyticsEngineDataset;
};

/**
 * Middleware to persist UTM parameters in a cookie for first-touch attribution.
 * This ensures we can track the original marketing source across the entire user journey.
 *
 * When a user lands on any page with UTM parameters (e.g., from links.prashamhtrivedi.app),
 * we store these in a cookie. All subsequent analytics events will read from this cookie
 * to maintain attribution even when they navigate to pages without UTM params.
 */
export async function utmPersistenceMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  // Check if we should set a UTM cookie (has URL params, no existing cookie)
  const { shouldSet, utm } = analytics.shouldSetUTMCookie(c.req.raw);

  if (shouldSet) {
    // Set the cookie before the response is created
    c.header('Set-Cookie', analytics.createUTMCookie(utm));
    console.log(`[UTM] Setting first-touch cookie: ${utm.source}/${utm.medium}/${utm.campaign}`);
  }

  // Continue to the next handler
  await next();
}
