import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";
import { signAppAccessToken } from "./jwt";

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
  const status = (user?.subscriptionStatus ?? "").toString().toLowerCase().trim();
  return status === "active";
}

export function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not found. Google authentication disabled.");
    return;
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  const port = process.env.PORT || "5000";
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    (process.env.NODE_ENV === "development"
      ? `http://127.0.0.1:${port}/api/auth/google/callback`
      : "https://layoffproof.ai/api/auth/google/callback");

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
              password: "",
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
      },
    ),
  );

  // Start OAuth flow
  app.get(
    "/api/auth/google",
    (req: any, _res, next) => {
      const safe = getSafeRedirectPath(req.query?.redirect);
      if (req.session) {
        req.session.oauthRedirect = safe ?? null;
      }
      next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );

  // OAuth callback — session + Layoff Proof JWT (same as email login)
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=oauth_failed" }),
    async (req: any, res) => {
      try {
        if (!req.user) {
          console.error("No user in Google OAuth callback");
          return res.redirect("/login?error=oauth_failed");
        }

        if (!req.session) {
          console.error("No session available in Google OAuth callback");
          return res.redirect("/login?error=session_failed");
        }

        const user = req.user;
        const email = user.email ?? "";

        req.session.user = {
          id: user.id,
          email,
          firstName: user.firstName,
          lastName: user.lastName,
          authProvider: "google",
        };

        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });

        const token = signAppAccessToken({
          sub: user.id,
          email,
          authProvider: "google",
        });

        const requested = getSafeRedirectPath(req.session?.oauthRedirect);
        if (req.session) req.session.oauthRedirect = null;

        const dest = hasActiveSubscription(user)
          ? requested ?? "/"
          : "/subscribe";

        const hash = new URLSearchParams({
          token,
          redirect: dest,
          user: JSON.stringify({
            id: user.id,
            email,
            firstName: user.firstName,
            lastName: user.lastName,
          }),
        }).toString();

        res.redirect(`/auth/google/callback#${hash}`);
      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        res.redirect("/login?error=oauth_failed");
      }
    },
  );
}
