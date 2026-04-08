import type { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";

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

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
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

  return <>{children}</>;
}
