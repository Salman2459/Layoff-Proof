import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { getSafeRedirectPath } from "@/components/ProtectedRoute";
import { persistAuthLogin } from "@/lib/logoutStorage";

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

      setDest(getSafeRedirectPath(redirect) ?? "/");
    } catch {
      setError("invalid_payload");
    }
  }, []);

  if (error) {
    return <Redirect to={`/login?error=${error}`} />;
  }

  if (dest) {
    window.location.href = dest;
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center lp-page-mesh">
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
    </div>
  );
}

