import crypto from "crypto";
import type { Express, RequestHandler } from "express";
import "./types"; // Import session and request type extensions
import { storage } from "./storage";
import { attachReferralFromCookie } from "./affiliateService";
import { z } from "zod";

// Magic link configuration
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || process.env.SESSION_SECRET || "default-secret";

// Email sending function (placeholder - would integrate with SendGrid, Mailgun, etc.)
async function sendMagicLinkEmail(email: string, magicLink: string): Promise<boolean> {
  console.log(`
=== MAGIC LINK EMAIL ===
To: ${email}
Subject: Sign in to LayoffTracker

Click the link below to sign in to your LayoffTracker account:

${magicLink}

This link will expire in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this email.
========================
  `);
  
  // For development, we'll just log the magic link
  // In production, replace this with actual email sending logic
  return true;
}

// Generate secure random token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate email format
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function setupMagicAuth(app: Express) {
  // Request magic link endpoint
  app.post('/api/auth/magic-link/request', async (req, res) => {
    try {
      const { email } = emailSchema.parse(req.body);
      
      // Generate secure token
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
      
      // Store token in database
      await storage.createMagicLinkToken({
        email: email.toLowerCase(),
        token,
        expiresAt,
      });
      
      // Generate magic link URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;
      
      // Send email using email service
      const { emailService } = await import('./emailService');
      const emailSent = await emailService.sendMagicLink(email, magicLink);
      
      if (emailSent) {
        res.json({ 
          success: true, 
          message: "Magic link sent! Check your email for the sign-in link." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send magic link. Please try again." 
        });
      }
    } catch (error) {
      console.error("Magic link request error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: error.errors[0].message 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "An error occurred. Please try again." 
      });
    }
  });

  // Verify magic link endpoint
  app.get('/api/auth/magic-link/verify', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.redirect('/?error=invalid-token');
      }
      
      // Find and validate token
      const magicToken = await storage.getMagicLinkToken(token);
      
      if (!magicToken) {
        return res.redirect('/?error=invalid-token');
      }
      
      // Check if token has expired
      if (new Date() > magicToken.expiresAt) {
        return res.redirect('/?error=expired-token');
      }
      
      // Check if token has already been used
      if (magicToken.usedAt) {
        return res.redirect('/?error=token-used');
      }
      
      // Mark token as used
      await storage.useMagicLinkToken(token);
      
      // Find or create user
      let user = await storage.getUserByEmail(magicToken.email);
      
      if (!user) {
        // Create new user for first-time magic link users
        user = await storage.upsertUser({
          email: magicToken.email,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        });
        try {
          await attachReferralFromCookie(req, user.id);
        } catch (refErr) {
          console.error("Affiliate referral attach error:", refErr);
        }
      } else {
        // Update existing user
        await storage.updateUserProfile(user.id, {
          isEmailVerified: true,
          lastLoginAt: new Date(),
        });
      }
      
      // Create user session (simplified session management)
      const sessionData = {
        userId: user.id,
        email: user.email,
        loginMethod: 'magic-link',
        loginTime: new Date().toISOString(),
      };
      
      // Store session in Express session
      (req.session as any).user = sessionData;
      
      // Redirect to dashboard or intended page
      const redirectUrl = req.query.redirect as string || '/dashboard';
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error("Magic link verification error:", error);
      res.redirect('/?error=verification-failed');
    }
  });

  // Magic link logout
  app.post('/api/auth/magic-link/logout', async (req, res) => {
    try {
      await destroyUserSession(req, res);
      res.json({
        success: true,
        message: "Logged out successfully",
        redirectTo: '/',
      });
    } catch (err) {
      console.error("Logout error:", err);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  });
}

// Middleware to check magic link authentication
export const isMagicAuthenticated: RequestHandler = (req, res, next) => {
  const user = (req.session as any)?.user;
  
  if (!user || !user.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Attach user info to request for use in route handlers
  (req as any).magicUser = user;
  next();
};