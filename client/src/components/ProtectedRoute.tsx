import type { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { hasActiveSubscription } from "@/lib/subscription";

/** Only allows same-origin relative paths (prevents open redirects). */
export function getSafeRedirectPath(redirect: string | null): string | null {
  if (!redirect || typeof redirect !== "string") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(redirect.trim());
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  return decoded;
}

export function ProtectedRoute({
  children,
  requireSubscription = false,
}: {
  children: ReactNode;
  /** When true, only users with `subscriptionStatus === "active"` may view the route. */
  requireSubscription?: boolean;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    const safe = getSafeRedirectPath(location);
    const qs =
      safe && safe !== "/login" && safe !== "/signup"
        ? `?redirect=${encodeURIComponent(safe)}`
        : "";
    return <Redirect to={`/login${qs}`} />;
  }

  if (requireSubscription && !hasActiveSubscription(user)) {
    return <Redirect to="/subscribe" />;
  }

  return <>{children}</>;
}
