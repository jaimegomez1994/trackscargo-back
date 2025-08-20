import { Resend } from 'resend';

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static resend = new Resend(process.env.RESEND_API_KEY);
  private static fromEmail = process.env.FROM_EMAIL || 'admin@trackscargo.com';
  private static fromName = process.env.FROM_NAME || 'TracksCargo';
  private static isEnabled = process.env.ENABLE_EMAIL_SENDING === 'true';

  /**
   * Send invitation email to a new user
   */
  static async sendInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    invitationLink: string
  ): Promise<EmailResponse> {
    if (!this.isEnabled) {
      console.log('Email sending is disabled');
      return { success: false, error: 'Email sending is disabled' };
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: `You're invited to join ${organizationName} on TracksCargo`,
        html: this.getInvitationEmailTemplate(inviterName, organizationName, invitationLink),
        text: this.getInvitationEmailText(inviterName, organizationName, invitationLink),
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('Invitation email sent successfully:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send welcome email to a newly registered user
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    organizationName: string
  ): Promise<EmailResponse> {
    if (!this.isEnabled) {
      console.log('Email sending is disabled');
      return { success: false, error: 'Email sending is disabled' };
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: `Welcome to ${organizationName} on TracksCargo!`,
        html: this.getWelcomeEmailTemplate(userName, organizationName),
        text: this.getWelcomeEmailText(userName, organizationName),
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('Welcome email sent successfully:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * HTML template for invitation email
   */
  private static getInvitationEmailTemplate(
    inviterName: string,
    organizationName: string,
    invitationLink: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TracksCargo Invitation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7f9fc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 600;">TracksCargo</h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">Shipment Tracking & Logistics</p>
                </div>
                
                <!-- Main Content -->
                <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">You're invited!</h2>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 16px 0;">Hi there!</p>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 16px 0;">
                    <strong style="color: #1e293b;">${inviterName}</strong> has invited you to join 
                    <strong style="color: #1e293b;">${organizationName}</strong> on TracksCargo.
                </p>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 32px 0;">
                    TracksCargo helps teams track shipments and manage logistics efficiently. 
                    Accept this invitation to start collaborating with your team.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${invitationLink}" 
                       style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
                        Accept Invitation
                    </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 24px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                        <strong>Can't click the button?</strong> Copy and paste this link into your browser:
                    </p>
                    <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0;">
                        <a href="${invitationLink}" style="color: #2563eb;">${invitationLink}</a>
                    </p>
                </div>
                
                <!-- Expiration Notice -->
                <p style="color: #ef4444; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
                    ⏰ This invitation expires in 7 days
                </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    Need help? Reply to this email or contact our support team.<br>
                    © 2024 TracksCargo. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text version of invitation email
   */
  private static getInvitationEmailText(
    inviterName: string,
    organizationName: string,
    invitationLink: string
  ): string {
    return `
You're invited to join ${organizationName} on TracksCargo!

Hi there!

${inviterName} has invited you to join ${organizationName} on TracksCargo.

TracksCargo helps teams track shipments and manage logistics efficiently. Accept this invitation to start collaborating with your team.

Accept your invitation by clicking this link:
${invitationLink}

This invitation expires in 7 days.

Need help? Reply to this email or contact our support team.

© 2024 TracksCargo. All rights reserved.
    `.trim();
  }

  /**
   * HTML template for welcome email
   */
  private static getWelcomeEmailTemplate(userName: string, organizationName: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TracksCargo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7f9fc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 600;">TracksCargo</h1>
                    <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">Shipment Tracking & Logistics</p>
                </div>
                
                <!-- Main Content -->
                <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Welcome to ${organizationName}! 🎉</h2>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 16px 0;">Hi ${userName}!</p>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 16px 0;">
                    Welcome to ${organizationName} on TracksCargo! Your account has been successfully created and you're now part of the team.
                </p>
                
                <p style="color: #475569; font-size: 16px; margin: 0 0 24px 0;">
                    You can now create shipments, track packages, and collaborate with your team members.
                </p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
                    <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Getting Started</h3>
                    <ul style="color: #475569; margin: 0; padding-left: 20px;">
                        <li>Create your first shipment</li>
                        <li>Add tracking events and updates</li>
                        <li>Invite team members to collaborate</li>
                    </ul>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    Need help getting started? Reply to this email.<br>
                    © 2024 TracksCargo. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text version of welcome email
   */
  private static getWelcomeEmailText(userName: string, organizationName: string): string {
    return `
Welcome to ${organizationName} on TracksCargo!

Hi ${userName}!

Welcome to ${organizationName} on TracksCargo! Your account has been successfully created and you're now part of the team.

You can now create shipments, track packages, and collaborate with your team members.

Getting Started:
- Create your first shipment
- Add tracking events and updates  
- Invite team members to collaborate

Need help getting started? Reply to this email.

© 2024 TracksCargo. All rights reserved.
    `.trim();
  }
}