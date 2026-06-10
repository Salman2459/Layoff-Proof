import type { User } from "@shared/schema";
import { effectiveSubscriptionStatus } from "./subscriptionAccess";
import { stripe } from "./stripe";
import { storage } from "./storage";

const STRIPE_MEMBER_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "paused",
]);

/**
 * Resolves a user who may use paid features (layoffs, AI tools, etc.).
 * Matches client `hasSubscriberAccess` — DB active OR Stripe confirms membership
 * when webhooks have not updated the database yet.
 */
export async function getUserWithSubscriberAccess(
  userId: string,
): Promise<User | null> {
  if (!userId?.trim()) return null;

  const user = await storage.getUser(userId);
  if (!user) return null;

  if (effectiveSubscriptionStatus(user) === "active") {
    return user;
  }

  if (!user.stripeSubscriptionId) return null;

  try {
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    if (STRIPE_MEMBER_STATUSES.has(sub.status)) {
      return user;
    }
    if (
      sub.cancel_at_period_end &&
      sub.current_period_end * 1000 > Date.now()
    ) {
      return user;
    }
    if (sub.status === "canceled" && sub.current_period_end * 1000 > Date.now()) {
      return user;
    }
  } catch {
    /* fall through to end-date grace */
  }

  const plan = user.subscriptionPlan;
  if (
    typeof plan === "string" &&
    plan.startsWith("prod_") &&
    user.subscriptionEndDate
  ) {
    const end = new Date(user.subscriptionEndDate);
    if (!Number.isNaN(end.getTime()) && end > new Date()) {
      return user;
    }
  }

  return null;
}

export function resolveAuthUserId(req: {
  user?: { id?: string; claims?: { sub?: string }; userId?: string };
}): string {
  const u = req.user;
  return String(u?.id ?? u?.claims?.sub ?? u?.userId ?? "");
}
