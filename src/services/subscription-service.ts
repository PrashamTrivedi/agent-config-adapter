import type { SubscriptionRecord } from '../domain/types';

/**
 * Service for managing email subscriptions in KV storage
 */
export class SubscriptionService {
  constructor(private kv: KVNamespace) {}

  /**
   * Subscribe a new email address
   */
  async subscribe(
    email: string,
    ipAddress?: string
  ): Promise<SubscriptionRecord> {
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    const subscription: SubscriptionRecord = {
      email: normalizedEmail,
      projectName: 'agentConfig',
      subscribedAt: new Date().toISOString(),
      ipAddress,
    };

    // Store in KV with email as key
    await this.kv.put(normalizedEmail, JSON.stringify(subscription), {
      metadata: {
        subscribedAt: subscription.subscribedAt,
      },
    });

    return subscription;
  }

  /**
   * Check if an email is subscribed
   */
  async isSubscribed(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const value = await this.kv.get(normalizedEmail);
    return value !== null;
  }

  /**
   * Get subscription record for an email
   */
  async getSubscription(email: string): Promise<SubscriptionRecord | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const value = await this.kv.get(normalizedEmail, 'text');

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as SubscriptionRecord;
    } catch {
      return null;
    }
  }

  /**
   * List all subscriptions with pagination
   * Admin-only feature for viewing all subscribers
   */
  async listSubscriptions(cursor?: string): Promise<{
    subscriptions: SubscriptionRecord[];
    cursor?: string;
  }> {
    const limit = 100;
    const list = await this.kv.list({ cursor, limit });

    const subscriptions: SubscriptionRecord[] = [];

    for (const key of list.keys) {
      const value = await this.kv.get(key.name, 'text');
      if (value) {
        try {
          subscriptions.push(JSON.parse(value) as SubscriptionRecord);
        } catch {
          // Skip invalid records
          continue;
        }
      }
    }

    return {
      subscriptions,
      cursor: list.list_complete ? undefined : list.cursor,
    };
  }

  /**
   * Delete a subscription (GDPR compliance)
   */
  async deleteSubscription(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await this.isSubscribed(normalizedEmail);

    if (exists) {
      await this.kv.delete(normalizedEmail);
      return true;
    }

    return false;
  }
}
