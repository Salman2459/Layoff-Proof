type SubscriptionUser = {
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | Date | null;
};

export function hasActiveSubscription(user?: SubscriptionUser): boolean {
  if (!user) return false;

  // Prefer the explicit status when present.
  if ((user.subscriptionStatus ?? "").toLowerCase() === "active") return true;

  // Back-compat: some flows rely on an end date.
  if (!user.subscriptionEndDate) return false;
  const end = new Date(user.subscriptionEndDate);
  if (Number.isNaN(end.getTime())) return false;
  return end > new Date();
}

