import { layoffProofNavItems } from "./layoffproof-nav";

/** Paths rendered inside the persistent LayoffProof app shell (sidebar stays mounted). */
const SHELL_EXACT_PATHS = new Set([
  "/dashboard",
  "/all-activities",
  "/lay-offs",
  "/profile",
  "/manage-subscription",
  "/affiliate",
  "/subscribe",
  "/resume-builder",
  "/cover-letter",
  "/interview-preparation",
  "/linkedin-optimizer",
  "/recruiter-outreach",
  "/career-path-analyzer",
  "/skills-assessment",
  "/auto-job-apply",
  "/auto-job-apply-dashboard",
  "/job-board",
]);

const SHELL_PREFIX_PATHS = ["/auto-job-apply"];

export function isLayoffProofShellPath(path: string): boolean {
  if (SHELL_EXACT_PATHS.has(path)) return true;
  return SHELL_PREFIX_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Resolve sidebar highlight from the current URL. */
export function resolveLayoffProofNavId(path: string): string {
  for (const item of layoffProofNavItems) {
    if (item.match ? item.match(path) : path === item.href) {
      return item.id;
    }
  }
  if (path === "/lay-offs") return "lay-offs";
  if (path === "/manage-subscription") return "settings";
  if (path === "/all-activities") return "dashboard";
  return "dashboard";
}

/** Routes that require an active paid subscription. */
export function layoffProofShellRequiresSubscription(path: string): boolean {
  const paidOnly = new Set([
    "/resume-builder",
    "/cover-letter",
    "/interview-preparation",
    "/linkedin-optimizer",
    "/recruiter-outreach",
    "/career-path-analyzer",
    "/skills-assessment",
    "/auto-job-apply",
    "/auto-job-apply-dashboard",
    "/job-board",
  ]);
  if (paidOnly.has(path)) return true;
  return path.startsWith("/auto-job-apply");
}
