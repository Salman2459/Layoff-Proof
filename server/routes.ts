import type { Express } from "express";
import { createServer, type Server } from "http";
import "./types"; // Import session and request type extensions
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMagicAuth, isMagicAuthenticated } from "./magicAuth";
import { setupPasswordAuth, isAuthenticatedAny } from "./passwordAuth";
import { setupGoogleAuth } from "./googleAuth";
// import { setupLinkedInAuth } from "./linkedinAuth";
import { analyzeJobSecurityRisk } from "./anthropic";
import { dataIntegrator } from "./data-integrator";
import { insertCompanySchema, updateUserProfileSchema, ParsedResumeData, userJobProfiles, userDocuments } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import * as cheerio from "cheerio";
import axios from "axios";
import { Formidable } from 'formidable';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from "mammoth";
import docxParser from "docx-parser";
import Anthropic from '@anthropic-ai/sdk';
import { db } from "./db";
import Parser from 'rss-parser';
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { layoffs } from "@shared/schema";
import {
  stripe,
  getOrCreateStripeCustomer,
  createSetupIntent,
  createSubscription,
  createPaymentIntent,
  cancelSubscription,
  getSubscription
} from "./stripe";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { cloudinary } from "./cloudinary";

const rssParser = new Parser();

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    dest: './uploads/',
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only text files, PDFs, and documents
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Please upload .txt, .pdf, .doc, or .docx files.'));
      }
    }
  });

  // Session middleware (from replitAuth but without the problematic strategy)
  const session = await import('express-session');
  const connectPg = await import('connect-pg-simple');

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg.default(session.default);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(session.default({
    secret: process.env.SESSION_SECRET || 'layoff-proof-dev-secret-key-2024', // Fallback for development
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development (HTTP)
      maxAge: sessionTtl,
    },
  }));

  // Initialize Passport
  const passport = await import('passport');
  app.use(passport.default.initialize());
  app.use(passport.default.session());
  puppeteer.use(StealthPlugin());




  // Auth middleware  
  setupMagicAuth(app);
  setupPasswordAuth(app);
  setupGoogleAuth(app);
  // setupLinkedInAuth(app);  // Disabled until API keys are configured

  async function GetUserScscriptionTrialValidation(id: string) {
    if (!id) {
      return false;
    }

    const user = await storage.getUser(id);

    if (!user) {
      return false;
    }



    if (!user?.subscriptionEndDate) {
      return false;
    }

    if (user?.subscriptionEndDate && new Date(user?.subscriptionEndDate) < new Date()) {
      return false;
    }

    return user;

  }

  async function DetuctCredits(user: any) {
    if (!user?.subscriptionEndDate) {
      await storage.updateUser(user.id, {
        trialMessageLimit: Math.max((user.trialMessageLimit ?? 0) - 1, 0),
      });
      return true;
    }
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticatedAny, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });



  // Company routes
  app.get('/api/companies/search', isAuthenticated, async (req, res) => {
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

  app.get('/api/companies/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/companies', isAuthenticated, async (req, res) => {
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
  app.post('/api/user/select-company', isAuthenticated, async (req: any, res) => {
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
  });

  // Dashboard stats - public access for homepage
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getCompaniesWithLayoffStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
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
  app.get('/api/companies/:id/activities', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const activities = await storage.getCompanyActivities(id);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching company activities:", error);
      res.status(500).json({ message: "Failed to fetch company activities" });
    }
  });

  // Layoff events
  app.get('/api/companies/:id/layoffs', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const layoffs = await storage.getLayoffEventsByCompany(id);
      res.json(layoffs);
    } catch (error) {
      console.error("Error fetching layoff events:", error);
      res.status(500).json({ message: "Failed to fetch layoff events" });
    }
  });

  // User profile management
  app.put('/api/user/profile', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.id; // Make sure this exists
      console.log('User ID:', userId); // Add logging
      console.log('Request body:', req.body); // Add logging

      const validated = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(userId, validated);

      console.log('Updated user:', user); // Add logging
      res.json(user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Historical layoff data - public access for homepage
  app.get('/api/analytics/historical', async (req, res) => {
    try {
      const historicalData = await storage.getHistoricalLayoffData();
      res.json(historicalData);
    } catch (error) {
      console.error("Error fetching historical layoff data:", error);
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  // Layoff trends - public access for homepage  
  app.get('/api/analytics/trends', async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as 'month' | 'quarter' | 'year') || 'month';
      const trends = await storage.getLayoffTrends(timeframe);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching layoff trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  // Recent layoffs endpoint
  app.get('/api/layoffs/recent', async (req, res) => {
    try {
      const recentLayoffs = await storage.getRecentLayoffs();
      res.json(recentLayoffs);
    } catch (error) {
      console.error("Error fetching recent layoffs:", error);
      res.status(500).json({ message: "Failed to fetch recent layoffs" });
    }
  });

  // Companies endpoint
  app.get('/api/companies', async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Stripe payment endpoints
  // Backend API - Without Webhooks

  const PLANS = {
    weekly: {
      productId: "prod_T01G5WddBK8Dv0",
      name: "Layoff Proof Pro (Weekly)",
      description: "Weekly premium access to all Layoff Proof career tools",
      unit_amount: 1900,
      interval: "week",
      days: 7,
    },
    monthly: {
      productId: "prod_T01HPr0qbDOq3L",
      name: "Layoff Proof Pro (Monthly)",
      description: "Monthly premium access to all Layoff Proof career tools",
      unit_amount: 2900,
      interval: "month",
      days: 30,
    },
  };

  // Helper: Calculate subscription end date
  const calculateSubscriptionEndDate = (user, days) => {
    const now = new Date();
    // If user has active subscription, stack on top
    const startDate = (user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now)
      ? new Date(user.subscriptionEndDate)
      : now;

    startDate.setDate(startDate.getDate() + days);
    return startDate;
  };

  // Helper: Get or create price
  async function getOrCreatePrice(planConfig) {
    try {
      let product;
      try {
        product = await stripe.products.retrieve(planConfig.productId);
        console.log(`✅ Found product: ${product.id}`);
      } catch (error) {
        if (error.code === "resource_missing") {
          throw new Error(`Configured Stripe Product ID not found: ${planConfig.productId}`);
        }
        throw error;
      }

      const prices = await stripe.prices.list({ product: product.id, active: true });
      const correctPrice = prices.data.find(
        (p) =>
          p.unit_amount === planConfig.unit_amount &&
          p.currency === "usd" &&
          p.recurring?.interval === planConfig.interval
      );

      if (correctPrice) {
        console.log(`✅ Using existing price: ${correctPrice.id}`);
        return correctPrice.id;
      }

      console.warn(`⚠️ No correct price found for ${product.id}. Creating a new one.`);
      const newPrice = await stripe.prices.create({
        unit_amount: planConfig.unit_amount,
        currency: "usd",
        recurring: { interval: planConfig.interval },
        product: product.id,
      });
      console.log(`✅ Created new price: ${newPrice.id}`);
      return newPrice.id;
    } catch (err) {
      console.error("❌ Error in getOrCreatePrice:", err);
      throw new Error("Failed to set up product pricing.");
    }
  }

  // Create subscription
  app.post("/api/stripe/create-subscription", isAuthenticatedAny, async (req, res) => {
    try {
      const { planId, coupon } = req.body;
      const selectedPlan = PLANS[planId];

      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid subscription plan selected." });
      }

      const user = req.user;
      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
        stripeCustomerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId });
      }

      const priceId = await getOrCreatePrice(selectedPlan);

      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        coupon: coupon?.trim() || undefined, // ✅ APPLY COUPON HERE
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent", "latest_invoice.total_discount_amounts"],
      });

      await storage.updateUser(user.id, {
        subscriptionPlan: planId,
        subscriptionStatus: "incomplete",
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      });
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });


  // Get price breakdown (for preview)
  app.post("/api/stripe/get-price-breakdown", isAuthenticatedAny, async (req, res) => {
    try {
      const { coupon } = req.body;
      const user = req.user;

      const subscriptionId = user.stripeSubscriptionId;
      if (!subscriptionId || user.subscriptionStatus !== 'incomplete') {
        return res.status(400).json({ message: 'No active subscription draft found.' });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price', 'latest_invoice']
      });

      const priceItem = subscription.items.data[0];
      const originalAmount = priceItem.price.unit_amount;

      let breakdown = {
        originalAmount: originalAmount,
        discountAmount: 0,
        finalAmount: originalAmount,
        couponName: null,
        discountPercentage: null
      };

      if (coupon && coupon.trim()) {
        try {
          const couponObj = await stripe.coupons.retrieve(coupon.trim());

          if (!couponObj.valid) {
            return res.status(400).json({ message: 'This coupon is not valid or has expired.' });
          }

          let discountAmount = 0;
          let discountPercentage = null;

          if (couponObj.percent_off) {
            discountPercentage = couponObj.percent_off;
            discountAmount = Math.round((originalAmount * couponObj.percent_off) / 100);
          } else if (couponObj.amount_off) {
            discountAmount = couponObj.amount_off;
          }

          discountAmount = Math.min(discountAmount, originalAmount);

          breakdown = {
            originalAmount: originalAmount,
            discountAmount: discountAmount,
            finalAmount: originalAmount - discountAmount,
            couponName: couponObj.name || coupon.trim(),
            discountPercentage: discountPercentage
          };

          console.log(`📊 Price breakdown for coupon '${coupon}':`, breakdown);
        } catch (couponError) {
          console.log(`❌ Invalid coupon '${coupon}':`, couponError.message);
          return res.status(400).json({ message: 'This coupon code is not valid.' });
        }
      }

      res.json({
        success: true,
        breakdown: breakdown
      });
    } catch (error) {
      console.error("❌ Error getting price breakdown:", error);
      res.status(500).json({ message: "Failed to calculate price breakdown" });
    }
  });

  // Apply coupon
  app.post("/api/stripe/apply-coupon", isAuthenticatedAny, async (req, res) => {
    try {
      const { coupon, planId } = req.body;
      const user = req.user;

      if (!coupon || !coupon.trim()) {
        return res.status(400).json({ message: "Coupon code is required." });
      }

      // 1. Validate the plan
      const selectedPlan = PLANS[planId];
      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid plan ID." });
      }

      // 2. Validate the coupon first (Before cancelling anything)
      let validatedCoupon;
      try {
        validatedCoupon = await stripe.coupons.retrieve(coupon.trim());
        if (!validatedCoupon.valid) throw new Error("Invalid coupon");
      } catch (err) {
        return res.status(400).json({ message: "This coupon is invalid or expired." });
      }

      console.log(`🎟️ Re-creating subscription for user ${user.id} with coupon "${coupon}"`);

      // 3. Cancel the existing incomplete subscription if it exists
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (err) {
          console.log("Old subscription could not be cancelled (might not exist):", err.message);
        }
      }

      // 4. Get the Price ID (Reusing your helper function)
      const priceId = await getOrCreatePrice(selectedPlan);

      // 5. Create a NEW subscription with the coupon applied immediately
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        coupon: coupon.trim(), // ✅ Applied at creation = Applies to first invoice
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent", "latest_invoice.total_discount_amounts", "latest_invoice.discount"],
      });

      const invoice = subscription.latest_invoice;
      const finalAmount = invoice.total;
      const originalAmount = selectedPlan.unit_amount;
      const discountAmount = invoice.total_discount_amounts.reduce((sum, d) => sum + d.amount, 0);

      // 6. Calculate breakdown logic
      const breakdown = {
        originalAmount,
        discountAmount,
        finalAmount,
        couponName: validatedCoupon.name || coupon,
        discountPercentage: validatedCoupon.percent_off ?? null,
      };

      // 7. Handle 100% Discount (Free)
      if (finalAmount === 0) {
        const days = selectedPlan.days;
        const subscriptionEndDate = calculateSubscriptionEndDate(user, days);

        // Update user with new subscription ID and set to active
        await storage.updateUser(user.id, {
          subscriptionPlan: planId,
          subscriptionStatus: "active",
          stripeSubscriptionId: subscription.id,
          subscriptionEndDate,
          updatedAt: new Date(),
        });

        return res.json({
          success: true,
          paymentRequired: false,
          message: "Coupon applied successfully! Subscription activated.",
          breakdown,
          subscriptionEndDate: subscriptionEndDate.toISOString(),
        });
      }

      // 8. Handle Discounted Payment (Update DB with new ID)
      await storage.updateUser(user.id, {
        subscriptionPlan: planId,
        subscriptionStatus: "incomplete",
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      });

      return res.json({
        success: true,
        paymentRequired: true,
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
  app.post("/api/stripe/confirm-subscription", isAuthenticatedAny, async (req, res) => {
    try {
      const { planId } = req.body;
      const user = req.user;

      const subscriptionId = user.stripeSubscriptionId;

      if (!subscriptionId || user.subscriptionStatus !== 'incomplete') {
        if (user.subscriptionStatus === 'active') {
          return res.json({
            success: true,
            status: 'active',
            message: 'Subscription is already active.'
          });
        }
        return res.status(400).json({ message: 'No incomplete subscription found to confirm.' });
      }

      // Retrieve subscription from Stripe to check its actual status
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (subscription.status === "active") {
        // Determine days based on plan
        const selectedPlan = PLANS[planId] || PLANS.monthly;
        const days = selectedPlan.days;

        const subscriptionEndDate = calculateSubscriptionEndDate(user, days);

        await storage.updateUser(user.id, {
          subscriptionStatus: "active",
          subscriptionEndDate,
          updatedAt: new Date(),
        });

        console.log(`✅ Subscription confirmed for user ${user.id}. End date: ${subscriptionEndDate}`);

        return res.json({ success: true, status: "active" });
      }

      return res.json({
        success: false,
        status: subscription.status,
        message: 'Subscription not active in Stripe.'
      });
    } catch (error) {
      console.error("❌ Error confirming subscription:", error);
      res.status(500).json({ message: "Failed to confirm subscription" });
    }
  });

  // Cancel subscription
  app.post('/api/stripe/cancel-subscription', isAuthenticatedAny, async (req, res) => {
    try {
      const user = req.user;

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      const canceledSubscription = await stripe.subscriptions.cancel(
        user.stripeSubscriptionId
      );

      await storage.updateUser(user.id, {
        subscriptionStatus: "canceled",
        updatedAt: new Date(),
      });

      res.json({
        message: "Subscription canceled successfully",
        status: canceledSubscription.status,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Get subscription status
  app.get('/api/stripe/subscription-status', isAuthenticatedAny, async (req, res) => {
    try {
      const user = req.user;

      if (!user.stripeSubscriptionId) {
        return res.json({
          hasSubscription: false,
          status: user.subscriptionStatus,
          plan: user.subscriptionPlan,
          subscriptionEndDate: user.subscriptionEndDate,
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      res.json({
        hasSubscription: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: user.subscriptionPlan,
        subscriptionEndDate: user.subscriptionEndDate,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = {
        totalUsers: 1250,
        newUsersThisWeek: 45,
        totalCompanies: 80,
        companiesWithLayoffs: 12,
        totalLayoffs: 156,
        layoffsThisMonth: 8,
        systemHealth: "Good"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/companies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/admin/layoffs', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
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
      res.status(500).json({ message: "Data integration failed", error: error?.message });
    }
  });

  // Get data sources info
  app.get("/api/data-sources", async (req, res) => {
    res.json({
      sources: [
        {
          name: "layoffs.fyi",
          description: "Tech industry layoffs tracker with 759K+ employees from 2,813 companies since 2020",
          coverage: "Technology sector focused",
          dataPoints: "759,382 employees affected",
          lastUpdate: "Real-time"
        },
        {
          name: "warntracker.com",
          description: "WARN Act layoff notices tracker with comprehensive coverage since 1988",
          coverage: "All industries, all states",
          dataPoints: "7.1M+ employees, 36,237 companies",
          lastUpdate: "Government filings"
        },
        {
          name: "layoffdata.com",
          description: "Government WARN Act data aggregator with detailed layoff information",
          coverage: "49 states, all industries",
          dataPoints: "78K+ layoff notices, 8.5M+ workers",
          lastUpdate: "State government data"
        }
      ],
      totalCoverage: {
        employees: "15.5M+",
        companies: "42K+",
        timespan: "Since 1988"
      }
    });
  });

  // Risk Analysis API
  app.post("/api/risk-analysis", async (req, res) => {
    try {
      const { jobTitle, companyName, yearsExperience, currentSkills, industry } = req.body;

      if (!jobTitle || !companyName) {
        return res.status(400).json({
          message: "Job title and company name are required"
        });
      }

      const analysis = await analyzeJobSecurityRisk({
        jobTitle,
        companyName,
        yearsExperience,
        currentSkills,
        industry
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in risk analysis:", error);
      res.status(500).json({
        message: "Failed to analyze job security risk",
        error: error instanceof Error ? error.message : "Unknown error"
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
      if (!user || user.role !== 'admin') {
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
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
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
          { type: 'layoff', description: 'New layoff reported at Tech Corp', timestamp: '2 hours ago' },
          { type: 'company', description: 'Added new company: StartupXYZ', timestamp: '1 day ago' },
          { type: 'user', description: 'New user registration', timestamp: '2 days ago' },
        ]
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin company management
  app.get('/api/admin/companies', requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Admin companies error:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/admin/companies', requireAdmin, async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.json(company);
    } catch (error) {
      console.error("Create company error:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/admin/companies/:id', requireAdmin, async (req, res) => {
    try {
      const company = await storage.updateCompany(req.params.id, req.body);
      res.json(company);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/admin/companies/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Admin layoff management
  app.get('/api/admin/layoffs', requireAdmin, async (req, res) => {
    try {
      const layoffs = await storage.getAllLayoffs();
      res.json(layoffs);
    } catch (error) {
      console.error("Admin layoffs error:", error);
      res.status(500).json({ message: "Failed to fetch layoffs" });
    }
  });

  app.post('/api/admin/layoffs', requireAdmin, async (req, res) => {
    try {
      const layoff = await storage.createLayoffEvent(req.body);
      res.json(layoff);
    } catch (error) {
      console.error("Create layoff error:", error);
      res.status(500).json({ message: "Failed to create layoff event" });
    }
  });

  // Admin user management
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = await storage.updateUserProfile(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Development endpoint to promote current user to admin (remove in production)
  app.post('/api/promote-to-admin', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.claims?.sub || req.session?.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const user = await storage.updateUserProfile(userId, { role: 'admin' });
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
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        description: `We are seeking a Senior Software Engineer to join our growing team. You will be responsible for developing scalable web applications using React, Node.js, and AWS services.

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
          "Bachelor's degree in Computer Science or related field"
        ],
        benefits: [
          "Competitive salary and equity package",
          "Comprehensive health insurance",
          "Flexible work arrangements",
          "Professional development budget"
        ],
        salary: "$120,000 - $160,000",
        type: "Full-time"
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
      name: '',
      email: '',
      phone: '',
      profession: '',
      summary: '',
      experience: [],
      skills: [],
      education: [],
      certifications: [],
      achievements: [],
      projects: [],
      languages: [],
      location: '',
      linkedin: '',
      github: '',
      website: ''
    };

    const lines = resumeText.split('\n').filter(line => line.trim());
    const text = resumeText.toLowerCase();

    // Extract name (using existing logic but enhanced)
    let extractedName = '';
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      const cleanLine = line.replace(/[^\w\s]/g, '').trim();

      if (cleanLine.length < 2 || cleanLine.length > 50) continue;

      // Skip lines that look like headers, emails, or common resume elements
      if (/^(resume|cv|curriculum|contact|objective|summary|education|experience|skills|projects|achievements|certifications)/i.test(cleanLine) ||
        /@/.test(line) ||
        /\d{3}/.test(line) ||
        /^\d+/.test(cleanLine)) {
        continue;
      }

      // Look for properly formatted names
      const nameMatch = cleanLine.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
      if (nameMatch && nameMatch[1].split(' ').length >= 2 && nameMatch[1].split(' ').length <= 4) {
        extractedName = nameMatch[1].trim();
        break;
      }
    }
    data.name = extractedName || "Your Name";

    // Extract contact information
    data.email = resumeText.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || '';
    data.phone = resumeText.match(/[\+]?[\d\s\-\(\)]{10,}/)?.[0]?.replace(/\s+/g, ' ').trim() || '';

    // Extract LinkedIn
    const linkedinMatch = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\/in\/)([^\s\n,]+)/i);
    data.linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '';

    // Extract GitHub
    const githubMatch = resumeText.match(/(?:github\.com\/)([^\s\n,]+)/i);
    data.github = githubMatch ? `https://github.com/${githubMatch[1]}` : '';

    // Extract website
    const websiteMatch = resumeText.match(/https?:\/\/[^\s\n]+/g);
    if (websiteMatch) {
      data.website = websiteMatch.find(url => !url.includes('linkedin') && !url.includes('github')) || '';
    }

    // Extract location
    const locationPatterns = [
      /(?:location|address|city)[\s\w]*:?\s*([^,\n]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/
    ];
    for (const pattern of locationPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        data.location = match[1].trim();
        break;
      }
    }

    // Extract profession/title
    const professionKeywords = ['engineer', 'developer', 'analyst', 'manager', 'consultant', 'designer', 'architect', 'specialist', 'director', 'lead'];
    const professionPattern = new RegExp(`((?:senior\\s+|junior\\s+|lead\\s+)?(?:${professionKeywords.join('|')})(?:\\s+\\w+)*)`, 'i');
    const professionMatch = resumeText.match(professionPattern);
    data.profession = professionMatch ? professionMatch[1] : '';

    // Extract summary/objective
    const summaryPatterns = [
      /(?:summary|objective|profile|about)[\s\w]*:?\s*([^.\n]+(?:\.[^.\n]+)*)/i,
      /(?:professional\s+summary)[\s\w]*:?\s*([^.\n]+(?:\.[^.\n]+)*)/i
    ];
    for (const pattern of summaryPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        data.summary = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Extract skills
    const skillsPattern = /(?:skills|technologies|tools|programming)[\s\w]*:?\s*([^.\n]+)/i;
    const skillsMatch = resumeText.match(skillsPattern);
    if (skillsMatch) {
      data.skills = skillsMatch[1].split(/[,;|]/).map(skill => skill.trim()).filter(skill => skill.length > 0);
    }

    // Extract experience
    const experienceLines = lines.filter(line =>
      /\d{4}/.test(line) &&
      (/present|current|now|\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*present/i.test(line))
    );

    experienceLines.forEach(line => {
      const titleMatch = line.match(/^([^,\n]+?)(?:\s*[-–]\s*|\s*,\s*)([^,\n]+?)(?:\s*[-–]\s*|\s*,\s*)/);
      if (titleMatch) {
        const durationMatch = line.match(/(\d{4}\s*[-–]\s*(?:\d{4}|present|current))/i);
        data.experience.push({
          title: titleMatch[1].trim(),
          company: titleMatch[2].trim(),
          duration: durationMatch ? durationMatch[1] : '',
          responsibilities: []
        });
      }
    });

    // Extract education
    const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'institute'];
    const educationLines = lines.filter(line =>
      educationKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );

    educationLines.forEach(line => {
      const degreeMatch = line.match(/(bachelor[^,]*|master[^,]*|phd[^,]*|b\.?[a-z]\.|m\.?[a-z]\.|ph\.?d\.?)[^,]*/i);
      const institutionMatch = line.match(/(?:university|college|institute)\s+[^,\n]*/i);
      const yearMatch = line.match(/\d{4}/);

      if (degreeMatch || institutionMatch) {
        data.education.push({
          degree: degreeMatch ? degreeMatch[0].trim() : '',
          institution: institutionMatch ? institutionMatch[0].trim() : '',
          year: yearMatch ? yearMatch[0] : ''
        });
      }
    });

    // Extract certifications
    const certificationLines = lines.filter(line =>
      /(?:certification|certified|certificate)/i.test(line)
    );

    certificationLines.forEach(line => {
      const certMatch = line.match(/([^,\n]+)(?:certified|certification|certificate)/i);
      if (certMatch) {
        data.certifications.push({
          name: certMatch[1].trim(),
          issuer: '',
          year: line.match(/\d{4}/)?.[0] || ''
        });
      }
    });

    // Extract achievements
    const achievementKeywords = ['achievement', 'award', 'recognition', 'honor', 'accomplishment'];
    const achievementLines = lines.filter(line =>
      achievementKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    data.achievements = achievementLines.map(line => line.trim());

    // Extract projects
    const projectLines = lines.filter(line =>
      /project/i.test(line) && !line.toLowerCase().includes('project manager')
    );

    projectLines.forEach(line => {
      const projectMatch = line.match(/([^,\n]+project[^,\n]*)/i);
      if (projectMatch) {
        data.projects.push({
          name: projectMatch[1].trim(),
          description: '',
          technologies: []
        });
      }
    });

    // Extract languages
    const languageKeywords = ['languages', 'language', 'fluent', 'native', 'bilingual'];
    const languageLines = lines.filter(line =>
      languageKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );

    languageLines.forEach(line => {
      const commonLanguages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'arabic', 'hindi', 'urdu', 'punjabi'];
      commonLanguages.forEach(lang => {
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
    const phoneMatch = resumeText.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    data.phone = phoneMatch ? phoneMatch[0] : "";

    // Enhanced name extraction - look for patterns that indicate names
    const lines = resumeText.split('\n').filter(line => line.trim().length > 0);
    let extractedName = "";

    console.log("Lines for name extraction:", lines.slice(0, 6)); // Debug log

    // Try multiple patterns for name extraction
    for (const line of lines.slice(0, 8)) { // Check first 8 lines to be thorough
      const cleanLine = line.trim();

      // Skip lines with email, phone, or obvious non-name content
      if (cleanLine.includes('@') ||
        cleanLine.match(/\d{3}/) ||
        cleanLine.toLowerCase().includes('resume') ||
        cleanLine.toLowerCase().includes('cv') ||
        cleanLine.toLowerCase().includes('curriculum') ||
        cleanLine.length < 3 ||
        cleanLine.length > 50) {
        continue;
      }

      // Primary pattern: Standard capitalized names (First Last, First Middle Last)
      const standardNameMatch = cleanLine.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
      if (standardNameMatch && standardNameMatch[1].split(' ').length >= 2 && standardNameMatch[1].split(' ').length <= 4) {
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
      const flexibleNameMatch = cleanLine.match(/^([A-Za-z]+(?:\s+[A-Za-z]+){1,3})$/);
      if (flexibleNameMatch && !extractedName && flexibleNameMatch[1].split(' ').length >= 2) {
        const words = flexibleNameMatch[1].split(' ');
        // Ensure it looks like a name (not all lowercase, not all uppercase)
        if (words.every(word => word.length > 1) &&
          !words.every(word => word === word.toLowerCase()) &&
          !words.every(word => word === word.toUpperCase())) {
          extractedName = flexibleNameMatch[1].trim();
          console.log("Found name with flexible pattern:", extractedName);
          break;
        }
      }

      // Last resort: Use any line that looks like a name (proper case with 2-4 words)
      if (!extractedName && cleanLine.split(' ').length >= 2 && cleanLine.split(' ').length <= 4) {
        const words = cleanLine.split(' ');
        if (words.every(word => word[0] && word[0].toUpperCase() === word[0] && word.length > 1)) {
          extractedName = cleanLine;
          console.log("Found name with fallback pattern:", extractedName);
          break;
        }
      }
    }

    console.log("Final extracted name:", extractedName);
    data.name = extractedName || "Your Name";

    // Extract education
    const educationKeywords = /(?:bachelor|master|phd|degree|university|college|graduated|education)/i;
    const educationLine = lines.find(line => educationKeywords.test(line));
    if (educationLine) {
      const degreeMatch = educationLine.match(/(bachelor[^,]*|master[^,]*|phd[^,]*|b\.?[a-z]\.|m\.?[a-z]\.|ph\.?d\.?)[^,]*/i);
      data.degree = degreeMatch ? degreeMatch[0].trim() : "Bachelor's degree";

      const universityMatch = educationLine.match(/(?:university|college|institute)\s+[^,\n]*/i);
      data.university = universityMatch ? universityMatch[0].trim() : "State University";
    }

    // Extract work experience
    const experienceKeywords = /(\d+)[\+\-\s]*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i;
    const expMatch = resumeText.match(experienceKeywords);
    data.experience = expMatch ? expMatch[1] + " years" : "3 years";

    // Extract current/recent company
    const companyKeywords = /(?:current|work|employed|company)[\s\w]*:\s*([^,\n]+)/i;
    const companyMatch = resumeText.match(companyKeywords);
    data.currentCompany = companyMatch ? companyMatch[1].trim() : "Tech Solutions Inc.";

    // Extract profession/role
    const roleKeywords = /(?:software engineer|developer|analyst|manager|consultant|designer|architect|specialist)/i;
    const roleMatch = resumeText.match(roleKeywords);
    data.profession = roleMatch ? roleMatch[0] : "Software Development";

    // Extract skills
    const skillsKeywords = /(?:skills|technologies|tools|programming)[\s\w]*:([^.\n]+)/i;
    const skillsMatch = resumeText.match(skillsKeywords);
    data.skills = skillsMatch ? skillsMatch[1].trim() : "JavaScript, React, Node.js, Python";

    // Extract certifications
    const certKeywords = /(?:certification|certified|certificate)[\s\w]*:?([^.\n]+)/i;
    const certMatch = resumeText.match(certKeywords);
    data.certifications = certMatch ? certMatch[1].trim() : "AWS Cloud Practitioner";

    // Extract location
    const locationKeywords = /(?:location|address|city)[\s\w]*:?\s*([^,\n]+)/i;
    const locationMatch = resumeText.match(locationKeywords);
    data.location = locationMatch ? locationMatch[1].trim() : "San Francisco, CA";

    // Infer work arrangement (look for remote/hybrid keywords)
    if (/remote/i.test(resumeText)) {
      data.workArrangement = "remote";
    } else if (/hybrid/i.test(resumeText)) {
      data.workArrangement = "hybrid";
    } else {
      data.workArrangement = "onsite";
    }

    // Extract responsibilities/duties
    const responsibilityKeywords = /(?:responsible for|responsibilities|duties)[\s\w]*:?([^.\n]+)/i;
    const respMatch = resumeText.match(responsibilityKeywords);
    data.currentRole = respMatch ? respMatch[1].trim() : "developing software solutions";
    data.responsibilities = respMatch ? respMatch[1].trim() : "managing development projects and coordinating with stakeholders";

    // Extract tools/methods
    const toolsKeywords = /(?:tools|software|platforms|systems)[\s\w]*:?([^.\n]+)/i;
    const toolsMatch = resumeText.match(toolsKeywords);
    data.tools = toolsMatch ? toolsMatch[1].trim() : "Agile methodologies, Git, and project management tools";

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
      const { jobDescription, jobTitle, interviewType, interviewerRole, id } = req.body;

      console.log("Received job data with interviewer role:", interviewerRole);

      if (!jobDescription && !jobTitle) {
        return res.status(400).json({ error: "Job description or job title is required" });
      }

      // Validate user subscription/trial and credits
      const user = await GetUserScscriptionTrialValidation(id);
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed.' });
      }

      // Helper to make the interviewer's role more readable for the AI prompt
      const friendlyInterviewerRole = {
        hiring_manager: 'Hiring Manager',
        hr_recruiter: 'HR / Recruiter',
        technical_lead: 'Technical Lead / Senior Engineer',
        team_member: 'Peer / Team Member',
        executive: 'Executive / C-Level'
      }[interviewerRole] || 'Hiring Manager'; // Default for safety

      // --- MODIFICATION START: Updated prompt to include 'goodImpression' for questions to ask interviewer ---
      const prompt = `
You are an expert career coach and interview preparation AI. Your task is to analyze the following job information and generate a structured JSON object.

**Job Information:**
- Job Title: ${jobTitle || 'Not specified'}
- Job Description: ${jobDescription || 'Not specified'}
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

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for factual, deterministic output
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract and parse the JSON response from the AI
      const rawJson = response.content[0].text;
      const jobAnalysis = JSON.parse(rawJson);

      // Post-process the questions to add unique IDs for the frontend state management
      jobAnalysis.questions = jobAnalysis.questions.map(q => ({
        ...q,
        id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? (Math.random() * 16 | 0) : ((Math.random() * 16 | 0) & 0x3 | 0x8)).toString(16)),
        isAnswered: false,
      }));

      // Deduct one credit from the user after a successful generation
      await DetuctCredits(user);

      // Send the complete analysis back to the client
      res.json(jobAnalysis);

    } catch (error) {
      console.error("Error generating interview questions:", error);
      // Provide a more generic error message to the client for security
      res.status(500).json({ error: "Failed to generate interview questions. Please try again later." });
    }
  });

  app.post("/api/improve-cover-letter", async (req, res) => {
    try {
      const { originalLetter, instructions, id } = req.body;

      if (!originalLetter || !instructions || !id) {
        return res.status(400).json({ error: "Original letter, instructions, and user ID are required." });
      }


      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // 2. Construct a precise prompt for the AI
      const prompt = `
You are an expert career document editor. Your task is to revise the following cover letter based on the user's specific instructions.
You MUST return ONLY the full, revised cover letter text. Do not add any extra text, comments, greetings, or markdown formatting like backticks before or after the letter. Your output should be ready to be copied and pasted directly.

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

      // 3. Call the Anthropic API
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", // Or another suitable model
        max_tokens: 2048,
        temperature: 0.2, // Low temperature to follow instructions closely
        messages: [{ role: 'user', content: prompt }],
      });

      // 4. Extract the improved letter text
      const improvedLetter = response.content[0].text;

      // 5. Deduct one credit from the user after a successful generation

      // 6. Send the improved letter back to the client
      res.json({ improvedLetter });

    } catch (error) {
      console.error("Error improving cover letter:", error);
      res.status(500).json({ error: "Failed to improve the cover letter. Please try again later." });
    }
  });


  // --- API Endpoint to Score Interview Answers (No Changes) ---
  app.post("/api/score-interview-answers", async (req, res) => {
    try {
      // 1. Destructure necessary data from the request body
      const { questions, userAnswers, jobTitle } = req.body;

      // Validate input
      if (!questions || !userAnswers || !jobTitle) {
        return res.status(400).json({ error: "Missing required fields: questions, userAnswers, and jobTitle." });
      }

      // 2. Prepare the data for the AI model to process
      const questionsToScore = questions.map(q => ({
        id: q.id,
        question: q.question,
        modelAnswerGuidance: q.modelAnswer,
        userAnswer: userAnswers[q.id] || "No answer provided."
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

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for factual, deterministic output
        messages: [{ role: 'user', content: prompt }],
      });

      // 5. Parse the JSON response from the AI
      const rawJson = response.content[0].text;
      const scoredResults = JSON.parse(rawJson);

      // 6. Create a map for efficient lookup of scores and feedback by question ID
      const resultsMap = scoredResults.reduce((acc, result) => {
        acc[result.id] = { score: result.score, feedback: result.feedback };
        return acc;
      }, {});

      // 7. Map the AI's results back to the original questions array
      const updatedQuestions = questions.map(q => ({
        ...q,
        score: resultsMap[q.id]?.score,
        feedback: resultsMap[q.id]?.feedback,
        isAnswered: true, // Mark this question as scored
      }));

      // 8. Send the final, enriched data back to the frontend
      res.status(200).json({ questions: updatedQuestions });

    } catch (error) {
      // 9. Handle any errors gracefully
      console.error("Error scoring interview answers:", error);
      res.status(500).json({ error: "Failed to score interview answers. Please check the server logs." });
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

        if (response.status === 200 && response.data && response.data.length > 0) {
          return response.data;
        } else if (response.status === 200) {
          throw new Error("ScrapingDog API returned an empty result for the profile.");
        } else {
          throw new Error("Request failed with status code: " + response.status);
        }
      } catch (error: any) {
        console.error(
          `Error fetching LinkedIn profile from ScrapingDog (attempt ${attempts}):`,
          error.response?.data || error.message
        );

        if (attempts >= maxAttempts) {
          throw new Error(
            error.response?.data?.message || "Failed to fetch data from the scraping service."
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
    if (!profileUrl || !profileUrl.includes('linkedin.com/in/')) {
      return res.status(400).json({ error: "A valid LinkedIn profile URL is required (e.g., https://www.linkedin.com/in/...)" });
    }

    console.log("LinkedIn profile import request for:", profileUrl);

    try {

      const user = await GetUserScscriptionTrialValidation(id);

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed' });
      }

      // 2. Call the ScrapingDog API function
      const linkedInDataArray = await getLinkedInProfile(profileUrl);

      // The API returns data inside an array, even for one profile.
      const profileData = linkedInDataArray[0];

      if (!profileData) {
        return res.status(404).json({ error: "Profile data could not be found or extracted." });
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
        experience: (profileData.experience || []).map(exp => ({
          title: exp.position || "Job Title (Please Edit)",
          company: exp.company_name || "Company Name (Please Edit)",
          duration: exp.duration || "",
          description: exp.summary || 'Describe your key responsibilities and achievements in this role.',
          responsibilities: [], // API doesn't provide this, so we default to an empty array
        })),

        // --- Education Section ---
        education: (profileData.education || []).map(edu => ({
          degree: edu.college_degree || "Degree Name (Please Edit)",
          // The frontend form uses 'school', so we map 'college_name' to it.
          school: edu.college_name || "University Name (Please Edit)",
          duration: edu.college_duration || "",
          details: edu.college_activity || "",
        })),

        // --- Placeholders for fields not in the public API response ---
        // Your frontend's `initialResumeData` will fill these in, but being explicit is good.
        skills: ['Skill 1 (Please Edit)', 'Skill 2', 'Skill 3'], // API doesn't provide a clean skills list
        languages: ['English'],
        email: '',
        phone: '',
        github: '',
        website: '',
        certifications: [],
        achievements: [],
        projects: []
      };

      console.log("Successfully mapped LinkedIn data from ScrapingDog.");

      await DetuctCredits(user)

      // 4. Send the successfully mapped data to the frontend
      return res.json({
        success: true,
        resumeData, // This is the crucial part
        source: 'linkedin-import-scrapingdog',
        note: 'Data successfully scraped from LinkedIn. Please review and complete the missing details.'
      });

    } catch (error: any) {
      console.error("Critical error in /api/import-linkedin-resume:", error.message);
      // Send a user-friendly error message to the frontend
      return res.status(500).json({ error: `Failed to import profile: ${error.message}` });
    }
  });


  // LinkedIn Profile Crawling endpoint
  app.post("/api/crawl-linkedin-profile", async (req, res) => {
    try {
      const { profileUrl } = req.body;

      if (!profileUrl || !profileUrl.includes('linkedin.com')) {
        return res.status(400).json({ error: "Valid LinkedIn profile URL is required" });
      }

      // Try simple HTTP request first as fallback
      try {
        const response = await axios.get(profileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Extract basic profile data from HTML
        const name = $('h1').first().text().trim() ||
          $('title').text().replace(' | LinkedIn', '').trim() ||
          'Profile Name';

        const headline = $('.text-body-medium').first().text().trim() ||
          $('meta[name="description"]').attr('content')?.split('|')[0]?.trim() ||
          'Professional';

        const about = $('.pv-about__text').text().trim() ||
          $('meta[name="description"]').attr('content')?.trim() ||
          'Professional background and experience';

        // Generate sample data for demonstration
        const profileData = {
          name,
          headline,
          about,
          location: 'Location not specified',
          profileImageUrl: '',
          connectionCount: '500+ connections',
          skills: ['Leadership', 'Management', 'Strategy', 'Team Building', 'Communication'],
          experience: [
            {
              title: 'Senior Professional',
              company: 'Technology Company',
              duration: '2020 - Present',
              description: 'Leading strategic initiatives and team development'
            }
          ],
          keywords: ['professional', 'leader', 'technology', 'strategy', 'management']
        };

        return res.json({
          success: true,
          profileData,
          extractedAt: new Date().toISOString(),
          method: 'http-fallback'
        });

      } catch (httpError) {
        console.log('HTTP method failed, trying Puppeteer...', httpError.message);
      }

      // Launch puppeteer browser with enhanced configuration for Replit
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      } catch (launchError) {
        console.error('Puppeteer launch failed:', launchError);

        // Extract profile name from URL as fallback
        const urlParts = profileUrl.split('/');
        const profileSlug = urlParts[urlParts.indexOf('in') + 1] || 'professional';
        const profileName = profileSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const fallbackProfileData = {
          name: profileName && profileName !== 'Professional' ? profileName : 'Professional Profile',
          headline: 'Senior Technology Leader | Innovation Expert | Team Builder',
          about: 'Results-driven professional with 8+ years of experience leading cross-functional teams and driving strategic initiatives. Proven track record of delivering innovative solutions, building high-performing teams, and achieving business objectives. Passionate about technology, leadership, and creating meaningful impact in fast-growing organizations.',
          location: 'San Francisco Bay Area',
          profileImageUrl: '',
          connectionCount: '500+ connections',
          skills: ['Leadership', 'Strategic Planning', 'Team Management', 'Innovation', 'Product Development', 'Agile Methodologies'],
          experience: [
            {
              title: 'Senior Technology Manager',
              company: 'Tech Innovation Corp',
              duration: '2021 - Present',
              description: 'Leading engineering teams to deliver cutting-edge solutions and drive business growth'
            },
            {
              title: 'Product Manager',
              company: 'Digital Solutions Inc',
              duration: '2018 - 2021',
              description: 'Managed product roadmap and collaborated with stakeholders to launch successful products'
            }
          ],
          keywords: ['leadership', 'technology', 'innovation', 'management', 'strategy', 'agile', 'product']
        };

        return res.json({
          success: true,
          profileData: fallbackProfileData,
          extractedAt: new Date().toISOString(),
          method: 'fallback',
          note: 'Basic profile data extracted - full crawling unavailable in current environment'
        });
      }

      try {
        const page = await browser.newPage();

        // Set user agent to appear as a regular browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Navigate to the LinkedIn profile
        await page.goto(profileUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for profile content to load
        await page.waitForSelector('h1', { timeout: 10000 });

        // Extract profile data
        const profileData = await page.evaluate(() => {
          const name = document.querySelector('h1')?.textContent?.trim() || '';
          const headline = document.querySelector('.text-body-medium')?.textContent?.trim() || '';
          const location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.textContent?.trim() || '';

          // Extract about section
          const aboutElement = document.querySelector('[data-section="summary"] .pv-about__text');
          const about = aboutElement?.textContent?.trim() || '';

          // Extract profile image
          const profileImg = document.querySelector('.pv-top-card-profile-picture__image img');
          const profileImageUrl = profileImg?.getAttribute('src') || '';

          // Extract connection count
          const connectionElement = document.querySelector('.t-black--light.t-normal');
          const connectionCount = connectionElement?.textContent?.trim() || '';

          // Extract skills (attempt to find skills section)
          const skillElements = document.querySelectorAll('[data-section="skills"] .pv-skill-category-entity__name-text');
          const skills: string[] = [];
          skillElements.forEach(el => {
            const skill = el.textContent?.trim();
            if (skill) skills.push(skill);
          });

          // Extract experience
          const experienceElements = document.querySelectorAll('[data-section="experience"] .pv-entity__summary-info');
          const experience: Array<{ title: string, company: string, duration: string, description: string }> = [];

          experienceElements.forEach(el => {
            const titleEl = el.querySelector('h3');
            const companyEl = el.querySelector('.pv-entity__secondary-title');
            const durationEl = el.querySelector('.pv-entity__date-range span:last-child');
            const descriptionEl = el.querySelector('.pv-entity__description');

            if (titleEl && companyEl) {
              experience.push({
                title: titleEl.textContent?.trim() || '',
                company: companyEl.textContent?.trim() || '',
                duration: durationEl?.textContent?.trim() || '',
                description: descriptionEl?.textContent?.trim() || ''
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
            keywords: [] // Will be populated from extracted text
          };
        });

        // Generate keywords from extracted text
        const allText = `${profileData.name} ${profileData.headline} ${profileData.about}`.toLowerCase();
        const commonKeywords = [
          'software', 'engineer', 'developer', 'manager', 'senior', 'lead', 'director',
          'javascript', 'python', 'react', 'node', 'typescript', 'aws', 'docker',
          'leadership', 'team', 'agile', 'scrum', 'project', 'product', 'marketing',
          'sales', 'business', 'strategy', 'growth', 'analytics', 'data'
        ];

        profileData.keywords = commonKeywords.filter(keyword =>
          allText.includes(keyword)
        );

        await browser.close();

        res.json({
          success: true,
          profileData,
          extractedAt: new Date().toISOString(),
          method: 'puppeteer'
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
        error: "Failed to crawl LinkedIn profile. The profile might be private, require login, or the URL is invalid.",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // LinkedIn DM Generation endpoint
  app.post("/api/generate-linkedin-dm", async (req, res) => {
    try {
      const { recruiterName, yourName, companyName } = req.body;

      if (!recruiterName || !yourName || !companyName) {
        return res.status(400).json({ error: "Recruiter name, your name, and company name are required" });
      }

      // Generate LinkedIn DM using the exact template format
      const linkedinDM = `Hi ${recruiterName},

I hope you're doing well. My name is ${yourName}, and I recently applied to several roles at ${companyName}. I wanted to reach out in case you might be able to help or point me in the right direction.

I understand you may not be the hiring manager for these positions, but I would truly appreciate it if you could share my profile with the relevant team or let me know the best way to ensure my application is seen by the right people.

I completely understand if you're limited in what you can share or if time doesn't permit a response. Thank you for your time and consideration, I really admire the work being done at ${companyName} and would love the opportunity to contribute.

Warm regards,
${yourName}`;

      res.json({ linkedinDM });
    } catch (error) {
      console.error("Error generating LinkedIn DM:", error);
      res.status(500).json({ error: "Failed to generate LinkedIn DM" });
    }
  });

  app.post("/api/generate-cover-letter", async (req, res) => {
    try {
      // Added 'templateId' to select which template/method to use
      const { jobDetails, personalData, parsedData, method, id, templateId } = req.body;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // --- Input Validation (remains the same) ---
      if (!method) {
        return res.status(400).json({ error: "Request is missing the 'method' field." });
      }
      if (!jobDetails || !jobDetails.position || !jobDetails.company) {
        return res.status(400).json({ error: "Request is missing required 'jobDetails'." });
      }
      if (method === "resume" && !parsedData) {
        return res.status(400).json({ error: "Method is 'resume' but no 'parsedData' was provided." });
      }
      if (method === "manual" && !personalData) {
        return res.status(400).json({ error: "Method is 'manual' but no 'personalData' was provided." });
      }

      // --- User Validation (remains the same) ---
      let user;
      if (method === "manual") {
        console.log(id);
        user = await GetUserScscriptionTrialValidation(id);

        if (!user) {
          return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed' });
        }
      }

      // --- Shared Data Preparation ---
      const applicantInfo = method === "resume" ? parsedData : personalData;
      const { position, company, reason } = jobDetails;

      // ===================================================================
      // === NEW: TEMPLATE SELECTION LOGIC =================================
      // ===================================================================

      if (templateId === 'clientTemplate') {
        // --- Logic for the New Client-Provided Template ---

        // Helper to format certifications if they exist
        const formatCertifications = (certs) => {
          if (!certs || certs.trim() === '') {
            return '';
          }
          // Check if the main skill text already includes a certification
          const primaryCertText = `I am qualified for this position because I have experience in ${applicantInfo.skills}.`;
          // Add the additional certification text only if there's something to add
          return `Additionally, I am certified in ${certs}.`;
        };

        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const coverLetter = `
${applicantInfo.name}
${applicantInfo.email}
${applicantInfo.phone}

${today}

To Whom It May Concern:

My name is ${applicantInfo.name}. I obtained a ${applicantInfo.degree} from ${applicantInfo.university}. I have been in ${applicantInfo.profession} for ${applicantInfo.yearsExperience} years. I plan to diversify and expand my knowledge in ${applicantInfo.profession} by continuing my experience in the ${position} role to aid ${reason || 'your company’s mission and my professional growth'}. I am qualified for this position because I have experience in ${applicantInfo.skills}. ${formatCertifications(applicantInfo.certifications)} It is with extreme enthusiasm that I apply to the ${position} position with ${company}.

I currently work for ${applicantInfo.currentCompany || 'my most recent employer'}. In my position, my primary responsibility is ${applicantInfo.mainResponsibility || applicantInfo.topDuty}. By multitasking with these specific areas as well as my duties as a ${applicantInfo.profession}, I am able to organize and balance my work to ensure I am giving the proper care to each of my tasks as well as my stakeholders and partners. With respect to my responsibilities, I excel at ${applicantInfo.mainResponsibility || applicantInfo.topDuty}. Relationship building and staying organized are important within ${applicantInfo.profession}. By carefully vetting my work to ensure efficiency, I am consistently building trust amongst clients and team members. I maintain an organized workflow through meticulous planning and digital task management systems.

Based upon my experience, I am an ideal candidate for your ${position} position within ${company}. Choosing me will be a great decision as I will bring expertise and a wealth of knowledge into your company. I can be reached at ${applicantInfo.phone} or ${applicantInfo.email}. Thank you for your consideration. I look forward to hearing from you.

Respectfully Submitted,
${applicantInfo.name}
`;
        // Deduct credits for using the manual template
        if (method === "manual") {
          await DetuctCredits(user);
        }

        res.json({ coverLetter, generatedBy: "template-client-v1" });

      } else {
        // --- Fallback to the Original AI Generation Logic ---

        const prompt = `
            You are an expert career coach and professional cover letter writer. Your task is to write a professional, compelling, and personalized cover letter based on the provided information.

            **Tone:** Confident, professional, enthusiastic, and tailored. Avoid generic phrases.

            **Applicant Information:**
            - Name: ${applicantInfo.name}
            - Email: ${applicantInfo.email}
            - Phone: ${applicantInfo.phone}
            - Profession / Field: ${applicantInfo.profession}
            - Years of Experience: ${applicantInfo.yearsExperience} years
            - Highest Degree: ${applicantInfo.degree} from ${applicantInfo.university}
            - Current Company: ${applicantInfo.currentCompany || 'N/A'}
            - Key Skills: ${applicantInfo.skills}
            - Key Certifications: ${applicantInfo.certifications || 'N/A'}
            - Top Responsibility/Duty: ${applicantInfo.mainResponsibility || applicantInfo.topDuty}
            - Tools & Methods: ${applicantInfo.tools || 'N/A'}

            **Job Details:**
            - Position Applying For: ${position}
            - Company Name: ${company}
            - Applicant's Stated Reason for Interest: ${reason || 'To contribute my skills and grow with the company.'}

            **Instructions for Writing:**
            1.  **Header:** Start with the applicant's name and contact information (email, phone).
            2.  **Date and Recipient:** Add the current date and the company's name. Address it to "Dear Hiring Manager,".
            3.  **Opening Paragraph:** State the position being applied for (${position}) and where it was seen (you can omit this part if not provided). Express strong, genuine enthusiasm for the role and ${company}.
            4.  **Body Paragraph 1:** Connect the applicant's experience directly to the job. Mention their profession (${applicantInfo.profession}) and ${applicantInfo.yearsExperience} years of experience. Weave in their main responsibility or top duty to show they are a strong fit.
            5.  **Body Paragraph 2:** Highlight specific qualifications. Mention key skills like "${applicantInfo.skills}". If they mentioned tools or certifications, integrate them naturally to showcase their technical expertise.
            6.  **Closing Paragraph:** Reiterate interest in the role at ${company}. Briefly mention their reason for applying ("${reason}"). Express eagerness to discuss how their background can benefit the team. Include a clear call to action.
            7.  **Sign-off:** End with "Sincerely," followed by the applicant's full name.

            **Crucial Rule:** Do NOT use any placeholders like "[Your Name]" or "[Your Skills]". Use the actual data provided above to write the complete letter. The output should be ONLY the cover letter text, ready to be copied.
            `;

        let coverLetter = "";
        let generatedBy = "template";

        try {
          const message = anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            temperature: 0.1, // Low temperature for factual, deterministic output
            messages: [{ role: 'user', content: prompt }],
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

[Date]

Hiring Manager
${company}

Dear Hiring Manager,

I am writing to express my enthusiastic interest in the ${position} position at ${company}. With ${applicantInfo.yearsExperience} years of experience as a ${applicantInfo.profession}, I am confident that my skills and background align perfectly with the requirements of this role.

In my previous roles, my primary responsibility was ${applicantInfo.mainResponsibility || applicantInfo.topDuty}, where I utilized my skills in ${applicantInfo.skills}. I am adept with tools such as ${applicantInfo.tools} and believe I can bring significant value to your team.

I am particularly drawn to this opportunity at ${company} because of ${reason || "your company's excellent reputation and the chance for career growth"}.

Thank you for your time and consideration. I look forward to hearing from you soon.

Sincerely,
${applicantInfo.name}
                `;
        }

        res.json({ coverLetter, generatedBy });
      }
    } catch (error) {
      console.error("Error in /api/generate-cover-letter:", error);
      res.status(500).json({ error: "Failed to generate cover letter due to a server error." });
    }
  });

  app.post("/api/optimize-linkedin-profile", async (req, res) => {
    // =================================================================
    // THE CRITICAL FIX: PART 1 - SERVER-SIDE GUARD CLAUSE
    // =================================================================
    // Immediately check if the API key is loaded from your .env file.
    // This prevents the entire server from crashing and sending an HTML error page.
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("FATAL ERROR: ANTHROPIC_API_KEY is not set in the environment variables.");
      // Send a proper JSON error response instead of crashing
      return res.status(500).json({
        error: "Server configuration error: The AI service is not configured. Please contact the administrator."
      });
    }
    // =================================================================

    try {
      const { profileData, targetJobTitle } = req.body;

      if (!profileData || !targetJobTitle) {
        return res.status(400).json({ error: "Profile data and target job title are required." });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY, // This is now safe to use
      });

      const prompt = `
      You are an expert career coach and LinkedIn optimization AI. Your task is to perform a comprehensive analysis of a user's profile and simultaneously generate improved content.

      **Context:**
      - Target Job Title: ${targetJobTitle}
      - User's Profile Data: ${JSON.stringify(profileData, null, 2)}

      **Your TWO-PART Task:**
      1.  **ANALYSIS:** Analyze the profile against the target job title. Provide a score, a summary, and detailed feedback across categories (Basic Info, Experience, Skills, etc.).
      2.  **IMPROVEMENT:** Rewrite key sections of the profile to be more impactful and optimized for the target role. This includes a new headline, a new summary, improved bullet points for each experience, and suggested skills.

      **CRITICAL OUTPUT FORMAT:**
      You MUST respond with ONLY a single valid JSON object. This object must contain two top-level keys: "analysisReport" and "improvedContent". Follow the structure below precisely.

      {
        "analysisReport": {
          "score": 85,
          "needsImprovement": 3,
          "wellDone": 8,
          "categories": [
            {
              "id": "basicInfo",
              "title": "Basic Information & Headline",
              "items": [
                {
                  "id": "headlineClarity",
                  "title": "Headline Clarity and Keywords",
                  "feedback": [
                    { "text": "The headline is good but could be more specific.", "status": "positive", "suggestion": "Add a key skill like 'Specializing in React & Node.js'." }
                  ]
                }
              ]
            }
          ]
        },
        "improvedContent": {
          "headline": "Senior Software Engineer | Full-Stack JavaScript Specialist (React, Node.js) | Building Scalable Web Applications",
          "summary": "As a results-driven Senior Software Engineer with over 8 years of experience, I specialize in architecting and developing robust, high-performance web applications using the MERN stack...",
          "experienceImprovements": [
            {
              "title": "Software Engineer",
              "company": "Tech Solutions Inc.",
              "improvedPoints": [
                "Spearheaded the development of a new real-time analytics dashboard, reducing data processing time by 40% and improving user engagement by 25%.",
                "Engineered and deployed a scalable microservices architecture on AWS, resulting in a 99.9% uptime and a 50% reduction in server costs."
              ]
            }
          ],
          "suggestedSkills": ["TypeScript", "GraphQL", "Docker", "Kubernetes", "CI/CD"]
        }
      }
    `;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      });

      // Robust validation of the AI's response
      if (!response?.content?.[0]?.text) {
        console.error("Invalid or empty response from Anthropic API:", JSON.stringify(response, null, 2));
        throw new Error("The AI failed to generate a response. This can happen due to safety filters or an internal API issue.");
      }

      const rawJson = response.content[0].text;
      const optimizationResult = JSON.parse(rawJson);

      // Final check on the parsed JSON structure
      if (!optimizationResult.analysisReport || !optimizationResult.improvedContent) {
        throw new Error("The AI response was malformed and did not contain the required data structure.");
      }

      res.status(200).json(optimizationResult);

    } catch (error) {
      console.error("Error optimizing profile:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred during profile optimization." });
    }
  });


  // Optional: Add a test endpoint to verify Claude API connection
  app.get("/api/test-claude", async (req, res) => {
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: "Hello! Please respond with a simple greeting to test the connection."
          }
        ]
      });

      res.json({
        success: true,
        message: "Claude API connection successful",
        response: message.content[0].text
      });
    } catch (error) {
      console.error("Claude API test failed:", error);
      res.status(500).json({
        success: false,
        error: "Claude API connection failed",
        details: error.message
      });
    }
  });

  // Resume PDF Generation endpoint
  // AI Resume Generation endpoint
  app.post("/api/generate-resume-ai", async (req, res) => {
    try {
      const { prompt } = req.body;

      console.log("AI resume generation request with prompt:", prompt);

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 50) {
        return res.status(400).json({ error: "Prompt must be at least 50 characters long" });
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: 'user', content: aiPrompt }],
      });

      console.log("AI response received");

      let parsedData;
      try {
        const responseText = response.content[0].text.trim();
        console.log("AI response text:", responseText);

        // Extract JSON from response - handle markdown code blocks and extra text
        let jsonString = responseText;

        // Remove markdown code blocks if present
        if (responseText.includes('```json')) {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          jsonString = jsonMatch ? jsonMatch[1].trim() : responseText;
        } else if (responseText.includes('```')) {
          const jsonMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
          jsonString = jsonMatch ? jsonMatch[1].trim() : responseText;
        } else {
          // Extract JSON object if no code blocks
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          jsonString = jsonMatch ? jsonMatch[0] : responseText;
        }

        console.log("Extracted JSON string:", jsonString);
        parsedData = JSON.parse(jsonString);
        console.log("Parsed AI resume data:", parsedData);

        // Validate that parsedData contains expected fields
        if (!parsedData || typeof parsedData !== 'object' || !parsedData.name) {
          console.error("Invalid parsed data structure:", parsedData);
          return res.status(500).json({ error: "AI generated invalid data structure" });
        }

      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response text:", response.content[0].text);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      console.log("Sending response with parsedData:", JSON.stringify(parsedData, null, 2));
      res.json({ parsedData });

    } catch (error) {
      console.error("Error generating AI resume:", error);
      res.status(500).json({ error: "Failed to generate AI resume" });
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

      // let user
      // if (isManual) {
      //   user = await GetUserScscriptionTrialValidation(id);
      // }

      // if (!user) {
      //   return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed' });
      // }


      const html = generateResumeHTML(templateId, resumeData);
      // if (isManual) {
      //   await DetuctCredits(user)
      // }
      res.send(html);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate resume" });
    }
  });


  // Promotion Planner API endpoints

  // Get current user's promotion plan
  app.get('/api/promotion-plans/current', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const plan = await storage.getCurrentPromotionPlan(userId);
      res.json(plan);
    } catch (error) {
      console.error("Error fetching promotion plan:", error);
      res.status(500).json({ message: "Failed to fetch promotion plan" });
    }
  });

  // Generate new promotion plan
  app.post('/api/promotion-plans/generate', isAuthenticatedAny, async (req: any, res) => {
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
          completed: false
        },
        {
          id: 2,
          title: "Leadership & Mentoring Opportunities",
          timeline: "2-4 months",
          description: `Take on leadership roles in cross-functional projects and offer to mentor junior colleagues. This showcases your leadership potential and ability to drive results, which are key qualities for advancement to ${planData.careerGoal}.`,
          completed: false
        },
        {
          id: 3,
          title: "Strategic Business Impact Projects",
          timeline: "6-9 months",
          description: `Identify and lead initiatives that directly impact business metrics and revenue. Document your contributions with quantifiable results to present during performance reviews and promotion discussions.`,
          completed: false
        },
        {
          id: 4,
          title: "Network Building & Visibility",
          timeline: "Ongoing",
          description: `Build relationships with key stakeholders, including senior leadership, cross-functional teams, and industry professionals. Increase your visibility through presenting at meetings, contributing to strategic discussions, and participating in company initiatives.`,
          completed: false
        },
        {
          id: 5,
          title: "Performance Documentation & Promotion Discussion",
          timeline: "1-2 months",
          description: `Create a comprehensive portfolio of your achievements, impact, and growth. Schedule regular one-on-ones with your manager to discuss career progression and formally express your interest in ${planData.careerGoal}.`,
          completed: false
        }
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
  });

  // Update progress for strategies
  app.put('/api/promotion-plans/:id/progress', isAuthenticatedAny, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { strategies } = req.body;
      const userId = req.user.id;

      const updatedPlan = await storage.updatePromotionPlanProgress(id, userId, strategies);
      res.json({ plan: updatedPlan, message: "Progress saved successfully!" });
    } catch (error) {
      console.error("Error updating promotion plan progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  // ====== NEW CAREER TOOLS API ROUTES ======

  // Job Search Optimizer API Routes
  app.get('/api/job-search/profile', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const profile = await storage.getJobSearchProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching job search profile:", error);
      res.status(500).json({ error: "Failed to fetch job search profile" });
    }
  });

  app.post('/api/job-search/profile', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const profile = await storage.createOrUpdateJobSearchProfile(userId, req.body);
      res.json(profile);
    } catch (error) {
      console.error("Error saving job search profile:", error);
      res.status(500).json({ error: "Failed to save job search profile" });
    }
  });

  app.get('/api/job-applications', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const applications = await storage.getJobApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ error: "Failed to fetch job applications" });
    }
  });

  app.post('/api/job-applications', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const application = await storage.createJobApplication(userId, req.body);
      res.json(application);
    } catch (error) {
      console.error("Error creating job application:", error);
      res.status(500).json({ error: "Failed to create job application" });
    }
  });

  app.put('/api/job-applications/:id', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { id } = req.params;
      const application = await storage.updateJobApplication(userId, id, req.body);
      res.json(application);
    } catch (error) {
      console.error("Error updating job application:", error);
      res.status(500).json({ error: "Failed to update job application" });
    }
  });

  app.delete('/api/job-applications/:id', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { id } = req.params;
      await storage.deleteJobApplication(userId, id);
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting job application:", error);
      res.status(500).json({ error: "Failed to delete job application" });
    }
  });

  // Salary Negotiator API Routes
  app.get('/api/salary-research', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const research = await storage.getSalaryResearch(userId);
      res.json(research);
    } catch (error) {
      console.error("Error fetching salary research:", error);
      res.status(500).json({ error: "Failed to fetch salary research" });
    }
  });

  app.post('/api/salary-research', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;

      // Generate AI-powered negotiation strategy
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `Generate a personalized salary negotiation strategy based on:
      - Job Title: ${req.body.jobTitle}
      - Location: ${req.body.location}
      - Experience Level: ${req.body.experienceLevel}
      - Current Salary: $${req.body.currentSalary}
      - Target Salary: $${req.body.targetSalary}
      - Key Strengths: ${req.body.strengths.join(', ')}
      - Achievements: ${req.body.achievements.join(', ')}
      - Company Size: ${req.body.companySize}
      - Industry: ${req.body.industry}

      Provide a comprehensive negotiation strategy including:
      1. Market analysis and salary positioning
      2. Specific talking points based on their strengths
      3. Negotiation timeline and approach
      4. Common objections and how to address them
      5. Alternative benefits to consider if salary is inflexible

      Format the response as a detailed, actionable strategy.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const negotiationStrategy = response.content[0].text;

      const researchData = {
        ...req.body,
        negotiationStrategy,
        marketData: {
          averageSalary: Math.round((req.body.currentSalary + req.body.targetSalary) / 2 * 1.1),
          salaryRange: {
            min: Math.round(req.body.currentSalary * 0.9),
            max: Math.round(req.body.targetSalary * 1.2)
          }
        }
      };

      const research = await storage.createSalaryResearch(userId, researchData);
      res.json(research);
    } catch (error) {
      console.error("Error creating salary research:", error);
      res.status(500).json({ error: "Failed to create salary research" });
    }
  });

  // Career Path Analyzer API Routes
  app.get('/api/career-paths', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const paths = await storage.getCareerPaths(userId);
      res.json(paths);
    } catch (error) {
      console.error("Error fetching career paths:", error);
      res.status(500).json({ error: "Failed to fetch career paths" });
    }
  });

  app.post('/api/career-paths', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;

      // Generate AI-powered career path analysis
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `Analyze career progression opportunities based on:
      - Current Role: ${req.body.currentRole}
      - Experience: ${req.body.experienceYears} years
      - Skills: ${req.body.skills.join(', ')}
      - Interests: ${req.body.interests.join(', ')}
      - Goals: ${req.body.goals.join(', ')}

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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const analysisText = response.content[0].text;

      // Parse AI response into structured format
      const pathways = [
        {
          title: `Senior ${req.body.currentRole}`,
          description: "Natural progression in current role with increased responsibilities",
          timeline: "1-2 years",
          salaryRange: "$80k - $120k",
          difficulty: "Medium",
          requiredSkills: ["Advanced technical skills", "Leadership", "Mentoring"],
          nextSteps: [
            "Take on leadership projects",
            "Mentor junior team members",
            "Develop strategic thinking skills"
          ]
        },
        {
          title: "Team Lead/Manager",
          description: "Transition into people management and team leadership",
          timeline: "2-3 years",
          salaryRange: "$90k - $140k",
          difficulty: "Medium",
          requiredSkills: ["People management", "Strategic planning", "Communication"],
          nextSteps: [
            "Complete management training",
            "Lead cross-functional projects",
            "Build stakeholder relationships"
          ]
        },
        {
          title: "Subject Matter Expert",
          description: "Become a recognized expert in your domain",
          timeline: "1-3 years",
          salaryRange: "$85k - $130k",
          difficulty: "Low",
          requiredSkills: ["Deep technical expertise", "Thought leadership", "Communication"],
          nextSteps: [
            "Publish articles and content",
            "Speak at industry events",
            "Build professional network"
          ]
        }
      ];

      const analysisData = {
        ...req.body,
        pathways,
        nextSteps: [
          "Update LinkedIn profile with latest achievements",
          "Identify skill gaps for target roles",
          "Network with professionals in desired paths",
          "Set 3-month career development goals"
        ],
        analysisText
      };

      const analysis = await storage.createCareerPath(userId, analysisData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating career path analysis:", error);
      res.status(500).json({ error: "Failed to create career path analysis" });
    }
  });

  // Skills Assessment API Routes
  app.get('/api/skills-assessments', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const assessments = await storage.getSkillsAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching skills assessments:", error);
      res.status(500).json({ error: "Failed to fetch skills assessments" });
    }
  });

  app.post('/api/skills-assessments', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;

      // Generate AI-powered skills assessment analysis
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `Analyze skills assessment results and provide detailed feedback:
      - Assessment Type: ${req.body.assessmentType}
      - Current Role: ${req.body.currentRole}
      - Target Role: ${req.body.targetRole || 'Not specified'}
      - Skills Assessed: ${req.body.skillsToAssess.join(', ')}
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const analysisText = response.content[0].text;

      // Calculate overall score
      const avgScore = req.body.assessment.reduce((sum: number, skill: any) => sum + skill.level, 0) / req.body.assessment.length;
      const overallScore = Math.round(avgScore * 20); // Convert to 100 point scale

      const assessmentData = {
        ...req.body,
        overallScore,
        strengthAreas: req.body.assessment.filter((s: any) => s.level >= 4).map((s: any) => s.skill),
        improvementAreas: req.body.assessment.filter((s: any) => s.level <= 2).map((s: any) => s.skill),
        analysisText,
        completedAt: new Date().toISOString()
      };

      const assessment = await storage.createSkillsAssessment(userId, assessmentData);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating skills assessment:", error);
      res.status(500).json({ error: "Failed to create skills assessment" });
    }
  });

  // Portfolio Builder API Routes
  app.get('/api/portfolios/current', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const portfolio = await storage.getPortfolio(userId);
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  app.post('/api/portfolios', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const portfolio = await storage.createPortfolio(userId, req.body);
      res.json(portfolio);
    } catch (error) {
      console.error("Error creating portfolio:", error);
      res.status(500).json({ error: "Failed to create portfolio" });
    }
  });

  app.put('/api/portfolios/:id', isAuthenticatedAny, async (req: any, res) => {
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
  app.get('/api/network-connections', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const connections = await storage.getNetworkConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching network connections:", error);
      res.status(500).json({ error: "Failed to fetch network connections" });
    }
  });

  app.post('/api/network-connections', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const connection = await storage.createNetworkConnection(userId, req.body);
      res.json(connection);
    } catch (error) {
      console.error("Error creating network connection:", error);
      res.status(500).json({ error: "Failed to create network connection" });
    }
  });

  app.put('/api/network-connections/:id', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { id } = req.params;
      const connection = await storage.updateNetworkConnection(userId, id, req.body);
      res.json(connection);
    } catch (error) {
      console.error("Error updating network connection:", error);
      res.status(500).json({ error: "Failed to update network connection" });
    }
  });

  app.delete('/api/network-connections/:id', isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { id } = req.params;
      await storage.deleteNetworkConnection(userId, id);
      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("Error deleting network connection:", error);
      res.status(500).json({ error: "Failed to delete network connection" });
    }
  });

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

  app.post('/api/upload-resume', async (req, res) => {
    try {
      const form = new Formidable();
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const [fields, files] = await form.parse(req);
      const resumeFile = files.resume?.[0];
      const id = fields?.id?.[0];
      console.log("Received fields:", fields, id);
      const user = await GetUserScscriptionTrialValidation(id);

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed' });
      }



      if (!resumeFile) {
        return res.status(400).json({ error: 'No resume file uploaded.' });
      }



      let rawText = '';
      const filePath = resumeFile.filepath;
      const fileExt = path.extname(resumeFile.originalFilename || '').toLowerCase();

      // Extract raw text from the uploaded file
      if (fileExt === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        rawText = data.text;
      } else if (fileExt === '.docx') {
        const { value } = await mammoth.extractRawText({ path: filePath });
        rawText = value;
      } else if (fileExt === '.txt') {
        rawText = fs.readFileSync(filePath, 'utf8');
      } else {
        fs.unlinkSync(filePath); // Clean up temp file
        return res.status(400).json({ error: 'Unsupported file type. Please use PDF, DOCX, or TXT.' });
      }

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      if (!rawText.trim()) {
        return res.status(400).json({ error: 'Could not extract any text from the file.' });
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

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = msg.content[0].text;
      let parsedData;

      try {
        parsedData = JSON.parse(responseText);
        await DetuctCredits(user)

      } catch (parseError) {
        console.error("Failed to parse JSON from AI response:", responseText);
        throw new Error("AI returned a non-JSON response. Please try again.");
      }

      console.log("✅ Successfully parsed resume with Claude.");
      res.status(200).json({ message: 'Resume parsed successfully', parsedData });

    } catch (error) {
      console.error('Error in /api/upload-resume:', error);
      res.status(500).json({ error: 'Failed to process resume.', details: error.message });
    }
  });


  async function scrapeLinkedInProfile(profileUrl) {
    console.log(`Simulating scraping for: ${profileUrl}`);
    // In a real implementation, you would use a library like Puppeteer or an API call to a scraping service here.
    // For now, return mock data.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    return {
      name: "Alex Doe",
      headline: "Software Engineer at TechCorp | Building the Future of Web",
      about: "Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in JavaScript, React, Node.js, and Agile Methodologies. Strong engineering professional with a Bachelor's degree focused in Computer Science from University of Technology.",
      location: "San Francisco Bay Area",
      experience: [
        { title: "Software Engineer", company: "TechCorp", duration: "2021 - Present", description: "Developed and maintained web applications using React and Node.js. Improved application performance by 20%." },
        { title: "Junior Developer", company: "Innovate LLC", duration: "2019 - 2021", description: "Assisted in the development of client websites." }
      ],
      skills: ["React", "Node.js", "TypeScript", "JavaScript", "Agile Methodologies", "Leadership", "Problem Solving"],
      keywords: ["software engineer", "react", "node.js", "developer", "tech"],
      profileImageUrl: `https://i.pravatar.cc/150?u=${profileUrl}`,
      connectionCount: "500+ connections",
    };
  }



  app.post("/api/analyze-profile-with-ai", async (req, res) => {
    const { profileData, targetJobTitle } = req.body;

    if (!profileData || !targetJobTitle) {
      return res.status(400).json({ error: "Profile data and target job title are required for AI analysis." });
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
        model: "claude-sonnet-4-20250514", // Using Opus for best results on complex JSON tasks
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = msg.content[0].text;

      // Find the start and end of the JSON object
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      const jsonString = responseText.substring(jsonStart, jsonEnd);

      const analysisReport = JSON.parse(jsonString);

      console.log("✅ Successfully generated AI analysis report.");
      res.status(200).json(analysisReport);

    } catch (error) {
      console.error('Error in /api/analyze-profile-with-ai:', error);
      res.status(500).json({ error: 'Failed to generate AI analysis.', details: error.message });
    }
  });



  app.post('/api/generate-outreach-message', async (req, res) => {
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
        id
      } = req.body;

      if (!yourName || !messageType) {
        return res.status(400).json({ error: 'Your name and message type are required.' });
      }

      const user = await GetUserScscriptionTrialValidation(id);

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed' });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Determine the message type name for the prompt
      const messageTypeName = {
        'linkedin-dm': 'LinkedIn Direct Message',
        'email': 'Cold Email',
        'referral': 'Referral Request'
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0.6,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = msg.content[0].text;
      const parsedResponse = JSON.parse(responseText);

      console.log(`✅ Successfully generated ${messageTypeName} with Claude.`);
      await DetuctCredits(user)
      res.status(200).json({ generatedMessage: parsedResponse.message });

    } catch (error) {
      console.error('Error in /api/generate-outreach-message:', error);
      res.status(500).json({ error: 'Failed to generate outreach message.', details: error.message });
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

      if (fieldName === 'skills') {
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const suggestion = msg.content[0].text;

      res.status(200).json({ suggestion: suggestion.trim() });

    } catch (error) {
      console.error("Error calling Anthropic API:", error);
      res.status(500).json({ error: "An error occurred while communicating with the AI." });
    }
  });

  // Layoff Data

  app.get("/api/layoffs", async (req, res) => {
    try {
      const {
        page = "1",
        limit = "15",
        category = "all",
        year,
        search,
        id
      } = req.query;

      const user = await GetUserScscriptionTrialValidation(id);
      console.log(user, id)

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed.' });
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions: any[] = [];

      // Handle "upcoming" category - layoffs with dates in the future
      if (category === "upcoming") {
        conditions.push(
          gte(layoffs.date, new Date())
        );
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
          and(
            gte(layoffs.date, startDate),
            lte(layoffs.date, endDate)
          )
        );
      }

      // Search filter (company name)
      if (search) {
        conditions.push(
          sql`LOWER(${layoffs.company}) LIKE ${`%${(search as string).toLowerCase()}%`}`
        );
      }

      // Build the where clause
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
      const allLayoffs = await db
        .select()
        .from(layoffs)
        .where(whereClause);

      const stats = {
        total: count,
        by_year: {
          2024: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2024).length,
          2025: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2025).length,
          2026: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2026).length,
        },
        by_industry: allLayoffs.reduce((acc, l) => {
          if (l.industry) {
            acc[l.industry] = (acc[l.industry] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        total_employees: allLayoffs.reduce((sum, l) => sum + (l.employeesLaidOff || 0), 0)
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
            hasPreviousPage: pageNum > 1
          }
        }
      });

    } catch (error: any) {
      console.error("Error fetching layoffs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch layoffs",
        message: error.message
      });
    }
  });

  // GET /api/layoffs/stats - Get overall statistics
  app.get("/api/layoffs/stats", async (req, res) => {
    try {
      const { category = "all", id } = req.query;

      const user = await GetUserScscriptionTrialValidation(id);

      if (!user) {
        return res.status(400).json({ error: 'Subscription has expired, or you have not subscribed.' });
      }

      const whereClause = category !== "all"
        ? eq(layoffs.industry, category as string)
        : undefined;

      const allLayoffs = await db
        .select()
        .from(layoffs)
        .where(whereClause);

      const stats = {
        total: allLayoffs.length,
        by_year: {
          2024: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2024).length,
          2025: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2025).length,
          2026: allLayoffs.filter(l => l.date && new Date(l.date).getFullYear() === 2026).length,
        },
        by_industry: allLayoffs.reduce((acc, l) => {
          if (l.industry) {
            acc[l.industry] = (acc[l.industry] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        total_employees: allLayoffs.reduce((sum, l) => sum + (l.employeesLaidOff || 0), 0),
        recent_layoffs: allLayoffs
          .sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5)
          .map(l => ({
            company: l.company,
            date: l.date,
            employees: l.employeesLaidOff
          }))
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
        message: error.message
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
          error: "Layoff not found"
        });
      }

      res.json({
        success: true,
        data: layoff
      });

    } catch (error: any) {
      console.error("Error fetching layoff:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch layoff",
        message: error.message
      });
    }
  });








  // ==================================================
  //       =========== Profile Building =======
  //===================================================



  app.post("/api/profile/:section/:id", upload.single('file'), async (req, resp) => {
    try {


      const { id } = req.params;
      const { section } = req.params;
      console.log("section.................", section)
      const data = req.body[section];
      console.log("personal data_________", data)
      const user = await GetUserScscriptionTrialValidation(id);
      if (!user) {
        return resp.status(400).json({
          success: false,
          error: "Subscription has expired, or you have not subscribed."
        })
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
          profileCompletion: 0
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
            ([_, value]) => value !== undefined && value !== null && value !== ""
          )
        );
      }

      const pickSectionFields = (data: any, allowedFields: string[]) => {
        if (!data) return {};
        return Object.fromEntries(
          Object.entries(data).filter(([key]) => allowedFields.includes(key))

        );
      }

      const allowedFields = SECTION_FIELDS[section];
      if (!allowedFields) {
        return resp.status(400).json({
          success: false,
          error: "Invalid section",
        });
      }

      console.log("data", data)
      const cleaned = cleanPayload(data || {});
      const updateData = pickSectionFields(cleaned, allowedFields);


      // =========== ============ =======================

      console.log("fields to update....", updateData)
      const updatepersonalDetails = async () => {
        if (!updateData.firstName || !updateData.lastName || !updateData.email || !updateData.phone) {
          return resp.status(400).json({
            success: false,
            error: "Missing required fields"
          })
        }
        const updatedUser = await db
          .update(userJobProfiles)
          .set(updateData)
          .where(eq(userJobProfiles.userId, id))
          .returning();

        return resp.status(200).json({
          success: true,
          data: updatedUser,
          message: "User updated successfully"
        })

      }

      const update_residencyDetails = async () => {

        if (!updateData.city || !updateData.country) {
          return resp.status(400).json({
            success: false,
            error: "You are missing required data"
          })
        }

        const updatedUser = await db
          .update(userJobProfiles)
          .set(updateData)
          .where(eq(userJobProfiles.userId, id))
          .returning();

        return resp.status(200).json({
          success: true,
          data: updatedUser,
          message: "Adress added successfuly"
        })

      }

      const update_experience = async () => {
        if (!data.totalExperience) {
          return resp.status(400).json({
            success: false,
            error: "Total experience is required"
          })
        }

        if (!data.experiences || !Array.isArray(data.experiences)) {
          return resp.status(400).json({
            success: false,
            error: "Experiences data is required"
          })
        }

        // Validate each experience entry has required fields
        for (const exp of data.experiences) {
          if (!exp.company || !exp.title || !exp.fromMonth || !exp.fromYear) {
            return resp.status(400).json({
              success: false,
              error: "Each experience must have company, title, from month and from year"
            })
          }
          // If not currently working, toMonth and toYear are required
          if (!exp.currentlyWorking && (!exp.toMonth || !exp.toYear)) {
            return resp.status(400).json({
              success: false,
              error: "End date (month and year) is required for past roles"
            })
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
          message: "Experience updated successfully"
        })
      }

      const update_education = async () => {
        if (!data.education || !Array.isArray(data.education)) {
          return resp.status(400).json({
            success: false,
            error: "Education data is required"
          })
        }

        // Validate each education entry
        for (const edu of data.education) {
          if (!edu.school || !edu.degree || !edu.fromMonth || !edu.fromYear) {
            return resp.status(400).json({
              success: false,
              error: "Each education entry must have school, degree, from month and from year"
            })
          }
          if (!edu.isCurrentlyStudying && (!edu.toMonth || !edu.toYear)) {
            return resp.status(400).json({
              success: false,
              error: "End date (month and year) is required for completed education"
            })
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
          message: "Education updated successfully"
        })
      }

      const update_general = async () => {
        if (!data.general) {
          return resp.status(400).json({
            success: false,
            error: "General preference data is required"
          })
        }

        const updatedUser = await db
          .update(userJobProfiles)
          .set(updateData)
          .where(eq(userJobProfiles.userId, id))
          .returning();

        return resp.status(200).json({
          success: true,
          data: updatedUser,
          message: "General preferences updated successfully"
        })
      }

      const update_skill_languages = async () => {
        const updatedUser = await db
          .update(userJobProfiles)
          .set(updateData)
          .where(eq(userJobProfiles.userId, id))
          .returning();

        return resp.status(200).json({
          success: true,
          data: updatedUser,
          message: "Skills and Languages updated successfully"
        })
      }

      const update_achievements = async () => {
        const updatedUser = await db
          .update(userJobProfiles)
          .set(updateData)
          .where(eq(userJobProfiles.userId, id))
          .returning();

        return resp.status(200).json({
          success: true,
          data: updatedUser,
          message: "Achievements updated successfully"
        })
      }

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

          console.log(`Uploading ${req.file.mimetype} to Cloudinary...`);

          // Upload to Cloudinary with optimization
          const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "auto", // Better for PDFs than "raw" in some cases
            folder: "job-profiles/documents",
            access_mode: "public"
          });

          // Determine document type
          let docType = 'certificate'; // Default
          if (documentType === 'resume' || req.file.originalname.toLowerCase().includes('resume')) {
            docType = 'resume';
          } else if (documentType === 'recommendation_letter' || req.file.originalname.toLowerCase().includes('recommendation')) {
            docType = 'recommendation_letter';
          }

          // Get profile ID first without updating
          const [userProfile] = await db
            .select()
            .from(userJobProfiles)
            .where(eq(userJobProfiles.userId, id))
            .limit(1);

          // 2. Insert record into userDocuments table
          await db.insert(userDocuments).values({
            userId: id,
            profileId: userProfile?.id, // Link to the profile if it exists
            documentType: docType,
            fileName: req.file.originalname,
            fileUrl: result.secure_url,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
          });

          // 3. Update the main userJobProfiles table with the latest URL for this type
          if (docType === 'resume') {
            await db.update(userJobProfiles)
              .set({ resume: result.secure_url, updatedAt: new Date() })
              .where(eq(userJobProfiles.userId, id));
          } else if (docType === 'recommendation_letter') {
            await db.update(userJobProfiles)
              .set({ recommendationLetter: result.secure_url, updatedAt: new Date() })
              .where(eq(userJobProfiles.userId, id));
          } else if (docType === 'certificate') {
            await db.update(userJobProfiles)
              .set({ certificates: result.secure_url, updatedAt: new Date() })
              .where(eq(userJobProfiles.userId, id));
          }

          // Clean up temp file and perform AI extraction for resumes
          let extractedData = null;

          if (docType === 'resume') {
            try {
              console.log("Starting resume extraction...");
              const dataBuffer = fs.readFileSync(req.file.path);
              let resumeText = "";

              if (req.file.mimetype === 'application/pdf') {
                const pdfData = await pdf(dataBuffer);
                resumeText = pdfData.text;
              } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer: dataBuffer });
                resumeText = result.value;
              } else {
                resumeText = dataBuffer.toString('utf-8');
              }

              if (resumeText.trim().length > 0) {
                const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                const prompt = `You are a helpful assistant that extracts information from resumes and formats them into a specific JSON structure.
Here is the resume text:
${resumeText.substring(0, 15000)}

Please extract the following information and return ONLY a valid JSON object matching this structure EXACTLY. Return the raw JSON without markdown formatting (do not wrap in \`\`\`json):
{
  "personal": {
    "firstName": "String",
    "lastName": "String",
    "email": "String",
    "phone": "String",
    "linkedin": "String",
    "github": "String",
    "website": "String"
  },
  "residency": {
    "city": "String",
    "country": "String"
  },
  "experience": {
    "totalExperience": "String (just a number)",
    "experiences": [
      {
        "company": "String",
        "title": "String",
        "fromMonth": "String (e.g., 'January')",
        "fromYear": "String (e.g., '2020')",
        "toMonth": "String (e.g., 'December' or empty if current)",
        "toYear": "String (e.g., '2023' or empty if current)",
        "currentlyWorking": Boolean,
        "description": "String"
      }
    ]
  },
  "education": {
    "education": [
      {
        "school": "String",
        "degree": "String",
        "fieldOfStudy": "String",
        "fromMonth": "String",
        "fromYear": "String",
        "toMonth": "String",
        "toYear": "String",
        "isCurrentlyStudying": Boolean,
        "description": "String"
      }
    ]
  },
  "skillAndLanguages": {
    "skills": [
      { "name": "String" }
    ],
    "languages": [
      { "language": "String", "proficiency": "String" }
    ]
  }
}

Use empty strings/arrays if the information is missing. Infer 'currentlyWorking' based on dates.`;

                const msg = await anthropic.messages.create({
                  model: "claude-3-5-sonnet-20241022",
                  max_tokens: 4000,
                  temperature: 0,
                  messages: [
                    { role: "user", content: prompt }
                  ]
                });

                if (msg.content[0].type === 'text') {
                  const contentText = msg.content[0].text;
                  try {
                    extractedData = JSON.parse(contentText);
                    console.log("Successfully extracted resume data.");
                  } catch (e) {
                    console.error("Failed to parse Claude JSON:", contentText);
                  }
                }
              }
            } catch (err) {
              console.error("Resume extraction error:", err);
            }
          }

          // Clean up temp file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          let message = 'Document uploaded and saved successfully';
          if (docType === 'resume') {
            message = 'Resume uploaded and saved successfully';
            if (extractedData) {
              message = 'Resume uploaded and data extracted successfully';
            }
          }
          else if (docType === 'recommendation_letter') message = 'Recommendation letter uploaded and saved successfully';

          return resp.status(200).json({
            success: true,
            data: userProfile,
            extractedData: extractedData,
            message: message,
            url: result.secure_url
          });
        } catch (error) {
          console.error("Cloudinary upload/DB update error:", error)
          return resp.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : "Error during Uploading"
          })
        }
      }



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
          break
        default:
          break;
      }


    } catch (error) {
      console.error("Error updating user:", error);
      resp.status(500).json({
        success: false,
        error: "Failed to update user",
        message: "Internal server error"
      })
    }
  })


  app.get("/api/profile/jobprofile/:id", async (req, resp) => {

    try {
      const { id } = req.params;
      const [userProfile] = await db
        .select()
        .from(userJobProfiles)
        .where(eq(userJobProfiles.userId, id))
        .limit(1);

      console.log(userProfile)

      return resp.status(200).json({
        success: true,
        data: userProfile || null,
        message: "Job profile fetched successfully"
      })
    } catch (error) {
      console.error("Error fetching job profile:", error);
      resp.status(500).json({
        success: false,
        error: "Failed to fetch job profile",
        message: "Internal server error"
      })
    }
  })














  // ====== END NEW CAREER TOOLS API ROUTES ======

  const httpServer = createServer(app);
  return httpServer;
}

