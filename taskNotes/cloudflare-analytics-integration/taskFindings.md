# Purpose

Integrate Cloudflare Web Analytics and Workers Analytics Engine to track user journeys, conversion funnels, and engagement metrics across the platform.

## Original Ask

We need to integrate Cloudflare web analytics (Find online about it) in our platform

Some of the metrics we want to measure is

- Country of the requestor (Exclude if automatically captured)
- First page
- The entire traceable funnel from first page to email entry (And the place where email entry is done)
- Selected Config Data (Format, Name and type)
- The target of conversion
- What do they do in Slash Commands page
- Their activity in Plugins and Marketplace page
- Pageview at every static and dynamic page, number and time
- Specific Onboarding Page
- Track the parameters like source and other parameters we pass as query param and page param for onboarding which are solely for analytics tracing...

If something is overlapping, consider them into one. Otherwise plan for the analytics

## Complexity and the reason behind it

**Complexity Score: 3/5**

Reasoning:
- Requires integration of TWO Cloudflare analytics solutions (Web Analytics + Workers Analytics Engine)
- Needs comprehensive server-side instrumentation across multiple routes
- Requires database schema changes for analytics configuration
- Frontend JavaScript changes for client-side event tracking
- SQL-based analytics queries for funnel analysis
- UTM parameter tracking and session management logic
- Not just a simple beacon integration - requires strategic event design
- Testing requires generating realistic user journeys and validating data collection
- Moderate complexity, but well-documented by Cloudflare

## Architectural changes required

### New Infrastructure Components

1. **Workers Analytics Engine Dataset**
   - Add `analytics_engine_datasets` binding to `wrangler.jsonc`
   - Dataset name: `user_analytics`
   - Server-side data point tracking

2. **Web Analytics Token**
   - Add `WEB_ANALYTICS_TOKEN` environment variable
   - Client-side JavaScript beacon integration

3. **Analytics Service Layer** (NEW)
   - Create `src/services/analytics-service.ts`
   - Centralize all analytics tracking logic
   - Provide typed events and properties
   - Handle funnel step tracking
   - Manage UTM parameter extraction and storage

### Data Architecture

**Analytics Event Schema:**
```typescript
interface AnalyticsEvent {
  indexes: [string];  // Session ID or User ID
  blobs: [
    eventName: string,        // Event type (page_view, config_select, etc.)
    path: string,             // URL path
    referrer: string,         // Referrer source
    country: string,          // User country
    city: string,             // User city (optional)
    utmSource: string,        // UTM source parameter
    utmMedium: string,        // UTM medium parameter
    utmCampaign: string,      // UTM campaign parameter
    onboardingICP: string,    // Which ICP page (if applicable)
    configFormat: string,     // Selected config format (if applicable)
    configType: string,       // Selected config type (if applicable)
    configName: string        // Config name (if applicable)
  ];
  doubles: [
    timestamp: number,        // Event timestamp
    sessionDuration: number,  // Time spent on page (seconds)
    conversionValue: number   // Conversion value (if applicable)
  ];
}
```

**Funnel Steps to Track:**
1. `landing` - First page view
2. `onboarding_view` - Viewing ICP onboarding page
3. `configs_browse` - Browsing configs/skills/extensions
4. `config_view` - Viewing specific config detail
5. `config_conversion` - Converting config format
6. `slash_command_convert` - Using slash command converter
7. `email_gate_view` - Email subscription modal shown
8. `email_submit` - Email subscription submitted
9. `plugin_browse` - Browsing plugin downloads
10. `marketplace_browse` - Browsing marketplace

## Backend changes required

### 1. Update `wrangler.jsonc`

**Add Analytics Engine Dataset:**
```jsonc
{
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS",
      "dataset": "user_analytics"
    }
  ],
  "vars": {
    "WEB_ANALYTICS_TOKEN": "YOUR_TOKEN_FROM_DASHBOARD"
    // ... existing vars
  }
}
```

### 2. Update `src/domain/types.ts`

