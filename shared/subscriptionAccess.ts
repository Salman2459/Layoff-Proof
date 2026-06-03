/** Shared promo (coupon) access rules — used by server and client. */

export type SubscriptionAccessUser = {
  subscriptionStatus?: string | null;
  subscriptionEndDate?: Date | string | null;
  subscriptionViaCoupon?: boolean | null;
};

export function parseSubscriptionEndDate(
  end: Date | string | null | undefined,
): Date | null {
  if (end == null) return null;
  const d = end instanceof Date ? end : new Date(end);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Promo subscribers lose access after `subscription_end_date` (one Stripe billing period). */
export function isCouponAccessPeriodExpired(
  user: SubscriptionAccessUser | null | undefined,
): boolean {
  if (!user?.subscriptionViaCoupon) return false;
  const end = parseSubscriptionEndDate(user.subscriptionEndDate);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

export function effectiveSubscriptionStatus(
  user: SubscriptionAccessUser | null | undefined,
): "active" | "inactive" {
  if (!user) return "inactive";
  const raw = (user.subscriptionStatus ?? "").toString().toLowerCase().trim();
  if (raw !== "active") return "inactive";
  if (isCouponAccessPeriodExpired(user)) return "inactive";
  return "active";
}

export function withEffectiveSubscriptionFields<T extends SubscriptionAccessUser>(
  user: T,
): T & { subscriptionStatus: "active" | "inactive" } {
  return {
    ...user,
    subscriptionStatus: effectiveSubscriptionStatus(user),
  };
}
