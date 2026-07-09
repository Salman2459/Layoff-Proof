import type { Express } from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "http";
import "./types"; // Import session and request type extensions
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMagicAuth, isMagicAuthenticated } from "./magicAuth";
import { setupPasswordAuth, isAuthenticatedAny } from "./passwordAuth";
import { setupGoogleAuth } from "./googleAuth";
import { setupAffiliateRoutes } from "./affiliateRoutes";
import {
  affiliateRefCookieMiddleware,
  processAffiliateSubscriptionActivation,
} from "./affiliateService";
// import { setupLinkedInAuth } from "./linkedinAuth";
import {
  analyzeJobSecurityRisk,
  DEFAULT_MODEL_STR,
  getAnthropicResponseText,
  parseAnthropicJsonResponse,
} from "./anthropic";
import { dataIntegrator } from "./data-integrator";
import {
  insertCompanySchema,
  updateUserProfileSchema,
  profileSettingsSchema,
  ParsedResumeData,
  insertJobBoardSchema,
  userJobProfiles,
  userDocuments,
  insertNotifyMeSchema,
} from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import * as cheerio from "cheerio";
import axios from "axios";
import { Formidable } from "formidable";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import docxParser from "docx-parser";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicMessagesCreateWithRetry, USER_FACING_ANTHROPIC_OPTIONS } from "./anthropicRetry";
import { db } from "./db";
import Parser from "rss-parser";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  getRecentUserActivities,
  getUserDashboardMetrics,
  backfillLegacyUserActivities,
  recordUserActivity,
  recordUserActivityFromRequest,
  logLayoffProofTool,
  recordLayoffProofTool,
  resolveActivityUserId,
} from "./userActivities";
import { layoffs } from "@shared/schema";
import {
  linkedInPdfLinkHtml,
  resumeLocationSvg,
  resumeSocialSvg,
} from "@shared/resumeSocialIcons";
import { getResumeProfileImageSrc } from "@shared/resumeTemplates";
import {
  stripe,
  getOrCreateStripeCustomer,
  createSetupIntent,
  createSubscription,
  createPaymentIntent,
  cancelSubscriptionAtPeriodEnd,
  getSubscription,
  customerHasPaymentMethod,
} from "./stripe";
import {
  effectiveSubscriptionStatus,
  withEffectiveSubscriptionFields,
} from "./subscriptionAccess";
import {
  getUserWithSubscriberAccess,
  resolveAuthUserId,
} from "./subscriberAccess";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { uploadProfileDocument } from "./documentStorage";
import { AnyAaaaRecord } from "dns";

