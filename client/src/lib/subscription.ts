export type StripeSubscriptionPayload = {
  hasSubscription?: boolean;
  status?: string | null;
};

export type SubscriptionUser = {
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | Date | null;
  trialEndDate?: string | Date | null;
  stripeSubscriptionId?: string | null;
  subscriptionPlan?: string | null;
};

function hasTrialNotExpired(user: SubscriptionUser | undefined): boolean {
  if (!user?.trialEndDate) return false;
  const trialEnd = new Date(user.trialEndDate);
  return !Number.isNaN(trialEnd.getTime()) && trialEnd > new Date();
}

/** Stripe statuses where the customer is already subscribed (manage / change plan UX). */
const STRIPE_MEMBER_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

export function stripePayloadShowsManagingSubscription(
  payload: StripeSubscriptionPayload | null | undefined,
): boolean {
  if (!payload?.hasSubscription) return false;
  const lc = (payload.status ?? "").toString().toLowerCase();
  return STRIPE_MEMBER_STATUSES.has(lc);
}

/**
 * When DB says `inactive` but webhooks lag, Stripe confirms paid access, or app trial applies.
 */
export function hasStalePaidEntitlementBeyondDbActive(
  user: SubscriptionUser | undefined,
  stripePayload: StripeSubscriptionPayload | null | undefined,
): boolean {
  if (stripePayload == null) return false;
  if (!user?.stripeSubscriptionId) return false;
  const stripeLc = (stripePayload?.status ?? "").toString().toLowerCase();
  // Need Stripe response — avoid guessing while loading / error.
  if (!stripePayload.hasSubscription) return false;
  // First payment pending — treat as checkout, not "already subscribed".
  if (stripeLc === "incomplete") return false;
  // Explicit Stripe terminal / non-paid states — do not infer from DB end date alone.
  if (["canceled", "unpaid", "incomplete_expired"].includes(stripeLc)) return false;

  const plan = user.subscriptionPlan;
  if (typeof plan !== "string" || !plan.startsWith("prod_")) return false;

  const endRaw = user.subscriptionEndDate;
  if (endRaw == null) return false;
  const end = typeof endRaw === "string" || endRaw instanceof Date ? new Date(endRaw) : null;
  if (!end || Number.isNaN(end.getTime())) return false;
  return end > new Date();
}

/**
 * Subscribe page: honour DB `subscription_status` (`active` | `inactive`) together with Stripe
 * (`/api/stripe/subscription-status`) and app trial dates.
 */
export function hasSubscriberAccess(opts: {
  user?: SubscriptionUser;
  stripePayload?: StripeSubscriptionPayload | null;
}): boolean {
  const user = opts.user;
  if (!user) return false;

  const dbStatus = (user.subscriptionStatus ?? "").toString().toLowerCase().trim();

  // 1) Database explicit paid entitlement
  if (dbStatus === "active") {
    return true;
  }

  // 2) App free trial window (normally DB `inactive`)
  if (hasTrialNotExpired(user)) {
    return true;
  }

  // 3) Stripe says they already have a billed subscription — allow even if DB still `inactive` (sync lag)
  if (stripePayloadShowsManagingSubscription(opts.stripePayload)) {
    return true;
  }

  // 4) DB `inactive` (or unset) + Stripe confirms a sub + billing period saved — webhook/DB mismatch
  if (
    (dbStatus === "inactive" || dbStatus === "") &&
    hasStalePaidEntitlementBeyondDbActive(user, opts.stripePayload)
  ) {
    return true;
  }

  return false;
}

/**
 * Paid or time-boxed trial access (DB fields only — no Stripe payload).
 */
export function hasActiveSubscription(user?: SubscriptionUser): boolean {
  if (!user) return false;

  const status = (user?.subscriptionStatus ?? "").toString().toLowerCase();
  if (status === "active") return true;

  if (hasTrialNotExpired(user)) return true;

  return false;
}

