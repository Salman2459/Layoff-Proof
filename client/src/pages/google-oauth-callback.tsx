import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { AuthLoadingScreen } from "@/components/auth/AuthLayout";
import { getSafeRedirectPath } from "@/components/ProtectedRoute";
import { persistAuthLogin } from "@/lib/logoutStorage";
import { seedAuthCacheAndRefresh } from "@/lib/authNavigation";

/**
 * Completes Google sign-in: reads JWT + user from the URL hash (set by the server
 * OAuth callback) and persists them like email/password login.
 */
export default function GoogleOAuthCallback() {
  const [dest, setDest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      setError("missing_token");
      return;
    }

    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const userRaw = params.get("user");
    const redirect = params.get("redirect");

    if (!token || !userRaw) {
      setError("missing_token");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
      };

      persistAuthLogin({ user, token });

      window.history.replaceState(null, "", window.location.pathname);

      seedAuthCacheAndRefresh(user);
      setDest(getSafeRedirectPath(redirect) ?? "/dashboard");
    } catch {
      setError("invalid_payload");
    }
  }, []);

  if (error) {
    return <Redirect to={`/login?error=${error}`} />;
  }

  if (dest) {
    return <Redirect to={dest} />;
  }

  return <AuthLoadingScreen />;
}