**Add Analytics Types:**
```typescript
// Analytics Engine dataset binding
export interface AnalyticsEngineDataset {
  writeDataPoint(data: {
    indexes?: string[];
    blobs?: string[];
    doubles?: number[];
  }): void;
}

// Environment with Analytics binding
export interface Env {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  EMAIL: SendEmail;
  ANALYTICS: AnalyticsEngineDataset;  // NEW
  WEB_ANALYTICS_TOKEN: string;         // NEW
  // ... existing bindings
}

// Analytics event types
export type AnalyticsEventType =
  | 'landing'
  | 'page_view'
  | 'onboarding_view'
  | 'configs_browse'
  | 'config_view'
  | 'config_conversion'
  | 'slash_command_convert'
  | 'email_gate_view'
  | 'email_submit'
  | 'plugin_browse'
  | 'marketplace_browse'
  | 'extension_download'
  | 'skill_download';

// UTM parameters
export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// Analytics metadata
export interface AnalyticsMetadata {
  userId?: string;
  sessionId?: string;
  configFormat?: 'claude_code' | 'codex' | 'gemini';
  configType?: 'slash_command' | 'mcp_config' | 'agent_definition' | 'skill';
  configName?: string;
  onboardingICP?: 'no-code-builders' | 'multi-tool-orgs' | 'ai-pilot-teams';
  conversionTarget?: string;
  timeSpent?: number;
  [key: string]: string | number | undefined;
}
```

### 3. Create `src/services/analytics-service.ts`

**Analytics Service Implementation:**
```typescript
import type { Env, AnalyticsEventType, UTMParams, AnalyticsMetadata } from '../domain/types';

export class AnalyticsService {
  constructor(private env: Env) {}

  /**
   * Extract UTM parameters from URL
   */
  extractUTMParams(url: URL): UTMParams {
    return {
      source: url.searchParams.get('utm_source') || undefined,
      medium: url.searchParams.get('utm_medium') || undefined,
      campaign: url.searchParams.get('utm_campaign') || undefined,
      term: url.searchParams.get('utm_term') || undefined,
      content: url.searchParams.get('utm_content') || undefined,
    };
  }

  /**
   * Generate or retrieve session ID from request
   */
  getSessionId(request: Request): string {
    // Use CF-Ray header as session ID (unique per request edge location)
    return request.headers.get('cf-ray') || crypto.randomUUID();
  }

  /**
   * Track analytics event
   */
  async trackEvent(
    request: Request,
    eventType: AnalyticsEventType,
    metadata?: AnalyticsMetadata
  ): Promise<void> {
    try {
      const url = new URL(request.url);
      const cf = request.cf;
      const utm = this.extractUTMParams(url);
      const sessionId = metadata?.sessionId || this.getSessionId(request);

      // Write data point to Analytics Engine
      this.env.ANALYTICS.writeDataPoint({
        indexes: [sessionId],
        blobs: [
          eventType,
          url.pathname,
          request.headers.get('referer') || 'direct',
          (cf?.country as string) || 'unknown',
          (cf?.city as string) || '',
          utm.source || 'organic',
          utm.medium || 'none',
          utm.campaign || 'none',
          metadata?.onboardingICP || '',
          metadata?.configFormat || '',
          metadata?.configType || '',
          metadata?.configName || '',
        ],
        doubles: [
          Date.now(),
          metadata?.timeSpent || 0,
          metadata?.conversionValue || 0,
        ],
      });
    } catch (error) {
      // Analytics failures should not break the application
      console.error('Analytics tracking failed:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(request: Request, metadata?: AnalyticsMetadata): Promise<void> {
    await this.trackEvent(request, 'page_view', metadata);
  }

  /**
   * Track funnel step
   */
  async trackFunnelStep(
    request: Request,
    step: AnalyticsEventType,
    metadata?: AnalyticsMetadata
  ): Promise<void> {
    await this.trackEvent(request, step, metadata);
  }

  /**
   * Track config interaction
   */
  async trackConfigInteraction(
    request: Request,
    eventType: AnalyticsEventType,
    configId: string,
    format?: string,
    type?: string,
    name?: string
  ): Promise<void> {
    await this.trackEvent(request, eventType, {
      configFormat: format as any,
      configType: type as any,
      configName: name,
    });
  }
}
```

### 4. Update Route Files (Add Analytics Tracking)

**Pattern for all routes:**
```typescript
import { AnalyticsService } from '../services/analytics-service';

// In route handler
const analytics = new AnalyticsService(c.env);

// Track page view
await analytics.trackPageView(c.req.raw, {
  // metadata specific to this page
});
```

**Specific Route Updates:**

#### `src/routes/configs.ts`
```typescript
// List configs - Track browse
app.get('/configs', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackPageView(c.req.raw, {
    onboardingICP: c.req.query('icp') as any, // From onboarding links
  });
  // ... existing code
});

// View config detail
app.get('/configs/:id', async (c) => {
  const analytics = new AnalyticsService(c.env);
  const config = await configService.getConfigById(id);

  if (config) {
    await analytics.trackEvent(c.req.raw, 'config_view', {
      configFormat: config.original_format,
      configType: config.type,
      configName: config.name,
    });
  }
  // ... existing code
});

// Convert config format
app.get('/api/configs/:id/format/:format', async (c) => {
  const analytics = new AnalyticsService(c.env);
  const config = await configService.getConfigById(id);

  if (config) {
    await analytics.trackEvent(c.req.raw, 'config_conversion', {
      configFormat: targetFormat,
      configType: config.type,
      configName: config.name,
      conversionTarget: targetFormat,
    });
  }
  // ... existing conversion code
});
```

