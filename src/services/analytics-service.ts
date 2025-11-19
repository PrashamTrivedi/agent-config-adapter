import type {
  AnalyticsEngineDataset,
  AnalyticsEventType,
  UTMParams,
  AnalyticsMetadata,
} from '../domain/types';

export class AnalyticsService {
  constructor(private analytics?: AnalyticsEngineDataset) {}

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
    // Use CF-Ray header as session ID (unique per request at edge location)
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
    // Skip if analytics not configured or writeDataPoint not available (local dev)
    if (!this.analytics || typeof this.analytics.writeDataPoint !== 'function') {
      console.log(`[Analytics] Skipping event tracking (local dev): ${eventType}`);
      return;
    }

    try {
      const url = new URL(request.url);
      const cf = request.cf as IncomingRequestCfProperties | undefined;
      const utm = this.extractUTMParams(url);
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
