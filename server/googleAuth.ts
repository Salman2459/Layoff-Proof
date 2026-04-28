import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";
import session from "express-session";

function getSafeRedirectPath(redirect: unknown): string | null {
  if (!redirect || typeof redirect !== "string") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(redirect.trim());
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  return decoded;
}

function hasActiveSubscription(user: any): boolean {
  const status = (user?.subscriptionStatus ?? "").toString().toLowerCase();
  if (status === "active") return true;
  const end = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  if (!end || Number.isNaN(end.getTime())) return false;
  return end > new Date();
}

export function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not found. Google authentication disabled.");
    return;
  }

  // ================================================================
  // 🔑 Add serialization logic for sessions
  // ================================================================
  passport.serializeUser((user: any, done) => {
    done(null, user.id); // only store user.id in the session
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Force canonical domain (always www.layoffproof.ai)
  const callbackURL = "https://layoffproof.ai/api/auth/google/callback";

  console.log("Google OAuth callback URL:", callbackURL);
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Google profile"));
          }

          let user = await storage.getUserByEmail(email);

          if (user) {
            if (user.authProvider !== "google") {
              user = await storage.updateUser(user.id, {
                authProvider: "google",
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              });
            } else {
              await storage.updateUserLastLogin(user.id);
              user = await storage.getUser(user.id);
            }
          } else {
            const firstName = profile.name?.givenName || "";
            const lastName = profile.name?.familyName || "";
            const profileImageUrl = profile.photos?.[0]?.value || "";

            user = await storage.createEmailUser({
              firstName,
              lastName,
              email,
              password: "", // no password for Google users
              authProvider: "google",
              isEmailVerified: true,
            });

            if (profileImageUrl) {
              user = await storage.updateUser(user.id, {
                profileImageUrl,
                updatedAt: new Date(),
              });
            }
          }

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error);
        }
      }
    )
  );

  // ================================================================
  // Mount session + passport middlewares
  // ================================================================
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "super-secret",
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Start OAuth flow
  app.get("/api/auth/google", (req: any, _res, next) => {
    // Preserve where the user wanted to go (only allow safe same-origin paths)
    const safe = getSafeRedirectPath(req.query?.redirect);
    if (req.session) {
      req.session.oauthRedirect = safe ?? null;
    }
    next();
  }, passport.authenticate("google", { scope: ["profile", "email"] }));

  // OAuth callback
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=oauth_failed" }),
    async (req: any, res) => {
      try {
        if (!req.user) {
          console.error("No user in Google OAuth callback");
          return res.redirect("/login?error=oauth_failed");
        }

        console.log("Google OAuth user received:", req.user);

        if (!req.session) {
          console.error("No session available in Google OAuth callback");
          return res.redirect("/login?error=session_failed");
        }

        req.session.user = {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          authProvider: "google",
        };

        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error("Session save error:", err);
              reject(err);
            } else {
              console.log("Session saved successfully");
              resolve();
            }
          });
        });

        const requested = getSafeRedirectPath(req.session?.oauthRedirect);
        if (req.session) req.session.oauthRedirect = null;

        const fallback = hasActiveSubscription(req.user) ? "/" : "/pricing";
        const dest = requested ?? fallback;
        console.log("Google OAuth successful, redirecting to", dest);
        res.redirect(dest);
      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        res.redirect("/login?error=oauth_failed");
      }
    }
  );
}