#### `src/routes/slash-command-converter.ts`
```typescript
app.get('/slash-commands/convert', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackPageView(c.req.raw);
  // ... existing code
});

app.post('/api/slash-commands/:id/convert', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'slash_command_convert', {
    configName: id,
  });
  // ... existing code
});
```

#### `src/routes/plugins.ts`
```typescript
app.get('/plugins/:extensionId/:format', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'plugin_browse', {
    configFormat: format as any,
  });
  // ... existing code
});

app.get('/plugins/:extensionId/:format/download', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'extension_download', {
    configFormat: format as any,
  });
  // ... existing code
});
```

#### `src/routes/marketplaces.ts`
```typescript
app.get('/marketplaces', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackPageView(c.req.raw);
  // ... existing code
});

app.get('/marketplaces/:id', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'marketplace_browse');
  // ... existing code
});
```

#### `src/routes/subscriptions.ts`
```typescript
app.post('/api/subscriptions/subscribe', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'email_submit', {
    onboardingICP: c.req.header('Referer')?.includes('onboarding') ?
      extractICPFromReferer(c.req.header('Referer')) : undefined,
  });
  // ... existing code
});
```

#### Create `src/routes/onboarding.ts` (NEW)
```typescript
import { Hono } from 'hono';
import type { Env } from '../domain/types';
import { layout } from '../views/layout';
import { noCodeBuildersPage, multiToolOrgsPage, aiPilotTeamsPage } from '../views/onboarding';
import { AnalyticsService } from '../services/analytics-service';

const app = new Hono<{ Bindings: Env }>();

app.get('/onboarding/no-code-builders', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'onboarding_view', {
    onboardingICP: 'no-code-builders',
  });

  return c.html(layout('No-Code/Low-Code Builders', noCodeBuildersPage()));
});

app.get('/onboarding/multi-tool-orgs', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'onboarding_view', {
    onboardingICP: 'multi-tool-orgs',
  });

  return c.html(layout('Multi-Tool Organizations', multiToolOrgsPage()));
});

app.get('/onboarding/ai-pilot-teams', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'onboarding_view', {
    onboardingICP: 'ai-pilot-teams',
  });

  return c.html(layout('AI Pilot Teams', aiPilotTeamsPage()));
});

export default app;
```

### 5. Update `src/index.ts`

**Add onboarding routes and Analytics Engine binding:**
```typescript
import onboardingRoutes from './routes/onboarding';

// ... existing imports

app.route('/', onboardingRoutes);

// Track landing page
app.get('/', async (c) => {
  const analytics = new AnalyticsService(c.env);
  await analytics.trackEvent(c.req.raw, 'landing');
  // ... existing home page code
});
```

### 6. Update `src/services/index.ts`

**Export Analytics Service:**
```typescript
export { AnalyticsService } from './analytics-service';
export { ConfigService } from './config-service';
// ... other exports
```

## Frontend changes required

### 1. Update `src/views/layout.ts`

**Add Cloudflare Web Analytics Beacon:**

Add before closing `</body>` tag (around line 1447):

```typescript
<!-- Cloudflare Web Analytics -->
${c.env.WEB_ANALYTICS_TOKEN ? `
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
          data-cf-beacon='{"token": "${c.env.WEB_ANALYTICS_TOKEN}"}'></script>
` : ''}

<!-- Analytics Event Tracking -->
<script>
  // Track email gate modal views
  window.showEmailGate = function(callback) {
    // Track email gate view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'email_gate_view',
        metadata: { path: window.location.pathname }
      })
    }).catch(() => {});

    pendingAction = callback;
    const modal = document.getElementById('email-gate-modal');
    // ... existing code
  };

  // Track time spent on page (send on unload)
  let pageLoadTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const timeSpent = Math.floor((Date.now() - pageLoadTime) / 1000);
    navigator.sendBeacon('/api/analytics/track', JSON.stringify({
      event: 'page_unload',
      metadata: {
        path: window.location.pathname,
        timeSpent: timeSpent
      }
    }));
  });
</script>
```

**Note:** Accept `c` (Hono context) as parameter in layout function to access `env`:

```typescript
export function layout(title: string, content: string, c?: any): string {
  // ... existing code
}
```

