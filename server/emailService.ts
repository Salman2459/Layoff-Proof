import nodemailer from "nodemailer";
const createGmailTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.warn('Gmail credentials not configured.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
};
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = createGmailTransporter();
  
  if (!transporter) {
    console.error('Cannot send email: Gmail credentials not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}