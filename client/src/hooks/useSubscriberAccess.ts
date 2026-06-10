import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";
import {
  hasSubscriberAccess,
  type StripeSubscriptionPayload,
  type SubscriptionUser,
} from "@/lib/subscription";

/**
 * Paid access check used across the app — combines DB user fields with
 * `/api/stripe/subscription-status` (same logic as Manage Subscription).
 */
export function useSubscriberAccess() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: stripePayload, isLoading: stripeLoading } =
    useQuery<StripeSubscriptionPayload | null>({
      queryKey: ["/api/stripe/subscription-status"],
      queryFn: getQueryFn<StripeSubscriptionPayload | null>({ on401: "returnNull" }),
      enabled: isAuthenticated,
      staleTime: 60_000,
    });

  const hasAccess = hasSubscriberAccess({
    user: user as SubscriptionUser | undefined,
    stripePayload,
  });

  return {
    user,
    hasAccess,
    stripePayload,
    isLoading: authLoading || (isAuthenticated && stripeLoading),
  };
}