### 2. Create Analytics Tracking Endpoint

**Add to `src/index.ts`:**

```typescript
// Client-side analytics tracking endpoint
app.post('/api/analytics/track', async (c) => {
  try {
    const analytics = new AnalyticsService(c.env);
    const { event, metadata } = await c.req.json();

    await analytics.trackEvent(c.req.raw, event, metadata);

    return c.json({ success: true });
  } catch (error) {
    // Silent fail for analytics
    return c.json({ success: false }, 500);
  }
});
```

### 3. Update HTMX Tracking

**Add to layout.ts JavaScript section (around line 1656):**

```typescript
// Track HTMX page transitions (for hx-push-url navigation)
document.addEventListener('htmx:afterSettle', function(evt) {
  // Track as page view if URL changed
  if (window.location.pathname !== previousPath) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view',
        metadata: { path: window.location.pathname }
      })
    }).catch(() => {});
    previousPath = window.location.pathname;
  }
});

let previousPath = window.location.pathname;
```

## Acceptance Criteria

1. **Cloudflare Web Analytics Integration**
   - ✅ Web Analytics beacon script injected on all pages
   - ✅ Automatic tracking of: pageviews, country, browser, OS, device
   - ✅ Dashboard shows real-time visitor data
   - ✅ No JavaScript errors in browser console

2. **Workers Analytics Engine Integration**
   - ✅ Analytics Engine dataset created and bound
   - ✅ All funnel steps tracked server-side
   - ✅ UTM parameters captured and stored
   - ✅ Config interactions tracked (format, type, name)
   - ✅ Onboarding page visits tracked with ICP identification

3. **Funnel Tracking**
   - ✅ Landing page → Onboarding → Email submission funnel tracked
   - ✅ Config browse → Config view → Conversion tracked
   - ✅ Plugin browse → Download tracked
   - ✅ Time spent on each page captured

4. **Query Parameter Tracking**
   - ✅ UTM source, medium, campaign tracked
   - ✅ ICP parameter from onboarding links tracked
   - ✅ Return URL parameters tracked

5. **Data Integrity**
   - ✅ Analytics failures don't break app functionality
   - ✅ No PII stored in analytics data
   - ✅ Session IDs unique per visitor
   - ✅ Timestamps accurate

## Validation

### Setup Steps

```bash
# 1. Create Analytics Engine dataset
npx wrangler analytics-engine create user_analytics

# 2. Get Web Analytics token
# - Go to Cloudflare Dashboard → Analytics → Web Analytics
# - Add site (manual installation)
# - Copy token

# 3. Update wrangler.jsonc with token and dataset binding

# 4. Update .dev.vars for local testing
echo "WEB_ANALYTICS_TOKEN=your-token-here" >> .dev.vars

# 5. Deploy to production
npm run deploy

# 6. Apply to production (if using Cloudflare Dashboard)
# - Update Worker environment variables
# - Verify Analytics Engine binding
```

### Testing Analytics

```bash
# 1. Start dev server
npm run dev

# 2. Test Web Analytics integration
curl -I http://localhost:8787/
# Look for: <script defer src='https://static.cloudflareinsights.com/beacon.min.js'

# 3. Test UTM tracking
curl "http://localhost:8787/onboarding/no-code-builders?utm_source=github&utm_campaign=launch"

# 4. Test funnel steps
# Visit pages in sequence:
# - Landing: http://localhost:8787/
# - Onboarding: http://localhost:8787/onboarding/no-code-builders
# - Configs: http://localhost:8787/configs
# - Config view: http://localhost:8787/configs/:id
# - Conversion: http://localhost:8787/api/configs/:id/format/gemini
# - Email gate: Click any CUD button

# 5. Query Analytics Engine data (after deployment)
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql" \
  --header "Authorization: Bearer <API_TOKEN>" \
  --data "SELECT blob1 AS event, COUNT(*) AS count FROM user_analytics GROUP BY event"

# Expected output:
# landing: X
# onboarding_view: Y
# config_view: Z
# etc.
```

### Funnel Analysis Queries

