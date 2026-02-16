import passport from "passport";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import type { Express } from "express";
import { storage } from "./storage";

export function setupLinkedInAuth(app: Express) {
  // LinkedIn OAuth Strategy
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    callbackURL: "/api/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from LinkedIn profile
      const linkedinUser = {
        id: `linkedin_${profile.id}`,
        email: profile.emails?.[0]?.value || "",
        firstName: profile.name?.givenName || "",
        lastName: profile.name?.familyName || "",
        profileImageUrl: profile.photos?.[0]?.value || "",
        provider: "linkedin"
      };

      // Upsert user in database
      const user = await storage.upsertUser(linkedinUser);
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  // LinkedIn Auth Routes
  app.get("/api/auth/linkedin",
    passport.authenticate("linkedin", { state: 'SOME STATE' })
  );

  app.get("/api/auth/linkedin/callback",
    passport.authenticate("linkedin", { failureRedirect: "/login" }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect("/dashboard");
    }
  );
}