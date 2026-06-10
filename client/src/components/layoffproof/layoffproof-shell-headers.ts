export type ShellHeaderConfig =
  | { type: "greeting"; subtitle?: string }
  | { type: "page"; title: string; subtitle: string }
  | { type: "none" };

const DEFAULT_GREETING_SUBTITLE = "Let's accelerate your dream career with AI.";

/** Per-route header shown by the persistent shell (not re-mounted on navigation). */
export const SHELL_HEADER_BY_PATH: Record<string, ShellHeaderConfig> = {
  "/dashboard": { type: "greeting" },
  "/lay-offs": { type: "greeting" },
  "/all-activities": {
    type: "page",
    title: "All Activity",
    subtitle: "Your full history across Layoff Proof tools and profile updates.",
  },
  "/profile": {
    type: "page",
    title: "Profile Settings",
    subtitle: "Manage your account information and notification preferences",
  },
  "/manage-subscription": { type: "greeting" },
  "/affiliate": {
    type: "page",
    title: "Affiliate Program",
    subtitle: "Share your link and earn commission when friends subscribe.",
  },
  "/subscribe": { type: "greeting" },
  "/resume-builder": { type: "none" },
  "/cover-letter": { type: "greeting" },
  "/interview-preparation": { type: "greeting" },
  "/linkedin-optimizer": {
    type: "page",
    title: "LinkedIn Optimizer",
    subtitle:
      "Optimize your LinkedIn profile to attract recruiters and get more opportunities ✨",
  },
  "/recruiter-outreach": { type: "greeting" },
  "/career-path-analyzer": { type: "greeting" },
  "/skills-assessment": { type: "greeting" },
  "/auto-job-apply": { type: "greeting" },
  "/auto-job-apply-dashboard": { type: "greeting" },
  "/job-board": { type: "greeting" },
};

export function resolveShellHeaderConfig(path: string): ShellHeaderConfig {
  if (SHELL_HEADER_BY_PATH[path]) return SHELL_HEADER_BY_PATH[path];
  if (path.startsWith("/auto-job-apply")) {
    return { type: "greeting" };
  }
  return { type: "greeting", subtitle: DEFAULT_GREETING_SUBTITLE };
}
