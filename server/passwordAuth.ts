import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Express, RequestHandler } from 'express';
import './types'; // Import session and request type extensions
import { destroyUserSession } from './sessionLogout';
import { storage } from './storage';
import {
  signupSchema,
  loginSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  SignupRequest,
  LoginRequest,
} from '@shared/schema';
import { getJwtSecret, signAppAccessToken, verifyJwt } from "./jwt";
import { sendEmail } from "./emailService";

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;

function passwordResetEmailHtml(firstName: string | null, resetUrl: string) {
  const name = firstName?.trim() || "there";
  return `<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset your Layoff Proof password. Use the link below to choose a new password. It expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>
<p><a href="${resetUrl}">Reset your password</a></p>
<p>If you did not request this, you can ignore this email.</p>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appOrigin(req: Parameters<RequestHandler>[0]) {
  const fromEnv = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return `${req.protocol}://${req.get("host")}`;
}

/** True if the user has a bcrypt password hash (email signup, or email then linked Google). */
function hasPasswordHashForReset(user: { password: string | null }): boolean {
  const p = user.password;
  return typeof p === "string" && p.length > 0 && p.startsWith("$2");
}

export function setupPasswordAuth(app: Express) {
  // Email/Password signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const { firstName, lastName, email: rawEmail, password }: SignupRequest =
        validation.data;
      const email = rawEmail.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const user = await storage.createEmailUser({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        authProvider: 'email',
        isEmailVerified: true // Auto-verify for now, can add email verification later
      });

      // Create session
      req.session.user = {
        id: user.id,
        email: user.email ?? email,
        firstName: user.firstName ?? firstName,
        lastName: user.lastName ?? lastName,
        authProvider: 'email'
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const token = signAppAccessToken({
        sub: user.id,
        email: user.email ?? email,
        authProvider: "email",
      });

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Email/Password login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const { email: rawEmail, password }: LoginRequest = validation.data;
      const email = rawEmail.trim().toLowerCase();

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !hasPasswordHashForReset(user)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password!);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Create session
      req.session.user = {
        id: user.id,
        email: user.email ?? email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        authProvider: 'email'
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const token = signAppAccessToken({
        sub: user.id,
        email: user.email ?? email,
        authProvider: "email",
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const forgotPasswordResponse = {
    success: true as const,
    message:
      "If an account exists for that email, you will receive password reset instructions shortly.",
  };

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const validation = forgotPasswordRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.issues,
        });
      }

      const email = validation.data.email.trim().toLowerCase();
      const user = await storage.getUserByEmail(email);

      if (!user || !hasPasswordHashForReset(user)) {
        return res.json(forgotPasswordResponse);
      }

      await storage.invalidateUnusedPasswordResetTokensForUser(user.id);
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
      );
      await storage.createPasswordResetToken({ userId: user.id, token, expiresAt });

      const resetUrl = `${appOrigin(req)}/reset-password?token=${encodeURIComponent(token)}`;
      const html = passwordResetEmailHtml(user.firstName ?? null, resetUrl);
      const sent = await sendEmail({
        to: email,
        subject: "Reset your Layoff Proof password",
        html,
      });

      if (!sent) {
        console.error("Forgot password: failed to send email to", email);
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "\n========== PASSWORD RESET (dev: email not sent) ==========\n" +
              resetUrl +
              "\n============================================================\n",
          );
        } else {
          await storage.deletePasswordResetToken(token);
        }
      }

      return res.json(forgotPasswordResponse);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validation = resetPasswordRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.issues,
        });
      }

      const { token, password } = validation.data;
      const row = await storage.getPasswordResetToken(token);

      if (!row || row.usedAt || new Date() > row.expiresAt) {
        return res.status(400).json({
          error: "Invalid or expired reset link. Please request a new password reset.",
        });
      }

      const user = await storage.getUser(row.userId);
      if (!user || !hasPasswordHashForReset(user)) {
        return res.status(400).json({
          error: "Invalid or expired reset link. Please request a new password reset.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.usePasswordResetToken(token);

      res.json({
        success: true,
        message: "Your password has been updated. You can sign in now.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const handleLogoutPost = async (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1]
  ) => {
    try {
      await destroyUserSession(req, res);
      res.json({ success: true, redirectTo: '/' });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Failed to logout' });
    }
  };

  const handleLogoutGet = async (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1]
  ) => {
    try {
      await destroyUserSession(req, res);
      res.redirect('/');
    } catch (err) {
      console.error('Logout error:', err);
      res.redirect('/?error=logout_failed');
    }
  };

  // Logout (session + passport + cookie; works for email, Google OAuth, etc.)
  app.post('/api/auth/logout', handleLogoutPost);
  app.get('/api/auth/logout', handleLogoutGet);

  // Legacy/alternate paths used by some UI links
  app.post('/api/logout', handleLogoutPost);
  app.get('/api/logout', handleLogoutGet);
}

// Middleware to check if user is authenticated (email/password)
export const isEmailAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const sessionUser = (req.session as any)?.user;

    if (!sessionUser || !sessionUser.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get full user data
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Combined middleware that accepts both Replit and email authentication
export const isAuthenticatedAny: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization || (req.headers as any).Authorization;
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    const payload = verifyJwt(token, getJwtSecret());
    const userId = typeof payload?.sub === "string" ? payload.sub : null;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          (req as any).user = user;
          return next();
        }
      } catch (error) {
        console.error("JWT auth check error:", error);
      }
    }
  }

  const sessionUser = (req.session as any)?.user;
  if (sessionUser && sessionUser.id) {
    try {
      const user = await storage.getUser(sessionUser.id);
      if (user) {
        (req as any).user = user;
        return next();
      }
    } catch (error) {
      console.error('Email auth check error:', error);
    }
  }

  // Try Replit authentication - check for user session instead
  try {
    const replitUser = (req as any).user;
    if (replitUser?.claims?.sub) {
      const userId = replitUser.claims.sub;
      const user = await storage.getUser(userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }
  } catch (error) {
    console.error('Replit auth check error:', error);
  }

  return res.status(401).json({ message: "Unauthorized" });
};