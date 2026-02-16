import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: any;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // Try different email services in order of preference
    if (process.env.SENDGRID_API_KEY) {
      // SendGrid setup
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      // Gmail setup (requires App Password)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Generic SMTP setup
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else if (process.env.RESEND_API_KEY) {
      // Resend setup
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY
        }
      });
    } else if (process.env.BREVO_API_KEY) {
      // Brevo (formerly Sendinblue) setup
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.BREVO_SMTP_USER || 'your-email@domain.com',
          pass: process.env.BREVO_API_KEY
        }
      });
    } else {
      // Development mode - log to console
      console.log('📧 No email service configured. Emails will be logged to console.');
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        // Development mode - log email
        console.log('\n=== MAGIC LINK EMAIL ===');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(options.text || options.html);
        console.log('========================\n');
        return true;
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@layofftracker.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  async sendMagicLink(email: string, magicLinkUrl: string): Promise<boolean> {
    const subject = 'Sign in to LayoffTracker';
    const text = `Click the link below to sign in to your LayoffTracker account:\n\n${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Sign in to LayoffTracker</h2>
        <p>Click the button below to sign in to your LayoffTracker account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLinkUrl}" style="background: linear-gradient(to right, #7C3AED, #EC4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Sign In to LayoffTracker
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 15 minutes.<br>
          If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          LayoffTracker - Protecting your career with real-time insights
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();