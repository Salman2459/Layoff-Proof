import type { Request, Response } from "express";

/** Default express-session cookie name */
const SESSION_COOKIE_NAME = "connect.sid";

/**
 * Ends the login for this request: Passport logout (if present), then destroys
 * the express-session row in the store and clears the session cookie.
 */
export function destroyUserSession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const reqWithLogout = req as Request & {
      logout?: (cb: (err?: unknown) => void) => void;
    };

    const clearCookieAndResolve = () => {
      const base = { path: "/" as const, httpOnly: true };
      res.clearCookie(SESSION_COOKIE_NAME, base);
      // express-session signs this cookie by default when `secret` is set
      res.clearCookie(SESSION_COOKIE_NAME, { ...base, signed: true });
      resolve();
    };

    const runSessionDestroy = () => {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          reject(destroyErr);
          return;
        }
        clearCookieAndResolve();
      });
    };

    if (typeof reqWithLogout.logout === "function") {
      try {
        reqWithLogout.logout(() => {
          runSessionDestroy();
        });
      } catch {
        runSessionDestroy();
      }
    } else {
      runSessionDestroy();
    }
  });
}