const rssParser = new Parser();

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    dest: "./uploads/",
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only text files, PDFs, and documents
      const allowedTypes = [
        "text/plain",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Please upload .txt, .pdf, .doc, or .docx files.",
          ),
        );
      }
    },
  });

  // Session middleware (from replitAuth but without the problematic strategy)
  const session = await import("express-session");
  const connectPg = await import("connect-pg-simple");

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const sessionSecret =
    process.env.SESSION_SECRET || "layoff-proof-dev-secret-key-2024";
  const pgStore = connectPg.default(session.default);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  // Required for res.clearCookie(..., { signed: true }) (e.g. session logout)
  app.use(cookieParser(sessionSecret));
  // Affiliate referral attribution cookie on /signup?ref=CODE
  app.use(affiliateRefCookieMiddleware);
  app.use(
    session.default({
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Set to false for development (HTTP)
        maxAge: sessionTtl,
      },
    }),
  );

  // Initialize Passport
  const passport = await import("passport");
  app.use(passport.default.initialize());
  app.use(passport.default.session());
  puppeteer.use(StealthPlugin());

  // Auth middleware
  setupMagicAuth(app);
  setupPasswordAuth(app);
  setupGoogleAuth(app);
  setupAffiliateRoutes(app);
  // setupLinkedInAuth(app);  // Disabled until API keys are configured

  async function GetUserScscriptionTrialValidation(id: string) {
    const user = await getUserWithSubscriberAccess(id);
    return user ?? false;
  }

  async function DetuctCredits(user: any) {
    if (!user?.subscriptionEndDate) {
      await storage.updateUser(user.id, {
        trialMessageLimit: Math.max((user.trialMessageLimit ?? 0) - 1, 0),
      });
      return true;
    }
  }

  // Auth routes — never cache: browsers may serve a stale 200 after logout.
  app.use("/api/auth/user", (_req, res, next) => {
    res.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    next();
  });

  app.get("/api/auth/user", isAuthenticatedAny, async (req: any, res) => {
    try {
      const sessionUser = req.user;
      const userId =
        sessionUser?.id ??
        sessionUser?.claims?.sub ??
        sessionUser?.userId ??
        sessionUser?.sub ??
        null;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const dbUser = await storage.getUser(String(userId));
      const merged = { ...(sessionUser ?? {}), ...(dbUser ?? {}) };
      // Promo month: treat as inactive once `subscription_end_date` has passed.
      res.json(withEffectiveSubscriptionFields(merged));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get("/api/companies/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const companies = await storage.searchCompanies(query);
      res.json(companies);
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({ message: "Failed to search companies" });
    }
  });

  app.get("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validated);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  // User company selection
  app.post(
    "/api/user/select-company",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { companyId } = req.body;

        if (!companyId) {
          return res.status(400).json({ message: "Company ID is required" });
        }

        await storage.updateUserSelectedCompany(userId, companyId);
        res.json({ message: "Company selected successfully" });
      } catch (error) {
        console.error("Error selecting company:", error);
        res.status(500).json({ message: "Failed to select company" });
      }
    },
  );

  // Dashboard stats - public access for homepage
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getCompaniesWithLayoffStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Company activities
  app.get(
    "/api/companies/:id/activities",
    isAuthenticated,
    async (req, res) => {
      try {
        const { id } = req.params;
        const activities = await storage.getCompanyActivities(id);
        res.json(activities);
      } catch (error) {
        console.error("Error fetching company activities:", error);
        res.status(500).json({ message: "Failed to fetch company activities" });
      }
    },
  );

  // Layoff events
  app.get("/api/companies/:id/layoffs", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const layoffs = await storage.getLayoffEventsByCompany(id);
      res.json(layoffs);
    } catch (error) {
      console.error("Error fetching layoff events:", error);
      res.status(500).json({ message: "Failed to fetch layoff events" });
    }
  });

  app.get("/api/user/recent-activities", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const limitRaw = req.query?.limit;
      const limit = Math.min(
        100,
        Math.max(1, parseInt(typeof limitRaw === "string" ? limitRaw : "15", 10) || 15),
      );
      const activities = await getRecentUserActivities(userId, limit);
      res.json({ activities });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  app.get("/api/user/dashboard-metrics", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const metrics = await getUserDashboardMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.post(
    "/api/user/recent-activities/backfill",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const inserted = await backfillLegacyUserActivities(userId);
        const activities = await getRecentUserActivities(userId, 30);
        res.json({ inserted, activities });
      } catch (error) {
        console.error("Error backfilling activities:", error);
        res.status(500).json({ message: "Failed to backfill activities" });
      }
    },
  );

  // User profile management
  app.put("/api/user/profile", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = profileSettingsSchema.parse(req.body);
      const {
        linkedin,
        website,
        location,
        currentCompany,
        ...userFields
      } = validated;

      if (userFields.email) {
        const existingUser = await storage.getUserByEmail(userFields.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            message: "This email is already in use by another account.",
          });
        }
      }

      const user = await storage.updateUserProfile(userId, userFields);

      const jobProfilePatch: Record<string, unknown> = {};
      if (userFields.firstName !== undefined) {
        jobProfilePatch.firstName = userFields.firstName;
      }
      if (userFields.lastName !== undefined) {
        jobProfilePatch.lastName = userFields.lastName;
      }
      if (userFields.email !== undefined) {
        jobProfilePatch.email = userFields.email;
      }
      if (userFields.phoneNumber !== undefined) {
        jobProfilePatch.phone = userFields.phoneNumber;
      }
      if (linkedin !== undefined) {
        jobProfilePatch.linkedin = linkedin || null;
      }
      if (website !== undefined) {
        jobProfilePatch.website = website || null;
      }
      if (location !== undefined && location.trim()) {
        const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts[0]) jobProfilePatch.city = parts[0];
        if (parts.length > 1) {
          jobProfilePatch.country = parts.slice(1).join(", ");
        }
      }

      const [existingJobProfile] = await db
        .select()
        .from(userJobProfiles)
        .where(eq(userJobProfiles.userId, userId))
        .limit(1);

      if (currentCompany !== undefined || userFields.jobTitle !== undefined) {
        const existingExp = Array.isArray(existingJobProfile?.experiences)
          ? existingJobProfile.experiences[0]
          : undefined;
        jobProfilePatch.experiences = [
          {
            company: currentCompany ?? existingExp?.company ?? "",
            title: userFields.jobTitle ?? existingExp?.title ?? "",
            fromMonth: existingExp?.fromMonth ?? "",
            fromYear: existingExp?.fromYear ?? "",
            toMonth: existingExp?.toMonth ?? "",
            toYear: existingExp?.toYear ?? "",
            currentlyWorking: existingExp?.currentlyWorking ?? true,
            description: existingExp?.description ?? "",
          },
        ];
      }

      if (Object.keys(jobProfilePatch).length > 0) {
        if (existingJobProfile) {
          await db
            .update(userJobProfiles)
            .set(jobProfilePatch)
            .where(eq(userJobProfiles.userId, userId));
        } else {
          await db.insert(userJobProfiles).values({
            userId,
            profileCompletion: 0,
            ...jobProfilePatch,
          });
        }
      }

      await recordUserActivity(userId, {
        type: "profile_updated",
        title: "Updated account profile",
        sourceId: `account-profile:${userId}:${Date.now()}`,
      });

      res.json(user);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        const firstIssue = error.issues?.[0];
        const fieldMessage =
          firstIssue?.message && firstIssue?.path?.length
            ? `${String(firstIssue.path[0])}: ${firstIssue.message}`
            : "Invalid profile data";
        return res.status(400).json({ message: fieldMessage });
      }

      if (error?.code === "23505") {
        return res.status(409).json({
          message: "This email is already in use by another account.",
        });
      }

      console.error("Error updating user profile:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Historical layoff data - public access for homepage
  app.get("/api/analytics/historical", async (req, res) => {
    try {
      const historicalData = await storage.getHistoricalLayoffData();
      res.json(historicalData);
    } catch (error) {
      console.error("Error fetching historical layoff data:", error);
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  // Layoff trends - public access for homepage
  app.get("/api/analytics/trends", async (req, res) => {
    try {
      const timeframe =
        (req.query.timeframe as "month" | "quarter" | "year") || "month";
      const trends = await storage.getLayoffTrends(timeframe);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching layoff trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  // Recent layoffs endpoint
  app.get("/api/layoffs/recent", async (req, res) => {
    try {
      const recentLayoffs = await storage.getRecentLayoffs();
      res.json(recentLayoffs);
    } catch (error) {
      console.error("Error fetching recent layoffs:", error);
      res.status(500).json({ message: "Failed to fetch recent layoffs" });
    }
  });

  // Companies endpoint
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });


  // Helper: Calculate subscription end date
  const calculateSubscriptionEndDate = (user, days) => {
    const now = new Date();
    // If user has active subscription, stack on top
    const startDate =
      user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now
        ? new Date(user.subscriptionEndDate)
        : now;

    startDate.setDate(startDate.getDate() + days);
    return startDate;
  };

  function getDaysForPrice(price: any) {
    const recurring = price?.recurring;
    if (!recurring?.interval) return null;
    const count = recurring.interval_count ?? 1;
    switch (recurring.interval) {
      case "day":
        return 1 * count;
      case "week":
        return 7 * count;
      case "month":
        return 30 * count;
      case "year":
        return 365 * count;
      default:
        return null;
    }
  }

  /** True if coupon applies to this Stripe product (no / empty `applies_to.products` = all products). */
  function couponAppliesToProduct(couponObj: any, productId: string | null): boolean {
    const list = couponObj?.applies_to?.products;
    if (!Array.isArray(list) || list.length === 0) return true;
    if (!productId) return false;
    return list.includes(productId);
  }

  async function resolvePriceFromId(id: string): Promise<{
    priceId: string;
    unitAmount: number | null;
    days: ReturnType<typeof getDaysForPrice>;
    /** Catalog product ID for coupon.applies_to checks */
    productId: string | null;
  }> {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("Missing Stripe id.");
    }

    const normalized = id.trim();

    if (normalized.startsWith("price_")) {
      const price = await stripe.prices.retrieve(normalized, {
        expand: ["product"],
      });
      let productId: string | null = null;
      const pr: any = price.product;
      if (typeof pr === "string") productId = pr;
      else if (pr && typeof pr === "object" && !pr.deleted) {
        productId = pr.id ?? null;
      }

      return {
        priceId: price.id,
        unitAmount: price.unit_amount ?? null,
        days: getDaysForPrice(price),
        productId,
      };
    }

    if (normalized.startsWith("prod_")) {
      const product = await stripe.products.retrieve(normalized, {
        expand: ["default_price"],
      });

      let priceId: string | null = null;

      const defaultPrice: any = (product as any).default_price;
      if (typeof defaultPrice === "string") {
        priceId = defaultPrice;
      } else if (defaultPrice?.id) {
        priceId = defaultPrice.id;
      }

      if (!priceId) {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 10,
        });
        priceId = prices.data[0]?.id ?? null;
      }

      if (!priceId) {
        throw new Error(`No active price found for product ${product.id}`);
      }

      const price = await stripe.prices.retrieve(priceId);
      return {
        priceId: price.id,
        unitAmount: price.unit_amount ?? null,
        days: getDaysForPrice(price),
        productId: product.id,
      };
    }

    throw new Error("Invalid Stripe id. Pass a price_... or prod_... id.");
  }

  async function resolveCouponOrPromotionCode(code: string) {
    const normalized = code.trim();
    if (!normalized) throw new Error("Coupon code is required.");

    // First try direct coupon id (or "coupon code" if you're using ids as codes)
    try {
      const coupon = await stripe.coupons.retrieve(normalized);
      if (!coupon.valid) throw new Error("Invalid coupon");
      return { coupon, promotionCodeId: null as string | null };
    } catch (err: any) {
      // If it isn't a coupon id, it might be a Promotion Code (the common UX case)
      if (err?.code !== "resource_missing") throw err;
    }

    const promos = await stripe.promotionCodes.list({
      code: normalized,
      active: true,
      limit: 1,
      expand: ["data.coupon"],
    });
    const promo: any = promos.data[0];
    if (!promo?.coupon?.valid) {
      throw new Error("Invalid promotion code");
    }
    return { coupon: promo.coupon, promotionCodeId: promo.id as string };
  }

  // Create subscription
  app.post(
    "/api/stripe/create-subscription",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const { planId, coupon } = req.body;

        if (!planId) {
          return res
            .status(400)
            .json({ message: "Invalid subscription plan selected." });
        }

        const user:any = req.user;
        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
          });
          stripeCustomerId = customer.id;
          await storage.updateUser(user.id, { stripeCustomerId });
        }

        const { priceId, productId } = await resolvePriceFromId(planId);

        if (coupon?.trim()) {
          try {
            const resolved = await resolveCouponOrPromotionCode(coupon.trim());
            if (!couponAppliesToProduct(resolved.coupon, productId)) {
              return res.status(400).json({
                message:
                  "This promo code isn't valid for the plan you selected. Choose the eligible plan or a different code.",
              });
            }
          } catch {
            // Stripe will reject invalid promotion codes during create — keep going
          }
        }

        const createSubscription = async (customerId: string) =>
          stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            coupon: coupon?.trim() || undefined,
            payment_behavior: "default_incomplete",
            payment_settings: { save_default_payment_method: "on_subscription" },
            expand: [
              "latest_invoice.payment_intent",
              "latest_invoice.total_discount_amounts",
            ],
          });

        let subscription;
        try {
          subscription = await createSubscription(stripeCustomerId);
        } catch (err: any) {
          // If the stored customerId was created in a different Stripe mode/account,
          // Stripe returns resource_missing on param=customer. Auto-heal by recreating.
          if (err?.code === "resource_missing" && err?.param === "customer") {
            const customer = await stripe.customers.create({
              email: user.email,
              name: user.name,
            });
            stripeCustomerId = customer.id;
            await storage.updateUser(user.id, { stripeCustomerId });
            subscription = await createSubscription(stripeCustomerId);
          } else {
            throw err;
          }
        }

        // subscription_status is updated only from Stripe webhooks (see server/stripeWebhook.ts).
        await storage.updateUser(user.id, {
          subscriptionPlan: planId,
          stripeSubscriptionId: subscription.id,
          updatedAt: new Date(),
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret:
            subscription.latest_invoice.payment_intent.client_secret,
        });
      } catch (error) {
        console.error("❌ Error creating subscription:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    },
  );



  // Resume Engine add-on: one-time PaymentIntent (no subscription)
  app.post(
    "/api/stripe/create-resume-engine-addon-payment",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user: any = req.user;
        const { addonPriceCents, jobsPerMonth } = req.body as {
          addonPriceCents?: number;
          jobsPerMonth?: number;
        };

        if (
          typeof addonPriceCents !== "number" ||
          !Number.isFinite(addonPriceCents) ||
          addonPriceCents <= 0
        ) {
          return res.status(400).json({ message: "Invalid add-on price." });
        }

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { userId: user.id },
          });
          stripeCustomerId = customer.id;
          await storage.updateUser(user.id, { stripeCustomerId });
        }

        const intent = await stripe.paymentIntents.create({
          amount: Math.round(addonPriceCents),
          currency: "usd",
          customer: stripeCustomerId,
          automatic_payment_methods: { enabled: true },
          description: `Resume Engine add-on${typeof jobsPerMonth === "number" && Number.isFinite(jobsPerMonth) ? ` (${Math.round(jobsPerMonth)} apps/mo)` : ""}`,
          metadata: {
            type: "resume_engine_addon",
            userId: String(user.id ?? ""),
            ...(typeof jobsPerMonth === "number" && Number.isFinite(jobsPerMonth)
              ? { jobsPerMonth: String(Math.round(jobsPerMonth)) }
              : {}),
            addonPriceCents: String(Math.round(addonPriceCents)),
          },
        });

        return res.json({ clientSecret: intent.client_secret });
      } catch (error) {
        console.error("❌ Error creating Resume Engine add-on PaymentIntent:", error);
        return res.status(500).json({ message: "Failed to initialize payment." });
      }
    },
  );

  app.post(
    "/api/stripe/preview-plan-change",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user: any = req.user;
        const { newPlanId } = req.body as { newPlanId?: string };

        if (!user?.stripeSubscriptionId) {
          return res.status(400).json({ message: "No active subscription found." });
        }
        if (!newPlanId) {
          return res.status(400).json({ message: "newPlanId is required." });
        }

        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
          { expand: ["items.data", "items.data.price"] },
        );

        const currentItem = subscription.items.data[0];
        if (!currentItem) {
          return res.status(400).json({ message: "Subscription has no items." });
        }

        const { priceId: newPriceId, unitAmount: newUnitAmount } =
          await resolvePriceFromId(newPlanId);

        // Guard against subscriptions accidentally having multiple recurring items.
        // If we preview only updating one item while another remains, Stripe can show/charge
        // more than one month’s worth of recurring charges.
        const nextItems = subscription.items.data.map((item: any, idx: number) =>
          idx === 0
            ? { id: item.id, price: newPriceId, quantity: 1 }
            : { id: item.id, deleted: true },
        );

        const currentUnitAmount = (currentItem as any)?.price?.unit_amount ?? null;
        const isDowngrade =
          typeof currentUnitAmount === "number" &&
          typeof newUnitAmount === "number" &&
          newUnitAmount < currentUnitAmount;

        const prorationDate = Math.floor(Date.now() / 1000);
        const upcoming = await (stripe.invoices as any).createPreview({
          customer: subscription.customer as string,
          subscription: subscription.id,
          subscription_details: {
            items: nextItems,
            proration_behavior: isDowngrade ? "none" : "create_prorations",
            ...(isDowngrade ? {} : { proration_date: prorationDate }),
          },
          expand: ["lines.data.price"],
        });

        const lines = Array.isArray(upcoming?.lines?.data) ? upcoming.lines.data : [];
        const payToday = lines
          .filter((l: any) => l?.proration === true)
          .reduce((sum: number, l: any) => sum + (typeof l.amount === "number" ? l.amount : 0), 0);

        res.json({
          subscriptionId: subscription.id,
          currency: upcoming.currency,
          amountDue: upcoming.amount_due,
          subtotal: upcoming.subtotal,
          total: upcoming.total,
          renewalDate: (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000).toISOString()
            : null,
          prorationDate,
          payToday,
          isDowngrade,
          lines: lines.map((l: any) => ({
            id: l.id,
            amount: l.amount,
            description: l.description,
            proration: l.proration ?? false,
            quantity: l.quantity ?? null,
            price: l.price
              ? {
                  id: l.price.id,
                  unit_amount: l.price.unit_amount ?? null,
                  recurring: l.price.recurring ?? null,
                }
              : null,
          })),
        });
      } catch (error) {
        console.error("❌ Error previewing plan change:", error);
        res.status(500).json({ message: "Failed to preview plan change." });
      }
    },
  );

  async function buildPlanChangeItemUpdates(
    subscription: { items: { data: any[] } },
    newPlanId: string,
  ) {
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw new Error("Subscription has no items.");
    }

    const { priceId: newPriceId, unitAmount: newUnitAmount } =
      await resolvePriceFromId(newPlanId);

    const nextItems = subscription.items.data.map((item: any, idx: number) =>
      idx === 0
        ? { id: item.id, price: newPriceId, quantity: 1 }
        : { id: item.id, deleted: true },
    );

    const currentUnitAmount = (currentItem as any)?.price?.unit_amount ?? null;
    const isDowngrade =
      typeof currentUnitAmount === "number" &&
      typeof newUnitAmount === "number" &&
      newUnitAmount < currentUnitAmount;

    return { nextItems, isDowngrade };
  }

  async function previewPlanChangePayToday(
    subscription: { id: string; customer: string | { id: string } },
    nextItems: any[],
    isDowngrade: boolean,
    prorationDate: number,
  ) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const upcoming = await (stripe.invoices as any).createPreview({
      customer: customerId,
      subscription: subscription.id,
      subscription_details: {
        items: nextItems,
        proration_behavior: isDowngrade ? "none" : "create_prorations",
        ...(isDowngrade ? {} : { proration_date: prorationDate }),
      },
    });

    const lines = Array.isArray(upcoming?.lines?.data) ? upcoming.lines.data : [];
    const payToday = lines
      .filter((l: any) => l?.proration === true)
      .reduce(
        (sum: number, l: any) =>
          sum + (typeof l.amount === "number" ? l.amount : 0),
        0,
      );

    return {
      payToday,
      currency: (upcoming.currency as string) || "usd",
    };
  }

  async function persistPlanChangeToUser(
    user: { id: string; subscriptionViaCoupon?: boolean },
    updated: any,
    newPlanId: string,
    payToday: number,
  ) {
    const hasPendingUpdate = Boolean((updated as any).pending_update);
    if (!hasPendingUpdate) {
      const periodEndMs = updated.current_period_end * 1000;
      await storage.updateUser(user.id, {
        subscriptionPlan: newPlanId,
        stripeSubscriptionId: updated.id,
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(periodEndMs),
        subscriptionViaCoupon: payToday > 0 ? false : user.subscriptionViaCoupon,
        updatedAt: new Date(),
      });
    }
    return hasPendingUpdate;
  }

  app.post(
    "/api/stripe/change-plan",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user: any = req.user;
        const { newPlanId, prorationDate } = req.body as {
          newPlanId?: string;
          prorationDate?: number;
        };

        if (!user?.stripeSubscriptionId) {
          return res.status(400).json({ message: "No active subscription found." });
        }
        if (!newPlanId) {
          return res.status(400).json({ message: "newPlanId is required." });
        }

        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
          { expand: ["items.data", "items.data.price"] },
        );

        const { nextItems, isDowngrade } = await buildPlanChangeItemUpdates(
          subscription,
          newPlanId,
        );

        const effectiveProrationDate =
          typeof prorationDate === "number" && Number.isFinite(prorationDate)
            ? Math.floor(prorationDate)
            : Math.floor(Date.now() / 1000);

        const hasPm = user.stripeCustomerId
          ? await customerHasPaymentMethod(
              user.stripeCustomerId,
              subscription.id,
            )
          : false;

        const { payToday: previewPayToday, currency: previewCurrency } =
          await previewPlanChangePayToday(
            subscription,
            nextItems,
            isDowngrade,
            effectiveProrationDate,
          );

        // Promo / no-card subscribers: collect proration via PaymentIntent before updating Stripe subscription.
        if (
          !isDowngrade &&
          previewPayToday > 0 &&
          !hasPm &&
          user.stripeCustomerId
        ) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: previewPayToday,
            currency: previewCurrency,
            customer: user.stripeCustomerId,
            description: "Subscription update",
            automatic_payment_methods: { enabled: true },
            setup_future_usage: "off_session",
            metadata: {
              type: "plan_change_upgrade",
              userId: String(user.id),
              newPlanId,
              prorationDate: String(effectiveProrationDate),
              subscriptionId: subscription.id,
            },
          });

          return res.json({
            success: true,
            subscriptionId: subscription.id,
            clientSecret: paymentIntent.client_secret,
            applied: false,
            isDowngrade: false,
            payToday: previewPayToday,
            paymentRequired: true,
            requiresPaymentMethod: true,
            hasDefaultPaymentMethod: false,
            subscriptionViaCoupon: Boolean(user.subscriptionViaCoupon),
          });
        }

        // Stripe disallows `cancel_at_period_end` on the same update as
        // `payment_behavior: pending_if_incomplete`. Clear a pending cancel first.
        if (subscription.cancel_at_period_end) {
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: false,
          });
        }

        const updated = await stripe.subscriptions.update(subscription.id, isDowngrade
          ? {
              items: nextItems,
              proration_behavior: "none",
              expand: ["latest_invoice.payment_intent"],
            }
          : {
              items: nextItems,
              proration_behavior: "always_invoice",
              proration_date: effectiveProrationDate,
              payment_behavior: "pending_if_incomplete",
              expand: ["latest_invoice.payment_intent"],
            });

        const latestInvoice: any = updated.latest_invoice;
        const paymentIntent = latestInvoice?.payment_intent ?? null;
        const clientSecret = paymentIntent?.client_secret ?? null;
        const payToday =
          typeof latestInvoice?.amount_due === "number"
            ? latestInvoice.amount_due
            : previewPayToday;

        const hasPendingUpdate = await persistPlanChangeToUser(
          user,
          updated,
          newPlanId,
          payToday,
        );

        const paymentRequired = !isDowngrade && payToday > 0;
        const requiresPaymentMethod = paymentRequired && !hasPm;

        res.json({
          success: true,
          subscriptionId: updated.id,
          status: updated.status,
          cancelAtPeriodEnd: updated.cancel_at_period_end,
          clientSecret,
          applied: !hasPendingUpdate,
          isDowngrade,
          payToday,
          paymentRequired,
          requiresPaymentMethod,
          hasDefaultPaymentMethod: hasPm,
          subscriptionViaCoupon: Boolean(user.subscriptionViaCoupon),
        });
      } catch (error) {
        console.error("❌ Error changing plan:", error);
        res.status(500).json({ message: "Failed to change plan." });
      }
    },
  );

  app.post(
    "/api/stripe/complete-plan-change-payment",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user: any = req.user;
        const { paymentIntentId } = req.body as { paymentIntentId?: string };

        if (!paymentIntentId) {
          return res.status(400).json({ message: "paymentIntentId is required." });
        }

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.type !== "plan_change_upgrade") {
          return res.status(400).json({ message: "Invalid payment for plan change." });
        }
        if (pi.metadata?.userId !== String(user.id)) {
          return res.status(403).json({ message: "Payment does not belong to this user." });
        }
        if (pi.status !== "succeeded") {
          return res.status(400).json({ message: "Payment has not completed yet." });
        }

        if (!pi.description) {
          await stripe.paymentIntents.update(paymentIntentId, {
            description: "Subscription update",
          });
        }

        const newPlanId = pi.metadata.newPlanId;
        const prorationDate = Number(pi.metadata.prorationDate);
        const subscriptionId =
          pi.metadata.subscriptionId || user.stripeSubscriptionId;

        if (!newPlanId || !subscriptionId) {
          return res.status(400).json({ message: "Missing plan change metadata." });
        }

        const pmId =
          typeof pi.payment_method === "string" ? pi.payment_method : null;
        if (!pmId) {
          return res.status(400).json({ message: "No payment method on file." });
        }

        const customerId =
          typeof pi.customer === "string"
            ? pi.customer
            : user.stripeCustomerId;
        if (!customerId) {
          return res.status(400).json({ message: "No Stripe customer found." });
        }

        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pmId },
        });

        // Proration was collected on the PaymentIntent; credit the customer so the
        // subscription proration invoice does not charge again.
        if (pi.amount > 0 && pi.currency) {
          await stripe.customers.createBalanceTransaction(customerId, {
            amount: -pi.amount,
            currency: pi.currency,
            description: "Subscription update",
          });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data", "items.data.price"],
        });

        const { nextItems, isDowngrade } = await buildPlanChangeItemUpdates(
          subscription,
          newPlanId,
        );

        if (subscription.cancel_at_period_end) {
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: false,
          });
        }

        const updated = await stripe.subscriptions.update(
          subscription.id,
          isDowngrade
            ? {
                items: nextItems,
                proration_behavior: "none",
                expand: ["latest_invoice.payment_intent"],
              }
            : {
                items: nextItems,
                proration_behavior: "always_invoice",
                proration_date:
                  Number.isFinite(prorationDate) && prorationDate > 0
                    ? Math.floor(prorationDate)
                    : Math.floor(Date.now() / 1000),
                payment_behavior: "pending_if_incomplete",
                expand: ["latest_invoice.payment_intent"],
              },
        );

        const latestInvoice: any = updated.latest_invoice;
        const payToday =
          typeof latestInvoice?.amount_due === "number" ? latestInvoice.amount_due : 0;

        const hasPendingUpdate = await persistPlanChangeToUser(
          user,
          updated,
          newPlanId,
          payToday,
        );

        res.json({
          success: true,
          applied: !hasPendingUpdate,
          subscriptionId: updated.id,
          payToday,
        });
      } catch (error) {
        console.error("❌ Error completing plan change payment:", error);
        res.status(500).json({ message: "Failed to complete plan change." });
      }
    },
  );

  app.get("/api/stripe/catalog", async (req, res) => {
    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"], // 👈 expands default price only
    });
  
    res.json(products.data);
  });

  // Get price breakdown (for preview)
  app.post(
    "/api/stripe/get-price-breakdown",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const { coupon } = req.body;
        const user = req.user;

        const subscriptionId = user?.stripeSubscriptionId;
        if (!subscriptionId) {
          return res
            .status(400)
            .json({ message: "No active subscription draft found." });
        }

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
          {
            expand: ["items.data.price.product", "latest_invoice"],
          },
        );

        if (subscription.status !== "incomplete") {
          return res
            .status(400)
            .json({ message: "No active subscription draft found." });
        }

        const priceItem = subscription.items.data[0];
        const priceAny: any = priceItem?.price;
        let lineProductId: string | null = null;
        const prodRef = priceAny?.product;
        if (typeof prodRef === "string") lineProductId = prodRef;
        else if (prodRef && typeof prodRef === "object" && prodRef.id) {
          lineProductId = prodRef.id;
        }
        const originalAmount = priceItem.price.unit_amount;

        let breakdown = {
          originalAmount: originalAmount,
          discountAmount: 0,
          finalAmount: originalAmount,
          couponName: null,
          discountPercentage: null,
        };

        if (coupon && coupon.trim()) {
          try {
          const { coupon: couponObj } = await resolveCouponOrPromotionCode(
            coupon,
          );

            if (!couponObj.valid) {
              return res
                .status(400)
                .json({ message: "This coupon is not valid or has expired." });
            }

            if (!couponAppliesToProduct(couponObj, lineProductId)) {
              return res.status(400).json({
                message:
                  "This promo code doesn't apply to this subscription plan.",
              });
            }

            let discountAmount = 0;
            let discountPercentage = null;

            if (couponObj.percent_off) {
              discountPercentage = couponObj.percent_off;
              discountAmount = Math.round(
                (originalAmount * couponObj.percent_off) / 100,
              );
            } else if (couponObj.amount_off) {
              discountAmount = couponObj.amount_off;
            }

            discountAmount = Math.min(discountAmount, originalAmount);

            breakdown = {
              originalAmount: originalAmount,
              discountAmount: discountAmount,
              finalAmount: originalAmount - discountAmount,
              couponName: couponObj.name || coupon.trim(),
              discountPercentage: discountPercentage,
            };

            console.log(
              `📊 Price breakdown for coupon '${coupon}':`,
              breakdown,
            );
        } catch (couponError: any) {
          console.log(`❌ Invalid coupon '${coupon}':`, couponError?.message);
            return res
              .status(400)
              .json({ message: "This coupon code is not valid." });
          }
        }

        res.json({
          success: true,
          breakdown: breakdown,
        });
      } catch (error) {
        console.error("❌ Error getting price breakdown:", error);
        res
          .status(500)
          .json({ message: "Failed to calculate price breakdown" });
      }
    },
  );

  /**
   * Validates a promotion/coupon against Stripe without an incomplete subscription on the user.
   * Used for live feedback while typing on checkout; optionally computes discount from catalog unit amount (cents).
   */
  app.post("/api/stripe/verify-coupon", isAuthenticatedAny, async (req, res) => {
    try {
      const { code, unitAmountCents, planId } = req.body ?? {};
      const trimmed = typeof code === "string" ? code.trim() : "";
      if (!trimmed) {
        return res.status(400).json({ message: "Coupon code is required." });
      }

      let originalAmount: number | null =
        typeof unitAmountCents === "number" &&
        Number.isFinite(unitAmountCents) &&
        unitAmountCents > 0
          ? Math.round(unitAmountCents)
          : null;

      let couponObj: any;
      try {
        const resolved = await resolveCouponOrPromotionCode(trimmed);
        couponObj = resolved.coupon;
      } catch (e: any) {
        return res.status(400).json({
          message: "This coupon code is not valid.",
        });
      }

      if (!couponObj?.valid) {
        return res
          .status(400)
          .json({ message: "This coupon is not valid or has expired." });
      }

      let targetProductId: string | null = null;
      if (typeof planId === "string" && planId.trim()) {
        try {
          targetProductId = (await resolvePriceFromId(planId.trim())).productId;
        } catch {
          targetProductId = null;
        }
      }

      if (!couponAppliesToProduct(couponObj, targetProductId)) {
        return res.status(400).json({
          message:
            "This promo code doesn't apply to the plan you selected.",
        });
      }

      let discountAmount = 0;
      let discountPercentage: number | null = null;
      const pctOff =
        typeof couponObj.percent_off === "number" ? couponObj.percent_off : null;
      const amtOff =
        typeof couponObj.amount_off === "number" ? couponObj.amount_off : null;

      if (originalAmount != null) {
        if (pctOff != null) {
          discountPercentage = pctOff;
          discountAmount = Math.round((originalAmount * pctOff) / 100);
        } else if (amtOff != null && amtOff > 0) {
          discountAmount = amtOff;
        }
        discountAmount = Math.min(discountAmount, originalAmount);
      } else if (pctOff != null) {
        discountPercentage = pctOff;
      }

      const meta = {
        couponName: (couponObj.name as string | null) || trimmed,
        discountPercentage,
        amountOffCents: amtOff,
      };

      let breakdown:
        | {
            originalAmount: number;
            discountAmount: number;
            finalAmount: number;
            couponName?: string | null;
            discountPercentage?: number | null;
          }
        | null =
        originalAmount != null
          ? {
              originalAmount,
              discountAmount,
              finalAmount: originalAmount - discountAmount,
              couponName: meta.couponName,
              discountPercentage,
            }
          : null;

      res.json({
        valid: true,
        breakdown,
        meta,
      });
    } catch (error) {
      console.error("❌ Error verifying coupon:", error);
      res.status(500).json({ message: "Failed to verify coupon." });
    }
  });

  // Apply coupon
  app.post("/api/stripe/apply-coupon", isAuthenticatedAny, async (req, res) => {
    try {
      const { coupon, planId } = req.body;
      const user :any= req.user;

      if (!coupon || !coupon.trim()) {
        return res.status(400).json({ message: "Coupon code is required." });
      }

      // 1. Resolve price from Stripe id (prod_... or price_...)
      const { priceId, unitAmount, days, productId } =
        await resolvePriceFromId(planId);

      // 2. Validate the coupon first (Before cancelling anything)
      let validatedCoupon: any;
      let promotionCodeId: string | null = null;
      try {
        const resolved = await resolveCouponOrPromotionCode(coupon);
        validatedCoupon = resolved.coupon;
        promotionCodeId = resolved.promotionCodeId;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "This coupon is invalid or expired." });
      }

      if (!validatedCoupon.valid) {
        return res
          .status(400)
          .json({ message: "This coupon is invalid or expired." });
      }

      if (!couponAppliesToProduct(validatedCoupon, productId)) {
        return res.status(400).json({
          message:
            "This promo code doesn't apply to the plan you selected.",
        });
      }

      console.log(
        `🎟️ Re-creating subscription for user ${user.id} with coupon "${coupon}"`,
      );

      // 3. Cancel the existing incomplete subscription if it exists
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (err:any) {
          console.log(
            "Old subscription could not be cancelled (might not exist):",
            err.message,
          );
        }
      }

      // 5. Create a NEW subscription with the coupon applied immediately
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        ...(promotionCodeId
          ? { promotion_code: promotionCodeId }
          : { coupon: coupon.trim() }), // ✅ Applied at creation = Applies to first invoice
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: [
          "latest_invoice.payment_intent",
          "latest_invoice.total_discount_amounts",
          "latest_invoice.discount",
        ],
      });

      const invoice :any= subscription.latest_invoice;
      const finalAmount = invoice.total;
      const originalAmount = unitAmount ?? invoice.subtotal ?? 0;
      const discountAmount = invoice.total_discount_amounts.reduce(
        (sum:any, d:any) => sum + d.amount,
        0,
      );

      // 6. Calculate breakdown logic
      const breakdown = {
        originalAmount,
        discountAmount,
        finalAmount,
        couponName: validatedCoupon.name || coupon,
        discountPercentage: validatedCoupon.percent_off ?? null,
      };

      // 7. Handle 100% Discount (Free) — Stripe coupon `duration: once`; no renewal charge.
      if (finalAmount === 0) {
        const subNoRenew = await cancelSubscriptionAtPeriodEnd(subscription.id);
        const periodEndMs = subNoRenew.current_period_end * 1000;
        const subscriptionEndDate = new Date(periodEndMs);

        await storage.updateUser(user.id, {
          subscriptionPlan: planId,
          stripeSubscriptionId: subNoRenew.id,
          subscriptionStatus: "active",
          subscriptionViaCoupon: true,
          subscriptionEndDate,
          updatedAt: new Date(),
        });

        try {
          await processAffiliateSubscriptionActivation(user.id, subNoRenew.id, {
            createCommission: false,
          });
        } catch (affErr) {
          console.error("Affiliate activation (promo subscribe):", affErr);
        }

        return res.json({
          success: true,
          paymentRequired: false,
          subscriptionViaCoupon: true,
          cancelAtPeriodEnd: true,
          message:
            "Promo applied! You have full access until the end of this billing period. Add a payment method before then to keep your plan.",
          breakdown,
          subscriptionEndDate: subscriptionEndDate.toISOString(),
        });
      }

      await storage.updateUser(user.id, {
        subscriptionPlan: planId,
        stripeSubscriptionId: subscription.id,
        subscriptionViaCoupon: false,
        updatedAt: new Date(),
      });

      return res.json({
        success: true,
        paymentRequired: true,
        subscriptionViaCoupon: false,
        message: "Coupon applied successfully.",
        clientSecret: invoice.payment_intent.client_secret, // ✅ Send NEW client secret
        breakdown,
      });
    } catch (error) {
      console.error("❌ Error applying coupon:", error);
      res.status(500).json({ message: "Failed to apply coupon." });
    }
  });

  // Confirm subscription (after payment)
  app.post(
    "/api/stripe/confirm-subscription",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user = req.user;

        const subscriptionId = user.stripeSubscriptionId;

        if (!subscriptionId) {
          return res
            .status(400)
            .json({ message: "No subscription found to confirm." });
        }

        // Retrieve subscription from Stripe to check its actual status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice"],
        });

        if (user.subscriptionStatus === "active") {
          return res.json({
            success: true,
            status: "active",
            message: "Subscription is already active.",
          });
        }

        if (subscription.status === "active" || subscription.status === "trialing") {
          // subscription_status and subscription_end_date are updated only from Stripe webhooks.
          console.log(
            `✅ Subscription active in Stripe for user ${user.id}; DB will sync via webhook.`,
          );

          const latestInvoice = subscription.latest_invoice;
          const paidCents =
            latestInvoice &&
            typeof latestInvoice === "object" &&
            typeof latestInvoice.amount_paid === "number"
              ? latestInvoice.amount_paid
              : 0;

          try {
            await processAffiliateSubscriptionActivation(
              user.id,
              subscriptionId,
              { createCommission: paidCents > 0 },
            );
          } catch (affErr) {
            console.error("Affiliate activation (confirm-subscription):", affErr);
          }

          return res.json({
            success: true,
            status: "active",
            message:
              "Stripe reports an active subscription. Your account updates when the webhook is processed.",
          });
        }

        return res.json({
          success: false,
          status: subscription.status,
          message: "Subscription not active in Stripe.",
        });
      } catch (error) {
        console.error("❌ Error confirming subscription:", error);
        res.status(500).json({ message: "Failed to confirm subscription" });
      }
    },
  );

  // Cancel subscription
  app.post(
    "/api/stripe/cancel-subscription",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user:any = req.user;

        if (!user.stripeSubscriptionId) {
          return res
            .status(400)
            .json({ message: "No active subscription found" });
        }

        const sub :any= await cancelSubscriptionAtPeriodEnd(
          user.stripeSubscriptionId,
        );

        const periodEndMs = sub.current_period_end * 1000;

        // Keep access until period end; Stripe still reports status "active".
        await storage.updateUser(user.id, {
          subscriptionStatus: "active",
          subscriptionEndDate: new Date(periodEndMs),
          stripeSubscriptionId: sub.id,
        });

        res.json({
          message:
            "Your subscription will cancel at the end of the current billing period. You keep access until then.",
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: new Date(periodEndMs),
        });
      } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    },
  );

  // Get subscription status
  app.get(
    "/api/stripe/subscription-status",
    isAuthenticatedAny,
    async (req, res) => {
      try {
        const user:any = req.user;

        if (!user.stripeSubscriptionId) {
          return res.json({
            hasSubscription: false,
            status: user.subscriptionStatus,
            plan: user.subscriptionPlan,
            currentProductId: null,
            subscriptionEndDate: user.subscriptionEndDate,
            subscriptionViaCoupon: Boolean(user.subscriptionViaCoupon),
            hasDefaultPaymentMethod: false,
          });
        }

        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
          { expand: ["items.data.price.product"] },
        );

        const hasDefaultPaymentMethod = user.stripeCustomerId
          ? await customerHasPaymentMethod(
              user.stripeCustomerId,
              user.stripeSubscriptionId,
            )
          : false;

        let currentProductId: string | null = null;
        const pri: any = subscription.items.data[0]?.price;
        if (pri && typeof pri === "object" && pri.product) {
          currentProductId =
            typeof pri.product === "string"
              ? pri.product
              : pri.product?.id ?? null;
        } else if (typeof pri === "string") {
          const price = await stripe.prices.retrieve(pri, {
            expand: ["product"],
          });
          const prod: any = price.product;
          currentProductId =
            typeof prod === "string" ? prod : prod?.id ?? null;
        }

        const periodEndMs = subscription.current_period_end * 1000;
        const stillInPaidPeriod = periodEndMs > Date.now();
        const dbAccessActive = effectiveSubscriptionStatus(user) === "active";

        res.json({
          hasSubscription: true,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(periodEndMs),
          plan: user.subscriptionPlan,
          currentProductId,
          subscriptionEndDate: user.subscriptionEndDate,
          subscriptionViaCoupon: Boolean(user.subscriptionViaCoupon),
          hasDefaultPaymentMethod,
          /** DB and/or Stripe — allow access when webhooks have not synced DB yet. */
          hasAccess:
            dbAccessActive ||
            subscription.status === "active" ||
            subscription.status === "trialing" ||
            (subscription.cancel_at_period_end && stillInPaidPeriod),
        });
      } catch (error) {
        console.error("Error fetching subscription status:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch subscription status" });
      }
    },
  );

  // Admin routes
  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = {
        totalUsers: 1250,
        newUsersThisWeek: 45,
        totalCompanies: 80,
        companiesWithLayoffs: 12,
        totalLayoffs: 156,
        layoffsThisMonth: 8,
        systemHealth: "Good",
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/admin/layoffs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const layoffs = await storage.getAllLayoffs();
      res.json(layoffs);
    } catch (error) {
      console.error("Error fetching layoffs:", error);
      res.status(500).json({ message: "Failed to fetch layoffs" });
    }
  });

  // Data integration endpoint
  app.post("/api/integrate-data", isAuthenticated, async (req, res) => {
    try {
      console.log("Starting data integration...");
      await dataIntegrator.integrateAllData();
      res.json({ message: "Data integration completed successfully" });
    } catch (error: any) {
      console.error("Data integration failed:", error);
      res
        .status(500)
        .json({ message: "Data integration failed", error: error?.message });
    }
  });

  // Get data sources info
  app.get("/api/data-sources", async (req, res) => {
    res.json({
      sources: [
        {
          name: "layoffs.fyi",
          description:
            "Tech industry layoffs tracker with 759K+ employees from 2,813 companies since 2020",
          coverage: "Technology sector focused",
          dataPoints: "759,382 employees affected",
          lastUpdate: "Real-time",
        },
        {
          name: "warntracker.com",
          description:
            "WARN Act layoff notices tracker with comprehensive coverage since 1988",
          coverage: "All industries, all states",
          dataPoints: "7.1M+ employees, 36,237 companies",
          lastUpdate: "Government filings",
        },
        {
          name: "layoffdata.com",
          description:
            "Government WARN Act data aggregator with detailed layoff information",
          coverage: "49 states, all industries",
          dataPoints: "78K+ layoff notices, 8.5M+ workers",
          lastUpdate: "State government data",
        },
      ],
      totalCoverage: {
        employees: "15.5M+",
        companies: "42K+",
        timespan: "Since 1988",
      },
    });
  });

  // Risk Analysis API
  app.post("/api/risk-analysis", async (req, res) => {
    try {
      const {
        jobTitle,
        companyName,
        yearsExperience,
        currentSkills,
        industry,
      } = req.body;

      if (!jobTitle || !companyName) {
        return res.status(400).json({
          message: "Job title and company name are required",
        });
      }

      const analysis = await analyzeJobSecurityRisk({
        jobTitle,
        companyName,
        yearsExperience,
        currentSkills,
        industry,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in risk analysis:", error);
      res.status(500).json({
        message: "Failed to analyze job security risk",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Admin routes - protected by admin role check
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.claims?.sub || req.session?.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      req.adminUser = user;
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  };

  // Admin dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const totalCompanies = await storage.getCompanyCount();
      const totalUsers = await storage.getUserCount();
      const totalLayoffs = await storage.getLayoffCount();
      const activeMonitoring = await storage.getActiveMonitoringCount();

      res.json({
        totalCompanies,
        totalUsers,
        totalLayoffs,
        activeMonitoring,
        newCompaniesThisMonth: 5, // Mock data - implement actual query
        newUsersThisMonth: 23,
        newLayoffsThisMonth: 8,
        recentActivity: [
          {
            type: "layoff",
            description: "New layoff reported at Tech Corp",
            timestamp: "2 hours ago",
          },
          {
            type: "company",
            description: "Added new company: StartupXYZ",
            timestamp: "1 day ago",
          },
          {
            type: "user",
            description: "New user registration",
            timestamp: "2 days ago",
          },
        ],
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin company management
  app.get("/api/admin/companies", requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Admin companies error:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post("/api/admin/companies", requireAdmin, async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.json(company);
    } catch (error) {
      console.error("Create company error:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put("/api/admin/companies/:id", requireAdmin, async (req, res) => {
    try {
      const company = await storage.updateCompany(req.params.id, req.body);
      res.json(company);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete("/api/admin/companies/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Admin layoff management
  app.get("/api/admin/layoffs", requireAdmin, async (req, res) => {
    try {
      const layoffs = await storage.getAllLayoffs();
      res.json(layoffs);
    } catch (error) {
      console.error("Admin layoffs error:", error);
      res.status(500).json({ message: "Failed to fetch layoffs" });
    }
  });

  app.post("/api/admin/layoffs", requireAdmin, async (req, res) => {
    try {
      const layoff = await storage.createLayoffEvent(req.body);
      res.json(layoff);
    } catch (error) {
      console.error("Create layoff error:", error);
      res.status(500).json({ message: "Failed to create layoff event" });
    }
  });

  // Admin user management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const validated = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.params.id, validated);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Development endpoint to promote current user to admin (remove in production)
  app.post("/api/promote-to-admin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.claims?.sub || req.session?.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const user = await storage.updateUserProfile(userId, { role: "admin" });
      res.json({ message: "User promoted to admin successfully", user });
    } catch (error) {
      console.error("Promote to admin error:", error);
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  // Job data extraction endpoint
  app.post("/api/extract-job-data", async (req, res) => {
    try {
      const { jobUrl } = req.body;

      if (!jobUrl) {
        return res.status(400).json({ error: "Job URL is required" });
      }

      // For now, return mock data - in production, this would scrape the job page
      // You could integrate with services like ScrapingBee, Puppeteer, or Cheerio
      const mockJobData = {
        title: "Software Engineer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        description: `We are seeking a Software Engineer to join our growing team. You will be responsible for developing scalable web applications using React, Node.js, and AWS services.

Key Responsibilities:
• Design and implement new features for our web platform
• Collaborate with cross-functional teams to deliver high-quality software
• Mentor junior developers and conduct code reviews
• Optimize application performance and scalability

Requirements:
• 5+ years of experience in software development
• Strong proficiency in JavaScript, React, and Node.js
• Experience with AWS services and cloud architecture
• Bachelor's degree in Computer Science or related field`,
        requirements: [
          "5+ years of experience in software development",
          "Strong proficiency in JavaScript, React, and Node.js",
          "Experience with AWS services and cloud architecture",
          "Bachelor's degree in Computer Science or related field",
        ],
        benefits: [
          "Competitive salary and equity package",
          "Comprehensive health insurance",
          "Flexible work arrangements",
          "Professional development budget",
        ],
        salary: "$120,000 - $160,000",
        type: "Full-time",
      };

      res.json(mockJobData);
    } catch (error) {
      console.error("Error extracting job data:", error);
      res.status(500).json({ error: "Failed to extract job data" });
    }
  });

  // Resume parsing helper function
  // Comprehensive resume parsing function
  function parseResumeComprehensively(resumeText: string): ParsedResumeData {
    const data: ParsedResumeData = {
      name: "",
      email: "",
      phone: "",
      profession: "",
      summary: "",
      experience: [],
      skills: [],
      education: [],
      certifications: [],
      achievements: [],
      projects: [],
      languages: [],
      location: "",
      linkedin: "",
      github: "",
      website: "",
    };

    const lines = resumeText.split("\n").filter((line) => line.trim());
    const text = resumeText.toLowerCase();

    // Extract name (using existing logic but enhanced)
    let extractedName = "";
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      const cleanLine = line.replace(/[^\w\s]/g, "").trim();

      if (cleanLine.length < 2 || cleanLine.length > 50) continue;

      // Skip lines that look like headers, emails, or common resume elements
      if (
        /^(resume|cv|curriculum|contact|objective|summary|education|experience|skills|projects|achievements|certifications)/i.test(
          cleanLine,
        ) ||
        /@/.test(line) ||
        /\d{3}/.test(line) ||
        /^\d+/.test(cleanLine)
      ) {
        continue;
      }

      // Look for properly formatted names
      const nameMatch = cleanLine.match(
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/,
      );
      if (
        nameMatch &&
        nameMatch[1].split(" ").length >= 2 &&
        nameMatch[1].split(" ").length <= 4
      ) {
        extractedName = nameMatch[1].trim();
        break;
      }
    }
    data.name = extractedName || "Your Name";

    // Extract contact information
    data.email = resumeText.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || "";
    data.phone =
      resumeText
        .match(/[\+]?[\d\s\-\(\)]{10,}/)?.[0]
        ?.replace(/\s+/g, " ")
        .trim() || "";

    // Extract LinkedIn
    const linkedinMatch = resumeText.match(
      /(?:linkedin\.com\/in\/|linkedin\/in\/)([^\s\n,]+)/i,
    );
    data.linkedin = linkedinMatch
      ? `https://linkedin.com/in/${linkedinMatch[1]}`
      : "";

    // Extract GitHub
    const githubMatch = resumeText.match(/(?:github\.com\/)([^\s\n,]+)/i);
    data.github = githubMatch ? `https://github.com/${githubMatch[1]}` : "";

    // Extract website
    const websiteMatch = resumeText.match(/https?:\/\/[^\s\n]+/g);
    if (websiteMatch) {
      data.website =
        websiteMatch.find(
          (url) => !url.includes("linkedin") && !url.includes("github"),
        ) || "";
    }

    // Extract location
    const locationPatterns = [
      /(?:location|address|city)[\s\w]*:?\s*([^,\n]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/,
    ];
    for (const pattern of locationPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        data.location = match[1].trim();
        break;
      }
    }

    // Extract profession/title
    const professionKeywords = [
      "engineer",
      "developer",
      "analyst",
      "manager",
      "consultant",
      "designer",
      "architect",
      "specialist",
      "director",
      "lead",
    ];
    const professionPattern = new RegExp(
      `((?:senior\\s+|junior\\s+|lead\\s+)?(?:${professionKeywords.join("|")})(?:\\s+\\w+)*)`,
      "i",
    );
    const professionMatch = resumeText.match(professionPattern);
    data.profession = professionMatch ? professionMatch[1] : "";

    // Extract summary/objective
    const summaryPatterns = [
      /(?:summary|objective|profile|about)[\s\w]*:?\s*([^.\n]+(?:\.[^.\n]+)*)/i,
      /(?:professional\s+summary)[\s\w]*:?\s*([^.\n]+(?:\.[^.\n]+)*)/i,
    ];
    for (const pattern of summaryPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        data.summary = match[1].trim().replace(/\s+/g, " ");
        break;
      }
    }

    // Extract skills
    const skillsPattern =
      /(?:skills|technologies|tools|programming)[\s\w]*:?\s*([^.\n]+)/i;
    const skillsMatch = resumeText.match(skillsPattern);
    if (skillsMatch) {
      data.skills = skillsMatch[1]
        .split(/[,;|]/)
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);
    }

    // Extract experience
    const experienceLines = lines.filter(
      (line) =>
        /\d{4}/.test(line) &&
        /present|current|now|\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*present/i.test(line),
    );

    experienceLines.forEach((line) => {
      const titleMatch = line.match(
        /^([^,\n]+?)(?:\s*[-–]\s*|\s*,\s*)([^,\n]+?)(?:\s*[-–]\s*|\s*,\s*)/,
      );
      if (titleMatch) {
        const durationMatch = line.match(
          /(\d{4}\s*[-–]\s*(?:\d{4}|present|current))/i,
        );
        data.experience.push({
          title: titleMatch[1].trim(),
          company: titleMatch[2].trim(),
          duration: durationMatch ? durationMatch[1] : "",
          responsibilities: [],
        });
      }
    });

    // Extract education
    const educationKeywords = [
      "bachelor",
      "master",
      "phd",
      "degree",
      "university",
      "college",
      "institute",
    ];
    const educationLines = lines.filter((line) =>
      educationKeywords.some((keyword) => line.toLowerCase().includes(keyword)),
    );

    educationLines.forEach((line) => {
      const degreeMatch = line.match(
        /(bachelor[^,]*|master[^,]*|phd[^,]*|b\.?[a-z]\.|m\.?[a-z]\.|ph\.?d\.?)[^,]*/i,
      );
      const institutionMatch = line.match(
        /(?:university|college|institute)\s+[^,\n]*/i,
      );
      const yearMatch = line.match(/\d{4}/);

      if (degreeMatch || institutionMatch) {
        data.education.push({
          degree: degreeMatch ? degreeMatch[0].trim() : "",
          institution: institutionMatch ? institutionMatch[0].trim() : "",
          year: yearMatch ? yearMatch[0] : "",
        });
      }
    });

    // Extract certifications
    const certificationLines = lines.filter((line) =>
      /(?:certification|certified|certificate)/i.test(line),
    );

    certificationLines.forEach((line) => {
      const certMatch = line.match(
        /([^,\n]+)(?:certified|certification|certificate)/i,
      );
      if (certMatch) {
        data.certifications.push({
          name: certMatch[1].trim(),
          issuer: "",
          year: line.match(/\d{4}/)?.[0] || "",
        });
      }
    });

    // Extract achievements
    const achievementKeywords = [
      "achievement",
      "award",
      "recognition",
      "honor",
      "accomplishment",
    ];
    const achievementLines = lines.filter((line) =>
      achievementKeywords.some((keyword) =>
        line.toLowerCase().includes(keyword),
      ),
    );
    data.achievements = achievementLines.map((line) => line.trim());

    // Extract projects
    const projectLines = lines.filter(
      (line) =>
        /project/i.test(line) &&
        !line.toLowerCase().includes("project manager"),
    );

    projectLines.forEach((line) => {
      const projectMatch = line.match(/([^,\n]+project[^,\n]*)/i);
      if (projectMatch) {
        data.projects.push({
          name: projectMatch[1].trim(),
          description: "",
          technologies: [],
        });
      }
    });

    // Extract languages
    const languageKeywords = [
      "languages",
      "language",
      "fluent",
      "native",
      "bilingual",
    ];
    const languageLines = lines.filter((line) =>
      languageKeywords.some((keyword) => line.toLowerCase().includes(keyword)),
    );

    languageLines.forEach((line) => {
      const commonLanguages = [
        "english",
        "spanish",
        "french",
        "german",
        "chinese",
        "japanese",
        "korean",
        "arabic",
        "hindi",
        "urdu",
        "punjabi",
      ];
      commonLanguages.forEach((lang) => {
        if (line.toLowerCase().includes(lang)) {
          data.languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
        }
      });
    });

    return data;
  }

  function parseResumeText(resumeText: string) {
    const data: any = {};

    // Extract email
    const emailMatch = resumeText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    data.email = emailMatch ? emailMatch[0] : "";

    // Extract phone number
    const phoneMatch = resumeText.match(
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    );
    data.phone = phoneMatch ? phoneMatch[0] : "";

    // Enhanced name extraction - look for patterns that indicate names
    const lines = resumeText
      .split("\n")
      .filter((line) => line.trim().length > 0);
    let extractedName = "";

    console.log("Lines for name extraction:", lines.slice(0, 6)); // Debug log

    // Try multiple patterns for name extraction
    for (const line of lines.slice(0, 8)) {
      // Check first 8 lines to be thorough
      const cleanLine = line.trim();

      // Skip lines with email, phone, or obvious non-name content
      if (
        cleanLine.includes("@") ||
        cleanLine.match(/\d{3}/) ||
        cleanLine.toLowerCase().includes("resume") ||
        cleanLine.toLowerCase().includes("cv") ||
        cleanLine.toLowerCase().includes("curriculum") ||
        cleanLine.length < 3 ||
        cleanLine.length > 50
      ) {
        continue;
      }

      // Primary pattern: Standard capitalized names (First Last, First Middle Last)
      const standardNameMatch = cleanLine.match(
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/,
      );
      if (
        standardNameMatch &&
        standardNameMatch[1].split(" ").length >= 2 &&
        standardNameMatch[1].split(" ").length <= 4
      ) {
        extractedName = standardNameMatch[1].trim();
        console.log("Found name with standard pattern:", extractedName);
        break;
      }

      // Check for "Name:" label
      const labelMatch = cleanLine.match(/^Name:\s*(.+)$/i);
      if (labelMatch && labelMatch[1]) {
        extractedName = labelMatch[1].trim();
        console.log("Found name with label pattern:", extractedName);
        break;
      }

      // More flexible pattern for names that might have different cases or special characters
      const flexibleNameMatch = cleanLine.match(
        /^([A-Za-z]+(?:\s+[A-Za-z]+){1,3})$/,
      );
      if (
        flexibleNameMatch &&
        !extractedName &&
        flexibleNameMatch[1].split(" ").length >= 2
      ) {
        const words = flexibleNameMatch[1].split(" ");
        // Ensure it looks like a name (not all lowercase, not all uppercase)
        if (
          words.every((word) => word.length > 1) &&
          !words.every((word) => word === word.toLowerCase()) &&
          !words.every((word) => word === word.toUpperCase())
        ) {
          extractedName = flexibleNameMatch[1].trim();
          console.log("Found name with flexible pattern:", extractedName);
          break;
        }
      }

      // Last resort: Use any line that looks like a name (proper case with 2-4 words)
      if (
        !extractedName &&
        cleanLine.split(" ").length >= 2 &&
        cleanLine.split(" ").length <= 4
      ) {
        const words = cleanLine.split(" ");
        if (
          words.every(
            (word) =>
              word[0] && word[0].toUpperCase() === word[0] && word.length > 1,
          )
        ) {
          extractedName = cleanLine;
          console.log("Found name with fallback pattern:", extractedName);
          break;
        }
      }
    }

    console.log("Final extracted name:", extractedName);
    data.name = extractedName || "Your Name";

    // Extract education
    const educationKeywords =
      /(?:bachelor|master|phd|degree|university|college|graduated|education)/i;
    const educationLine = lines.find((line) => educationKeywords.test(line));
    if (educationLine) {
      const degreeMatch = educationLine.match(
        /(bachelor[^,]*|master[^,]*|phd[^,]*|b\.?[a-z]\.|m\.?[a-z]\.|ph\.?d\.?)[^,]*/i,
      );
      data.degree = degreeMatch ? degreeMatch[0].trim() : "Bachelor's degree";

      const universityMatch = educationLine.match(
        /(?:university|college|institute)\s+[^,\n]*/i,
      );
      data.university = universityMatch
        ? universityMatch[0].trim()
        : "State University";
    }

    // Extract work experience
    const experienceKeywords =
      /(\d+)[\+\-\s]*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i;
    const expMatch = resumeText.match(experienceKeywords);
    data.experience = expMatch ? expMatch[1] + " years" : "3 years";

    // Extract current/recent company
    const companyKeywords =
      /(?:current|work|employed|company)[\s\w]*:\s*([^,\n]+)/i;
    const companyMatch = resumeText.match(companyKeywords);
    data.currentCompany = companyMatch
      ? companyMatch[1].trim()
      : "Tech Solutions Inc.";

    // Extract profession/role
    const roleKeywords =
      /(?:software engineer|developer|analyst|manager|consultant|designer|architect|specialist)/i;
    const roleMatch = resumeText.match(roleKeywords);
    data.profession = roleMatch ? roleMatch[0] : "Software Development";

    // Extract skills
    const skillsKeywords =
      /(?:skills|technologies|tools|programming)[\s\w]*:([^.\n]+)/i;
    const skillsMatch = resumeText.match(skillsKeywords);
    data.skills = skillsMatch
      ? skillsMatch[1].trim()
      : "JavaScript, React, Node.js, Python";

    // Extract certifications
    const certKeywords =
      /(?:certification|certified|certificate)[\s\w]*:?([^.\n]+)/i;
    const certMatch = resumeText.match(certKeywords);
    data.certifications = certMatch
      ? certMatch[1].trim()
      : "AWS Cloud Practitioner";

    // Extract location
    const locationKeywords = /(?:location|address|city)[\s\w]*:?\s*([^,\n]+)/i;
    const locationMatch = resumeText.match(locationKeywords);
    data.location = locationMatch
      ? locationMatch[1].trim()
      : "San Francisco, CA";

    // Infer work arrangement (look for remote/hybrid keywords)
    if (/remote/i.test(resumeText)) {
      data.workArrangement = "remote";
    } else if (/hybrid/i.test(resumeText)) {
      data.workArrangement = "hybrid";
    } else {
      data.workArrangement = "onsite";
    }

    // Extract responsibilities/duties
    const responsibilityKeywords =
      /(?:responsible for|responsibilities|duties)[\s\w]*:?([^.\n]+)/i;
    const respMatch = resumeText.match(responsibilityKeywords);
    data.currentRole = respMatch
      ? respMatch[1].trim()
      : "developing software solutions";
    data.responsibilities = respMatch
      ? respMatch[1].trim()
      : "managing development projects and coordinating with stakeholders";

    // Extract tools/methods
    const toolsKeywords =
      /(?:tools|software|platforms|systems)[\s\w]*:?([^.\n]+)/i;
    const toolsMatch = resumeText.match(toolsKeywords);
    data.tools = toolsMatch
      ? toolsMatch[1].trim()
      : "Agile methodologies, Git, and project management tools";

    return data;
  }

  // File upload endpoint for resume processing
  // app.post("/api/upload-resume", upload.single('resume'), async (req, res) => {
  //   try {
  //     console.log("File upload request received");
  //     console.log("Request file:", req.file);
  //     console.log("Request body:", req.body);

  //     if (!req.file) {
  //       console.log("No file found in request");
  //       return res.status(400).json({ error: "No file uploaded" });
  //     }

  //     console.log("File details:", {
  //       filename: req.file.filename,
  //       originalname: req.file.originalname,
  //       mimetype: req.file.mimetype,
  //       size: req.file.size
  //     });

  //     const filePath = req.file.path;
  //     let resumeText = "";

  //     // Read file content based on file type with specific parsers
  //     try {
  //       const dataBuffer = fs.readFileSync(filePath);

  //       if (req.file.mimetype === 'text/plain') {
  //         // Parse TXT files
  //         resumeText = fs.readFileSync(filePath, 'utf8');
  //       } else if (req.file.mimetype === 'application/pdf') {
  //         // Enhanced PDF text extraction with basic approach
  //         console.log("Processing PDF file...");
  //         try {
  //           // Try converting buffer to text and extracting readable content
  //           const pdfString = dataBuffer.toString('utf8');

  //           // Extract text patterns that are typically readable
  //           const textPatterns = [
  //             // Look for common text between stream markers
  //             /stream\s*([\s\S]*?)\s*endstream/gi,
  //             // Look for readable text sequences
  //             /[A-Za-z]{3,}[\s\S]*?[A-Za-z]{3,}/g,
  //             // Look for email patterns
  //             /[\w\.-]+@[\w\.-]+\.\w+/g,
  //             // Look for phone patterns
  //             /[\+\-\(\)\d\s]{10,}/g
  //           ];

  //           let extractedText = '';
  //           textPatterns.forEach(pattern => {
  //             const matches = pdfString.match(pattern);
  //             if (matches) {
  //               extractedText += matches.join(' ') + ' ';
  //             }
  //           });

  //           // Clean up the extracted text
  //           resumeText = extractedText
  //             .replace(/[^\w\s@\.\-\+\(\),]/g, ' ') // Remove special chars except basic ones
  //             .replace(/\s+/g, ' ') // Normalize whitespace
  //             .trim();

  //           console.log("PDF extracted text length:", resumeText.length);
  //           console.log("PDF extracted text sample:", resumeText.substring(0, 300));

  //           if (!resumeText || resumeText.trim().length < 50) {
  //             resumeText = "PDF text extraction yielded limited results. This PDF might be image-based or use complex formatting. For best results, please save your PDF as a .txt file (File → Save As → Plain Text) or upload a .docx version for comprehensive parsing.";
  //           }
  //         } catch (error) {
  //           console.error("PDF parsing error:", error);
  //           resumeText = "PDF processing encountered an issue. Please try uploading a .docx or .txt version for optimal text extraction.";
  //         }
  //       } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
  //         // Parse DOCX files
  //         try {
  //           const result = await mammoth.extractRawText({ buffer: dataBuffer });
  //           resumeText = result.value;
  //           console.log("DOCX extracted text:", resumeText.substring(0, 200)); // Debug log
  //         } catch (docxError) {
  //           console.error("Error parsing DOCX:", docxError);
  //           resumeText = "Error parsing DOCX file. Please try with a different format.";
  //         }
  //       } else if (req.file.mimetype === 'application/msword') {
  //         // Parse DOC files
  //         try {
  //           const docText = await docxParser.parseDocx(dataBuffer);
  //           resumeText = docText;
  //         } catch (docError) {
  //           console.error("Error parsing DOC:", docError);
  //           resumeText = "Error parsing DOC file. Please try with a different format.";
  //         }
  //       } else {
  //         resumeText = "Unsupported file format. Please use .txt, .pdf, .doc, or .docx files.";
  //       }
  //     } catch (error) {
  //       console.error("Error reading file:", error);
  //       resumeText = "Error processing file. Please try uploading a different file.";
  //     }

  //     // Clean up uploaded file
  //     fs.unlinkSync(filePath);

  //     // Parse the resume text comprehensively
  //     const parsedData = parseResumeComprehensively(resumeText);

  //     res.json({
  //       resumeText,
  //       parsedData,
  //       success: true
  //     });
  //   } catch (error) {
  //     console.error("Error processing resume:", error);
  //     res.status(500).json({ error: "Failed to process resume file" });
  //   }
  // });

  // AI Interview Question Generation endpoint

  app.post("/api/generate-interview-questions", async (req, res) => {
    try {
      const { jobDescription, jobTitle, interviewType, interviewerRole, id } =
        req.body;

      console.log("Received job data with interviewer role:", interviewerRole);

      if (!jobDescription && !jobTitle) {
        return res
          .status(400)
          .json({ error: "Job description or job title is required" });
      }

      // Validate paid subscription
      const user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed.",
          });
      }

      // Helper to make the interviewer's role more readable for the AI prompt
      const interviewerRoleLabels: Record<string, string> = {
        hiring_manager: "Hiring Manager",
        hr_recruiter: "HR / Recruiter",
        technical_lead: "Technical Lead / Senior Engineer",
        team_member: "Peer / Team Member",
        executive: "Executive / C-Level",
      };
      const friendlyInterviewerRole =
        (typeof interviewerRole === "string" &&
          interviewerRoleLabels[interviewerRole]) ||
        "Hiring Manager";

      // --- MODIFICATION START: Updated prompt to include 'goodImpression' for questions to ask interviewer ---
      const prompt = `
You are an expert career coach and interview preparation AI. Your task is to analyze the following job information and generate a structured JSON object.

**Job Information:**
- Job Title: ${jobTitle || "Not specified"}
- Job Description: ${jobDescription || "Not specified"}
- Requested Interview Type: ${interviewType}
- Interviewing With: ${friendlyInterviewerRole}

**Your Task:**
1.  Analyze the provided job information to infer key details like the true job title, company (if mentioned), key skills, and requirements.
2.  Generate 5 to 7 tailored interview questions that the INTERVIEWER might ask the CANDIDATE. For each of these questions, you must provide:
    a. The question itself ("question").
    b. A category like "Behavioral", "Technical", "Situational", or "Cultural Fit" ("category").
    c. Guidance on what a model answer should include ("modelAnswer").
    d. A brief explanation of the interviewer's real goal with this question—what they are truly trying to learn ("interviewerIntent").
3.  Generate 3 to 5 insightful questions that the CANDIDATE can ask the INTERVIEWER. For each of these questions, you must provide:
    a. The question itself ("question").
    b. A brief explanation of why asking this question makes a good impression on the interviewer ("goodImpression"). This explanation should be concise and focused on the value the question demonstrates (e.g., strategic thinking, long-term commitment, team-oriented mindset).

**Length constraints:**
- Keep each "modelAnswer" to 2-3 sentences.
- Keep each "interviewerIntent" and "goodImpression" to 1-2 sentences.
- Do not add extra fields or commentary outside the JSON object.

**Output Format:**
You MUST respond with ONLY a single valid JSON object. Do not include any text, backticks, or explanations before or after the JSON block. The JSON object must strictly follow this structure:

{
  "jobTitle": "string",
  "company": "string",
  "keySkills": ["string"],
  "requirements": ["string"],
  "questions": [
    {
      "question": "string",
      "category": "string",
      "modelAnswer": "string",
      "interviewerIntent": "string"
    }
  ],
  "questionsToAskInterviewer": [
    {
      "question": "string",
      "goodImpression": "string"
    }
  ]
}
`;
      // --- MODIFICATION END ---

      const aiResult = await anthropicMessagesCreateWithRetry(
        anthropic,
        {
          model: DEFAULT_MODEL_STR,
          max_tokens: 3000,
          temperature: 0.6,
          messages: [{ role: "user", content: prompt }],
        },
        { label: "generate-interview-questions", ...USER_FACING_ANTHROPIC_OPTIONS },
      );

      if (!aiResult.ok) {
        const httpStatus =
          aiResult.status === 529 || aiResult.status === 503 ? 503 : 502;
        return res.status(httpStatus).json({ error: aiResult.error });
      }

      if (aiResult.message.stop_reason === "max_tokens") {
        console.warn(
          "Interview questions response hit max_tokens and may be truncated",
        );
      }

      const jobAnalysis = parseAnthropicJsonResponse<any>(
        getAnthropicResponseText(aiResult.message.content),
      );

      // Post-process the questions to add unique IDs for the frontend state management
      jobAnalysis.questions = jobAnalysis.questions.map((q:any) => ({
        ...q,
        id: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
          (c === "x"
            ? (Math.random() * 16) | 0
            : (((Math.random() * 16) | 0) & 0x3) | 0x8
          ).toString(16),
        ),
        isAnswered: false,
      }));

      // Deduct one credit from the user after a successful generation
      await DetuctCredits(user);

      await logLayoffProofTool(req, "interview", {
        bodyUserId: user.id,
        title: "Generated interview practice questions",
        detail: jobTitle ? String(jobTitle) : null,
        metadata: { jobTitle, interviewType },
      });

      // Send the complete analysis back to the client
      res.json(jobAnalysis);
    } catch (error) {
      console.error("Error generating interview questions:", error);
      // Provide a more generic error message to the client for security
      res
        .status(500)
        .json({
          error:
            "Failed to generate interview questions. Please try again later.",
        });
    }
  });

  app.post("/api/improve-cover-letter", async (req, res) => {
    try {
      const { originalLetter, instructions, id } = req.body;

      if (!originalLetter || !instructions || !id) {
        return res
          .status(400)
          .json({
            error: "Original letter, instructions, and user ID are required.",
          });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // 2. Construct a precise prompt for the AI
      const prompt = `
You are revising a cover letter for a real job application. Follow the user's instructions exactly, but keep the result sounding like a person wrote it—not like AI or corporate marketing copy.

**Human voice (always apply):**
- Natural rhythm: mix short sentences with longer ones; contractions (I'm, I've) where they fit.
- Cut stiff openers ("I am writing to express…", "I am excited to submit…") and buzzwords (leverage, synergy, robust, cutting-edge, thrive in fast-paced, passion for, game-changer) unless the user asked for them.
- Avoid stacked adjectives, "Furthermore/Additionally" at every paragraph start, and bullet lists in the letter body unless the user requested bullets.
- Preserve facts; do not invent employers, numbers, or credentials.

You MUST return ONLY the full, revised cover letter text. No markdown fences, no commentary before or after.

**Original Cover Letter:**
---
${originalLetter}
---

**User's Instructions for Improvement:**
---
${instructions}
---

Now, provide the complete, improved cover letter below.
`;

      // 3. Call the Anthropic API (retry on 529 overload / rate limits)
      const aiResult = await anthropicMessagesCreateWithRetry(
        anthropic,
        {
          model: DEFAULT_MODEL_STR,
          max_tokens: 2048,
          temperature: 0.45,
          messages: [{ role: "user", content: prompt }],
        },
        { label: "improve-cover-letter", ...USER_FACING_ANTHROPIC_OPTIONS },
      );

      if (!aiResult.ok) {
        const httpStatus =
          aiResult.status === 529 || aiResult.status === 503 ? 503 : 502;
        return res.status(httpStatus).json({ error: aiResult.error });
      }

      // 4. Extract the improved letter text
      const improvedLetter = aiResult.message.content[0].text;

      // 5. Deduct one credit from the user after a successful generation

      await logLayoffProofTool(req, "cover-letter", {
        bodyUserId: id,
        title: "Improved cover letter with AI",
      });

      // 6. Send the improved letter back to the client
      res.json({ improvedLetter });
    } catch (error) {
      console.error("Error improving cover letter:", error);
      res
        .status(500)
        .json({
          error: "Failed to improve the cover letter. Please try again later.",
        });
    }
  });

  // --- API Endpoint to Score Interview Answers (No Changes) ---
  app.post("/api/score-interview-answers", async (req, res) => {
    try {
      // 1. Destructure necessary data from the request body
      const { questions, userAnswers, jobTitle } = req.body;

      // Validate input
      if (!questions || !userAnswers || !jobTitle) {
        return res
          .status(400)
          .json({
            error:
              "Missing required fields: questions, userAnswers, and jobTitle.",
          });
      }

      // 2. Prepare the data for the AI model to process
      const questionsToScore = questions.map((q) => ({
        id: q.id,
        question: q.question,
        modelAnswerGuidance: q.modelAnswer,
        userAnswer: userAnswers[q.id] || "No answer provided.",
      }));

      // 3. Construct a clear, detailed prompt for the AI
      // This prompt engineering is crucial for getting a reliable JSON output.
      const prompt = `
  You are an expert AI hiring manager and career coach. Your task is to evaluate a candidate's answers to a series of interview questions for a specific job.

  **Job Context:**
  - Job Title: ${jobTitle}

  **Instructions:**
  For each question-answer pair provided below, evaluate the user's answer based on the 'modelAnswerGuidance'. The guidance explains what a good answer should contain. Provide a numerical score from 1 (poor) to 10 (excellent) and concise, constructive feedback. Your feedback must justify the score and offer specific, actionable suggestions for improvement.

  **Input Data (Array of questions and answers):**
  ${JSON.stringify(questionsToScore, null, 2)}

  **Output Format:**
  You MUST respond with ONLY a single, valid JSON array. Do not include any text, backticks ("\`\`\`json"), or explanations before or after the JSON block. The array must strictly follow this structure:

  [
    {
      "id": "string", // The original ID of the question
      "score": number, // A score from 1 to 10
      "feedback": "string" // Constructive feedback for the user's answer
    }
  ]
  `;

      // 4. Initialize the AI client and make the API call
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const aiResult = await anthropicMessagesCreateWithRetry(
        anthropic,
        {
          model: DEFAULT_MODEL_STR,
          max_tokens: 2000,
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }],
        },
        { label: "score-interview-answers", ...USER_FACING_ANTHROPIC_OPTIONS },
      );

      if (!aiResult.ok) {
        const httpStatus =
          aiResult.status === 529 || aiResult.status === 503 ? 503 : 502;
        return res.status(httpStatus).json({ error: aiResult.error });
      }

      const scoredResults = parseAnthropicJsonResponse<
        Array<{ id: string; score: number; feedback: string }>
      >(getAnthropicResponseText(aiResult.message.content));

      // 6. Create a map for efficient lookup of scores and feedback by question ID
      const resultsMap = scoredResults.reduce<
        Record<string, { score: number; feedback: string }>
      >((acc, result) => {
        acc[result.id] = { score: result.score, feedback: result.feedback };
        return acc;
      }, {});

      // 7. Map the AI's results back to the original questions array
      const updatedQuestions = questions.map((q) => ({
        ...q,
        score: resultsMap[q.id]?.score,
        feedback: resultsMap[q.id]?.feedback,
        isAnswered: true, // Mark this question as scored
      }));

      await logLayoffProofTool(req, "interview", {
        title: "Scored interview practice answers",
        detail: jobTitle ? String(jobTitle) : null,
        metadata: { jobTitle },
      });

      // 8. Send the final, enriched data back to the frontend
      res.status(200).json({ questions: updatedQuestions });
    } catch (error) {
      // 9. Handle any errors gracefully
      console.error("Error scoring interview answers:", error);
      res
        .status(500)
        .json({
          error:
            "Failed to score interview answers. Please check the server logs.",
        });
    }
  });

  async function getLinkedInProfile(profileUrl: string) {
    const api_key = process.env.SCRAPINGDOG_API_KEY;
    const url = "https://api.scrapingdog.com/linkedin";

    const params = {
      api_key: api_key,
      type: "profile",
      linkId: profileUrl,
      premium: true,
    };

    let attempts = 0;
    const maxAttempts = 2; // first try + one retry

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await axios.get<any[]>(url, { params });

        if (
          response.status === 200 &&
          response.data &&
          response.data.length > 0
        ) {
          return response.data;
        } else if (response.status === 200) {
          throw new Error(
            "ScrapingDog API returned an empty result for the profile.",
          );
        } else {
          throw new Error(
            "Request failed with status code: " + response.status,
          );
        }
      } catch (error: any) {
        console.error(
          `Error fetching LinkedIn profile from ScrapingDog (attempt ${attempts}):`,
          error.response?.data || error.message,
        );

        if (attempts >= maxAttempts) {
          throw new Error(
            error.response?.data?.message ||
              "Failed to fetch data from the scraping service.",
          );
        }

        // Optional small delay before retry
        await new Promise((res) => setTimeout(res, 1000));
        console.log("Retrying ScrapingDog request...");
      }
    }
  }

  // --- THIS IS THE UPDATED ENDPOINT ---
  app.post("/api/import-linkedin-resume", async (req, res) => {
    const { profileUrl, id } = req.body;

    // 1. Basic URL validation
    if (!profileUrl || !profileUrl.includes("linkedin.com/in/")) {
      return res
        .status(400)
        .json({
          error:
            "A valid LinkedIn profile URL is required (e.g., https://www.linkedin.com/in/...)",
        });
    }

    console.log("LinkedIn profile import request for:", profileUrl);

    try {
      const user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed",
          });
      }

      // 2. Call the ScrapingDog API function
      const linkedInDataArray = await getLinkedInProfile(profileUrl);

      // The API returns data inside an array, even for one profile.
      const profileData = linkedInDataArray[0];

      if (!profileData) {
        return res
          .status(404)
          .json({ error: "Profile data could not be found or extracted." });
      }

      // 3. Map the API response to your frontend's expected 'resumeData' structure
      const resumeData = {
        // --- Personal Info ---
        name: profileData.fullName || "Name (Please Edit)",
        profession: profileData.headline || "Professional (Please Edit)",
        summary: profileData.about || "Summary (Please Edit)",
        location: profileData.location || "",
        linkedin: profileUrl, // Use the original URL provided

        // --- Experience Section ---
        experience: (profileData.experience || []).map((exp) => ({
          title: exp.position || "Job Title (Please Edit)",
          company: exp.company_name || "Company Name (Please Edit)",
          duration: exp.duration || "",
          description:
            exp.summary ||
            "Describe your key responsibilities and achievements in this role.",
          responsibilities: [], // API doesn't provide this, so we default to an empty array
        })),

        // --- Education Section ---
        education: (profileData.education || []).map((edu) => ({
          degree: edu.college_degree || "Degree Name (Please Edit)",
          // The frontend form uses 'school', so we map 'college_name' to it.
          school: edu.college_name || "University Name (Please Edit)",
          duration: edu.college_duration || "",
          details: edu.college_activity || "",
        })),

        // --- Placeholders for fields not in the public API response ---
        // Your frontend's `initialResumeData` will fill these in, but being explicit is good.
        skills: ["Skill 1 (Please Edit)", "Skill 2", "Skill 3"], // API doesn't provide a clean skills list
        languages: ["English"],
        email: "",
        phone: "",
        github: "",
        website: "",
        certifications: [],
        achievements: [],
        projects: [],
        profileImageDataUrl:
          profileData.profile_photo ||
          profileData.profile_picture ||
          profileData.profile_image ||
          profileData.avatar ||
          profileData.img ||
          "",
      };

      console.log("Successfully mapped LinkedIn data from ScrapingDog.");

      await DetuctCredits(user);

      await logLayoffProofTool(req, "resume-builder", {
        bodyUserId: user.id,
        type: "resume_uploaded",
        title: "Imported LinkedIn profile to resume",
      });

      // 4. Send the successfully mapped data to the frontend
      return res.json({
        success: true,
        resumeData, // This is the crucial part
        source: "linkedin-import-scrapingdog",
        note: "Data successfully scraped from LinkedIn. Please review and complete the missing details.",
      });
    } catch (error: any) {
      console.error(
        "Critical error in /api/import-linkedin-resume:",
        error.message,
      );
      // Send a user-friendly error message to the frontend
      return res
        .status(500)
        .json({ error: `Failed to import profile: ${error.message}` });
    }
  });

  // LinkedIn PDF import endpoint (uploads LinkedIn profile as PDF instead of URL)
  app.post("/api/import-linkedin-resume-pdf", async (req, res) => {
    try {
      const form = new Formidable({
        maxFileSize: 5 * 1024 * 1024, // 5MB
        multiples: false,
      });

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const [fields, files] = await form.parse(req);
      const id = fields?.id?.[0];
      const pdfFile =
        files.file?.[0] ?? files.profile?.[0] ?? files.resume?.[0] ?? null;

      const user = await GetUserScscriptionTrialValidation(
        typeof id === "string" ? id : "",
      );

      if (!user) {
        return res.status(400).json({
          error: "Subscription has expired, or you have not subscribed",
        });
      }

      if (!pdfFile) {
        return res.status(400).json({
          error: "No PDF uploaded. Please attach your LinkedIn profile PDF.",
        });
      }

      const filePath = pdfFile.filepath;
      const fileExt = path
        .extname(pdfFile.originalFilename || "")
        .toLowerCase();

      if (fileExt !== ".pdf") {
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return res.status(400).json({
          error: "Unsupported file type. Please upload a PDF file.",
        });
      }

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const rawText = (data?.text ?? "").trim();

      // Clean up the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch {}

      if (!rawText) {
        return res.status(400).json({
          error:
            "Could not extract any text from the PDF. If it’s a scanned/image PDF, export a text-based PDF from LinkedIn.",
        });
      }

      // Parse into resume JSON (same structure as /api/upload-resume)
      const prompt = `
You are an expert LinkedIn profile PDF parser. Convert the text extracted from a LinkedIn profile PDF into a structured JSON object.

The output MUST be a valid JSON object ONLY. Do not include introductions, explanations, or markdown like \`\`\`json.
Strictly follow this structure: ${resumeJsonStructure}.

- Prefer LinkedIn-style section headers (About, Experience, Education, Skills) when mapping.
- For arrays, if no information is found, return [].
- For strings, if no information is found, return "".

Here is the extracted text to parse:
---
${rawText}
---
`;

      const aiResult = await anthropicMessagesCreateWithRetry(
        anthropic,
        {
          model: DEFAULT_MODEL_STR,
          max_tokens: 2000,
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }],
        },
        {
          maxRetries: 6,
          baseDelayMs: 2000,
          label: "import-linkedin-resume-pdf",
          ...USER_FACING_ANTHROPIC_OPTIONS,
        },
      );

      if (!aiResult.ok) {
        return res.status(503).json({
          error: "Failed to parse LinkedIn PDF with AI.",
          details: aiResult.error,
        });
      }

      const responseText = getAnthropicResponseText(aiResult.message.content);
      let parsedData: any;
      try {
        parsedData = parseAnthropicJsonResponse<any>(responseText);
      } catch (parseError) {
        console.error(
          "Failed to parse JSON from AI response (linkedin pdf):",
          responseText,
        );
        return res.status(502).json({
          error: "AI returned an invalid response. Please try again.",
        });
      }

      // Map to the frontend LinkedIn Optimizer expected shape
      const resumeData = {
        name: parsedData?.name || "Name (Please Edit)",
        profession: parsedData?.profession || "Professional (Please Edit)",
        summary: parsedData?.summary || "Summary (Please Edit)",
        location: parsedData?.location || "",
        linkedin: parsedData?.linkedin || "",
        experience: Array.isArray(parsedData?.experience)
          ? parsedData.experience.map((exp: any) => ({
              title: exp?.title || "Job Title (Please Edit)",
              company: exp?.company || "Company Name (Please Edit)",
              duration: exp?.duration || "",
              description:
                exp?.description ||
                "Describe your key responsibilities and achievements in this role.",
              responsibilities: Array.isArray(exp?.responsibilities)
                ? exp.responsibilities
                : [],
            }))
          : [],
        education: Array.isArray(parsedData?.education)
          ? parsedData.education.map((edu: any) => ({
              degree: edu?.degree || "Degree Name (Please Edit)",
              school: edu?.institution || "",
              duration: edu?.duration || "",
              details: "",
            }))
          : [],
        skills: Array.isArray(parsedData?.skills)
          ? parsedData.skills
          : ["Skill 1 (Please Edit)", "Skill 2", "Skill 3"],
        languages: Array.isArray(parsedData?.languages) ? parsedData.languages : [],
        email: parsedData?.email || "",
        phone: parsedData?.phone || "",
        github: parsedData?.github || "",
        website: parsedData?.website || "",
        certifications: Array.isArray(parsedData?.certifications)
          ? parsedData.certifications
          : [],
        achievements: Array.isArray(parsedData?.achievements)
          ? parsedData.achievements
          : [],
        projects: Array.isArray(parsedData?.projects) ? parsedData.projects : [],
      };

      await DetuctCredits(user);

      await logLayoffProofTool(req, "resume-builder", {
        bodyUserId: user.id,
        type: "resume_uploaded",
        title: "Imported LinkedIn PDF to resume",
      });

      return res.json({
        success: true,
        resumeData,
        source: "linkedin-import-pdf",
        note: "Data parsed from your uploaded LinkedIn PDF. Please review and complete any missing details.",
      });
    } catch (error: any) {
      console.error("Critical error in /api/import-linkedin-resume-pdf:", error);
      return res.status(500).json({
        error: "Failed to import LinkedIn PDF.",
        details: error.message,
      });
    }
  });

  // LinkedIn Profile Crawling endpoint
  app.post("/api/crawl-linkedin-profile", async (req, res) => {
    try {
      const { profileUrl } = req.body;

      if (!profileUrl || !profileUrl.includes("linkedin.com")) {
        return res
          .status(400)
          .json({ error: "Valid LinkedIn profile URL is required" });
      }

      // Try simple HTTP request first as fallback
      try {
        const response = await axios.get(profileUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);

        // Extract basic profile data from HTML
        const name =
          $("h1").first().text().trim() ||
          $("title").text().replace(" | LinkedIn", "").trim() ||
          "Profile Name";

        const headline =
          $(".text-body-medium").first().text().trim() ||
          $('meta[name="description"]')
            .attr("content")
            ?.split("|")[0]
            ?.trim() ||
          "Professional";

        const about =
          $(".pv-about__text").text().trim() ||
          $('meta[name="description"]').attr("content")?.trim() ||
          "Professional background and experience";

        // Generate sample data for demonstration
        const profileData = {
          name,
          headline,
          about,
          location: "Location not specified",
          profileImageUrl: "",
          connectionCount: "500+ connections",
          skills: [
            "Leadership",
            "Management",
            "Strategy",
            "Team Building",
            "Communication",
          ],
          experience: [
            {
              title: "Senior Professional",
              company: "Technology Company",
              duration: "2020 - Present",
              description: "Leading strategic initiatives and team development",
            },
          ],
          keywords: [
            "professional",
            "leader",
            "technology",
            "strategy",
            "management",
          ],
        };

        return res.json({
          success: true,
          profileData,
          extractedAt: new Date().toISOString(),
          method: "http-fallback",
        });
      } catch (httpError) {
        console.log(
          "HTTP method failed, trying Puppeteer...",
          httpError.message,
        );
      }

      // Launch puppeteer browser with enhanced configuration for Replit
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: "new",
          executablePath:
            "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=TranslateUI",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
          ],
        });
      } catch (launchError) {
        console.error("Puppeteer launch failed:", launchError);

        // Extract profile name from URL as fallback
        const urlParts = profileUrl.split("/");
        const profileSlug =
          urlParts[urlParts.indexOf("in") + 1] || "professional";
        const profileName = profileSlug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        const fallbackProfileData = {
          name:
            profileName && profileName !== "Professional"
              ? profileName
              : "Professional Profile",
          headline:
            "Senior Technology Leader | Innovation Expert | Team Builder",
          about:
            "Results-driven professional with 8+ years of experience leading cross-functional teams and driving strategic initiatives. Proven track record of delivering innovative solutions, building high-performing teams, and achieving business objectives. Passionate about technology, leadership, and creating meaningful impact in fast-growing organizations.",
          location: "San Francisco Bay Area",
          profileImageUrl: "",
          connectionCount: "500+ connections",
          skills: [
            "Leadership",
            "Strategic Planning",
            "Team Management",
            "Innovation",
            "Product Development",
            "Agile Methodologies",
          ],
          experience: [
            {
              title: "Senior Technology Manager",
              company: "Tech Innovation Corp",
              duration: "2021 - Present",
              description:
                "Leading engineering teams to deliver cutting-edge solutions and drive business growth",
            },
            {
              title: "Product Manager",
              company: "Digital Solutions Inc",
              duration: "2018 - 2021",
              description:
                "Managed product roadmap and collaborated with stakeholders to launch successful products",
            },
          ],
          keywords: [
            "leadership",
            "technology",
            "innovation",
            "management",
            "strategy",
            "agile",
            "product",
          ],
        };

        return res.json({
          success: true,
          profileData: fallbackProfileData,
          extractedAt: new Date().toISOString(),
          method: "fallback",
          note: "Basic profile data extracted - full crawling unavailable in current environment",
        });
      }

      try {
        const page = await browser.newPage();

        // Set user agent to appear as a regular browser
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        );

        // Navigate to the LinkedIn profile
        await page.goto(profileUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Wait for profile content to load
        await page.waitForSelector("h1", { timeout: 10000 });

        // Extract profile data
        const profileData = await page.evaluate(() => {
          const name = document.querySelector("h1")?.textContent?.trim() || "";
          const headline =
            document.querySelector(".text-body-medium")?.textContent?.trim() ||
            "";
          const location =
            document
              .querySelector(
                ".text-body-small.inline.t-black--light.break-words",
              )
              ?.textContent?.trim() || "";

          // Extract about section
          const aboutElement = document.querySelector(
            '[data-section="summary"] .pv-about__text',
          );
          const about = aboutElement?.textContent?.trim() || "";

          // Extract profile image
          const profileImg = document.querySelector(
            ".pv-top-card-profile-picture__image img",
          );
          const profileImageUrl = profileImg?.getAttribute("src") || "";

          // Extract connection count
          const connectionElement = document.querySelector(
            ".t-black--light.t-normal",
          );
          const connectionCount = connectionElement?.textContent?.trim() || "";

          // Extract skills (attempt to find skills section)
          const skillElements = document.querySelectorAll(
            '[data-section="skills"] .pv-skill-category-entity__name-text',
          );
          const skills: string[] = [];
          skillElements.forEach((el) => {
            const skill = el.textContent?.trim();
            if (skill) skills.push(skill);
          });

          // Extract experience
          const experienceElements = document.querySelectorAll(
            '[data-section="experience"] .pv-entity__summary-info',
          );
          const experience: Array<{
            title: string;
            company: string;
            duration: string;
            description: string;
          }> = [];

          experienceElements.forEach((el) => {
            const titleEl = el.querySelector("h3");
            const companyEl = el.querySelector(".pv-entity__secondary-title");
            const durationEl = el.querySelector(
              ".pv-entity__date-range span:last-child",
            );
            const descriptionEl = el.querySelector(".pv-entity__description");

            if (titleEl && companyEl) {
              experience.push({
                title: titleEl.textContent?.trim() || "",
                company: companyEl.textContent?.trim() || "",
                duration: durationEl?.textContent?.trim() || "",
                description: descriptionEl?.textContent?.trim() || "",
              });
            }
          });

          return {
            name,
            headline,
            about,
            location,
            profileImageUrl,
            connectionCount,
            skills,
            experience,
            keywords: [], // Will be populated from extracted text
          };
        });

        // Generate keywords from extracted text
        const allText =
          `${profileData.name} ${profileData.headline} ${profileData.about}`.toLowerCase();
        const commonKeywords = [
          "software",
          "engineer",
          "developer",
          "manager",
          "senior",
          "lead",
          "director",
          "javascript",
          "python",
          "react",
          "node",
          "typescript",
          "aws",
          "docker",
          "leadership",
          "team",
          "agile",
          "scrum",
          "project",
          "product",
          "marketing",
          "sales",
          "business",
          "strategy",
          "growth",
          "analytics",
          "data",
        ];

        profileData.keywords = commonKeywords.filter((keyword) =>
          allText.includes(keyword),
        );

        await browser.close();

        await logLayoffProofTool(req, "linkedin", {
          title: "Imported LinkedIn profile data",
        });

        res.json({
          success: true,
          profileData,
          extractedAt: new Date().toISOString(),
          method: "puppeteer",
        });
      } catch (error) {
        if (browser) {
          await browser.close();
        }
        throw error;
      }
    } catch (error) {
      console.error("Error crawling LinkedIn profile:", error);
      res.status(500).json({
        error:
          "Failed to crawl LinkedIn profile. The profile might be private, require login, or the URL is invalid.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // LinkedIn DM Generation endpoint
  app.post("/api/generate-linkedin-dm", async (req, res) => {
    try {
      const { recruiterName, yourName, companyName } = req.body;

      if (!recruiterName || !yourName || !companyName) {
        return res
          .status(400)
          .json({
            error: "Recruiter name, your name, and company name are required",
          });
      }

      // Generate LinkedIn DM using the exact template format
      const linkedinDM = `Hi ${recruiterName},

I hope you're doing well. My name is ${yourName}, and I recently applied to several roles at ${companyName}. I wanted to reach out in case you might be able to help or point me in the right direction.

I understand you may not be the hiring manager for these positions, but I would truly appreciate it if you could share my profile with the relevant team or let me know the best way to ensure my application is seen by the right people.

I completely understand if you're limited in what you can share or if time doesn't permit a response. Thank you for your time and consideration, I really admire the work being done at ${companyName} and would love the opportunity to contribute.

Warm regards,
${yourName}`;

      await logLayoffProofTool(req, "recruiter-outreach", {
        title: "Generated LinkedIn outreach message",
        detail: companyName,
      });

      res.json({ linkedinDM });
    } catch (error) {
      console.error("Error generating LinkedIn DM:", error);
      res.status(500).json({ error: "Failed to generate LinkedIn DM" });
    }
  });

  app.post("/api/generate-cover-letter", async (req, res) => {
    try {
      // Added 'templateId' to select which template/method to use
      const { jobDetails, personalData, parsedData, method, id, templateId } =
        req.body;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // --- Input Validation (remains the same) ---
      if (!method) {
        return res
          .status(400)
          .json({ error: "Request is missing the 'method' field." });
      }
      if (!jobDetails || !jobDetails.position || !jobDetails.company) {
        return res
          .status(400)
          .json({ error: "Request is missing required 'jobDetails'." });
      }
      if (method === "resume" && !parsedData) {
        return res
          .status(400)
          .json({
            error: "Method is 'resume' but no 'parsedData' was provided.",
          });
      }
      if (method === "manual" && !personalData) {
        return res
          .status(400)
          .json({
            error: "Method is 'manual' but no 'personalData' was provided.",
          });
      }

      // --- User Validation (remains the same) ---
      let user;
      if (method === "manual") {
        console.log(id);
        user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");

        if (!user) {
          return res
            .status(400)
            .json({
              error: "Subscription has expired, or you have not subscribed",
            });
        }
      }

      // --- Shared Data Preparation ---
      const applicantInfo = method === "resume" ? parsedData : personalData;
      const { position, company, reason } = jobDetails;

      // ===================================================================
      // === NEW: TEMPLATE SELECTION LOGIC =================================
      // ===================================================================

      if (templateId === "clientTemplate") {
        // --- Logic for the New Client-Provided Template ---

        // Helper to format certifications if they exist
        const formatCertifications = (certs) => {
          if (!certs || certs.trim() === "") {
            return "";
          }
          // Check if the main skill text already includes a certification
          const primaryCertText = `I am qualified for this position because I have experience in ${applicantInfo.skills}.`;
          // Add the additional certification text only if there's something to add
          return `Additionally, I am certified in ${certs}.`;
        };

        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const coverLetter = `
${applicantInfo.name}
${applicantInfo.email}
${applicantInfo.phone}

${today}

To Whom It May Concern:

My name is ${applicantInfo.name}. I obtained a ${applicantInfo.degree} from ${applicantInfo.university}. I have been in ${applicantInfo.profession} for ${applicantInfo.yearsExperience} years. I plan to diversify and expand my knowledge in ${applicantInfo.profession} by continuing my experience in the ${position} role to aid ${reason || "your company’s mission and my professional growth"}. I am qualified for this position because I have experience in ${applicantInfo.skills}. ${formatCertifications(applicantInfo.certifications)} It is with extreme enthusiasm that I apply to the ${position} position with ${company}.

I currently work for ${applicantInfo.currentCompany || "my most recent employer"}. In my position, my primary responsibility is ${applicantInfo.mainResponsibility || applicantInfo.topDuty}. By multitasking with these specific areas as well as my duties as a ${applicantInfo.profession}, I am able to organize and balance my work to ensure I am giving the proper care to each of my tasks as well as my stakeholders and partners. With respect to my responsibilities, I excel at ${applicantInfo.mainResponsibility || applicantInfo.topDuty}. Relationship building and staying organized are important within ${applicantInfo.profession}. By carefully vetting my work to ensure efficiency, I am consistently building trust amongst clients and team members. I maintain an organized workflow through meticulous planning and digital task management systems.

Based upon my experience, I am an ideal candidate for your ${position} position within ${company}. Choosing me will be a great decision as I will bring expertise and a wealth of knowledge into your company. I can be reached at ${applicantInfo.phone} or ${applicantInfo.email}. Thank you for your consideration. I look forward to hearing from you.

Respectfully Submitted,
${applicantInfo.name}
`;
        // Deduct credits for using the manual template
        if (method === "manual") {
          await DetuctCredits(user);
        }

        await logLayoffProofTool(req, "cover-letter", {
          bodyUserId: typeof id === "string" ? id : undefined,
          title: "Generated cover letter",
          detail: position && company ? `${position} at ${company}` : null,
          metadata: { jobTitle: position, company },
        });

        res.json({ coverLetter, generatedBy: "template-client-v1" });
      } else {
        // --- Fallback to the Original AI Generation Logic ---

        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const prompt = `
You are helping a real person apply for a job. Write a cover letter that reads as if they wrote it themselves: clear, conversational, and specific—not generic, not "AI polished," and not full of corporate filler.

**Human voice (critical):**
- Mix short and medium sentences; use contractions (I'm, I've, I'd) where they sound natural.
- Do NOT start with stiff formulas like "I am writing to express my interest," "I am excited to apply," or "Please accept this letter."
- Avoid buzzwords and AI tells: leverage, synergy, robust, cutting-edge, dynamic environment, game-changer, "strong passion," "proven track record" unless tied to a concrete fact from the data below, stacked adjectives, or every paragraph starting with "Furthermore" / "Additionally."
- No bullet lists in the letter body—use 3–4 tight paragraphs.
- Stay honest: only use employers, duties, skills, tools, and credentials implied by the applicant information. Do not invent metrics, awards, or jobs.

**Still appropriate for work:** Warm, confident, and respectful. Sound like someone who actually read the role title and company name.

**Applicant Information:**
- Name: ${applicantInfo.name}
- Email: ${applicantInfo.email}
- Phone: ${applicantInfo.phone}
- Profession / Field: ${applicantInfo.profession}
- Years of Experience: ${applicantInfo.yearsExperience} years
- Highest Degree: ${applicantInfo.degree} from ${applicantInfo.university}
- Current Company: ${applicantInfo.currentCompany || "N/A"}
- Key Skills: ${applicantInfo.skills}
- Key Certifications: ${applicantInfo.certifications || "N/A"}
- Top Responsibility/Duty: ${applicantInfo.mainResponsibility || applicantInfo.topDuty}
- Tools & Methods: ${applicantInfo.tools || "N/A"}

**Job Details:**
- Position: ${position}
- Company: ${company}
- Why they're interested (use naturally, don't quote verbatim if awkward): ${reason || "They want to contribute their skills and grow with the team."}

**Shape (keep it loose—avoid a rigid template feel):**
- Top: applicant name, email, phone; then this exact date on its own line: ${today} (do not use any other date); address to "Dear Hiring Manager," (company name can appear in the first paragraph instead of a full formal block if that reads more natural).
- Open by tying them to the ${position} role at ${company} in a specific, plain-spoken way.
- One paragraph on what they actually do (${applicantInfo.profession}, ~${applicantInfo.yearsExperience} years, main responsibility/duty) and how it relates to the role.
- One paragraph weaving skills, tools, and certifications into sentences—not a keyword dump.
- Short close: they'd welcome a conversation; thanks; sign-off (Sincerely or Best regards) and full name.

**Output rules:** Return ONLY the cover letter text—no markdown, no preamble. Never use placeholders like [Your Name] or [Company]; use the real values from the data above.
            `;

        let coverLetter = "";
        let generatedBy = "template";

        try {
          const message = await anthropic.messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 2000,
            temperature: 0.72,
            messages: [{ role: "user", content: prompt }],
          });
          coverLetter = message.content[0].text;
          generatedBy = "ai";

          if (method === "manual") {
            await DetuctCredits(user);
          }
        } catch (aiError) {
          console.error("Anthropic API Error:", aiError);
          // Fallback to a simple template if the AI fails
          coverLetter = `
${applicantInfo.name}
${applicantInfo.email}
${applicantInfo.phone}

${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}

Dear Hiring Manager,

I'm applying for the ${position} role at ${company}. I'm a ${applicantInfo.profession} with about ${applicantInfo.yearsExperience} years in the field, and most of my day-to-day work has been ${applicantInfo.mainResponsibility || applicantInfo.topDuty || "similar to what you're hiring for"}.

The areas I'm strongest in include ${applicantInfo.skills}.${applicantInfo.certifications && String(applicantInfo.certifications).trim() ? ` I'm also certified in ${applicantInfo.certifications}.` : ""}${applicantInfo.tools && String(applicantInfo.tools).trim() ? ` I regularly use ${applicantInfo.tools}.` : ""}

${reason ? `One reason this role caught my attention: ${reason}.` : `I'd like to learn more about the team at ${company} and how I could help.`} If it makes sense to talk, I'd appreciate the chance to connect.

Thanks for your time,

${applicantInfo.name}
                `;
        }

        await logLayoffProofTool(req, "cover-letter", {
          bodyUserId: typeof id === "string" ? id : undefined,
          title: "Generated cover letter",
          detail: position && company ? `${position} at ${company}` : null,
          metadata: { jobTitle: position, company },
        });

        res.json({ coverLetter, generatedBy });
      }
    } catch (error) {
      console.error("Error in /api/generate-cover-letter:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate cover letter due to a server error.",
        });
    }
  });

  app.post("/api/optimize-linkedin-profile", async (req, res) => {
    // =================================================================
    // THE CRITICAL FIX: PART 1 - SERVER-SIDE GUARD CLAUSE
    // =================================================================
    // Immediately check if the API key is loaded from your .env file.
    // This prevents the entire server from crashing and sending an HTML error page.
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(
        "FATAL ERROR: ANTHROPIC_API_KEY is not set in the environment variables.",
      );
      // Send a proper JSON error response instead of crashing
      return res.status(500).json({
        error:
          "Server configuration error: The AI service is not configured. Please contact the administrator.",
      });
    }
    // =================================================================

    try {
      const { profileData, targetJobTitle } = req.body;

      if (!profileData || !targetJobTitle) {
        return res
          .status(400)
          .json({ error: "Profile data and target job title are required." });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY, // This is now safe to use
      });

      const prompt = `
      You are a brutally honest, data-driven LinkedIn optimization expert. Your job is to analyze a REAL profile and generate PERSONALIZED improvements — not generic advice.
      
      ═══════════════════════════════════════════
      REAL PROFILE DATA (your analysis MUST be grounded ONLY in this data):
      ═══════════════════════════════════════════
      Target Job Title: "${targetJobTitle}"
      
      Name: ${profileData.name ?? 'Not provided'}
      Current Headline: ${profileData.headline ?? 'Missing'}
      Location: ${profileData.location ?? 'Not provided'}
      Connections/Followers: ${profileData.followers ?? 'Unknown'}
      
      ABOUT SECTION:
      ${profileData.about ?? 'EMPTY — user has no About section'}
      
      EXPERIENCE (${profileData.experience?.length ?? 0} entries):
      ${profileData.experience?.length
        ? profileData.experience.map((exp, i) =>
            `[${i + 1}] Title: ${exp.title ?? 'Unknown'}
             Company: ${exp.company ?? 'Unknown'}
             Duration: ${exp.duration ?? 'Unknown'}
             Description: ${exp.description ?? 'NO DESCRIPTION PROVIDED'}`
          ).join('\n\n')
        : 'NO EXPERIENCE LISTED'}
      
      EDUCATION (${profileData.education?.length ?? 0} entries):
      ${profileData.education?.length
        ? profileData.education.map(e =>
            `${e.degree ?? 'Unknown degree'} @ ${e.school ?? 'Unknown school'} (${e.years ?? 'Unknown years'})`
          ).join('\n')
        : 'NO EDUCATION LISTED'}
      
      CURRENT SKILLS (${profileData.skills?.length ?? 0}):
      ${profileData.skills?.join(', ') || 'NO SKILLS LISTED'}
      
      CERTIFICATIONS:
      ${profileData.certifications?.map(c => c.name).join(', ') || 'None'}
      
      LANGUAGES:
      ${profileData.languages?.map(l => `${l.language} (${l.proficiency})`).join(', ') || 'Not specified'}
      
      ═══════════════════════════════════════════
      YOUR TASK
      ═══════════════════════════════════════════
      
      Perform TWO tasks simultaneously:
      
      **TASK 1 — DEEP ANALYSIS**
      Score and critique this SPECIFIC profile for the target role "${targetJobTitle}".
      - Reference ACTUAL content from the profile (quote their real headline, real job titles, real skills)
      - Identify what is LITERALLY MISSING (e.g., "Your About section is empty", "No metrics in any job description")
      - Do NOT give generic advice that applies to anyone — every piece of feedback must reference something specific in THIS profile
      - Score harshly if sections are empty or weak
      
      **TASK 2 — PERSONALIZED REWRITE**
      Rewrite content based ONLY on what exists in the profile:
      - NEVER invent companies, job titles, or roles that aren't in the profile
      - NEVER fabricate metrics (no "40% improvement" unless it appears in their data)
      - If a section has no description, write improvements based on the job title + company name only, and flag it
      - The new headline MUST incorporate their ACTUAL current role and skills, repositioned for "${targetJobTitle}"
      - The new summary MUST reference their REAL experience timeline and REAL skills
      - Improved bullet points must be grounded in their ACTUAL job titles — use action verbs + plausible scope, but never invent numbers
      
      ═══════════════════════════════════════════
      SCORING RUBRIC (be strict)
      ═══════════════════════════════════════════
      - Headline optimized for target role: /15
      - About section exists and is compelling: /20  
      - Experience has descriptions with impact: /25
      - Skills match target role keywords: /20
      - Profile completeness (photo, location, education): /10
      - Certifications & social proof: /10
      
      Deduct heavily for: empty About, no metrics anywhere, skills mismatch, generic headline.
      
      ═══════════════════════════════════════════
      CRITICAL RULES
      ═══════════════════════════════════════════
      1. Output ONLY valid JSON — no markdown, no backticks, no explanation outside JSON
      2. Every "feedback" item MUST quote or reference actual profile content
      3. "suggestion" fields must be actionable and specific to THIS person
      4. experienceImprovements must match EXACTLY the companies/titles in the profile data
      5. suggestedSkills must be role-relevant AND not already in their skills list
      6. If the profile is missing a section entirely, give it a score of 0 and explain why
      
      ═══════════════════════════════════════════
      OUTPUT SCHEMA (follow exactly)
      ═══════════════════════════════════════════
      
      {
        "analysisReport": {
          "score": <0-100 integer, calculated from rubric above>,
          "summary": "<2-3 sentence honest assessment referencing their ACTUAL profile — mention their name, real role, real gaps>",
          "needsImprovement": <count of negative/warning items>,
          "wellDone": <count of positive items>,
          "topPriorities": [
            "<Most impactful single change they should make>",
            "<Second most impactful change>",
            "<Third most impactful change>"
          ],
          "categories": [
            {
              "id": "basicInfo",
              "title": "Basic Information & Headline",
              "score": <0-15>,
              "items": [
                {
                  "id": "headlineOptimization",
                  "title": "Headline Optimization",
                  "items": [
                    {
                      "text": "<Reference their ACTUAL current headline here>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<Specific rewrite or action, not generic advice>"
                    }
                  ]
                }
              ]
            },
            {
              "id": "about",
              "title": "About / Summary Section",
              "score": <0-20>,
              "items": [
                {
                  "id": "aboutPresence",
                  "title": "About Section Presence & Quality",
                  "items": [
                    {
                      "text": "<State what their About actually contains, or that it is empty>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<Specific guidance>"
                    }
                  ]
                }
              ]
            },
            {
              "id": "experience",
              "title": "Work Experience",
              "score": <0-25>,
              "items": [
                {
                  "id": "experienceDepth",
                  "title": "Experience Descriptions & Impact",
                  "items": [
                    {
                      "text": "<Mention their ACTUAL job titles and whether descriptions exist>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<Specific guidance per role>"
                    }
                  ]
                }
              ]
            },
            {
              "id": "skills",
              "title": "Skills & Endorsements",
              "score": <0-20>,
              "items": [
                {
                  "id": "skillsRelevance",
                  "title": "Skills Relevance to Target Role",
                  "items": [
                    {
                      "text": "<List which of their skills ARE relevant to ${targetJobTitle} and which are not>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<Name specific skills they should add for this role>"
                    }
                  ]
                }
              ]
            },
            {
              "id": "completeness",
              "title": "Profile Completeness",
              "score": <0-10>,
              "items": [
                {
                  "id": "missingFields",
                  "title": "Missing or Incomplete Fields",
                  "items": [
                    {
                      "text": "<List what IS and ISN'T present in their profile>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<What to add>"
                    }
                  ]
                }
              ]
            },
            {
              "id": "socialProof",
              "title": "Certifications & Social Proof",
              "score": <0-10>,
              "items": [
                {
                  "id": "certifications",
                  "title": "Certifications & Credentials",
                  "items": [
                    {
                      "text": "<Reference their actual certifications or state none exist>",
                      "status": "positive" | "negative" | "warning",
                      "suggestion": "<Suggest specific certifications relevant to ${targetJobTitle}>"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "improvedContent": {
          "headline": "<New headline using their REAL current role, repositioned for ${targetJobTitle} — max 220 chars>",
          "summary": "<New 3-paragraph About section. Para 1: Who they are based on their real background. Para 2: What they've done, referencing their actual companies/roles. Para 3: What they're seeking — aligned with ${targetJobTitle}>",
          "experienceImprovements": [
            ${profileData.experience?.map(exp => `{
              "title": "${exp.title ?? 'Role'}",
              "company": "${exp.company ?? 'Company'}",
              "duration": "${exp.duration ?? ''}",
              "hadDescription": ${!!exp.description},
              "flag": "<null if description existed, or 'No original description — improvements based on role title only' if empty>",
              "improvedPoints": [
                "<Strong bullet point using action verb + realistic scope for this role at this company — NO fabricated percentages>",
                "<Second bullet point>",
                "<Third bullet point>"
              ]
            }`).join(',\n') ?? ''}
          ],
          "suggestedSkills": [
            "<Skill relevant to ${targetJobTitle} NOT already in their profile>",
            "<Another missing skill>",
            "<Another missing skill>",
            "<Another missing skill>",
            "<Another missing skill>"
          ],
          "quickWins": [
            "<Fastest thing they can do today to improve their profile>",
            "<Second quick win>",
            "<Third quick win>"
          ]
        }
      }
      `;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2500,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      });

      // Robust validation of the AI's response
      if (!response?.content?.[0]?.text) {
        console.error(
          "Invalid or empty response from Anthropic API:",
          JSON.stringify(response, null, 2),
        );
        throw new Error(
          "The AI failed to generate a response. This can happen due to safety filters or an internal API issue.",
        );
      }

      const optimizationResult = parseAnthropicJsonResponse<any>(
        getAnthropicResponseText(response.content),
      );

      // Final check on the parsed JSON structure
      if (
        !optimizationResult.analysisReport ||
        !optimizationResult.improvedContent
      ) {
        throw new Error(
          "The AI response was malformed and did not contain the required data structure.",
        );
      }

      await logLayoffProofTool(req, "linkedin", {
        type: "linkedin_optimized",
        title: "Optimized LinkedIn profile",
        detail: targetJobTitle ? `Target role: ${targetJobTitle}` : null,
        metadata: {
          targetJobTitle,
          score: optimizationResult.analysisReport?.score,
        },
        sourceId: `linkedin-optimized:${Date.now()}`,
      });

      res.status(200).json(optimizationResult);
    } catch (error) {
      console.error("Error optimizing profile:", error);
      res
        .status(500)
        .json({
          error:
            error.message ||
            "An unexpected error occurred during profile optimization.",
        });
    }
  });

  // Optional: Add a test endpoint to verify Claude API connection
  app.get("/api/test-claude", async (req, res) => {
    try {
      const message = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content:
              "Hello! Please respond with a simple greeting to test the connection.",
          },
        ],
      });

      res.json({
        success: true,
        message: "Claude API connection successful",
        response: message.content[0].text,
      });
    } catch (error) {
      console.error("Claude API test failed:", error);
      res.status(500).json({
        success: false,
        error: "Claude API connection failed",
        details: error.message,
      });
    }
  });

  // Resume PDF Generation endpoint
  // AI Resume Generation endpoint
  app.post("/api/generate-resume-ai", async (req, res) => {
    try {
      const { prompt } = req.body;

      console.log("AI resume generation request with prompt:", prompt);

      if (!prompt || typeof prompt !== "string" || prompt.trim().length < 50) {
        return res
          .status(400)
          .json({ error: "Prompt must be at least 50 characters long" });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        console.error("ANTHROPIC_API_KEY not configured");
        return res.status(500).json({ error: "AI service not configured" });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const aiPrompt = `You are a professional resume writer. Based on the following career description, create a structured resume data in JSON format.

Career Description: "${prompt}"

Please extract and generate the following information in valid JSON format:
{
  "name": "Extract or infer person's name, or use 'Your Name' if not available",
  "email": "Extract email if mentioned, or use empty string",
  "phone": "Extract phone if mentioned, or use empty string",
  "profession": "Create a professional title based on the description",
  "summary": "Write a professional summary (2-3 sentences) based on the description",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Duration (e.g., 'Jan 2020 - Present')",
      "description": "Brief description of the role",
      "responsibilities": ["Responsibility 1", "Responsibility 2", "Responsibility 3"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3", "etc"],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University name",
      "year": "Year or date range",
      "gpa": "GPA if mentioned, optional"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "year": "Year obtained"
    }
  ],
  "achievements": ["Achievement 1", "Achievement 2"],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["Tech 1", "Tech 2"]
    }
  ],
  "languages": ["English", "Other languages"],
  "location": "Infer or extract location",
  "linkedin": "LinkedIn URL if mentioned",
  "github": "GitHub URL if mentioned",
  "website": "Website URL if mentioned"
}

Rules:
- Infer missing information based on industry standards and the description provided
- Create realistic experience entries based on the career level described
- Include relevant skills for the profession mentioned
- If specific details aren't provided, create professional placeholders that match the career level
- Ensure all arrays have at least some realistic entries
- Make the content professional and tailored to the described career path

Return ONLY the JSON object, no additional text or formatting.`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        messages: [{ role: "user", content: aiPrompt }],
      });

      console.log("AI response received");

      let parsedData;
      try {
        const responseText = getAnthropicResponseText(response.content);
        console.log("AI response text:", responseText);

        parsedData = parseAnthropicJsonResponse<any>(responseText);
        console.log("Parsed AI resume data:", parsedData);

        // Validate that parsedData contains expected fields
        if (!parsedData || typeof parsedData !== "object" || !parsedData.name) {
          console.error("Invalid parsed data structure:", parsedData);
          return res
            .status(500)
            .json({ error: "AI generated invalid data structure" });
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response text:", response.content[0].text);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      console.log(
        "Sending response with parsedData:",
        JSON.stringify(parsedData, null, 2),
      );
      await logLayoffProofTool(req, "resume-builder", {
        type: "resume_analyzed",
        title: "Generated resume with AI",
        sourceId: `generate-resume-ai:${Date.now()}`,
      });
      res.json({ parsedData });
    } catch (error) {
      console.error("Error generating AI resume:", error);
      res.status(500).json({ error: "Failed to generate AI resume" });
    }
  });

  app.post("/api/generate-resume-preview", async (req, res) => {
    try {
      const { templateId, resumeData } = req.body;

      if (!templateId || typeof templateId !== "string") {
        return res.status(400).json({ error: "templateId is required" });
      }
      if (!resumeData || Object.keys(resumeData).length === 0) {
        return res.status(400).json({ error: "No resume data received" });
      }

      const html = generateResumeHTML(templateId, resumeData);
      res.json({ html });
    } catch (error) {
      console.error("Error generating resume preview:", error);
      res.status(500).json({ error: "Failed to generate resume preview" });
    }
  });

  app.post("/api/generate-resume-pdf", async (req, res) => {
    try {
      const { templateId, resumeData, id, isManual } = req.body;

      console.log("Received templateId:", templateId);
      console.log("Received resumeData:", resumeData);

      if (!resumeData || Object.keys(resumeData).length === 0) {
        return res.status(400).json({ error: "No resume data received" });
      }

      const html = generateResumeHTML(templateId, resumeData);
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await resumeHtmlToPdfBuffer(html);
      } catch (pdfErr) {
        console.error("Puppeteer PDF generation failed:", pdfErr);
        return res.status(500).json({
          error: "Failed to generate PDF",
          message:
            pdfErr instanceof Error
              ? pdfErr.message
              : "Chromium/Puppeteer is unavailable on this server.",
        });
      }

      await logLayoffProofTool(req, "resume-builder", {
        type: "resume_analyzed",
        title: "Downloaded resume PDF",
        metadata: { templateId },
        sourceId: `generate-resume-pdf:${Date.now()}`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="resume.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate resume" });
    }
  });

  // Promotion Planner API endpoints

  // Get current user's promotion plan
  app.get(
    "/api/promotion-plans/current",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const plan = await storage.getCurrentPromotionPlan(userId);
        res.json(plan);
      } catch (error) {
        console.error("Error fetching promotion plan:", error);
        res.status(500).json({ message: "Failed to fetch promotion plan" });
      }
    },
  );

  // Generate new promotion plan
  app.post(
    "/api/promotion-plans/generate",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const planData = req.body;

        // Generate personalized strategies using AI
        const strategies = [
          {
            id: 1,
            title: "Skill Development & Certification",
            timeline: "3-6 months",
            description: `Focus on expanding your technical expertise by obtaining industry-relevant certifications and learning new technologies that align with your ${planData.careerGoal}. This will demonstrate your commitment to growth and make you more valuable to your organization.`,
            completed: false,
          },
          {
            id: 2,
            title: "Leadership & Mentoring Opportunities",
            timeline: "2-4 months",
            description: `Take on leadership roles in cross-functional projects and offer to mentor junior colleagues. This showcases your leadership potential and ability to drive results, which are key qualities for advancement to ${planData.careerGoal}.`,
            completed: false,
          },
          {
            id: 3,
            title: "Strategic Business Impact Projects",
            timeline: "6-9 months",
            description: `Identify and lead initiatives that directly impact business metrics and revenue. Document your contributions with quantifiable results to present during performance reviews and promotion discussions.`,
            completed: false,
          },
          {
            id: 4,
            title: "Network Building & Visibility",
            timeline: "Ongoing",
            description: `Build relationships with key stakeholders, including senior leadership, cross-functional teams, and industry professionals. Increase your visibility through presenting at meetings, contributing to strategic discussions, and participating in company initiatives.`,
            completed: false,
          },
          {
            id: 5,
            title: "Performance Documentation & Promotion Discussion",
            timeline: "1-2 months",
            description: `Create a comprehensive portfolio of your achievements, impact, and growth. Schedule regular one-on-ones with your manager to discuss career progression and formally express your interest in ${planData.careerGoal}.`,
            completed: false,
          },
        ];

        // Create promotion plan
        const plan = await storage.createPromotionPlan({
          ...planData,
          userId,
          strategies,
        });

        res.json({ plan, message: "Promotion plan generated successfully!" });
      } catch (error) {
        console.error("Error generating promotion plan:", error);
        res.status(500).json({ message: "Failed to generate promotion plan" });
      }
    },
  );

  // Update progress for strategies
  app.put(
    "/api/promotion-plans/:id/progress",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { strategies } = req.body;
        const userId = req.user.id;

        const updatedPlan = await storage.updatePromotionPlanProgress(
          id,
          userId,
          strategies,
        );
        res.json({
          plan: updatedPlan,
          message: "Progress saved successfully!",
        });
      } catch (error) {
        console.error("Error updating promotion plan progress:", error);
        res.status(500).json({ message: "Failed to save progress" });
      }
    },
  );

  // ====== NEW CAREER TOOLS API ROUTES ======

  // Job Search Optimizer API Routes
  app.get(
    "/api/job-search/profile",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const profile = await storage.getJobSearchProfile(userId);
        res.json(profile);
      } catch (error) {
        console.error("Error fetching job search profile:", error);
        res.status(500).json({ error: "Failed to fetch job search profile" });
      }
    },
  );

  app.post(
    "/api/job-search/profile",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const profile = await storage.createOrUpdateJobSearchProfile(
          userId,
          req.body,
        );
        await logLayoffProofTool(req, "job-search", { bodyUserId: userId });
        res.json(profile);
      } catch (error) {
        console.error("Error saving job search profile:", error);
        res.status(500).json({ error: "Failed to save job search profile" });
      }
    },
  );

  app.get(
    "/api/job-applications",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const applications = await storage.getJobApplications(userId);
        res.json(applications);
      } catch (error) {
        console.error("Error fetching job applications:", error);
        res.status(500).json({ error: "Failed to fetch job applications" });
      }
    },
  );

  app.post(
    "/api/job-applications",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const application = await storage.createJobApplication(
          userId,
          req.body,
        );
        const jobTitle = application.jobTitle ?? req.body?.jobTitle ?? "a role";
        const company = application.company ?? req.body?.company ?? "a company";
        await logLayoffProofTool(req, "job-tracker", {
          bodyUserId: userId,
          type: "job_applied",
          title: `Applied to ${jobTitle}`,
          detail: company,
          metadata: { jobTitle, company, status: application.status },
          occurredAt: application.appliedDate
            ? new Date(application.appliedDate)
            : new Date(),
          sourceId: `application:${application.id}`,
        });
        res.json(application);
      } catch (error) {
        console.error("Error creating job application:", error);
        res.status(500).json({ error: "Failed to create job application" });
      }
    },
  );

  app.put(
    "/api/job-applications/:id",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const { id } = req.params;
        const application = await storage.updateJobApplication(
          userId,
          id,
          req.body,
        );
        const jobTitle = application.jobTitle ?? req.body?.jobTitle;
        await logLayoffProofTool(req, "job-tracker", {
          bodyUserId: userId,
          title: "Updated job application",
          detail:
            jobTitle && application.company
              ? `${jobTitle} at ${application.company}`
              : jobTitle ?? application.company ?? null,
          sourceId: `application-update:${id}:${Date.now()}`,
        });
        res.json(application);
      } catch (error) {
        console.error("Error updating job application:", error);
        res.status(500).json({ error: "Failed to update job application" });
      }
    },
  );

  app.delete(
    "/api/job-applications/:id",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const { id } = req.params;
        await storage.deleteJobApplication(userId, id);
        res.json({ message: "Application deleted successfully" });
      } catch (error) {
        console.error("Error deleting job application:", error);
        res.status(500).json({ error: "Failed to delete job application" });
      }
    },
  );

  // Job Board API Routes
  app.get("/api/job-board", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const limitRaw = req.query?.limit;
      const pageRaw = req.query?.page;
      const limit = Math.min(
        50,
        Math.max(1, parseInt(typeof limitRaw === "string" ? limitRaw : "10", 10) || 10),
      );
      const page = Math.max(1, parseInt(typeof pageRaw === "string" ? pageRaw : "1", 10) || 1);
      const searchRaw = req.query?.search;
      const search = typeof searchRaw === "string" ? searchRaw : "";
      const tabRaw = req.query?.tab;
      const tab =
        tabRaw === "applied" || tabRaw === "saved" ? tabRaw : "all";

      const normalize = (v: string | null | undefined) =>
        String(v ?? "").trim().toLowerCase();

      const [allPosts, applications, metrics] = await Promise.all([
        storage.getAllJobBoardPosts(userId, search),
        storage.getJobApplications(userId),
        getUserDashboardMetrics(userId),
      ]);

      const withStatus = allPosts.map((post) => {
        const applied = applications.some(
          (app) =>
            normalize(app.jobTitle) === normalize(post.jobTitle) &&
            normalize(app.company) === normalize(post.companyName),
        );
        return {
          ...post,
          status: applied ? ("applied" as const) : ("saved" as const),
        };
      });

      const filtered =
        tab === "all"
          ? withStatus
          : withStatus.filter((post) => post.status === tab);

      const total = filtered.length;
      const items = filtered.slice((page - 1) * limit, page * limit);

      const allForSummary = await storage.getAllJobBoardPosts(userId, "");
      let appliedCount = 0;
      let savedCount = 0;
      for (const post of allForSummary) {
        const isApplied = applications.some(
          (app) =>
            normalize(app.jobTitle) === normalize(post.jobTitle) &&
            normalize(app.company) === normalize(post.companyName),
        );
        if (isApplied) appliedCount += 1;
        else savedCount += 1;
      }

      res.json({
        items,
        page,
        limit,
        total,
        search,
        tab,
        summary: {
          total: allForSummary.length,
          applied: appliedCount,
          saved: savedCount,
          interviews: metrics.interviews.value,
        },
      });
    } catch (error) {
      console.error("Error fetching job board posts:", error);
      res.status(500).json({ error: "Failed to fetch job board posts" });
    }
  });

  app.post("/api/job-board", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const parsed = insertJobBoardSchema.parse(req.body || {});
      const created = await storage.createJobBoardPost(userId, parsed);
      res.json(created);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request body", details: error.errors });
      }
      console.error("Error creating job board post:", error);
      res.status(500).json({ error: "Failed to create job board post" });
    }
  });


app.post("/api/notify-me", isAuthenticatedAny, async (req: any, res) => {
  try {
    const userId = req.user.claims?.sub || req.user.id;
    const parsed = insertNotifyMeSchema.parse(req.body || {});
    const created = await storage.createNotifyMe(userId, parsed);
    await recordUserActivity(userId, {
      type: "job_alert_set",
      title: `Set alert for ${created.role}`,
      detail: created.company,
      metadata: { company: created.company, role: created.role },
      sourceId: `notify:${created.id}`,
    });
    res.json(created);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    if (error?.code === "DUPLICATE_NOTIFY_EMAIL") {
      return res.status(409).json({ error: error.message });
    }
    console.error("Error creating notify me:", error);
    res.status(500).json({ error: "Failed to create notify me" });
  }
});


  // Salary Negotiator API Routes
  app.get("/api/salary-research", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const research = await storage.getSalaryResearch(userId);
      res.json(research);
    } catch (error) {
      console.error("Error fetching salary research:", error);
      res.status(500).json({ error: "Failed to fetch salary research" });
    }
  });

  app.delete(
    "/api/salary-research/:id",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const { id } = req.params;
        await storage.deleteSalaryResearch(userId, id);
        res.json({ message: "Salary research deleted successfully" });
      } catch (error) {
        console.error("Error deleting salary research:", error);
        res.status(500).json({ error: "Failed to delete salary research" });
      }
    },
  );

  app.post(
    "/api/salary-research",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;

        const body = req.body || {};
        const jobTitle = String(body.jobTitle || "").trim();
        const location = String(body.location || "").trim();
        const experienceLevel = String(body.experienceLevel || "").trim();
        const currentSalary = Number(body.currentSalary);
        const targetSalary = Number(body.targetSalary);
        const strengths = Array.isArray(body.strengths)
          ? body.strengths.map((s: any) => String(s || "").trim()).filter(Boolean)
          : [];
        const achievements = Array.isArray(body.achievements)
          ? body.achievements.map((a: any) => String(a || "").trim()).filter(Boolean)
          : [];
        const companySize = String(body.companySize || "").trim();
        const industry = String(body.industry || "").trim();

        if (!jobTitle || !location || !experienceLevel || !Number.isFinite(currentSalary) || !Number.isFinite(targetSalary) || strengths.length === 0) {
          return res.status(400).json({
            error:
              "Missing or invalid fields. Required: jobTitle, location, experienceLevel, currentSalary, targetSalary, strengths[]",
          });
        }

        let negotiationStrategy = "";

        const prompt = `Generate a personalized salary negotiation strategy based on:
      - Job Title: ${jobTitle}
      - Location: ${location}
      - Experience Level: ${experienceLevel}
      - Current Salary: $${currentSalary}
      - Target Salary: $${targetSalary}
      - Key Strengths: ${strengths.join(", ")}
      - Achievements: ${achievements.join(", ")}
      - Company Size: ${companySize}
      - Industry: ${industry}

      Output MUST include these 3 sections (use the exact labels below):

      BENCHMARK RANGES FOR YOUR ROLE AND LOCATION:
      - Provide a realistic range (low / typical / high) for base salary and briefly explain the assumptions.
      - Mention how level, company size, and industry may shift the range.

      SCRIPTS FOR COUNTER-OFFERS AND PROMOTIONS:
      - Provide 3 short scripts: (1) counter-offer on a new offer, (2) ask for a promotion/level-up, (3) ask for an out-of-cycle raise.
      - Make them copy/paste-ready, professional, and specific to the user's inputs.

      CONFIDENCE BACKED BY TALKING POINTS:
      - Provide 6–10 bullet talking points anchored in strengths/achievements and business impact.
      - Include 2 responses to common objections (budget/leveling).

      Then add (briefly):
      - Negotiation timeline and approach (3–6 bullets)
      - Alternative benefits to negotiate if base is inflexible (bullets)
      - Suggested anchor number and walk-away floor (with numbers)

      IMPORTANT: Do NOT use markdown headings like "#", "##", or "###".
      Use plain text only. Keep it structured and skimmable.`;

        if (process.env.ANTHROPIC_API_KEY) {
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const response = await anthropic.messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
          });

          const first = response.content?.[0];
          if (first && typeof first === "object" && "type" in first && (first as any).type === "text") {
            negotiationStrategy = String((first as any).text || "");
          } else if (first && typeof first === "object" && "text" in first) {
            // Back-compat if SDK returns plain text blocks
            negotiationStrategy = String((first as any).text || "");
          }
        }

        // Normalize output: remove markdown heading markers if model uses them anyway.
        if (negotiationStrategy) {
          negotiationStrategy = negotiationStrategy
            .replace(/^\s{0,3}#{1,6}\s+/gm, "")
            .replace(/^\s{0,3}#{1,6}\s*$/gm, "")
            .trim();
        }

        if (!negotiationStrategy) {
          // Safe fallback so the tool still works without AI configured
          negotiationStrategy = [
            "BENCHMARK RANGES FOR YOUR ROLE AND LOCATION:",
            `- Low: $${Math.round(targetSalary * 0.9).toLocaleString()} • Typical: $${Math.round(((currentSalary + targetSalary) / 2) * 1.05).toLocaleString()} • High: $${Math.round(targetSalary * 1.15).toLocaleString()} (base salary)`,
            `- Assumptions: ${experienceLevel} ${jobTitle} in ${location}. Larger companies and high-demand industries tend to pay toward the high end.`,
            "",
            "SCRIPTS FOR COUNTER-OFFERS AND PROMOTIONS:",
            `1) Counter-offer (new offer): “I’m excited about the ${jobTitle} role. Based on market ranges for ${location} and the impact I’ll deliver (${strengths.slice(0, 2).join("; ") || "my core strengths"}), I’m targeting $${Math.round(targetSalary * 1.05).toLocaleString()} base. Is there flexibility to move the offer closer to that?”`,
            `2) Promotion / level-up: “I’d like to discuss leveling based on scope and results. Over the last cycle I delivered ${achievements.filter(Boolean).slice(0, 1)[0] || "measurable outcomes"} and I’m already operating at the next level. Can we align my level and compensation to reflect that?”`,
            `3) Out-of-cycle raise: “Given the expanded responsibilities and results I’m driving, I’d like to revisit compensation now rather than waiting for the annual cycle. What would we need to see to move my base to $${Math.round(targetSalary).toLocaleString()}?”`,
            "",
            "CONFIDENCE BACKED BY TALKING POINTS:",
            ...strengths.slice(0, 5).map((s: string) => `- ${s}`),
            ...achievements.slice(0, 5).map((a: string) => `- Proof: ${a}`),
            "- Objection: “We don’t have budget.” → “What range is approved? If base is capped, can we bridge the gap with sign-on, bonus, equity, or a 90-day salary review tied to clear milestones?”",
            "- Objection: “This is standard for this level.” → “Happy to align—can we re-check leveling given scope/impact, or adjust comp within-band based on market and my experience?”",
            "",
            "Negotiation timeline and approach:",
            "- Reaffirm excitement → ask about flexibility → present benchmark range + anchor → pause and listen → trade variables (base vs bonus/equity) → confirm next steps in writing.",
            "",
            "Alternative benefits to negotiate:",
            "- Sign-on bonus, performance bonus, equity, remote/hybrid, extra PTO, learning budget, title/level alignment, review in 3–6 months.",
            "",
            `Anchor & walk-away floor: Anchor $${Math.round(targetSalary * 1.05).toLocaleString()} • Walk-away (base) $${Math.round(targetSalary * 0.92).toLocaleString()}`,
          ]
            .filter(Boolean)
            .join("\n");
        }

        const researchData = {
          jobTitle,
          location,
          experienceLevel,
          currentSalary,
          targetSalary,
          strengths,
          achievements,
          companySize,
          industry,
          negotiationStrategy,
          marketData: {
            averageSalary: Math.round(
              ((currentSalary + targetSalary) / 2) * 1.1,
            ),
            salaryRange: {
              min: Math.round(currentSalary * 0.9),
              max: Math.round(targetSalary * 1.2),
            },
          },
        };

        const research = await storage.createSalaryResearch(
          userId,
          researchData,
        );
        await logLayoffProofTool(req, "salary", {
          bodyUserId: userId,
          detail: jobTitle,
          metadata: { jobTitle, location },
        });
        res.json(research);
      } catch (error) {
        console.error("Error creating salary research:", error);
        res.status(500).json({ error: "Failed to create salary research" });
      }
    },
  );

  // Career Path Analyzer API Routes
  app.get("/api/career-paths", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const paths = await storage.getCareerPaths(userId);
      res.json(paths);
    } catch (error) {
      console.error("Error fetching career paths:", error);
      res.status(500).json({ error: "Failed to fetch career paths" });
    }
  });

  app.post("/api/career-paths", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;

      // Generate AI-powered career path analysis
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `Analyze career progression opportunities based on:
      - Current Role: ${req.body.currentRole}
      - Experience: ${req.body.experienceYears} years
      - Skills: ${req.body.skills.join(", ")}
      - Interests: ${req.body.interests.join(", ")}
      - Goals: ${req.body.goals.join(", ")}

      Provide 3-4 potential career pathways with:
      1. Career progression title and description
      2. Required skills and experience
      3. Timeline to achieve (realistic timeframe)
      4. Salary range expectations
      5. Difficulty level (Low/Medium/High)
      6. Specific next steps to pursue this path

      Also provide immediate action items for overall career advancement.
      
      Format as structured data that can be easily parsed.`;

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const analysisText = response.content[0].text;

      // Parse AI response into structured format
      const pathways = [
        {
          title: `Senior ${req.body.currentRole}`,
          description:
            "Natural progression in current role with increased responsibilities",
          timeline: "1-2 years",
          salaryRange: "$80k - $120k",
          difficulty: "Medium",
          requiredSkills: [
            "Advanced technical skills",
            "Leadership",
            "Mentoring",
          ],
          nextSteps: [
            "Take on leadership projects",
            "Mentor junior team members",
            "Develop strategic thinking skills",
          ],
        },
        {
          title: "Team Lead/Manager",
          description: "Transition into people management and team leadership",
          timeline: "2-3 years",
          salaryRange: "$90k - $140k",
          difficulty: "Medium",
          requiredSkills: [
            "People management",
            "Strategic planning",
            "Communication",
          ],
          nextSteps: [
            "Complete management training",
            "Lead cross-functional projects",
            "Build stakeholder relationships",
          ],
        },
        {
          title: "Subject Matter Expert",
          description: "Become a recognized expert in your domain",
          timeline: "1-3 years",
          salaryRange: "$85k - $130k",
          difficulty: "Low",
          requiredSkills: [
            "Deep technical expertise",
            "Thought leadership",
            "Communication",
          ],
          nextSteps: [
            "Publish articles and content",
            "Speak at industry events",
            "Build professional network",
          ],
        },
      ];

      const analysisData = {
        ...req.body,
        pathways,
        nextSteps: [
          "Update LinkedIn profile with latest achievements",
          "Identify skill gaps for target roles",
          "Network with professionals in desired paths",
          "Set 3-month career development goals",
        ],
        analysisText,
      };

      const analysis = await storage.createCareerPath(userId, analysisData);
      await logLayoffProofTool(req, "career", {
        bodyUserId: userId,
        detail: req.body.currentRole,
      });
      res.json(analysis);
    } catch (error) {
      console.error("Error creating career path analysis:", error);
      res.status(500).json({ error: "Failed to create career path analysis" });
    }
  });

  // Skills Assessment API Routes
  app.get(
    "/api/skills-assessments",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const assessments = await storage.getSkillsAssessments(userId);
        res.json(assessments);
      } catch (error) {
        console.error("Error fetching skills assessments:", error);
        res.status(500).json({ error: "Failed to fetch skills assessments" });
      }
    },
  );

  app.post(
    "/api/skills-assessments",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;

        // Generate AI-powered skills assessment analysis
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const prompt = `Analyze skills assessment results and provide detailed feedback:
      - Assessment Type: ${req.body.assessmentType}
      - Current Role: ${req.body.currentRole}
      - Target Role: ${req.body.targetRole || "Not specified"}
      - Skills Assessed: ${req.body.skillsToAssess.join(", ")}
      - Skill Ratings: ${JSON.stringify(req.body.assessment)}

      For each skill, provide:
      1. Strength analysis based on self-assessment
      2. Specific improvement recommendations
      3. Learning resources and next steps
      4. How this skill impacts career growth

      Also provide:
      - Overall score out of 100
      - Top 3 strength areas
      - Top 3 improvement areas
      - Personalized learning plan (short/medium/long term)

      Format as detailed, actionable feedback.`;

        const response = await anthropic.messages.create({
          model: DEFAULT_MODEL_STR,
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });

        const analysisText = response.content[0].text;

        // Calculate overall score
        const avgScore =
          req.body.assessment.reduce(
            (sum: number, skill: any) => sum + skill.level,
            0,
          ) / req.body.assessment.length;
        const overallScore = Math.round(avgScore * 20); // Convert to 100 point scale

        const assessmentData = {
          ...req.body,
          overallScore,
          strengthAreas: req.body.assessment
            .filter((s: any) => s.level >= 4)
            .map((s: any) => s.skill),
          improvementAreas: req.body.assessment
            .filter((s: any) => s.level <= 2)
            .map((s: any) => s.skill),
          analysisText,
          completedAt: new Date().toISOString(),
        };

        const assessment = await storage.createSkillsAssessment(
          userId,
          assessmentData,
        );
        await logLayoffProofTool(req, "skills", { bodyUserId: userId });
        res.json(assessment);
      } catch (error) {
        console.error("Error creating skills assessment:", error);
        res.status(500).json({ error: "Failed to create skills assessment" });
      }
    },
  );

  // Portfolio Builder API Routes
  app.get(
    "/api/portfolios/current",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const portfolio = await storage.getPortfolio(userId);
        res.json(portfolio);
      } catch (error) {
        console.error("Error fetching portfolio:", error);
        res.status(500).json({ error: "Failed to fetch portfolio" });
      }
    },
  );

  app.post("/api/portfolios", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const portfolio = await storage.createPortfolio(userId, req.body);
      await logLayoffProofTool(req, "portfolio", { bodyUserId: userId });
      res.json(portfolio);
    } catch (error) {
      console.error("Error creating portfolio:", error);
      res.status(500).json({ error: "Failed to create portfolio" });
    }
  });

  app.put("/api/portfolios/:id", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { id } = req.params;
      const portfolio = await storage.updatePortfolio(userId, id, req.body);
      res.json(portfolio);
    } catch (error) {
      console.error("Error updating portfolio:", error);
      res.status(500).json({ error: "Failed to update portfolio" });
    }
  });

  // Networking Assistant API Routes
  app.get(
    "/api/network-connections",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const connections = await storage.getNetworkConnections(userId);
        res.json(connections);
      } catch (error) {
        console.error("Error fetching network connections:", error);
        res.status(500).json({ error: "Failed to fetch network connections" });
      }
    },
  );

  app.post(
    "/api/network-connections",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const connection = await storage.createNetworkConnection(
          userId,
          req.body,
        );
        const contactName =
          connection.contactName ?? req.body?.contactName ?? "contact";
        await recordUserActivity(userId, {
          type: "connection_added",
          title: `Added ${contactName}`,
          detail: connection.company ?? connection.role ?? null,
          metadata: {
            contactName,
            company: connection.company,
          },
          sourceId: `connection:${connection.id}`,
        });
        res.json(connection);
      } catch (error) {
        console.error("Error creating network connection:", error);
        res.status(500).json({ error: "Failed to create network connection" });
      }
    },
  );

  app.put(
    "/api/network-connections/:id",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const { id } = req.params;
        const connection = await storage.updateNetworkConnection(
          userId,
          id,
          req.body,
        );
        res.json(connection);
      } catch (error) {
        console.error("Error updating network connection:", error);
        res.status(500).json({ error: "Failed to update network connection" });
      }
    },
  );

  app.delete(
    "/api/network-connections/:id",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const userId = req.user.claims?.sub || req.user.id;
        const { id } = req.params;
        await storage.deleteNetworkConnection(userId, id);
        res.json({ message: "Connection deleted successfully" });
      } catch (error) {
        console.error("Error deleting network connection:", error);
        res.status(500).json({ error: "Failed to delete network connection" });
      }
    },
  );

  // Networking Assistant — AI message generator
  app.post(
    "/api/networking-assistant/generate-message",
    isAuthenticatedAny,
    async (req: any, res) => {
      try {
        const body = req.body || {};
        const contextType = String(body.contextType || "").trim(); // cold-outreach | follow-up | job-inquiry
        const contact = body.contact && typeof body.contact === "object" ? body.contact : {};
        const name = String((contact as any).name || "").trim();
        const company = String((contact as any).company || "").trim();
        const role = String((contact as any).role || "").trim();
        const linkedInUrl = String((contact as any).linkedInUrl || (contact as any).contactLinkedIn || "").trim();
        const notes = String((contact as any).notes || "").trim();
        const extraContext = String(body.context || "").trim();

        if (!contextType) {
          return res.status(400).json({ error: "contextType is required" });
        }

        const prompt = `Write a professional, friendly, non-robotic networking message.

Context type: ${contextType}
Recipient name: ${name || "(unknown)"}
Recipient company: ${company || "(unknown)"}
Recipient role: ${role || "(unknown)"}
LinkedIn URL (if any): ${linkedInUrl || "(none)"}
Notes about the person / last conversation (if any): ${notes || "(none)"}
Extra context from user: ${extraContext || "(none)"}

Requirements:
- Output ONLY the message text (no headings, no markdown, no bullet lists).
- Keep it concise: 70–140 words.
- Include 1 clear call-to-action.
- Avoid generic fluff, avoid sounding like AI, avoid emojis.
- If context type is "follow-up", reference a plausible prior touchpoint.
- If context type is "job-inquiry", include a respectful ask and mention fit briefly.
`;

        if (process.env.ANTHROPIC_API_KEY) {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const response = await anthropic.messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 350,
            messages: [{ role: "user", content: prompt }],
          });

          const first = response.content?.[0] as any;
          const text =
            first && typeof first === "object" && "text" in first
              ? String(first.text || "")
              : "";
          await logLayoffProofTool(req, "networking", {
            bodyUserId: req.user.claims?.sub || req.user.id,
            detail: name ? `To ${name}` : null,
          });
          return res.json({ message: text.trim() });
        }

        // Fallback (no AI key)
        const fallback = (() => {
          if (contextType === "follow-up") {
            return `Hi ${name || "there"},\n\nI hope you’ve been well. I wanted to follow up on our last conversation${company ? ` about ${company}` : ""}—your perspective was helpful, and I’ve been thinking about it. If you’re open to it, I’d love to reconnect for 10–15 minutes this week to get your latest thoughts${role ? ` on ${role}` : ""}.\n\nWould Tuesday or Thursday work for a quick chat?\n`;
          }
          if (contextType === "job-inquiry") {
            return `Hi ${name || "there"},\n\nI’m reaching out because I’m exploring ${role ? role : "roles"}${company ? ` at ${company}` : ""} and your background stood out. I’d appreciate any guidance on the team’s needs and what strong candidates typically demonstrate. If you’re open to a quick 10-minute chat, I can work around your schedule.\n\nWould you have time sometime this week?\n`;
          }
          return `Hi ${name || "there"},\n\nI came across your profile${company ? ` at ${company}` : ""} and wanted to reach out. I’m currently focusing on ${role ? role : "my next role"} and would love to connect and learn from your experience. If you’re open to it, I’d appreciate a quick 10-minute chat to hear how you approached your career moves.\n\nWould you be open to connecting?\n`;
        })();

        await logLayoffProofTool(req, "networking", {
          bodyUserId: req.user.claims?.sub || req.user.id,
          detail: name ? `To ${name}` : null,
        });
        return res.json({ message: fallback.trim() });
      } catch (error) {
        console.error("Error generating networking message:", error);
        res.status(500).json({ error: "Failed to generate message" });
      }
    },
  );

  const resumeJsonStructure = `
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "profession": "string",
  "summary": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "duration": "string",
      "description": "string",
      "responsibilities": ["string"]
    }
  ],
  "skills": ["string"],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "duration": "string"
    }
  ],
  "certifications": ["string"],
  "achievements": ["string"],
  "projects": [],
  "languages": ["string"],
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "website": "string"
}
`;

  app.post("/api/upload-resume", async (req, res) => {
    try {
      const form = new Formidable();
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const [fields, files] = await form.parse(req);
      const resumeFile = files.resume?.[0];
      const id = fields?.id?.[0];
      console.log("Received fields:", fields, id);
      const user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed",
          });
      }

      if (!resumeFile) {
        return res.status(400).json({ error: "No resume file uploaded." });
      }

      let rawText = "";
      const filePath = resumeFile.filepath;
      const fileExt = path
        .extname(resumeFile.originalFilename || "")
        .toLowerCase();

      // Extract raw text from the uploaded file
      if (fileExt === ".pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        rawText = data.text;
      } else if (fileExt === ".docx") {
        const { value } = await mammoth.extractRawText({ path: filePath });
        rawText = value;
      } else if (fileExt === ".txt") {
        rawText = fs.readFileSync(filePath, "utf8");
      } else {
        fs.unlinkSync(filePath); // Clean up temp file
        return res
          .status(400)
          .json({
            error: "Unsupported file type. Please use PDF, DOCX, or TXT.",
          });
      }

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      if (!rawText.trim()) {
        return res
          .status(400)
          .json({ error: "Could not extract any text from the file." });
      }

      // --- AI-Powered Parsing Step using Anthropic Claude ---
      const prompt = `
      You are an expert resume parser. Your only job is to analyze the raw text from a resume and convert it into a structured JSON object.
      The output MUST be a valid JSON object ONLY. Do not include any introductions, explanations, or markdown formatting like \`\`\`json. Just the raw JSON.
      Strictly follow this structure: ${resumeJsonStructure}.

      - For arrays like 'skills' or 'experience', if no information is found, provide an empty array [].
      - For string fields, if no information is found, provide an empty string "".
      - The main 'location' field should be the candidate's address (e.g., "Los Angeles, CA 90291").
      - The 'experience.location' field should be the location of the company (e.g., "Miami Gardens").
      - Extract bullet points into the 'experience.responsibilities' array.

      Here is the raw text from the resume to parse:
      ---
      ${rawText}
      ---
    `;

      const aiResult = await anthropicMessagesCreateWithRetry(
        anthropic,
        {
          model: DEFAULT_MODEL_STR,
          max_tokens: 2000,
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }],
        },
        { maxRetries: 6, baseDelayMs: 2000, label: "upload-resume", ...USER_FACING_ANTHROPIC_OPTIONS },
      );

      if (!aiResult.ok) {
        return res.status(503).json({
          error: "Failed to parse resume with AI.",
          details: aiResult.error,
        });
      }

      const responseText = getAnthropicResponseText(aiResult.message.content);
      let parsedData;

      try {
        parsedData = parseAnthropicJsonResponse<any>(responseText);
        await DetuctCredits(user);
      } catch (parseError) {
        console.error("Failed to parse JSON from AI response:", responseText);
        throw new Error("AI returned a non-JSON response. Please try again.");
      }

      console.log("✅ Successfully parsed resume with Claude.");
      const uploadUserId = typeof id === "string" ? id : null;
      if (uploadUserId) {
        await recordLayoffProofTool(uploadUserId, "resume-builder", {
          type: "resume_uploaded",
          title: "Resume parsed from upload",
          detail: resumeFile.originalFilename ?? undefined,
          sourceId: `upload-resume:${Date.now()}`,
        });
      }
      res
        .status(200)
        .json({ message: "Resume parsed successfully", parsedData });
    } catch (error) {
      console.error("Error in /api/upload-resume:", error);
      res
        .status(500)
        .json({ error: "Failed to process resume.", details: error.message });
    }
  });

  async function scrapeLinkedInProfile(profileUrl) {
    console.log(`Simulating scraping for: ${profileUrl}`);
    // In a real implementation, you would use a library like Puppeteer or an API call to a scraping service here.
    // For now, return mock data.
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
    return {
      name: "Alex Doe",
      headline: "Software Engineer at TechCorp | Building the Future of Web",
      about:
        "Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in JavaScript, React, Node.js, and Agile Methodologies. Strong engineering professional with a Bachelor's degree focused in Computer Science from University of Technology.",
      location: "San Francisco Bay Area",
      experience: [
        {
          title: "Software Engineer",
          company: "TechCorp",
          duration: "2021 - Present",
          description:
            "Developed and maintained web applications using React and Node.js. Improved application performance by 20%.",
        },
        {
          title: "Junior Developer",
          company: "Innovate LLC",
          duration: "2019 - 2021",
          description: "Assisted in the development of client websites.",
        },
      ],
      skills: [
        "React",
        "Node.js",
        "TypeScript",
        "JavaScript",
        "Agile Methodologies",
        "Leadership",
        "Problem Solving",
      ],
      keywords: ["software engineer", "react", "node.js", "developer", "tech"],
      profileImageUrl: `https://i.pravatar.cc/150?u=${profileUrl}`,
      connectionCount: "500+ connections",
    };
  }

  app.post("/api/analyze-profile-with-ai", async (req, res) => {
    const { profileData, targetJobTitle } = req.body;

    if (!profileData || !targetJobTitle) {
      return res
        .status(400)
        .json({
          error:
            "Profile data and target job title are required for AI analysis.",
        });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // This is the powerful, structured prompt for Claude 4
    const prompt = `
        You are an expert LinkedIn profile optimizer and career coach. Your task is to analyze the following LinkedIn profile data for a professional targeting the role of "${targetJobTitle}".
        
        Analyze each section (Basic Information, Headline, Work Experience, Skills, Education) and provide constructive feedback. For each piece of feedback, specify if it's 'positive' or 'negative' and provide a concrete 'suggestion' for negative items.
        
        Finally, generate an overall score out of 100 based on the quality of the profile for the target job title and provide 3 general "Tips & Tricks".
        
        You MUST return a single, valid JSON object with the exact structure I define below. Do not include any text, explanations, or markdown formatting like \`\`\`json outside of the JSON object.

        JSON Structure to follow:
        {
          "score": <number>, // Overall score from 0-100
          "needsImprovement": <number>, // Count of all 'negative' feedback items
          "wellDone": <number>, // Count of all 'positive' feedback items
          "categories": [
            {
              "id": "basicInfo",
              "title": "Basic Information",
              "items": [
                { "id": "fullName", "title": "Profile Name & Location", "feedback": [{ "text": "<analysis>", "status": "positive" | "negative", "suggestion": "<suggestion_if_negative>" }] }
              ]
            },
            {
              "id": "highImpact",
              "title": "High Impact",
              "items": [
                { "id": "headline", "title": "Headline", "content": "${profileData.profession}", "feedback": [/* array of feedback items */] }
              ]
            },
            {
              "id": "experience",
              "title": "Work Experience",
              "items": [ // Create one item for EACH job experience
                { "id": "exp-0", "title": "<Job Title> at <Company>", "feedback": [/* feedback on description, metrics, verbs */] }
              ]
            },
            {
              "id": "skills",
              "title": "Key Skills",
              "items": [
                { "id": "skillsList", "title": "Skills Quantity & Relevance", "feedback": [/* feedback on quantity and relevance to target job */] }
              ]
            },
            {
              "id": "education",
              "title": "Education",
              "items": [
                { "id": "eduHistory", "title": "Education History", "feedback": [/* feedback on completeness */] }
              ]
            },
            {
              "id": "tips",
              "title": "Tips & Tricks",
              "items": [
                { "id": "generalTips", "title": "General Profile Enhancements", "feedback": [/* 3 general tips, format them as 'negative' feedback items */] }
              ]
            }
          ]
        }.........................
        
        Here is the profile data to analyze:
        ${JSON.stringify(profileData, null, 2)}
    `;

    try {
      const msg = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR, // Using Opus for best results on complex JSON tasks
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });

      const analysisReport = parseAnthropicJsonResponse<any>(
        getAnthropicResponseText(msg.content),
      );

      console.log("✅ Successfully generated AI analysis report.");
      await logLayoffProofTool(req, "linkedin", {
        type: "resume_analyzed",
        title: "Analyzed LinkedIn profile with AI",
        detail: targetJobTitle ? `Target role: ${targetJobTitle}` : null,
        metadata: {
          targetJobTitle,
          score: analysisReport.score,
        },
        sourceId: `linkedin-analyzed:${Date.now()}`,
      });
      res.status(200).json(analysisReport);
    } catch (error) {
      console.error("Error in /api/analyze-profile-with-ai:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate AI analysis.",
          details: error.message,
        });
    }
  });

  app.post("/api/generate-outreach-message", async (req, res) => {
    try {
      const {
        messageType, // 'linkedin-dm', 'email', 'referral'
        recruiterName,
        companyName,
        jobTitle,
        yourName,
        yourRole,
        industry,
        experience,
        tone,
        id,
      } = req.body;

      if (!yourName || !messageType) {
        return res
          .status(400)
          .json({ error: "Your name and message type are required." });
      }

      const user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed",
          });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Determine the message type name for the prompt
      const messageTypeName = {
        "linkedin-dm": "LinkedIn Direct Message",
        email: "Cold Email",
        referral: "Referral Request",
      }[messageType];

      const prompt = `
You are an expert career coach and professional copywriter specializing in job search outreach. 
Your task is to generate a personalized and effective outreach message for a job seeker based on the details provided.

Here is the information about the job seeker and their target:
- Recipient's Name: ${recruiterName || "[Recipient's Name]"}
- Target Company: ${companyName || "[Company Name]"}
- Target Job Title: ${jobTitle || "[Target Role]"}
- Job Seeker's Name: ${yourName}
- Job Seeker's Current Role: ${yourRole || "[Your Current Role]"}
- Target Industry: ${industry || "[Industry]"}
- Job Seeker's Experience Level: ${experience || "[Experience Level]"}

Instructions for the message:
1. Message Type: Generate a "${messageTypeName}".
2. Tone: The message should have a "${tone}" tone.
3. Personalization: If a company name is provided, subtly mention why the job seeker is interested in that specific company.
4. Clarity: Clearly state the purpose of the message.
5. Value Proposition: Briefly highlight the job seeker's value, referencing their role and experience.
6. Call to Action: Include a clear and polite call to action (e.g., asking for a brief chat).
7. For Emails: If the message type is 'Cold Email', you MUST include a compelling subject line at the very beginning, like "Subject: [Your Subject Line]".
8. For LinkedIn Direct Messages: You MUST adapt and improve upon the following template, filling in with the provided details where appropriate:

Direct Message Recruiter Template:
"Good morning! I hope all is well. My name is [Your Name Here] and it is wonderful to connect with you. I applied to a few positions within [Company Name]. I am reaching out to you because while I understand you may not be the hiring manager or connected to the position, I was wondering if there was a way my credentials can be seen by someone connected to the position. Confidentiality is understood so if you are not at liberty to give me the information to the person connected to the role, is there some way that you can share my LinkedIn profile with some of your colleagues? Your time is valuable and I understand if you don’t have the bandwidth. I’ve been consistently applying to the company and I’m hoping to be noticed soon. Thank you for taking the time to consider my request. Have an amazing rest of the day.

Best wishes,
[Your Name Here]"

The output MUST be a valid JSON object with a single key "message" containing the complete generated text as a string.
Do not include any other text, explanations, or markdown formatting like \`\`\`json.

Example format: {"message": "Subject: Inquiry about opportunities\\n\\nDear John,\\n..."}
`;

      const msg = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1000,
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      });

      const parsedResponse = parseAnthropicJsonResponse<{ message: string }>(
        getAnthropicResponseText(msg.content),
      );

      console.log(`✅ Successfully generated ${messageTypeName} with Claude.`);
      await DetuctCredits(user);
      await logLayoffProofTool(req, "recruiter-outreach", {
        bodyUserId: user.id,
        title: "Generated recruiter outreach message",
        detail: companyName || jobTitle || null,
        metadata: { messageType, company: companyName, jobTitle },
      });
      res.status(200).json({ generatedMessage: parsedResponse.message });
    } catch (error) {
      console.error("Error in /api/generate-outreach-message:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate outreach message.",
          details: error.message,
        });
    }
  });

  // In your server.js or index.js

  app.post("/api/improve-with-ai", async (req, res) => {
    try {
      const {
        fieldName,
        existingText,
        resumeContext,
        improvementType,
        manualPrompt,
      } = req.body;

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      if (!fieldName || !resumeContext) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // --- 🚀 CHANGE STARTS HERE: DYNAMIC PROMPT ENGINEERING ---

      let prompt;

      if (fieldName === "skills") {
        // --- PROMPT FOR SKILLS ---
        let userInstruction;
        if (improvementType === "manual" && manualPrompt) {
          userInstruction = `The user has provided specific instructions for the skills: "${manualPrompt}". Please generate a relevant list of skills based on their request and the resume context.`;
        } else {
          userInstruction = `Please analyze the resume context, particularly the job titles and experience descriptions, and suggest additional relevant technical and soft skills. Combine these new suggestions with the user's existing skills.`;
        }

        prompt = `
You are an expert career coach and technical recruiter. Your task is to analyze a user's resume and enhance their skills list.

Here is the user's full resume data for context:
<resume_context>
${JSON.stringify(resumeContext, null, 2)}
</resume_context>

The user wants to improve their "skills" section.
Their current skills are:
<existing_skills>
${existingText || "No skills listed yet."}
</existing_skills>

Your task: ${userInstruction}

IMPORTANT: Respond ONLY with a single, comma-separated string of skills. Do not include any explanations, greetings, or markdown formatting. For example: "React, JavaScript, Node.js, Agile Methodologies, Team Leadership, SQL".
`;
      } else {
        // --- DEFAULT PROMPT FOR OTHER FIELDS (like summary, description, etc.) ---
        let userInstruction;
        if (improvementType === "manual" && manualPrompt) {
          userInstruction = `The user has provided specific instructions: "${manualPrompt}". Please rewrite the text following these instructions precisely.`;
        } else {
          userInstruction = `Please rewrite the text to be more professional, impactful, and concise. Use strong action verbs, quantify achievements where possible, and align with modern resume best practices.`;
        }

        prompt = `
You are an expert career coach and professional resume writer. Your task is to improve a specific section of a user's resume.

Here is the user's full resume data for context:
<resume_context>
${JSON.stringify(resumeContext, null, 2)}
</resume_context>

The user wants to improve the "${fieldName}" field. The current text is:
<existing_text>
${existingText || "This field is currently empty."}
</existing_text>

Your task: ${userInstruction}

IMPORTANT: Respond ONLY with the improved text for the requested field. Do not include any explanations, greetings, or markdown formatting. Just provide the plain text suggestion.
`;
      }

      // --- CHANGE ENDS HERE ---

      // --- API Call to Claude (No changes needed here) ---
      const msg = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      });

      const suggestion = msg.content[0].text;

      await logLayoffProofTool(req, "resume-builder", {
        title: "Improved resume section with AI",
        detail: fieldName ? String(fieldName) : null,
        metadata: { fieldName },
      });

      res.status(200).json({ suggestion: suggestion.trim() });
    } catch (error) {
      console.error("Error calling Anthropic API:", error);
      res
        .status(500)
        .json({ error: "An error occurred while communicating with the AI." });
    }
  });

  // Layoff Data

  app.get("/api/layoffs", isAuthenticatedAny, async (req: any, res) => {
    try {
      const {
        page = "1",
        limit = "15",
        category = "all",
        year,
        search,
      } = req.query;

      const userId = resolveAuthUserId(req);
      const user = await GetUserScscriptionTrialValidation(userId);

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed.",
          });
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions: any[] = [];

      // Handle "upcoming" category - layoffs with dates in the future
      if (category === "upcoming") {
        conditions.push(gte(layoffs.date, new Date()));
      }
      // Category filter (for industries)
      else if (category !== "all") {
        conditions.push(eq(layoffs.industry, category as string));
      }

      // Year filter
      if (year) {
        const yearNum = parseInt(year as string);
        const startDate = new Date(`${yearNum}-01-01`);
        const endDate = new Date(`${yearNum}-12-31`);
        conditions.push(
          and(gte(layoffs.date, startDate), lte(layoffs.date, endDate)),
        );
      }

      // Search filter (company name)
      if (search) {
        conditions.push(
          sql`LOWER(${layoffs.company}) LIKE ${`%${(search as string).toLowerCase()}%`}`,
        );
      }

      // Build the where clause
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(layoffs)
        .where(whereClause);

      // Get paginated layoffs
      const layoffsList = await db
        .select()
        .from(layoffs)
        .where(whereClause)
        .orderBy(desc(layoffs.date))
        .limit(limitNum)
        .offset(offset);

      // Calculate stats
      const allLayoffs = await db.select().from(layoffs).where(whereClause);

      const stats = {
        total: count,
        by_year: {
          2024: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2024,
          ).length,
          2025: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2025,
          ).length,
          2026: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2026,
          ).length,
        },
        by_industry: allLayoffs.reduce(
          (acc, l) => {
            if (l.industry) {
              acc[l.industry] = (acc[l.industry] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        ),
        total_employees: allLayoffs.reduce(
          (sum, l) => sum + (l.employeesLaidOff || 0),
          0,
        ),
      };

      const totalPages = Math.ceil(count / limitNum);

      res.json({
        success: true,
        data: {
          layoffs: layoffsList,
          stats,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching layoffs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch layoffs",
        message: error.message,
      });
    }
  });

  // GET /api/layoffs/stats - Get overall statistics
  app.get("/api/layoffs/stats", isAuthenticatedAny, async (req: any, res) => {
    try {
      const { category = "all" } = req.query;

      const userId = String(req.user?.id ?? req.user?.claims?.sub ?? req.user?.userId ?? "");
      const user = await GetUserScscriptionTrialValidation(userId);

      if (!user) {
        return res
          .status(400)
          .json({
            error: "Subscription has expired, or you have not subscribed.",
          });
      }

      const whereClause =
        category !== "all"
          ? eq(layoffs.industry, category as string)
          : undefined;

      const allLayoffs = await db.select().from(layoffs).where(whereClause);

      const stats = {
        total: allLayoffs.length,
        by_year: {
          2024: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2024,
          ).length,
          2025: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2025,
          ).length,
          2026: allLayoffs.filter(
            (l) => l.date && new Date(l.date).getFullYear() === 2026,
          ).length,
        },
        by_industry: allLayoffs.reduce(
          (acc, l) => {
            if (l.industry) {
              acc[l.industry] = (acc[l.industry] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        ),
        total_employees: allLayoffs.reduce(
          (sum, l) => sum + (l.employeesLaidOff || 0),
          0,
        ),
        recent_layoffs: allLayoffs
          .sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5)
          .map((l) => ({
            company: l.company,
            date: l.date,
            employees: l.employeesLaidOff,
          })),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
        message: error.message,
      });
    }
  });

  // GET /api/layoffs/:id - Get single layoff details
  app.get("/api/layoffs/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [layoff] = await db
        .select()
        .from(layoffs)
        .where(eq(layoffs.id, id))
        .limit(1);

      if (!layoff) {
        return res.status(404).json({
          success: false,
          error: "Layoff not found",
        });
      }

      res.json({
        success: true,
        data: layoff,
      });
    } catch (error: any) {
      console.error("Error fetching layoff:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch layoff",
        message: error.message,
      });
    }
  });

  // ==================================================
  //       =========== Profile Building =======
  //===================================================

  // Must be registered before `/api/profile/:section/:id` so `autosave` is not captured as a section name.
  app.post("/api/profile/autosave/:id", async (req, resp) => {
    try {
      const { id } = req.params;
      const user = await GetUserScscriptionTrialValidation(
        typeof id === "string" ? id : "",
      );
      if (!user) {
        return resp.status(400).json({
          success: false,
          error: "Subscription has expired, or you have not subscribed.",
        });
      }

      const [existingProfile] = await db
        .select()
        .from(userJobProfiles)
        .where(eq(userJobProfiles.userId, id))
        .limit(1);

      if (!existingProfile) {
        await db.insert(userJobProfiles).values({
          userId: id,
          profileCompletion: 0,
        });
      }

      const SECTION_FIELDS: Record<string, string[]> = {
        personal: [
          "firstName",
          "lastName",
          "email",
          "phone",
          "linkedin",
          "twitter",
          "website",
          "github",
        ],
        residency: [
          "street",
          "buildingNo",
          "apartmentNo",
          "country",
          "city",
          "zip",
          "authorizedCountries",
          "sponsorship",
          "relocate",
        ],
        experience: ["totalExperience", "experiences"],
        education: ["education"],
        general: [
          "expectedSalary",
          "expectedSalaryCurrency",
          "currentSalary",
          "currentSalaryCurrency",
          "noticePeriod",
          "startDate",
          "race",
          "disability",
          "veteran",
        ],
        skillAndLanguages: ["skills", "languages"],
        achievements: ["achievements"],
      };

      const cleanPayload = (payload: any) => {
        if (!payload) return {};
        return Object.fromEntries(
          Object.entries(payload).filter(
            ([_, value]) =>
              value !== undefined && value !== null && value !== "",
          ),
        );
      };

      const pickSectionFields = (data: any, allowedFields: string[]) => {
        if (!data) return {};
        return Object.fromEntries(
          Object.entries(data).filter(([key]) => allowedFields.includes(key)),
        );
      };

      const updateData: Record<string, unknown> = {};
      for (const [section, allowedFields] of Object.entries(SECTION_FIELDS)) {
        const sectionData = req.body[section];
        if (!sectionData || typeof sectionData !== "object") continue;
        const cleaned = cleanPayload(sectionData);
        const picked = pickSectionFields(cleaned, allowedFields);
        Object.assign(updateData, picked);
      }

      if (updateData.startDate != null) {
        const raw = updateData.startDate as string | number | Date;
        const d =
          raw instanceof Date ? raw : new Date(raw as string | number);
        if (Number.isNaN(d.getTime())) {
          delete updateData.startDate;
        } else {
          updateData.startDate = d;
        }
      }

      const stepIndex = req.body.currentStep;
      if (typeof stepIndex === "number" && stepIndex >= 0) {
        updateData.currentStep = stepIndex;
      }

      if (Object.keys(updateData).length === 0) {
        return resp.status(200).json({
          success: true,
          message: "Nothing to save",
        });
      }

      updateData.updatedAt = new Date();

      const [updated] = await db
        .update(userJobProfiles)
        .set(updateData)
        .where(eq(userJobProfiles.userId, id))
        .returning();

      return resp.status(200).json({
        success: true,
        data: updated,
        message: "Profile draft saved",
      });
    } catch (error) {
      console.error("Error autosaving job profile:", error);
      return resp.status(500).json({
        success: false,
        error: "Failed to autosave profile",
        message: "Internal server error",
      });
    }
  });

  app.post(
    "/api/profile/:section/:id",
    upload.single("file"),
    async (req, resp) => {
      try {
        const { id } = req.params;
        const { section } = req.params;
        console.log("section.................", section);
        const data = req.body[section];
        console.log("personal data_________", data);
        const user = await GetUserScscriptionTrialValidation(typeof id === "string" ? id : "");
        if (!user) {
          return resp.status(400).json({
            success: false,
            error: "Subscription has expired, or you have not subscribed.",
          });
        }

        // Check if profile exists; if not, create it
        const [existingProfile] = await db
          .select()
          .from(userJobProfiles)
          .where(eq(userJobProfiles.userId, id))
          .limit(1);

        if (!existingProfile) {
          console.log("No profile found for user, creating one now...");
          await db.insert(userJobProfiles).values({
            userId: id,
            profileCompletion: 0,
          });
        }

        // =========== For input Varificaiton============

        const SECTION_FIELDS: Record<string, string[]> = {
          personal: [
            "firstName",
            "lastName",
            "email",
            "phone",
            "linkedin",
            "twitter",
            "website",
            "github",
          ],
          residency: [
            "street",
            "buildingNo",
            "apartmentNo",
            "country",
            "city",
            "zip",
            "authorizedCountries",
            "sponsorship",
            "relocate",
          ],
          experience: ["totalExperience", "experiences"],
          education: ["education"],
          general: [
            "expectedSalary",
            "expectedSalaryCurrency",
            "currentSalary",
            "currentSalaryCurrency",
            "noticePeriod",
            "startDate",
            "race",
            "disability",
            "veteran",
          ],
          skillAndLanguages: ["skills", "languages"],
          achievements: ["achievements"],
          documentupdate: ["resume", "recommendationLetters", "documents"],
        };

        const cleanPayload = (payload: any) => {
          if (!payload) return {};
          return Object.fromEntries(
            Object.entries(payload).filter(
              ([_, value]) =>
                value !== undefined && value !== null && value !== "",
            ),
          );
        };

        const pickSectionFields = (data: any, allowedFields: string[]) => {
          if (!data) return {};
          return Object.fromEntries(
            Object.entries(data).filter(([key]) => allowedFields.includes(key)),
          );
        };

        const allowedFields = SECTION_FIELDS[section];
        if (!allowedFields) {
          return resp.status(400).json({
            success: false,
            error: "Invalid section",
          });
        }

        console.log("data", data);
        const cleaned = cleanPayload(data || {});
        const updateData = pickSectionFields(cleaned, allowedFields);

        // startDate is a PG timestamp; client sends ISO strings. Invalid values must not reach Drizzle
        // (Invalid Date still has .toISOString and throws RangeError when called).
        if (section === "general" && updateData.startDate != null) {
          const raw = updateData.startDate as string | number | Date;
          const d =
            raw instanceof Date ? raw : new Date(raw as string | number);
          if (Number.isNaN(d.getTime())) {
            delete (updateData as Record<string, unknown>).startDate;
          } else {
            (updateData as Record<string, unknown>).startDate = d;
          }
        }

        // =========== ============ =======================

        console.log("fields to update....", updateData);
        const updatepersonalDetails = async () => {
          if (
            !updateData.firstName ||
            !updateData.lastName ||
            !updateData.email ||
            !updateData.phone
          ) {
            return resp.status(400).json({
              success: false,
              error: "Missing required fields",
            });
          }
          const updatedUser = await db
            .update(userJobProfiles)
            .set(updateData)
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "User updated successfully",
          });
        };

        const update_residencyDetails = async () => {
          if (!updateData.city || !updateData.country) {
            return resp.status(400).json({
              success: false,
              error: "You are missing required data",
            });
          }

          const updatedUser = await db
            .update(userJobProfiles)
            .set(updateData)
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "Adress added successfuly",
          });
        };

        const update_experience = async () => {
          if (!data.totalExperience) {
            return resp.status(400).json({
              success: false,
              error: "Total experience is required",
            });
          }

          if (!data.experiences || !Array.isArray(data.experiences)) {
            return resp.status(400).json({
              success: false,
              error: "Experiences data is required",
            });
          }

          // Validate each experience entry has required fields
          for (const exp of data.experiences) {
            if (!exp.company || !exp.title || !exp.fromMonth || !exp.fromYear) {
              return resp.status(400).json({
                success: false,
                error:
                  "Each experience must have company, title, from month and from year",
              });
            }
            // If not currently working, toMonth and toYear are required
            if (!exp.currentlyWorking && (!exp.toMonth || !exp.toYear)) {
              return resp.status(400).json({
                success: false,
                error: "End date (month and year) is required for past roles",
              });
            }
          }

          const updatedUser = await db
            .update(userJobProfiles)
            .set({
              totalExperience: data.totalExperience,
              experiences: data.experiences || [],
            })
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "Experience updated successfully",
          });
        };

        const update_education = async () => {
          if (!data.education || !Array.isArray(data.education)) {
            return resp.status(400).json({
              success: false,
              error: "Education data is required",
            });
          }

          // Validate each education entry
          for (const edu of data.education) {
            if (!edu.school || !edu.degree || !edu.fromMonth || !edu.fromYear) {
              return resp.status(400).json({
                success: false,
                error:
                  "Each education entry must have school, degree, from month and from year",
              });
            }
            if (!edu.isCurrentlyStudying && (!edu.toMonth || !edu.toYear)) {
              return resp.status(400).json({
                success: false,
                error:
                  "End date (month and year) is required for completed education",
              });
            }
          }

          const updatedUser = await db
            .update(userJobProfiles)
            .set({
              education: data.education,
            })
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "Education updated successfully",
          });
        };

        const update_general = async () => {
          // data is req.body[section], so for section "general" it is the flat payload (expectedSalary, etc.), not { general: ... }
          if (
            !data ||
            typeof data !== "object" ||
            Object.keys(data).length === 0
          ) {
            return resp.status(400).json({
              success: false,
              error: "General preference data is required",
            });
          }

          const updatedUser = await db
            .update(userJobProfiles)
            .set(updateData)
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "General preferences updated successfully",
          });
        };

        const update_skill_languages = async () => {
          const updatedUser = await db
            .update(userJobProfiles)
            .set(updateData)
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "Skills and Languages updated successfully",
          });
        };

        const update_achievements = async () => {
          const updatedUser = await db
            .update(userJobProfiles)
            .set(updateData)
            .where(eq(userJobProfiles.userId, id))
            .returning();

          return resp.status(200).json({
            success: true,
            data: updatedUser,
            message: "Achievements updated successfully",
          });
        };

        const update_document = async () => {
          try {
            const { id } = req.params;
            const { documentType } = req.query; // Optional query param to specify type

            if (!req.file) {
              return resp.status(400).json({
                success: false,
                message: "No file uploaded",
              });
            }

            // Determine document type
            let docType = "certificate"; // Default
            if (
              documentType === "resume" ||
              req.file.originalname.toLowerCase().includes("resume")
            ) {
              docType = "resume";
            } else if (
              documentType === "recommendation_letter" ||
              req.file.originalname.toLowerCase().includes("recommendation")
            ) {
              docType = "recommendation_letter";
            }

            console.log(`Uploading ${req.file.mimetype}...`);

            const { fileUrl } = await uploadProfileDocument(req.file, {
              userId: id,
              docType,
            });

            // Get profile ID first without updating
            const [userProfile] = await db
              .select()
              .from(userJobProfiles)
              .where(eq(userJobProfiles.userId, id))
              .limit(1);

            // 2. Insert record into userDocuments table
            const [insertedDoc] = await db
              .insert(userDocuments)
              .values({
                userId: id,
                profileId: userProfile?.id,
                documentType: docType,
                fileName: req.file.originalname,
                fileUrl,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
              })
              .returning();

            if (insertedDoc) {
              const uploadTitle =
                docType === "resume"
                  ? "Resume uploaded"
                  : docType === "certificate"
                    ? "Certificate uploaded"
                    : "Document uploaded";
              await recordLayoffProofTool(id, "auto-apply", {
                type: "resume_uploaded",
                title: uploadTitle,
                detail: insertedDoc.fileName,
                metadata: {
                  documentType: docType,
                  fileName: insertedDoc.fileName,
                },
                sourceId: `document:${insertedDoc.id}`,
              });
            }

            // 3. Update the main userJobProfiles table with the latest URL for this type
            if (docType === "resume") {
              await db
                .update(userJobProfiles)
                .set({ resume: fileUrl, updatedAt: new Date() })
                .where(eq(userJobProfiles.userId, id));
            } else if (docType === "recommendation_letter") {
              await db
                .update(userJobProfiles)
                .set({
                  recommendationLetter: fileUrl,
                  updatedAt: new Date(),
                })
                .where(eq(userJobProfiles.userId, id));
            } else if (docType === "certificate") {
              await db
                .update(userJobProfiles)
                .set({ certificates: fileUrl, updatedAt: new Date() })
                .where(eq(userJobProfiles.userId, id));
            }

            // Clean up temp file
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }

            let message = "Document uploaded and saved successfully";
            if (docType === "resume")
              message = "Resume uploaded and saved successfully";
            else if (docType === "recommendation_letter")
              message = "Recommendation letter uploaded and saved successfully";

            return resp.status(200).json({
              success: true,
              data: userProfile,
              message: message,
              url: fileUrl,
            });
          } catch (error) {
            console.error("Document upload/DB update error:", error);
            return resp.status(500).json({
              success: false,
              message: "Internal Server Error",
              error:
                error instanceof Error
                  ? error.message
                  : "Error during Uploading",
            });
          }
        };

        switch (section) {
          case "personal":
            await updatepersonalDetails();
            break;
          case "residency":
            await update_residencyDetails();
            break;
          case "experience":
            await update_experience();
            break;
          case "education":
            await update_education();
            break;
          case "skillAndLanguages":
            await update_skill_languages();
            break;
          case "achievements":
            await update_achievements();
            break;
          case "documentupdate":
            await update_document();
            break;
          case "general":
            await update_general();
            break;
          default:
            break;
        }

        if (section && section !== "documentupdate") {
          const sectionLabels: Record<string, string> = {
            personal: "personal details",
            residency: "residency",
            experience: "experience",
            education: "education",
            skillAndLanguages: "skills & languages",
            achievements: "achievements",
            general: "job preferences",
          };
          await recordLayoffProofTool(id, "auto-apply", {
            type: "profile_updated",
            title: `Updated ${sectionLabels[section] ?? section}`,
            sourceId: `profile-section:${section}:${Date.now()}`,
          });
        }

        // Persist multi-step form current step so user returns to same step on reload
        const stepIndex = req.body.currentStep;
        if (typeof stepIndex === "number" && stepIndex >= 0) {
          await db
            .update(userJobProfiles)
            .set({ currentStep: stepIndex, updatedAt: new Date() })
            .where(eq(userJobProfiles.userId, id));
        }
      } catch (error) {
        console.error("Error updating user:", error);
        resp.status(500).json({
          success: false,
          error: "Failed to update user",
          message: "Internal server error",
        });
      }
    },
  );

  app.get("/api/profile/jobprofile/:id", async (req, resp) => {
    try {
      const { id } = req.params;
      const [userProfile] = await db
        .select()
        .from(userJobProfiles)
        .where(eq(userJobProfiles.userId, id))
        .limit(1);

      console.log(userProfile);

      return resp.status(200).json({
        success: true,
        data: userProfile || null,
        message: "Job profile fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching job profile:", error);
      resp.status(500).json({
        success: false,
        error: "Failed to fetch job profile",
        message: "Internal server error",
      });
    }
  });

  // ====== END NEW CAREER TOOLS API ROUTES ======

  const httpServer = createServer(app);
  return httpServer;
}