```sql
-- 1. Overall funnel conversion rates
SELECT
  blob1 AS step,
  COUNT(DISTINCT index1) AS unique_sessions,
  COUNT(DISTINCT index1) * 100.0 /
    FIRST_VALUE(COUNT(DISTINCT index1)) OVER (ORDER BY
      CASE blob1
        WHEN 'landing' THEN 1
        WHEN 'onboarding_view' THEN 2
        WHEN 'configs_browse' THEN 3
        WHEN 'config_view' THEN 4
        WHEN 'email_submit' THEN 5
      END
    ) AS conversion_rate
FROM user_analytics
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob1
ORDER BY
  CASE blob1
    WHEN 'landing' THEN 1
    WHEN 'onboarding_view' THEN 2
    WHEN 'configs_browse' THEN 3
    WHEN 'config_view' THEN 4
    WHEN 'email_submit' THEN 5
  END;

-- 2. Onboarding ICP performance
SELECT
  blob9 AS icp,
  COUNT(DISTINCT index1) AS visitors,
  SUM(CASE WHEN blob1 = 'email_submit' THEN 1 ELSE 0 END) AS conversions,
  SUM(CASE WHEN blob1 = 'email_submit' THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT index1) AS conversion_rate
FROM user_analytics
WHERE blob9 IN ('no-code-builders', 'multi-tool-orgs', 'ai-pilot-teams')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blob9;

-- 3. UTM campaign performance
SELECT
  blob6 AS utm_source,
  blob7 AS utm_medium,
  blob8 AS utm_campaign,
  COUNT(DISTINCT index1) AS sessions,
  SUM(CASE WHEN blob1 = 'email_submit' THEN 1 ELSE 0 END) AS conversions
FROM user_analytics
WHERE blob6 != 'organic'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blob6, blob7, blob8
ORDER BY sessions DESC;

-- 4. Config format preferences
SELECT
  blob10 AS format,
  COUNT(*) AS views,
  COUNT(DISTINCT index1) AS unique_sessions
FROM user_analytics
WHERE blob1 IN ('config_view', 'config_conversion')
  AND blob10 != ''
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob10
ORDER BY views DESC;

-- 5. Top conversion targets
SELECT
  blob10 AS format,
  COUNT(*) AS conversions,
  AVG(double2) AS avg_time_spent
FROM user_analytics
WHERE blob1 = 'config_conversion'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob10
ORDER BY conversions DESC;

-- 6. Geographic distribution
SELECT
  blob4 AS country,
  COUNT(DISTINCT index1) AS unique_visitors,
  COUNT(*) AS total_events
FROM user_analytics
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob4 != 'unknown'
GROUP BY blob4
ORDER BY unique_visitors DESC
LIMIT 20;

-- 7. Time on site analysis
SELECT
  blob2 AS path,
  AVG(double2) AS avg_time_seconds,
  COUNT(*) AS page_views
FROM user_analytics
WHERE blob1 = 'page_view'
  AND double2 > 0
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob2
ORDER BY avg_time_seconds DESC;
```

### Dashboard Verification

**Cloudflare Web Analytics Dashboard:**
1. Navigate to Cloudflare Dashboard → Analytics → Web Analytics
2. Verify site appears in list
3. Check metrics:
   - Visits (should show traffic)
   - Page views (should track all pages)
   - Countries (should show geographic distribution)
   - Referrers (should show traffic sources)
   - Browsers/OS/Devices (should show distribution)
   - Core Web Vitals (LCP, FID, CLS)

**Workers Analytics Engine:**
1. Use SQL API or GraphQL API for querying
2. Create Grafana/Metabase dashboards for visualization
3. Set up automated reports for funnel analysis

### Performance Testing

```bash
# Verify analytics doesn't impact performance
# Before analytics integration:
wrk -t4 -c100 -d30s http://localhost:8787/
# After analytics integration:
wrk -t4 -c100 -d30s http://localhost:8787/
# Performance should be nearly identical (analytics is async)
```

### Privacy & Compliance

- ✅ No PII (emails, IPs) stored in Analytics Engine
- ✅ Session IDs are pseudonymous (CF-Ray or UUID)
- ✅ Web Analytics is GDPR/CCPA compliant by design
- ✅ No cookies used for tracking
- ✅ Analytics failures don't expose errors to users

### Expected Outcomes

After full implementation:

1. **Web Analytics Dashboard shows:**
   - Real-time visitor count
   - Page views per URL
   - Geographic distribution
   - Browser/OS/Device breakdown
   - Core Web Vitals scores

2. **Analytics Engine provides:**
   - Complete funnel visualization (landing → email)
   - UTM campaign performance
   - Config format preferences
   - Onboarding ICP effectiveness
   - Time-on-site metrics
   - Conversion targets distribution

3. **Business Intelligence:**
   - Which ICP converts best?
   - Which UTM campaigns drive traffic?
   - What config formats are popular?
   - Where do users drop off in funnel?
   - Geographic expansion opportunities

4. **Technical Validation:**
   - Zero impact on page load times
   - No JavaScript errors
   - Analytics failures don't break app
   - Data points visible in Analytics Engine SQL queries
