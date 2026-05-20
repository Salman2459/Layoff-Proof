export type StripeSubscriptionPayload = {
  hasSubscription?: boolean;
  status?: string | null;
};

export type SubscriptionUser = {
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | Date | null;
  stripeSubscriptionId?: string | null;
  subscriptionPlan?: string | null;
};

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
 * When DB says `inactive` but webhooks lag, Stripe confirms paid access.
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
 * (`/api/stripe/subscription-status`). No app free trial.
 */
export function hasSubscriberAccess(opts: {
  user?: SubscriptionUser;
  stripePayload?: StripeSubscriptionPayload | null;
}): boolean {
  const user = opts.user;
  if (!user) return false;

  const dbStatus = (user.subscriptionStatus ?? "").toString().toLowerCase().trim();

  if (dbStatus === "active") {
    return true;
  }

  if (stripePayloadShowsManagingSubscription(opts.stripePayload)) {
    return true;
  }

  if (
    (dbStatus === "inactive" || dbStatus === "") &&
    hasStalePaidEntitlementBeyondDbActive(user, opts.stripePayload)
  ) {
    return true;
  }

  return false;
}

/** Paid subscription only (`subscription_status === "active"`). */
export function hasActiveSubscription(user?: SubscriptionUser): boolean {
  if (!user) return false;
  const status = (user.subscriptionStatus ?? "").toString().toLowerCase().trim();
  return status === "active";
}

/** Where to send the user immediately after sign-in / sign-up. */
export function getPostAuthRedirectPath(
  user: SubscriptionUser | undefined,
  requestedRedirect?: string | null,
): string {
  if (!hasActiveSubscription(user)) {
    return "/subscribe";
  }
  const safe =
    requestedRedirect != null && typeof requestedRedirect === "string"
      ? requestedRedirect.trim()
      : null;
  if (safe && safe.startsWith("/") && !safe.startsWith("//") && !safe.includes("://")) {
    try {
      const decoded = decodeURIComponent(safe);
      if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("://")) {
        return decoded;
      }
    } catch {
      // ignore malformed redirect
    }
  }
  return "/";
}
