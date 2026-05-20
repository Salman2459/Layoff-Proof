/** Persisted login payload (email login + Google OAuth callback). */
export const LAYOFF_PROOF_USER_STORAGE_KEY = "layoff-proof-user";

export type StoredAuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

/** Save JWT + user to localStorage (same shape as POST /api/auth/login). */
export function persistAuthLogin(payload: {
  user: StoredAuthUser;
  token: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LAYOFF_PROOF_USER_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // private mode / quota — ignore
  }
}

/** App-scoped keys: drafts, templates, etc. (e.g. `lp:autoJobApply:draft:*`). */
const APP_STORAGE_KEY_PREFIX = "lp:";

/**
 * Remove client-only auth and app data after the server ends the session.
 * Safe to call before navigating to GET `/api/logout` or after POST logout succeeds.
 */
export function clearClientStorageOnLogout(): void {
  if (typeof window === "undefined") return;
  try {
    const { localStorage } = window;
    localStorage.removeItem(LAYOFF_PROOF_USER_STORAGE_KEY);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(APP_STORAGE_KEY_PREFIX)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // private mode / quota — ignore
  }
}

/** Full navigation: clears local data then hits the server logout route. */
export function logoutViaFullPageNavigate(url = "/api/logout"): void {
  if (typeof window === "undefined") return;
  clearClientStorageOnLogout();
  window.location.href = url;
}
