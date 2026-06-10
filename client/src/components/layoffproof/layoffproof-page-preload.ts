/** Preload route chunks on sidebar hover so navigation feels instant. */
export const layoffProofPagePreloaders: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/layoffproof-dashboard"),
  "/all-activities": () => import("@/pages/all-activities"),
  "/lay-offs": () => import("@/pages/dashboard"),
  "/profile": () => import("@/pages/profile"),
  "/manage-subscription": () => import("@/pages/manage-subscription"),
  "/affiliate": () => import("@/pages/affiliate"),
  "/subscribe": () => import("@/pages/Subscribe"),
  "/resume-builder": () => import("@/pages/resume-builder"),
  "/cover-letter": () => import("@/pages/cover-letter"),
  "/interview-preparation": () => import("@/pages/interview-preparation"),
  "/linkedin-optimizer": () => import("@/pages/linkedin-optimizer"),
  "/recruiter-outreach": () => import("@/pages/recruiter-outreach"),
  "/career-path-analyzer": () => import("@/pages/career-path-analyzer"),
  "/skills-assessment": () => import("@/pages/skills-assessment"),
  "/auto-job-apply": () => import("@/pages/auto-job-apply"),
  "/auto-job-apply-dashboard": () => import("@/pages/auto-job-apply-dashboard"),
  "/job-board": () => import("@/pages/job-board"),
};

export function preloadLayoffProofPage(href: string): void {
  const loader = layoffProofPagePreloaders[href];
  if (loader) void loader();
}
