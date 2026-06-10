import crypto from "crypto";
import type { Request } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  affiliates,
  affiliateCommissions,
  referrals,
  type Affiliate,
  type User,
} from "@shared/schema";
import { db } from "./db";
import { storage } from "./storage";

/** Cookie name for affiliate referral tracking (30-day attribution window). */
export const AFFILIATE_REF_COOKIE = "affiliate_ref";

const AFFILIATE_REF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const COMMISSION_HOLD_DAYS = 30;

export function publicAppOrigin(req?: Request): string {
  const fromEnv = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (req) return `${req.protocol}://${req.get("host")}`;
  return "https://layoffproof.ai";
}

/**
 * Generates referral codes in the format LP-USERNAME-RANDOM (e.g. LP-SHAHAB-A7F3D2).
 * Retries on collision until a unique code is found.
 */
export async function generateUniqueReferralCode(user: User): Promise<string> {
  const fromName =
    user.firstName?.trim() ||
    user.email?.split("@")[0] ||
    "USER";
  const base =
    fromName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12) || "USER";

  for (let attempt = 0; attempt < 12; attempt++) {
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `LP-${base}-${random}`;
    const existing = await storage.getAffiliateByReferralCode(code);
    if (!existing) return code;
  }

  throw new Error("Failed to generate unique referral code");
}

/** Creates an affiliate row for the user if one does not already exist. */
export async function ensureAffiliateForUser(userId: string): Promise<Affiliate> {
  const existing = await storage.getAffiliateByUserId(userId);
  if (existing) return existing;

  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const referralCode = await generateUniqueReferralCode(user);
  return storage.createAffiliate({
    userId,
    referralCode,
    status: "approved",
    commissionAmount: 49,
  });
}

export type AffiliateMeResponse = {
  referral_code: string;
  referral_link: string;
  commission_amount: number;
  total_referrals: number;
  active_referrals: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
};

/** Builds dashboard payload for GET /api/affiliate/me. */
export async function getAffiliateMe(
  userId: string,
  req?: Request,
): Promise<AffiliateMeResponse> {
  const affiliate = await ensureAffiliateForUser(userId);
  const origin = publicAppOrigin(req);
  const stats = await storage.getAffiliateStats(affiliate.id);

  return {
    referral_code: affiliate.referralCode,
    referral_link: `${origin}/signup?ref=${encodeURIComponent(affiliate.referralCode)}`,
    commission_amount: affiliate.commissionAmount,
    total_referrals: stats.totalReferrals,
    active_referrals: stats.activeReferrals,
    pending_commission: stats.pendingCommission,
    approved_commission: stats.approvedCommission,
    paid_commission: stats.paidCommission,
  };
}

/** Reads affiliate ref code from the attribution cookie. */
export function getAffiliateRefFromRequest(req: Request): string | null {
  const raw = req.cookies?.[AFFILIATE_REF_COOKIE];
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Express middleware: when visiting /signup?ref=CODE, persist CODE in httpOnly cookie
 * for 30 days so signup can attribute the referral later.
 */
export function affiliateRefCookieMiddleware(
  req: Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  if (req.method !== "GET") {
    next();
    return;
  }

  const ref = typeof req.query.ref === "string" ? req.query.ref.trim() : "";
  if (!ref) {
    next();
    return;
  }

  const isSignupPath =
    req.path === "/signup" || req.path === "/signup/";
  if (!isSignupPath) {
    next();
    return;
  }

  res.cookie(AFFILIATE_REF_COOKIE, ref, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: AFFILIATE_REF_MAX_AGE_MS,
    sameSite: "lax",
    path: "/",
  });

  next();
}

/**
 * Links a newly registered user to an affiliate when a valid attribution cookie exists.
 * Prevents self-referral and duplicate referrals for the same referred user.
 */
export async function attachReferralFromCookie(
  req: Request,
  newUserId: string,
): Promise<void> {
  const code = getAffiliateRefFromRequest(req);
  if (!code) return;

  const affiliate = await storage.getAffiliateByReferralCode(code);
  if (!affiliate || affiliate.status !== "approved") return;

  // Prevent self-referral
  if (affiliate.userId === newUserId) return;

  const existing = await storage.getReferralByReferredUserId(newUserId);
  if (existing) return;

  await storage.createReferral({
    affiliateId: affiliate.id,
    referredUserId: newUserId,
    referralCode: code,
    status: "signed_up",
  });
}

/**
 * When a referred user subscribes, create a pending commission (30-day hold)
 * and mark the referral as subscribed.
 */
export async function processAffiliateSubscriptionActivation(
  customerUserId: string,
  subscriptionId?: string | null,
  opts?: { createCommission?: boolean },
): Promise<void> {
  const createCommission = opts?.createCommission !== false;
  const referral = await storage.getReferralByReferredUserId(customerUserId);
  if (!referral) return;
  if (referral.status === "refunded" || referral.status === "inactive") return;

  const affiliate = await storage.getAffiliateById(referral.affiliateId);
  if (!affiliate || affiliate.status !== "approved") return;

  const existingCommission = await storage.getAffiliateCommissionByCustomer(
    affiliate.id,
    customerUserId,
  );
  if (existingCommission && existingCommission.status !== "reversed") {
    await storage.updateReferral(referral.id, { status: "subscribed" });
    return;
  }

  if (createCommission) {
    const subscribedAt = new Date();
    const eligibleAt = new Date(subscribedAt);
    eligibleAt.setDate(eligibleAt.getDate() + COMMISSION_HOLD_DAYS);

    // Commission creation — pending until eligible_at passes without refund
    await storage.createAffiliateCommission({
      affiliateId: affiliate.id,
      customerId: customerUserId,
      subscriptionId: subscriptionId ?? null,
      amount: affiliate.commissionAmount,
      status: "pending",
      eligibleAt,
    });
  }

  await storage.updateReferral(referral.id, { status: "subscribed" });
}

/**
 * Refund clawback: if customer refunds within the 30-day hold window,
 * reverse the pending commission and mark referral as refunded.
 */
export async function processAffiliateRefund(
  customerUserId: string,
  reason: string,
): Promise<void> {
  const referral = await storage.getReferralByReferredUserId(customerUserId);
  if (!referral) return;

  const commission = await storage.getAffiliateCommissionByCustomer(
    referral.affiliateId,
    customerUserId,
  );
  if (!commission) {
    await storage.updateReferral(referral.id, { status: "refunded" });
    return;
  }

  const now = new Date();
  const withinHoldWindow = now < new Date(commission.eligibleAt);

  if (commission.status === "pending" && withinHoldWindow) {
    await storage.updateAffiliateCommission(commission.id, {
      status: "reversed",
      reversedAt: now,
      reversalReason: reason,
    });
    await storage.updateReferral(referral.id, { status: "refunded" });
    return;
  }

  if (commission.status === "approved" || commission.status === "paid") {
    await storage.updateAffiliateCommission(commission.id, {
      status: "reversed",
      reversedAt: now,
      reversalReason: reason,
    });
    await storage.updateReferral(referral.id, { status: "refunded" });
  }
}

/** Cron: move pending commissions past eligible_at to approved. */
export async function approveEligibleAffiliateCommissions(): Promise<number> {
  const now = new Date();
  const rows = await db
    .select()
    .from(affiliateCommissions)
    .where(
      and(
        eq(affiliateCommissions.status, "pending"),
        sql`${affiliateCommissions.eligibleAt} <= ${now}`,
      ),
    );

  for (const row of rows) {
    await storage.updateAffiliateCommission(row.id, {
      status: "approved",
      approvedAt: now,
    });
  }

  return rows.length;
}
