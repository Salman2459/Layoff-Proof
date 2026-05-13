import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function textFromHtml(html: string, explicit?: string) {
  return explicit ?? html.replace(/<[^>]*>/g, "");
}

async function sendWithSendGrid(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from =
    process.env.SENDGRID_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim();
  if (!apiKey?.trim() || !from) {
    return false;
  }

  sgMail.setApiKey(apiKey.trim());

  try {
    await sgMail.send({
      to: options.to,
      from,
      subject: options.subject,
      html: options.html,
      text: textFromHtml(options.html, options.text),
    });
    console.log(`[email] SendGrid: sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("[email] SendGrid failed:", error);
    return false;
  }
}

function createSmtpTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendWithSmtp(options: EmailOptions): Promise<boolean> {
  const transporter = createSmtpTransporter();
  if (!transporter) return false;

  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    process.env.GMAIL_USER?.trim();
  if (!from) {
    console.warn("[email] SMTP configured but EMAIL_FROM / SMTP_USER missing for From header");
    return false;
  }

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: textFromHtml(options.html, options.text),
    });
    console.log(`[email] SMTP (${process.env.SMTP_HOST}): sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("[email] SMTP failed:", error);
    return false;
  }
}

function createGmailTransporter() {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!gmailUser || !gmailAppPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

async function sendWithGmail(options: EmailOptions): Promise<boolean> {
  const transporter = createGmailTransporter();
  if (!transporter) {
    return false;
  }

  const from = process.env.GMAIL_USER!.trim();

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: textFromHtml(options.html, options.text),
    });
    console.log(`[email] Gmail: sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("[email] Gmail failed:", error);
    return false;
  }
}

/**
 * Sends transactional email. Tries providers in order:
 * SendGrid (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL or EMAIL_FROM),
 * SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS),
 * Gmail (GMAIL_USER + GMAIL_APP_PASSWORD).
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (await sendWithSendGrid(options)) return true;
  if (await sendWithSmtp(options)) return true;
  if (await sendWithGmail(options)) return true;

  console.error(
    "[email] No provider succeeded. Set one of:\n" +
      "  - SENDGRID_API_KEY + SENDGRID_FROM_EMAIL (or EMAIL_FROM)\n" +
      "  - SMTP_HOST + SMTP_USER + SMTP_PASS (+ EMAIL_FROM for From)\n" +
      "  - GMAIL_USER + GMAIL_APP_PASSWORD",
  );
  return false;
}
