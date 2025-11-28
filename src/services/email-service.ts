const EMAIL_API_ENDPOINT = 'https://email-sender.prashamhtrivedi.in/api/send';

interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
}

/**
 * Email service for sending notifications via custom email API
 */
export class EmailService {
  constructor(
    private emailApiKey: string,
    private adminEmail: string,
    private senderEmail: string = 'notifications@agent-config.prashamhtrivedi.app'
  ) {}

  /**
   * Send email via custom email API
   */
  private async sendEmail(payload: EmailPayload): Promise<void> {
    const response = await fetch(EMAIL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.emailApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email API error: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Send admin notification about new subscriber
   */
  async sendSubscriptionNotification(
    subscriberEmail: string,
    subscribedAt: string
  ): Promise<void> {
    await this.sendEmail({
      from: `Agent Config Adapter <${this.senderEmail}>`,
      to: [this.adminEmail],
      subject: 'New Waitlist Signup - Agent Config Adapter',
      htmlBody: `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">New Waitlist Signup</h2>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #374151; width: 140px;">Email:</td>
                  <td style="padding: 12px 0; color: #6b7280;">${subscriberEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #374151;">Project:</td>
                  <td style="padding: 12px 0; color: #6b7280;">agentConfig</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #374151;">Subscribed At:</td>
                  <td style="padding: 12px 0; color: #6b7280;">${subscribedAt}</td>
                </tr>
              </table>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  A new user has joined the waitlist for Agent Config Adapter. They'll be notified when user authentication and upload features are available.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }

  /**
   * Send welcome email to new subscriber (waitlist)
   */
  async sendWelcomeEmail(subscriberEmail: string): Promise<void> {
    await this.sendEmail({
      from: `Agent Config Adapter <${this.senderEmail}>`,
      to: [subscriberEmail],
      subject: 'Welcome to Agent Config Adapter!',
      htmlBody: `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">Welcome to Agent Config Adapter!</h2>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151; margin-top: 0;">
                Thanks for joining our waitlist! You're now subscribed to updates about Agent Config Adapter.
              </p>
              <div style="background: white; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 12px 0; color: #6366f1; font-size: 18px;">What you can do now:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                  <li style="margin-bottom: 8px;">Browse existing configurations and skills</li>
                  <li style="margin-bottom: 8px;">Explore agent definitions and MCP configs</li>
                  <li style="margin-bottom: 8px;">Discover extensions and marketplaces</li>
                  <li>Stay updated on new features and releases</li>
                </ul>
              </div>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
                  <strong style="color: #374151;">Coming Soon:</strong> User authentication, personal config management, and upload features
                </p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  We'll notify you as soon as these features are ready!
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }
}
