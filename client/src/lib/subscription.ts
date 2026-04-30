type SubscriptionUser = {
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | Date | null;
};

export function hasActiveSubscription(user?: SubscriptionUser): boolean {
  if (!user) return false;

  const status = (user?.subscriptionStatus ?? "").toString().toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (status === "incomplete" || status === "incomplete_expired") return false;

  if (!user?.subscriptionEndDate) return false;
  const end = new Date(user?.subscriptionEndDate);
  if (Number.isNaN(end.getTime())) return false;
  return end > new Date();
}