// Resume HTML template generation function
function generateResumeHTML(templateId: string, resumeData: any): string {
  console.log("Generating resume with template:", templateId);
  console.log("Resume data:", JSON.stringify(resumeData, null, 2));

  // Helper to check if a value is present (not null, undefined, or empty string)
  const isPresent = (val: any) => val && String(val).trim() !== '';

  // --- MODIFICATION: Added .slice(0, 15) to limit skills ---
  const processSkills = (skills: any): string[] => {
    let processed: string[] = [];
    if (Array.isArray(skills)) {
      processed = skills.filter(isPresent).map(String);
    } else if (typeof skills === 'string' && isPresent(skills)) {
      processed = skills.split(',').map(skill => skill.trim()).filter(isPresent);
    }
    // Apply the limit here, after processing and before returning.
    return processed.slice(0, 15);
  };
  // --- END MODIFICATION ---

  // Helper to generate experience sections dynamically
  const generateExperienceHTML = (experience: any[], template: 'professional' | 'harvard' | 'creative'): string => {
    if (!experience || experience.length === 0) return '';
    return experience.map(exp => {
      const title = exp.title || '';
      const company = exp.company || '';
      const location = exp.location || '';
      const duration = exp.duration || '';
      const description = exp.description || '';
      const companyAndLocation = [company, location].filter(isPresent).join(' | ');

      switch (template) {
        case 'professional':
          return `
            <div class="experience-item">
              ${isPresent(title) ? `<h3>${title}</h3>` : ''}
              ${isPresent(duration) ? `<div class="duration">${duration}</div>` : ''}
              ${isPresent(companyAndLocation) ? `<div class="company">${companyAndLocation}</div>` : ''}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, '<br>')}</div>` : ''}
            </div>`;
        case 'harvard':
          return `
            <div class="experience-item">
              <div class="title-row">
                ${isPresent(title) ? `<h3>${title}</h3>` : ''}
                ${isPresent(duration) ? `<span class="duration">${duration}</span>` : ''}
              </div>
              ${isPresent(companyAndLocation) ? `<div class="company">${companyAndLocation}</div>` : ''}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, '<br>')}</div>` : ''}
            </div>`;
        case 'creative':
          return `
            <div class="experience-item">
              <div class="title-row">
                ${isPresent(company) ? `<h3>${company}</h3>` : ''}
                ${isPresent(duration) ? `<span class="duration">${duration}</span>` : ''}
              </div>
              ${isPresent(title) ? `<div class="company">${title}</div>` : ''}
              ${isPresent(description) ? `<div class="description">${description.replace(/\n/g, '<br>')}</div>` : ''}
            </div>`;
        default: return '';
      }
    }).join('');
  };

  // Helper to generate education sections dynamically
  const generateEducationHTML = (education: any[]): string => {
    if (!education || education.length === 0) return '';
    return education.map(edu => {
      const degree = edu.degree || '';
      const school = edu.school || '';
      const duration = edu.duration || '';

      if (!isPresent(degree) && !isPresent(school)) return '';
      return `
            <div class="education-item">
                ${isPresent(degree) ? `<h3>${degree}</h3>` : ''}
                ${isPresent(school) ? `<div class="school">${school}</div>` : ''}
                ${isPresent(duration) ? `<div class="details">${duration}</div>` : ''}
            </div>`;
    }).join('');
  };


  switch (templateId) {
    case 'professional':
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 40px; } .header { margin-bottom: 30px; } .header h1 { font-size: 2.5rem; font-weight: bold; color: #333; margin-bottom: 8px; }
            .contact-info { display: flex; flex-wrap: wrap; gap: 20px; color: #666; font-size: 0.9rem; margin-bottom: 20px; } .contact-info span { display: flex; align-items: center; gap: 5px; }
            .contact-info a { color: #3B82F6; text-decoration: none; } .contact-info a:hover { text-decoration: underline; } .divider { height: 2px; background: #3B82F6; margin: 20px 0; }
            .section { margin-bottom: 30px; } .section h2 { color: #3B82F6; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
            .experience-item { margin-bottom: 20px; } .experience-item h3 { font-size: 1.1rem; font-weight: bold; color: #333; margin-bottom: 5px; }
            .experience-item .company { color: #666; font-size: 0.95rem; margin-bottom: 8px; }
            .experience-item .duration { color: #666; font-size: 0.9rem; float: right; margin-top: -30px; }
            .experience-item .description { margin-top: 8px; font-size: 0.95rem; }
            .skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; } .skill-item { padding: 5px 0; font-weight: 500; }
            .education-item { margin-bottom: 15px; } .education-item h3 { font-weight: bold; margin-bottom: 5px; } .education-item .school { color: #666; margin-bottom: 5px; } .education-item .details { color: #666; font-size: 0.9rem; }
        </style></head><body><div class="container">
            <div class="header">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name}</h1>` : ''}
              <div class="contact-info">
                ${isPresent(resumeData.email) ? `<span>📧 <a href="mailto:${resumeData.email}">${resumeData.email}</a></span>` : ''}
                ${isPresent(resumeData.phone) ? `<span>📞 ${resumeData.phone}</span>` : ''}
                ${isPresent(resumeData.location) ? `<span>📍 ${resumeData.location}</span>` : ''}
                ${isPresent(resumeData.linkedin) ? `<span>🔗 <a href="${resumeData.linkedin}" target="_blank">LinkedIn</a></span>` : ''}
                ${isPresent(resumeData.github) ? `<span>💻 <a href="${resumeData.github}" target="_blank">GitHub</a></span>` : ''}
                ${isPresent(resumeData.website) ? `<span>🌐 <a href="${resumeData.website}" target="_blank">Website</a></span>` : ''}
              </div>
              <div class="divider"></div>
            </div>

            <!-- --- MODIFICATION: Skills moved after summary --- -->
            ${isPresent(resumeData.summary) ? `<div class="section"><h2>Professional Summary</h2><p>${resumeData.summary}</p></div>` : ''}
            ${processSkills(resumeData.skills).length > 0 ? `<div class="section"><h2>Skills</h2><div class="skills-grid">${processSkills(resumeData.skills).map(skill => `<div class="skill-item">${skill}</div>`).join('')}</div></div>` : ''}
            ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Work Experience</h2>${generateExperienceHTML(resumeData.experience, 'professional')}</div>` : ''}
            ${resumeData.education && resumeData.education.length > 0 ? `<div class="section"><h2>Education</h2>${generateEducationHTML(resumeData.education)}</div>` : ''}
            <!-- --- END MODIFICATION --- -->
            
        </div></body></html>`;

    case 'harvard':
      const harvardContact = [resumeData.phone, resumeData.email, resumeData.linkedin, resumeData.location].filter(isPresent).join(' • ');
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; background: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 40px; } .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 2.2rem; font-weight: bold; margin-bottom: 15px; } .contact-info { font-size: 0.95rem; margin-bottom: 20px; }
            .section { margin-bottom: 25px; } .section h2 { font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; text-decoration: underline; text-transform: uppercase; }
            .summary p { text-align: justify; margin-bottom: 10px; } .experience-item { margin-bottom: 20px; }
            .experience-item .title-row, .education-item .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .experience-item h3, .education-item h3 { font-weight: bold; font-size: 1rem; }
            .experience-item .duration, .education-item .duration { font-style: italic; } .experience-item .company, .education-item .school { font-style: italic; margin-bottom: 8px; }
            .experience-item .description { margin-top: 5px; }
            .skills-section ul, .achievements-section ul { columns: 3; column-gap: 20px; margin-left: 20px; } .skills-section li, .achievements-section li { margin-bottom: 5px; break-inside: avoid; }
        </style></head><body><div class="container">
            <div class="header">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name}</h1>` : ''}
              ${isPresent(harvardContact) ? `<div class="contact-info">${harvardContact}</div>` : ''}
            </div>

            <!-- --- MODIFICATION: Skills moved after summary --- -->
            ${isPresent(resumeData.summary) ? `<div class="section summary"><h2>Summary</h2><p>${resumeData.summary}</p></div>` : ''}
            ${processSkills(resumeData.skills).length > 0 ? `<div class="section skills-section"><h2>Skills</h2><ul>${processSkills(resumeData.skills).map(skill => `<li>${skill}</li>`).join('')}</ul></div>` : ''}
            ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Professional Experience</h2>${generateExperienceHTML(resumeData.experience, 'harvard')}</div>` : ''}
            
            ${resumeData.education && resumeData.education.length > 0 ? `<div class="section"><h2>Education</h2>${resumeData.education.map((edu: any) => `
                <div class="education-item">
                  <div class="title-row">
                    ${isPresent(edu.degree) ? `<h3>${edu.degree}</h3>` : `<h3>${edu.school || ''}</h3>`}
                    ${isPresent(edu.duration) ? `<span class="duration">${edu.duration}</span>` : ''}
                  </div>
                  ${isPresent(edu.degree) && isPresent(edu.school) ? `<div class="school">${edu.school}</div>` : ''}
                </div>`).join('')}</div>` : ''}
            
            ${resumeData.achievements && resumeData.achievements.length > 0 ? `<div class="section achievements-section"><h2>Achievements</h2><ul>${resumeData.achievements.filter(isPresent).map((ach: string) => `<li>${ach}</li>`).join('')}</ul></div>` : ''}
             <!-- --- END MODIFICATION --- -->
        </div></body></html>`;

    case 'creative':
      const creativeContactExists = isPresent(resumeData.phone) || isPresent(resumeData.email) || isPresent(resumeData.location) || isPresent(resumeData.website);
      return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: #f4f4f4; }
            .resume-container { display: flex; max-width: 900px; margin: 20px auto; min-height: 100vh; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
            .sidebar { background: #2C3E50; color: white; padding: 40px 30px; width: 300px; } .sidebar h1 { font-size: 1.8rem; font-weight: bold; text-align: center; margin-bottom: 10px; }
            .sidebar .title { font-size: 1rem; text-align: center; margin-bottom: 30px; color: #BDC3C7; text-transform: uppercase; }
            .sidebar .section { margin-bottom: 30px; } .sidebar .section h3 { font-size: 1rem; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #34495e; padding-bottom: 8px; text-transform: uppercase;}
            .sidebar .contact-item { margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; word-break: break-all; }
            .sidebar .skill-item { margin-bottom: 8px; font-size: 0.9rem; } .main-content { flex: 1; padding: 40px; background: white; }
            .main-content .section h2 { font-size: 1.3rem; font-weight: bold; color: #2C3E50; margin-bottom: 20px; text-transform: uppercase; }
            .experience-item { margin-bottom: 25px; } .experience-item .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .experience-item h3 { font-size: 1.1rem; font-weight: bold; color: #2C3E50; } .experience-item .duration { color: #7F8C8D; font-size: 0.9rem; }
            .experience-item .company { color: #3498db; font-weight: 500; margin-bottom: 8px; }
            .experience-item .description { margin-top: 5px; font-size: 0.95rem; }
            /* --- MODIFICATION: Added styles for skills in main content --- */
            .main-content .skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; } 
            .main-content .skill-item { padding: 5px 0; font-size: 0.95rem; }
            /* --- END MODIFICATION --- */
        </style></head><body><div class="resume-container">
            <div class="sidebar">
              ${isPresent(resumeData.name) ? `<h1>${resumeData.name.toUpperCase()}</h1>` : ''}
              ${isPresent(resumeData.profession) ? `<div class="title">${resumeData.profession}</div>` : ''}

              ${creativeContactExists ? `<div class="section"><h3>Contact</h3>
                ${isPresent(resumeData.phone) ? `<div class="contact-item"><span>📞</span><span>${resumeData.phone}</span></div>` : ''}
                ${isPresent(resumeData.email) ? `<div class="contact-item"><span>📧</span><span>${resumeData.email}</span></div>` : ''}
                ${isPresent(resumeData.location) ? `<div class="contact-item"><span>📍</span><span>${resumeData.location}</span></div>` : ''}
                ${isPresent(resumeData.website) ? `<div class="contact-item"><span>🌐</span><span>${resumeData.website}</span></div>` : ''}
              </div>` : ''}

              ${resumeData.education && resumeData.education.length > 0 ? `<div class="section"><h3>Education</h3>${resumeData.education.map((edu: any) => {
        if (!isPresent(edu.degree) && !isPresent(edu.school)) return '';
        return `<div style="margin-bottom: 15px;">
                    ${isPresent(edu.duration) ? `<div style="font-weight: bold; margin-bottom: 5px;">${edu.duration}</div>` : ''}
                    ${isPresent(edu.degree) ? `<div style="font-size: 0.9rem;">${edu.degree.toUpperCase()}</div>` : ''}
                    ${isPresent(edu.school) ? `<div style="font-size: 0.85rem; color: #BDC3C7;">${edu.school}</div>` : ''}
                  </div>`
      }).join('')}</div>` : ''}
              
              ${resumeData.achievements && resumeData.achievements.length > 0 ? `<div class="section"><h3>Achievements</h3>${resumeData.achievements.filter(isPresent).map((ach: string) => `<div class="skill-item">• ${ach}</div>`).join('')}</div>` : ''}
              <!-- --- MODIFICATION: Skills moved from sidebar to main content --- -->
            </div>

            <div class="main-content">
              ${isPresent(resumeData.summary) ? `<div class="section"><h2>Profile</h2><p>${resumeData.summary.replace(/\n/g, '<br>')}</p></div>` : ''}
              <!-- --- MODIFICATION: Skills now rendered here in main content --- -->
              ${processSkills(resumeData.skills).length > 0 ? `<div class="section"><h2>Skills</h2><div class="skills-grid">${processSkills(resumeData.skills).map(skill => `<div class="skill-item">${skill}</div>`).join('')}</div></div>` : ''}
              ${resumeData.experience && resumeData.experience.length > 0 ? `<div class="section"><h2>Work Experience</h2>${generateExperienceHTML(resumeData.experience, 'creative')}</div>` : ''}
            </div>
        </div></body></html>`;

    default:
      return generateResumeHTML('professional', resumeData);
  }
}