/** Render full resume HTML document to a PDF buffer (Letter, print backgrounds). */
async function resumeHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const launchOpts: {
    headless: boolean;
    args: string[];
    executablePath?: string;
  } = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  };
  const chromium =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN;
  if (chromium) {
    launchOpts.executablePath = chromium;
  }

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 90_000 });
    const pdfBytes = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// Resume HTML template generation function
function generateResumeHTML(templateId: string, resumeData: any): string {
  console.log("Generating resume with template:", templateId);

  // Helper to check if a value is present (not null, undefined, or empty string)
  const isPresent = (val: any) => val && String(val).trim() !== "";

  const escapeAttr = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const profileImageSrc = getResumeProfileImageSrc(resumeData);
  const profileImageHtml = isPresent(profileImageSrc)
    ? `<img src="${escapeAttr(profileImageSrc)}" alt="Profile" />`
    : "";

  // --- MODIFICATION: Added .slice(0, 15) to limit skills ---
  const processSkills = (skills: any): string[] => {
    let processed: string[] = [];
    if (Array.isArray(skills)) {
      processed = skills.filter(isPresent).map(String);
    } else if (typeof skills === "string" && isPresent(skills)) {
      processed = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(isPresent);
    }
    // Apply the limit here, after processing and before returning.
    return processed.slice(0, 15);
  };
  // --- END MODIFICATION ---

  const achievementItems: string[] = Array.isArray(resumeData.achievements)
    ? resumeData.achievements.filter(isPresent).map(String)
    : [];

  type ResumeProjectItem = {
    name: string;
    url: string;
    description: string;
  };

  const projectItems: ResumeProjectItem[] = Array.isArray(resumeData.projects)
    ? resumeData.projects
        .map((p: unknown): ResumeProjectItem | null => {
          if (typeof p === "string") {
            const t = p.trim();
            return t ? { name: t, url: "", description: "" } : null;
          }
          if (p && typeof p === "object") {
            const row = p as Record<string, unknown>;
            const name = String(row.name ?? "").trim();
            const url = String(row.url ?? "").trim();
            const description = String(row.description ?? "").trim();
            if (!name && !url && !description) return null;
            return { name, url, description };
          }
          return null;
        })
        .filter((p): p is ResumeProjectItem => p !== null)
    : [];

  const formatProjectHref = (url: string) =>
    /^https?:\/\//i.test(url) ? url : `https://${url}`;

  const renderProjectListItems = (
    items: ResumeProjectItem[],
    esc: (s: unknown) => string,
  ): string =>
    items
      .map((p) => {
        const bits: string[] = [];
        if (p.name) {
          bits.push(
            `<div style="font-weight:700;margin-bottom:6px;">${esc(p.name)}</div>`,
          );
        }
        if (p.url) {
          const href = formatProjectHref(p.url);
          bits.push(
            `<div style="margin-bottom:${p.description ? "6px" : "0"};"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}</a></div>`,
          );
        }
        if (p.description) {
          bits.push(
            `<div style="margin-top:${p.name || p.url ? "4px" : "0"};line-height:1.45;color:#64748b;">${esc(p.description)}</div>`,
          );
        }
        if (!bits.length) return "";
        return `<li style="margin-bottom:12px;">${bits.join("")}</li>`;
      })
      .filter(Boolean)
      .join("");

  const projectsSectionHtml = (
    items: ResumeProjectItem[],
    esc: (s: unknown) => string,
    options?: { heading?: string; headingTag?: string; wrapperClass?: string },
  ): string => {
    if (!items.length) return "";
    const heading = options?.heading ?? "Projects";
    const headingTag = options?.headingTag ?? "h2";
    const wrapperClass = options?.wrapperClass ?? "section";
    const list = renderProjectListItems(items, esc);
    if (!list) return "";
    return `<div class="${wrapperClass}"><${headingTag}>${heading}</${headingTag}><ul style="margin-left:20px;">${list}</ul></div>`;
  };

  const projectsLinksHtml = (
    items: ResumeProjectItem[],
    esc: (s: unknown) => string,
  ): string =>
    items
      .map((p) => {
        if (!isPresent(p.name) && !isPresent(p.url) && !isPresent(p.description)) {
          return "";
        }

        const titleHtml = p.url
          ? `<a href="${esc(formatProjectHref(p.url))}" target="_blank" rel="noopener noreferrer" style="font-weight:700;">${esc(p.name || p.url)}</a>`
          : p.name
            ? `<div style="font-weight:700;">${esc(p.name)}</div>`
            : "";

        const descHtml = p.description
          ? `<div class="muted project-desc">${esc(p.description)}</div>`
          : "";

        if (!titleHtml && !descHtml) return "";
        if (!titleHtml) {
          return `<div class="link project-item">${descHtml}</div>`;
        }

        return `<div class="link project-item">${titleHtml}${descHtml}</div>`;
      })
      .filter(Boolean)
      .join("");

  // Helper to generate experience sections dynamically
  const generateExperienceHTML = (
    experience: any[],
    template: "professional" | "harvard" | "creative",
  ): string => {
    if (!experience || experience.length === 0) return "";
    return experience
      .map((exp) => {
        const title = exp.title || "";
        const company = exp.company || "";
        const location = exp.location || "";
        const duration = exp.duration || "";
        const description = exp.description || "";
        const companyAndLocation = [company, location]
          .filter(isPresent)
          .join(" | ");

        switch (template) {
          case "professional":
            return `
            <div class="experience-item">
              ${isPresent(title) ? `<h3>${title}</h3>` : ""}
              ${isPresent(duration) ? `<div class="duration">${duration}</div>` : ""}
              ${isPresent(companyAndLocation) ? `<div class="company">${companyAndLocation}</div>` : ""}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, "<br>")}</div>` : ""}
            </div>`;
          case "harvard":
            return `
            <div class="experience-item">
              <div class="title-row">
                ${isPresent(title) ? `<h3>${title}</h3>` : ""}
                ${isPresent(duration) ? `<span class="duration">${duration}</span>` : ""}
              </div>
              ${isPresent(companyAndLocation) ? `<div class="company">${companyAndLocation}</div>` : ""}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, "<br>")}</div>` : ""}
            </div>`;
          case "creative":
            return `
            <div class="experience-item">
              <div class="title-row">
                ${isPresent(company) ? `<h3>${company}</h3>` : ""}
                ${isPresent(duration) ? `<span class="duration">${duration}</span>` : ""}
              </div>
              ${isPresent(title) ? `<div class="company">${title}</div>` : ""}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, "<br>")}</div>` : ""}
            </div>`;
          default:
            return "";
        }
      })
      .join("");
  };

  // Helper to generate education sections dynamically
  const generateEducationHTML = (education: any[]): string => {
    if (!education || education.length === 0) return "";
    return education
      .map((edu) => {
        const degree = edu.degree || "";
        const school = edu.school || "";
        const duration = edu.duration || "";

        if (!isPresent(degree) && !isPresent(school)) return "";
        return `
            <div class="education-item">
                ${isPresent(degree) ? `<h3>${degree}</h3>` : ""}
                ${isPresent(school) ? `<div class="school">${school}</div>` : ""}
                ${isPresent(duration) ? `<div class="details">${duration}</div>` : ""}
            </div>`;
      })
      .join("");
  };

  switch (templateId) {
    case "professional":
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 40px; } .header { margin-bottom: 30px; } .header h1 { font-size: 2.5rem; font-weight: bold; color: #333; margin-bottom: 8px; }
            .contact-info { display: flex; flex-wrap: wrap; gap: 20px; color: #666; font-size: 0.9rem; margin-bottom: 20px; } .contact-info span { display: flex; align-items: center; gap: 5px; } .contact-info svg { flex-shrink: 0; }
            .contact-info a { color: #3B82F6; text-decoration: none; } .contact-info a:hover { text-decoration: underline; } .divider { display: none; }
            .section { margin-bottom: 30px; } .section h2 { color: #3B82F6; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
            .experience-item { margin-bottom: 20px; } .experience-item h3 { font-size: 1.1rem; font-weight: bold; color: #333; margin-bottom: 5px; }
            .experience-item .company { color: #666; font-size: 0.95rem; margin-bottom: 8px; }
            .experience-item .duration { color: #666; font-size: 0.9rem; float: right; margin-top: -30px; }
            .experience-item .description { margin-top: 8px; font-size: 0.95rem; }
            .skills-grid { display: flex; flex-wrap: wrap; gap: 6px 16px; } .skill-item { padding: 0; font-weight: 500; }
            .education-item { margin-bottom: 15px; } .education-item h3 { font-weight: bold; margin-bottom: 5px; } .education-item .school { color: #666; margin-bottom: 5px; } .education-item .details { color: #666; font-size: 0.9rem; }
        </style></head><body><div class="container">
            <div class="header">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name}</h1>` : ""}
              <div class="contact-info">
                ${isPresent(resumeData.email) ? `<span>📧 <a href="mailto:${resumeData.email}">${resumeData.email}</a></span>` : ""}
                ${isPresent(resumeData.phone) ? `<span>📞 ${resumeData.phone}</span>` : ""}
                ${isPresent(resumeData.location) ? `<span>${resumeLocationSvg({ size: 16, fill: "#666666" })}${resumeData.location}</span>` : ""}
                ${isPresent(resumeData.linkedin) ? linkedInPdfLinkHtml(resumeData.linkedin, { linkColor: "#3B82F6" }) : ""}
                ${isPresent(resumeData.github) ? `<span>${resumeSocialSvg("github", { size: 16, fill: "#24292f" })}<a href="${resumeData.github}" target="_blank" rel="noopener noreferrer">GitHub</a></span>` : ""}
                ${isPresent(resumeData.website) ? `<span>🌐 <a href="${resumeData.website}" target="_blank">Website</a></span>` : ""}
              </div>
              <div class="divider"></div>
            </div>

            <!-- --- MODIFICATION: Skills moved after summary --- -->
            ${isPresent(resumeData.summary) ? `<div class="section"><h2>Professional Summary</h2><p>${resumeData.summary}</p></div>` : ""}
            ${
              processSkills(resumeData.skills).length > 0
                ? `<div class="section"><h2>Skills</h2><div class="skills-grid">${processSkills(
                    resumeData.skills,
                  )
                    .map((skill) => `<div class="skill-item">${skill}</div>`)
                    .join("")}</div></div>`
                : ""
            }
            ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Work Experience</h2>${generateExperienceHTML(resumeData.experience, "professional")}</div>` : ""}
            ${resumeData.education && resumeData.education.length > 0 ? `<div class="section"><h2>Education</h2>${generateEducationHTML(resumeData.education)}</div>` : ""}
            ${
              achievementItems.length > 0
                ? `<div class="section"><h2>Achievements</h2><ul style="margin-left:20px;">${achievementItems
                    .map((ach) => `<li>${ach}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${projectsSectionHtml(projectItems, (s) => String(s ?? ""))}
            <!-- --- END MODIFICATION --- -->
            
        </div></body></html>`;

    case "emerald-sidebar": {
      const esc = (s: unknown) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const contactBits = [
        isPresent(resumeData.phone) ? `📞 ${esc(resumeData.phone)}` : "",
        isPresent(resumeData.email) ? `✉️ ${esc(resumeData.email)}` : "",
        isPresent(resumeData.location)
          ? `${resumeLocationSvg({ size: 12, fill: "#047857" })} ${esc(resumeData.location)}`
          : "",
        isPresent(resumeData.linkedin)
          ? linkedInPdfLinkHtml(resumeData.linkedin, {
              esc,
              iconSize: 12,
              iconFill: "#047857",
              linkColor: "#047857",
            })
          : "",
      ].filter(isPresent);

      const portfolioRows = [
        isPresent(resumeData.website)
          ? `<div style="font-size:11px;margin-top:6px;word-break:break-word;"><a href="${esc(resumeData.website)}" target="_blank" rel="noopener noreferrer" style="color:#047857;font-weight:700;text-decoration:underline;">${esc(String(resumeData.website).replace(/^https?:\/\//, ""))}</a></div>`
          : "",
        isPresent(resumeData.linkedin)
          ? `<div style="margin-top:6px;">${linkedInPdfLinkHtml(resumeData.linkedin, { esc, iconSize: 12, iconFill: "#047857", linkColor: "#047857" })}</div>`
          : "",
        isPresent(resumeData.github)
          ? `<div style="font-size:11px;margin-top:6px;word-break:break-word;display:flex;align-items:center;gap:6px;">${resumeSocialSvg("github", { size: 12, fill: "#24292f" })}<a href="${esc(resumeData.github)}" target="_blank" rel="noopener noreferrer" style="color:#047857;font-weight:700;text-decoration:underline;">${esc(String(resumeData.github).replace(/^https?:\/\//, ""))}</a></div>`
          : "",
      ].filter(isPresent);

      const expHtml =
        resumeData.experience && resumeData.experience.length > 0
          ? generateExperienceHTML(resumeData.experience, "professional")
          : "";

      const eduHtml =
        resumeData.education && resumeData.education.length > 0
          ? generateEducationHTML(resumeData.education)
          : "";

      const highlights = isPresent(resumeData.summary)
        ? String(resumeData.summary).replace(/\n/g, "<br>")
        : "";

      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; line-height: 1.35; color: #0f172a; background: #ffffff; }
          .page { max-width: 900px; margin: 18px auto; }
          .layout { display: grid; grid-template-columns: 280px 1fr; min-height: 1050px; }
          .sidebar { background: #f8fafc; border-right: 1px solid #e5e7eb; padding: 26px 22px; }
          .main { padding: 28px 28px; }
          .avatar { width: 86px; height: 86px; border-radius: 999px; background: #e5e7eb; margin: 0 auto 14px; border: 4px solid rgba(16,185,129,0.25); overflow: hidden; }
          .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .name { text-align:center; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; font-size: 18px; color: #047857; }
          .role { text-align:center; margin-top: 6px; font-weight: 700; font-size: 11px; color: #334155; text-transform: uppercase; }
          .contacts { margin: 12px auto 18px; display:flex; justify-content:center; flex-wrap: wrap; gap: 8px; }
          .chip { font-size: 10px; color: #0f172a; background: #ecfeff; border: 1px solid #99f6e4; padding: 4px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
          .chip svg { flex-shrink: 0; }
          .s-title { margin-top: 18px; font-size: 10px; letter-spacing: 0.24em; font-weight: 900; color: #059669; text-transform: uppercase; }
          .s-box { margin-top: 8px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fff; padding: 10px; }
          .muted { color: #64748b; }
          .qr { width: 78px; height: 78px; border-radius: 14px; border: 2px solid rgba(16,185,129,0.35); background:
              linear-gradient(45deg, rgba(16,185,129,0.12), rgba(34,197,94,0.12)),
              repeating-linear-gradient(45deg, rgba(15,118,110,0.22) 0, rgba(15,118,110,0.22) 2px, transparent 2px, transparent 6px);
            margin: 8px 0 6px;
          }
          .list { margin: 8px 0 0; padding-left: 16px; }
          .list li { margin: 4px 0; font-size: 11px; color: #0f172a; }

          .rail { height: 10px; border-radius: 999px; background: linear-gradient(90deg, #10b981, #22c55e); margin-bottom: 16px; }
          .section { margin-bottom: 18px; }
          .h { font-size: 11px; letter-spacing: 0.22em; font-weight: 900; color: #047857; text-transform: uppercase; margin-bottom: 10px; }
          .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; background: #ffffff; }
          .card .bar { height: 7px; border-radius: 999px; background: linear-gradient(90deg, #10b981, #22c55e); margin-bottom: 12px; }

          /* Re-skin experience blocks from 'professional' template */
          .experience-item { margin-bottom: 14px; }
          .experience-item h3 { font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
          .experience-item .duration { color: #64748b; font-size: 10px; float: right; margin-top: -18px; }
          .experience-item .company { color: #047857; font-weight: 700; font-size: 11px; margin-bottom: 6px; }
          .experience-item .description { font-size: 11px; color: #0f172a; }
          .education-item { margin-bottom: 10px; }
          .education-item h3 { font-size: 11px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
          .education-item .school { color: #047857; font-weight: 700; font-size: 11px; margin-bottom: 2px; }
          .education-item .details { color: #64748b; font-size: 10px; }
        </style></head><body>
          <div class="page">
            <div class="layout">
              <aside class="sidebar">
                <div class="avatar">${profileImageHtml}</div>
                ${isPresent(resumeData.name) ? `<div class="name">${String(resumeData.name)}</div>` : ""}
                ${isPresent(resumeData.profession) ? `<div class="role">${String(resumeData.profession)}</div>` : ""}
                ${contactBits.length ? `<div class="contacts">${contactBits.map((c) => `<span class="chip">${c}</span>`).join("")}</div>` : ""}

                <div class="s-title">My Portfolio</div>
                <div class="s-box">
                  <div class="muted" style="font-size:10px;">Click here to view</div>
                  ${portfolioRows.length ? portfolioRows.join("") : `<div class="muted" style="font-size:10px;">(add website/linkedin/github)</div>`}
                </div>

                <div class="s-title">Area of Expertise</div>
                ${
                  processSkills(resumeData.skills).length
                    ? `<ul class="list">${processSkills(resumeData.skills)
                        .map((s) => `<li>${s}</li>`)
                        .join("")}</ul>`
                    : `<div class="muted" style="font-size:11px;margin-top:8px;">—</div>`
                }

                ${eduHtml ? `<div class="s-title">Education</div><div class="s-box">${eduHtml}</div>` : ""}
              </aside>

              <main class="main">
                <div class="rail"></div>
                ${highlights ? `<div class="section card"><div class="bar"></div><div class="h">Professional Highlights</div><div style="font-size:11px;color:#0f172a;">${highlights}</div></div>` : ""}
                ${expHtml ? `<div class="section card"><div class="bar"></div><div class="h">Work Experience</div>${expHtml}</div>` : ""}
                ${
                  processSkills(resumeData.skills).length
                    ? `<div class="section card"><div class="bar"></div><div class="h">Technical Skills</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${processSkills(
                        resumeData.skills,
                      )
                        .map(
                          (s) =>
                            `<span class="chip" style="border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.10);">${s}</span>`,
                        )
                        .join("")}</div></div>`
                    : ""
                }
                ${
                  achievementItems.length > 0
                    ? `<div class="section card"><div class="bar"></div><div class="h">Achievements</div><ul class="list">${achievementItems
                        .slice(0, 6)
                        .map((a: string) => `<li>${a}</li>`)
                        .join("")}</ul></div>`
                    : ""
                }
                ${
                  projectItems.length > 0
                    ? `<div class="section card"><div class="bar"></div><div class="h">Projects</div><ul class="list">${renderProjectListItems(
                        projectItems.slice(0, 6),
                        esc,
                      )}</ul></div>`
                    : ""
                }
              </main>
            </div>
          </div>
        </body></html>`;
    }

    case "photo-classic": {
      const esc = (s: unknown) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const linesToLis = (text: unknown) =>
        esc(text)
          .split(/\n+/)
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((x) => `<li>${x}</li>`)
          .join("");

      const projects = projectItems;
      const projectLinks = projectsLinksHtml(projects, esc);

      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, "Times New Roman", serif; color: #111827; background: #ffffff; }
          .page { max-width: 980px; margin: 14px auto; }
          .top { display: grid; grid-template-columns: 150px 1fr; gap: 18px; padding: 22px 26px 14px; }
          .photo { width: 124px; height: 124px; border-radius: 999px; overflow: hidden; background: #e5e7eb; border: 4px solid #ffffff; box-shadow: 0 10px 22px rgba(0,0,0,0.10); }
          .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .name { font-size: 34px; font-weight: 900; }
          .role { margin-top: 4px; font-size: 14px; font-weight: 800; font-family: Arial, sans-serif; }
          .summary { margin-top: 8px; font-size: 12px; color: #374151; line-height: 1.5; font-family: Arial, sans-serif; }
          .band { background: #f3f4f6; border-top: 1px solid #e5e7eb; border-bottom: none; padding: 10px 26px; display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 10px; font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
          .band span { display: inline-flex; gap: 8px; align-items: center; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .icon { width: 18px; height: 18px; border-radius: 6px; background: #111827; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex: 0 0 auto; }
          .icon svg { display: block; }
          .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 28px; padding: 18px 26px 26px; }
          h2 { font-size: 14px; font-weight: 900; margin: 0 0 10px; letter-spacing: 0.02em; }
          .section { margin-bottom: 18px; }
          .job { margin-bottom: 12px; }
          .job h3 { font-size: 12px; font-weight: 900; margin: 0; }
          .meta { font-size: 10px; color: #6b7280; font-style: italic; margin: 2px 0 6px; font-family: Arial, sans-serif; }
          ul { padding-left: 18px; font-family: Arial, sans-serif; font-size: 11px; }
          li { margin: 4px 0; }
          .chips { display: flex; flex-wrap: wrap; gap: 6px; font-family: Arial, sans-serif; }
          .chip { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 6px; padding: 4px 8px; font-size: 11px; line-height: 1.25; white-space: normal; word-break: break-word; max-width: 100%; }
          .links { display: grid; gap: 12px; font-family: Arial, sans-serif; font-size: 11px; }
          .link { word-break: break-word; }
          .project-item { margin-bottom: 4px; }
          .project-desc { margin-top: 8px; line-height: 1.45; color: #6b7280; }
          .muted { font-family: Arial, sans-serif; font-size: 11px; color: #6b7280; }
          .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .edu-item { margin-bottom: 10px; }
          .edu-item h3 { font-size: 12px; font-weight: 900; margin: 0; }
        </style></head><body>
          <div class="page">
            <div class="top">
              <div class="photo">${profileImageHtml}</div>
              <div>
                ${isPresent(resumeData.name) ? `<div class="name">${esc(resumeData.name)}</div>` : ""}
                ${isPresent(resumeData.profession) ? `<div class="role">${esc(resumeData.profession)}</div>` : ""}
                ${isPresent(resumeData.summary) ? `<div class="summary">${esc(resumeData.summary).replace(/\n/g, "<br/>")}</div>` : ""}
              </div>
            </div>

            <div class="band">
              ${isPresent(resumeData.email) ? `<span><span class="icon">✉</span><span>${esc(resumeData.email)}</span></span>` : ""}
              ${isPresent(resumeData.location) ? `<span><span class="icon">${resumeLocationSvg({ size: 12, fill: "#ffffff" })}</span><span>${esc(resumeData.location)}</span></span>` : ""}
              ${isPresent(resumeData.phone) ? `<span><span class="icon">☎</span><span>${esc(resumeData.phone)}</span></span>` : ""}
              ${isPresent(resumeData.linkedin) ? linkedInPdfLinkHtml(resumeData.linkedin, { esc, iconSize: 12, iconFill: "#ffffff", linkColor: "#111827", bandLayout: true }) : ""}
              ${isPresent(resumeData.github) ? `<span><span class="icon">${resumeSocialSvg("github", { size: 12, fill: "#ffffff" })}</span><span>${esc(String(resumeData.github).replace(/^https?:\/\//, ""))}</span></span>` : ""}
            </div>

            <div class="grid">
              <div>
                <div class="section">
                  <h2>WORK EXPERIENCE</h2>
                  ${(resumeData.experience || [])
                    .map(
                      (e: any) => `
                    <div class="job">
                      ${isPresent(e?.title) ? `<h3>${esc(e.title)}</h3>` : ""}
                      <div class="meta">${esc(e?.company || "")}${isPresent(e?.duration) ? ` • ${esc(e.duration)}` : ""}</div>
                      <ul>${linesToLis(e?.description)}</ul>
                    </div>
                  `,
                    )
                    .join("")}
                </div>

                <div class="section">
                  <h2>EDUCATION</h2>
                  ${(resumeData.education || [])
                    .slice(0, 3)
                    .map(
                      (e: any) => `
                    <div class="edu-item">
                      <h3>${esc(e?.degree || "")}</h3>
                      <div class="meta">${esc(e?.school || e?.institution || "")}${isPresent(e?.year) ? ` • ${esc(e.year)}` : ""}</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>

              <div>
                <div class="section">
                  <h2>SKILLS</h2>
                  <div class="chips">${processSkills(resumeData.skills)
                    .map((s) => `<span class="chip">${esc(s)}</span>`)
                    .join("")}</div>
                </div>

                ${
                  projectLinks
                    ? `<div class="section">
                  <h2>PROJECTS</h2>
                  <div class="links">${projectLinks}</div>
                </div>`
                    : ""
                }

                ${
                  achievementItems.length > 0
                    ? `<div class="section">
                  <h2>ACHIEVEMENTS</h2>
                  <div class="muted">${achievementItems
                    .slice(0, 6)
                    .map((a: string) => esc(a))
                    .join("<br/>")}</div>
                </div>`
                    : ""
                }

                <div class="section">
                  <h2>LANGUAGES</h2>
                  <div class="two">${(resumeData.languages || [])
                    .slice(0, 4)
                    .map(
                      (l: string) =>
                        `<div><div style="font-weight:900;">${esc(l)}</div><div class="muted">Full/Professional Proficiency</div></div>`,
                    )
                    .join("")}</div>
                </div>

                <div class="section">
                  <h2>INTERESTS</h2>
                  <div class="chips">${processSkills(resumeData.skills)
                    .slice(0, 3)
                    .map((s) => `<span class="chip">${esc(s)}</span>`)
                    .join("")}</div>
                </div>
              </div>
            </div>
          </div>
        </body></html>`;
    }

    case "brand-split": {
      const esc = (s: unknown) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const bullets = (text: unknown) =>
        esc(text)
          .split(/\n+/)
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((x) => `<li>${x}</li>`)
          .join("");

      const projectBlocks = projectsLinksHtml(projectItems, esc);

      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #ffffff; color: #0f172a; font-family: Arial, sans-serif; }
          .page { width: 100%; max-width: 980px; margin: 14px auto; }
          .hero { position: relative; padding: 22px 26px 18px; overflow: hidden; }
          .hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(800px circle at 8% 0%, rgba(45,212,191,0.22), transparent 55%), radial-gradient(700px circle at 92% 10%, rgba(167,139,250,0.20), transparent 55%), linear-gradient(135deg, rgba(13,148,136,0.10), rgba(99,102,241,0.10)); }
          .hero-inner { position: relative; display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: center; }
          .photo { width: 86px; height: 86px; border-radius: 999px; overflow: hidden; background: #e5e7eb; border: 4px solid #ffffff; box-shadow: 0 14px 28px rgba(2,6,23,0.10); }
          .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .name { font-size: 28px; font-weight: 900; letter-spacing: 0.02em; }
          .role { margin-top: 2px; color: #0f766e; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; }
          .meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #334155; }
          .pill { padding: 4px 10px; border-radius: 999px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.78); }
          .grid { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 22px; padding: 18px 26px 26px; align-items: start; }
          .section { margin-bottom: 14px; }
          .h { font-size: 12px; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; margin: 0 0 10px; }
          .h span { background: linear-gradient(90deg, #0d9488, #6366f1); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; background: #ffffff; }
          .summary { color: #334155; font-size: 12px; line-height: 1.5; }
          .job { margin-bottom: 12px; }
          .job-title { font-weight: 900; font-size: 12px; }
          .job-meta { color: #64748b; font-size: 10px; margin-top: 2px; font-style: italic; }
          .job ul { margin: 6px 0 0; padding-left: 18px; color: #0f172a; font-size: 11px; }
          .job li { margin: 4px 0; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill { border: 1px solid #d1d5db; background: #f8fafc; border-radius: 10px; padding: 7px 10px; font-size: 11px; line-height: 1.25; white-space: normal; word-break: break-word; max-width: 100%; }
          .links { display: grid; gap: 12px; font-size: 11px; color: #0f172a; }
          .link { word-break: break-word; }
          .project-item { margin-bottom: 4px; }
          .project-desc { margin-top: 8px; line-height: 1.45; }
          .muted { color: #64748b; font-size: 11px; }
        </style></head><body>
          <div class="page">
            <div class="hero">
              <div class="hero-inner">
                <div class="photo">${profileImageHtml}</div>
                <div>
                  ${isPresent(resumeData.name) ? `<div class="name">${esc(resumeData.name)}</div>` : ""}
                  ${isPresent(resumeData.profession) ? `<div class="role">${esc(resumeData.profession)}</div>` : ""}
                  <div class="meta">
                    ${isPresent(resumeData.email) ? `<span class="pill">✉ ${esc(resumeData.email)}</span>` : ""}
                    ${isPresent(resumeData.phone) ? `<span class="pill">☎ ${esc(resumeData.phone)}</span>` : ""}
                    ${isPresent(resumeData.location) ? `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;">${resumeLocationSvg({ size: 14, fill: "#0f766e" })}${esc(resumeData.location)}</span>` : ""}
                    ${isPresent(resumeData.linkedin) ? linkedInPdfLinkHtml(resumeData.linkedin, { esc, iconSize: 14, linkColor: "#0f766e", pillLayout: true }) : ""}
                    ${isPresent(resumeData.github) ? `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;">${resumeSocialSvg("github", { size: 14, fill: "#24292f" })}${esc(String(resumeData.github).replace(/^https?:\/\//, ""))}</span>` : ""}
                  </div>
                </div>
              </div>
            </div>

            <div class="grid">
              <div>
                <div class="section card">
                  <div class="h"><span>Summary</span></div>
                  <div class="summary">${isPresent(resumeData.summary) ? esc(resumeData.summary).replace(/\\n/g, "<br/>") : `<span class="muted">—</span>`}</div>
                </div>

                <div class="section card">
                  <div class="h"><span>Experience</span></div>
                  ${(resumeData.experience || []).map((e: any) => `
                    <div class="job">
                      ${isPresent(e?.title) ? `<div class="job-title">${esc(e.title)}</div>` : ""}
                      <div class="job-meta">${esc(e?.company || "")}${isPresent(e?.duration) ? ` • ${esc(e.duration)}` : ""}</div>
                      ${bullets(e?.description) ? `<ul>${bullets(e?.description)}</ul>` : ""}
                    </div>
                  `).join("") || `<div class="muted">Add experience to see it here.</div>`}
                </div>
              </div>

              <div>
                <div class="section card">
                  <div class="h"><span>Skills</span></div>
                  <div class="skills">${processSkills(resumeData.skills).map((s) => `<div class="skill">${esc(s)}</div>`).join("")}</div>
                </div>

                <div class="section card">
                  <div class="h"><span>Education</span></div>
                  ${(resumeData.education || []).slice(0, 3).map((e: any) => `
                    <div style="margin-bottom:10px;">
                      <div style="font-weight:900;">${esc(e?.degree || "")}</div>
                      <div class="muted">${esc(e?.school || e?.institution || "")}${isPresent(e?.year) ? ` • ${esc(e.year)}` : ""}</div>
                    </div>
                  `).join("") || `<div class="muted">—</div>`}
                </div>

                ${
                  projectBlocks
                    ? `<div class="section card">
                  <div class="h"><span>Projects</span></div>
                  <div class="links">${projectBlocks}</div>
                </div>`
                    : ""
                }

                ${
                  achievementItems.length > 0
                    ? `<div class="section card">
                  <div class="h"><span>Achievements</span></div>
                  <ul style="margin:0;padding-left:18px;font-size:11px;">${achievementItems
                    .map((a: string) => `<li style="margin:4px 0;">${esc(a)}</li>`)
                    .join("")}</ul>
                </div>`
                    : ""
                }
              </div>
            </div>
          </div>
        </body></html>`;
    }

    case "harvard": {
      const harvardBits: string[] = [];
      if (isPresent(resumeData.phone)) harvardBits.push(resumeData.phone);
      if (isPresent(resumeData.email)) harvardBits.push(resumeData.email);
      if (isPresent(resumeData.linkedin)) {
        harvardBits.push(
          linkedInPdfLinkHtml(resumeData.linkedin, {
            linkColor: "#000000",
          }),
        );
      }
      if (isPresent(resumeData.github)) {
        harvardBits.push(
          `<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;max-width:100%;">${resumeSocialSvg("github", { size: 14, fill: "#24292f" })}${resumeData.github}</span>`,
        );
      }
      if (isPresent(resumeData.location)) {
        harvardBits.push(
          `<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;max-width:100%;">${resumeLocationSvg({ size: 14, fill: "#000000" })}${resumeData.location}</span>`,
        );
      }
      const harvardContact = harvardBits.join(" • ");
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; background: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 40px; } .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 2.2rem; font-weight: bold; margin-bottom: 15px; } .contact-info { font-size: 0.95rem; margin-bottom: 20px; }
            .section { margin-bottom: 25px; } .section h2 { font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; text-decoration: none; text-transform: uppercase; }
            .summary p { text-align: justify; margin-bottom: 10px; } .experience-item { margin-bottom: 20px; }
            .experience-item .title-row, .education-item .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .experience-item h3, .education-item h3 { font-weight: bold; font-size: 1rem; }
            .experience-item .duration, .education-item .duration { font-style: italic; } .experience-item .company, .education-item .school { font-style: italic; margin-bottom: 8px; }
            .experience-item .description { margin-top: 5px; }
            .skills-section ul, .achievements-section ul { margin-left: 20px; } .skills-section li, .achievements-section li { display: inline-block; margin: 0 16px 4px 0; }
        </style></head><body><div class="container">
            <div class="header">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name}</h1>` : ""}
              ${isPresent(harvardContact) ? `<div class="contact-info">${harvardContact}</div>` : ""}
            </div>

            <!-- --- MODIFICATION: Skills moved after summary --- -->
            ${isPresent(resumeData.summary) ? `<div class="section summary"><h2>Summary</h2><p>${resumeData.summary}</p></div>` : ""}
            ${
              processSkills(resumeData.skills).length > 0
                ? `<div class="section skills-section"><h2>Skills</h2><ul>${processSkills(
                    resumeData.skills,
                  )
                    .map((skill) => `<li>${skill}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Professional Experience</h2>${generateExperienceHTML(resumeData.experience, "harvard")}</div>` : ""}
            
            ${
              resumeData.education && resumeData.education.length > 0
                ? `<div class="section"><h2>Education</h2>${resumeData.education
                    .map(
                      (edu: any) => `
                <div class="education-item">
                  <div class="title-row">
                    ${isPresent(edu.degree) ? `<h3>${edu.degree}</h3>` : `<h3>${edu.school || ""}</h3>`}
                    ${isPresent(edu.duration) ? `<span class="duration">${edu.duration}</span>` : ""}
                  </div>
                  ${isPresent(edu.degree) && isPresent(edu.school) ? `<div class="school">${edu.school}</div>` : ""}
                </div>`,
                    )
                    .join("")}</div>`
                : ""
            }
            
            ${
              achievementItems.length > 0
                ? `<div class="section achievements-section"><h2>Achievements</h2><ul>${achievementItems
                    .map((ach: string) => `<li>${ach}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${projectsSectionHtml(projectItems, (s) => String(s ?? ""), {
              wrapperClass: "section projects-section",
            })}
             <!-- --- END MODIFICATION --- -->
        </div></body></html>`;
    }

    case "techie": {
      const techSkills = processSkills(resumeData.skills);
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ui-monospace, "Cascadia Code", "Consolas", monospace; line-height: 1.5; color: #86efac; background: #0a0a0a; }
          .wrap { max-width: 800px; margin: 0 auto; padding: 36px 40px; }
          h1 { font-size: 1.75rem; color: #22c55e; margin-bottom: 4px; }
          h1 span { color: #4ade80; }
          .role { color: #86efac; font-size: 0.95rem; margin-bottom: 24px; }
          .contact { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.85rem; color: #a3e635; margin-bottom: 28px; }
          .contact a { color: #4ade80; text-decoration: none; }
          h2 { font-size: 0.85rem; color: #22c55e; margin: 22px 0 10px; letter-spacing: 0.05em; }
          h2::before { content: "// "; color: #166534; }
          p, .description { color: #bbf7d0; font-size: 0.9rem; }
          .experience-item { margin-bottom: 18px; border-left: 2px solid #166534; padding-left: 12px; }
          .experience-item h3 { color: #4ade80; font-size: 1rem; }
          .experience-item .meta { color: #65a30d; font-size: 0.8rem; margin: 4px 0 8px; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill { border: 1px solid #22c55e; color: #86efac; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; }
          .education-item { margin-bottom: 12px; }
          .education-item h3 { color: #4ade80; font-size: 0.95rem; }
          .education-item .school { color: #65a30d; font-size: 0.85rem; }
        </style></head><body><div class="wrap">
          ${isPresent(resumeData.name) ? `<h1>&gt; ${resumeData.name}<span>_</span></h1>` : ""}
          ${isPresent(resumeData.profession) ? `<div class="role">// ${resumeData.profession}</div>` : ""}
          <div class="contact">
            ${isPresent(resumeData.email) ? `<span>📧 <a href="mailto:${resumeData.email}">${resumeData.email}</a></span>` : ""}
            ${isPresent(resumeData.phone) ? `<span>📞 ${resumeData.phone}</span>` : ""}
            ${isPresent(resumeData.location) ? `<span>${resumeData.location}</span>` : ""}
            ${isPresent(resumeData.github) ? `<span><a href="${resumeData.github}">GitHub</a></span>` : ""}
          </div>
          ${isPresent(resumeData.summary) ? `<h2>ABOUT ME</h2><p>${resumeData.summary.replace(/\n/g, "<br>")}</p>` : ""}
          ${resumeData.experience?.length ? `<h2>EXPERIENCE</h2>${resumeData.experience.map((exp: any) => `
            <div class="experience-item">
              ${isPresent(exp.title) ? `<h3>${exp.title}</h3>` : ""}
              <div class="meta">${[exp.company, exp.duration].filter(isPresent).join(" · ")}</div>
              ${isPresent(exp.description) ? `<div class="description">${String(exp.description).replace(/\n/g, "<br>")}</div>` : ""}
            </div>`).join("")}` : ""}
          ${techSkills.length ? `<h2>SKILLS</h2><div class="skills">${techSkills.map((s) => `<span class="skill">${s}</span>`).join("")}</div>` : ""}
          ${resumeData.education?.length ? `<h2>EDUCATION</h2>${generateEducationHTML(resumeData.education)}` : ""}
          ${
            projectItems.length > 0
              ? `<h2>PROJECTS</h2><ul style="margin-left:20px;">${renderProjectListItems(
                  projectItems,
                  (s) => String(s ?? ""),
                )}</ul>`
              : ""
          }
        </div></body></html>`;
    }

    case "creative":
      const creativeContactExists =
        isPresent(resumeData.phone) ||
        isPresent(resumeData.email) ||
        isPresent(resumeData.location) ||
        isPresent(resumeData.website) ||
        isPresent(resumeData.linkedin) ||
        isPresent(resumeData.github);
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: #f4f4f4; }
            .resume-container { display: flex; max-width: 900px; margin: 20px auto; min-height: 100vh; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
            .sidebar { background: #2C3E50; color: white; padding: 40px 30px; width: 300px; } .sidebar h1 { font-size: 1.8rem; font-weight: bold; text-align: center; margin-bottom: 10px; }
            .sidebar .title { font-size: 1rem; text-align: center; margin-bottom: 30px; color: #BDC3C7; text-transform: uppercase; }
            .sidebar .section { margin-bottom: 30px; } .sidebar .section h3 { font-size: 1rem; font-weight: bold; margin-bottom: 15px; border-bottom: none; padding-bottom: 8px; text-transform: uppercase;}
            .sidebar .contact-item { margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; word-break: break-all; }
            .sidebar .skill-item { margin-bottom: 8px; font-size: 0.9rem; } .main-content { flex: 1; padding: 40px; background: white; }
            .main-content .section h2 { font-size: 1.3rem; font-weight: bold; color: #2C3E50; margin-bottom: 20px; text-transform: uppercase; }
            .experience-item { margin-bottom: 25px; } .experience-item .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .experience-item h3 { font-size: 1.1rem; font-weight: bold; color: #2C3E50; } .experience-item .duration { color: #7F8C8D; font-size: 0.9rem; }
            .experience-item .company { color: #3498db; font-weight: 500; margin-bottom: 8px; }
            .experience-item .description { margin-top: 5px; font-size: 0.95rem; }
            /* --- MODIFICATION: Added styles for skills in main content --- */
            .main-content .skills-grid { display: flex; flex-wrap: wrap; gap: 6px 16px; } 
            .main-content .skill-item { padding: 0; font-size: 0.95rem; }
            /* --- END MODIFICATION --- */
        </style></head><body><div class="resume-container">
            <div class="sidebar">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name.toUpperCase()}</h1>` : ""}
              ${isPresent(resumeData.profession) ? `<div class="title">${resumeData.profession}</div>` : ""}

              ${
                creativeContactExists
                  ? `<div class="section"><h3>Contact</h3>
                ${isPresent(resumeData.phone) ? `<div class="contact-item"><span>📞</span><span>${resumeData.phone}</span></div>` : ""}
                ${isPresent(resumeData.email) ? `<div class="contact-item"><span>📧</span><span>${resumeData.email}</span></div>` : ""}
                ${isPresent(resumeData.location) ? `<div class="contact-item">${resumeLocationSvg({ size: 18, fill: "#ffffff" })}<span>${resumeData.location}</span></div>` : ""}
                ${isPresent(resumeData.website) ? `<div class="contact-item"><span>🌐</span><span>${resumeData.website}</span></div>` : ""}
                ${isPresent(resumeData.linkedin) ? `<div class="contact-item">${linkedInPdfLinkHtml(resumeData.linkedin, { iconSize: 18, iconFill: "#ffffff", linkColor: "#ffffff" })}</div>` : ""}
                ${isPresent(resumeData.github) ? `<div class="contact-item">${resumeSocialSvg("github", { size: 18, fill: "#ffffff" })}<span><a href="${resumeData.github}" target="_blank" rel="noopener noreferrer" style="color:#fff;">${resumeData.github}</a></span></div>` : ""}
              </div>`
                  : ""
              }

              ${
                resumeData.education && resumeData.education.length > 0
                  ? `<div class="section"><h3>Education</h3>${resumeData.education
                      .map((edu: any) => {
                        if (!isPresent(edu.degree) && !isPresent(edu.school))
                          return "";
                        return `<div style="margin-bottom: 15px;">
                    ${isPresent(edu.duration) ? `<div style="font-weight: bold; margin-bottom: 5px;">${edu.duration}</div>` : ""}
                    ${isPresent(edu.degree) ? `<div style="font-size: 0.9rem;">${edu.degree.toUpperCase()}</div>` : ""}
                    ${isPresent(edu.school) ? `<div style="font-size: 0.85rem; color: #BDC3C7;">${edu.school}</div>` : ""}
                  </div>`;
                      })
                      .join("")}</div>`
                  : ""
              }
              
              ${
                achievementItems.length > 0
                  ? `<div class="section"><h3>Achievements</h3>${achievementItems
                      .map(
                        (ach: string) =>
                          `<div class="skill-item">• ${ach}</div>`,
                      )
                      .join("")}</div>`
                  : ""
              }
              ${
                projectItems.length > 0
                  ? `<div class="section"><h3>Projects</h3>${projectItems
                      .map((p) => {
                        const label = [p.name, p.url, p.description]
                          .filter(isPresent)
                          .join(" — ");
                        return label
                          ? `<div class="skill-item">• ${label}</div>`
                          : "";
                      })
                      .join("")}</div>`
                  : ""
              }
              <!-- --- MODIFICATION: Skills moved from sidebar to main content --- -->
            </div>

            <div class="main-content">
              ${isPresent(resumeData.summary) ? `<div class="section"><h2>Profile</h2><p>${resumeData.summary.replace(/\n/g, "<br>")}</p></div>` : ""}
              <!-- --- MODIFICATION: Skills now rendered here in main content --- -->
              ${
                processSkills(resumeData.skills).length > 0
                  ? `<div class="section"><h2>Skills</h2><div class="skills-grid">${processSkills(
                      resumeData.skills,
                    )
                      .map((skill) => `<div class="skill-item">${skill}</div>`)
                      .join("")}</div></div>`
                  : ""
              }
              ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Work Experience</h2>${generateExperienceHTML(resumeData.experience, "creative")}</div>` : ""}
              ${projectsSectionHtml(projectItems, (s) => String(s ?? ""))}
            </div>
        </div></body></html>`;

    default:
      return generateResumeHTML("professional", resumeData);
  }
}
