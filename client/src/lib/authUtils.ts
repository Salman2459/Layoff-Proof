export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message;
  if (/^401: .*Unauthorized/.test(m)) return true;
  // apiRequest / throwIfResNotOk surface JSON `message` without a status prefix
  if (m === "Unauthorized" || m === "Authentication required") return true;
  return /^401:\s/.test(m);
}