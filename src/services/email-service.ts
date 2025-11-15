import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';

/**
 * Email service for sending notifications via Cloudflare Email Routing
 */
export class EmailService {
  constructor(
    private emailBinding: any, // send_email binding from env
    private adminEmail: string,
    private senderEmail: string = 'notifications@prashamhtrivedi.app'
  ) {}

  /**
   * Send admin notification about new subscriber
   */
  async sendSubscriptionNotification(
    subscriberEmail: string,
    subscribedAt: string
  ): Promise<void> {
    const msg = createMimeMessage();

    msg.setSender({
      name: 'Agent Config Adapter',
      addr: this.senderEmail,
    });

    msg.setRecipient(this.adminEmail);
    msg.setSubject('New Subscription to Agent Config Adapter');

    msg.addMessage({
      contentType: 'text/html',
      data: `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">New Subscription</h2>
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
                  This user can now upload skills and configurations to the Agent Config Adapter platform.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    const message = new EmailMessage(
      this.senderEmail,
      this.adminEmail,
      msg.asRaw()
    );

    await this.emailBinding.send(message);
  }

  /**
   * Send welcome email to new subscriber
   * NOTE: Requires subscriber email to be verified in Email Routing
   * Currently commented out in the subscription flow
   */
  async sendWelcomeEmail(subscriberEmail: string): Promise<void> {
    const msg = createMimeMessage();

    msg.setSender({
      name: 'Agent Config Adapter',
      addr: this.senderEmail,
    });

    msg.setRecipient(subscriberEmail);
    msg.setSubject('Welcome to Agent Config Adapter!');

    msg.addMessage({
      contentType: 'text/html',
      data: `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">Welcome to Agent Config Adapter!</h2>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151; margin-top: 0;">
                Thanks for subscribing! You now have access to upload features.
              </p>
              <div style="background: white; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 12px 0; color: #6366f1; font-size: 18px;">What you can do now:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                  <li style="margin-bottom: 8px;">Upload skills as ZIP files with multi-file support</li>
                  <li style="margin-bottom: 8px;">Upload companion files for existing skills</li>
                  <li style="margin-bottom: 8px;">Get early access to new features</li>
                  <li>Be notified when user accounts are available</li>
                </ul>
              </div>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
                  <strong style="color: #374151;">Coming Soon:</strong> Full user authentication and personal config management
                </p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  We'll notify you when these features are ready!
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    const message = new EmailMessage(
      this.senderEmail,
      subscriberEmail,
      msg.asRaw()
    );

    await this.emailBinding.send(message);
  }
}
