import type {
  AnalyticsEngineDataset,
  AnalyticsEventType,
  UTMParams,
  AnalyticsMetadata,
} from '../domain/types';

// Cookie name for UTM persistence (30-day first-touch attribution)
const UTM_COOKIE_NAME = '_utm_first';
const UTM_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export class AnalyticsService {
  constructor(private analytics?: AnalyticsEngineDataset) {}

  /**
   * Extract UTM parameters from URL query string
   */
  extractUTMFromURL(url: URL): UTMParams {
    return {
      source: url.searchParams.get('utm_source') || undefined,
      medium: url.searchParams.get('utm_medium') || undefined,
      campaign: url.searchParams.get('utm_campaign') || undefined,
      term: url.searchParams.get('utm_term') || undefined,
      content: url.searchParams.get('utm_content') || undefined,
    };
  }

  /**
   * Extract UTM parameters from cookie
   */
  extractUTMFromCookie(request: Request): UTMParams | null {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const utmCookie = cookies.find((c) => c.startsWith(`${UTM_COOKIE_NAME}=`));
    if (!utmCookie) return null;

    try {
      const value = decodeURIComponent(utmCookie.split('=')[1]);
      return JSON.parse(value) as UTMParams;
    } catch {
      return null;
    }
  }

  /**
   * Check if UTM params have any meaningful values
   */
  hasUTMParams(utm: UTMParams): boolean {
    return !!(utm.source || utm.medium || utm.campaign || utm.term || utm.content);
  }

  /**
   * Get UTM params with persistence: URL first, then cookie fallback
   * This ensures first-touch attribution is preserved across the journey
   */
  getPersistedUTM(request: Request): UTMParams {
    const url = new URL(request.url);
    const urlUTM = this.extractUTMFromURL(url);

    // If URL has UTM params, use them (and they should be persisted by caller)
    if (this.hasUTMParams(urlUTM)) {
      return urlUTM;
    }

    // Fall back to cookie for persisted first-touch UTM
    const cookieUTM = this.extractUTMFromCookie(request);
    if (cookieUTM && this.hasUTMParams(cookieUTM)) {
      return cookieUTM;
    }

    // No UTM found
    return {};
  }

  /**
   * Create Set-Cookie header value for UTM persistence
   * Only call this when landing with UTM params and no existing cookie
   */
  createUTMCookie(utm: UTMParams): string {
    const value = encodeURIComponent(JSON.stringify(utm));
    return `${UTM_COOKIE_NAME}=${value}; Path=/; Max-Age=${UTM_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
  }

  /**
   * Check if we should set a UTM cookie (has URL params, no existing cookie)
   */
  shouldSetUTMCookie(request: Request): { shouldSet: boolean; utm: UTMParams } {
    const url = new URL(request.url);
    const urlUTM = this.extractUTMFromURL(url);

    // Only set if URL has UTM and no existing cookie (first-touch attribution)
    if (this.hasUTMParams(urlUTM)) {
      const existingCookie = this.extractUTMFromCookie(request);
      if (!existingCookie || !this.hasUTMParams(existingCookie)) {
        return { shouldSet: true, utm: urlUTM };
      }
    }

    return { shouldSet: false, utm: {} };
  }

  /**
   * Generate or retrieve session ID from request
   */
  getSessionId(request: Request): string {
    // Use CF-Ray header as session ID (unique per request at edge location)
    return request.headers.get('cf-ray') || crypto.randomUUID();
  }

  /**
   * Track analytics event with UTM persistence
   */
  async trackEvent(
    request: Request,
    eventType: AnalyticsEventType,
    metadata?: AnalyticsMetadata
  ): Promise<void> {
    // Skip if analytics not configured or writeDataPoint not available (local dev)
    if (!this.analytics || typeof this.analytics.writeDataPoint !== 'function') {
      console.log(`[Analytics] Skipping event tracking (local dev): ${eventType}`);
      return;
    }

    try {
      const url = new URL(request.url);
      const cf = request.cf as IncomingRequestCfProperties | undefined;
      // Use persisted UTM (URL first, then cookie fallback)
      const utm = this.getPersistedUTM(request);
      const sessionId = metadata?.sessionId || this.getSessionId(request);

      // Write data point to Analytics Engine
      this.analytics.writeDataPoint({
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
