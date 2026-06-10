import { lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { LayoffProofLayout } from "./LayoffProofLayout";
import { LayoffProofShellHeader } from "./LayoffProofShellHeader";
import { LayoffProofShellChromeProvider } from "./layoffproof-shell-chrome";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  isLayoffProofShellPath,
  layoffProofShellRequiresSubscription,
  resolveLayoffProofNavId,
} from "./layoffproof-shell-paths";

const LayoffProofDashboard = lazy(() => import("@/pages/layoffproof-dashboard"));
const AllActivitiesPage = lazy(() => import("@/pages/all-activities"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Profile = lazy(() => import("@/pages/profile"));
const ManageSubscription = lazy(() => import("@/pages/manage-subscription"));
const Affiliate = lazy(() => import("@/pages/affiliate"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const ResumeBuilder = lazy(() => import("@/pages/resume-builder"));
const CoverLetter = lazy(() => import("@/pages/cover-letter"));
const InterviewPreparation = lazy(() => import("@/pages/interview-preparation"));
const LinkedInOptimizer = lazy(() => import("@/pages/linkedin-optimizer"));
const RecruiterOutreach = lazy(() => import("@/pages/recruiter-outreach"));
const CareerPathAnalyzer = lazy(() => import("@/pages/career-path-analyzer"));
const SkillsAssessment = lazy(() => import("@/pages/skills-assessment"));
const AutoJobApply = lazy(() => import("@/pages/auto-job-apply"));
const AutoJobApplyDashboard = lazy(
  () => import("@/pages/auto-job-apply-dashboard"),
);
const JobBoardPage = lazy(() => import("@/pages/job-board"));

function MainContentLoader() {
  return (
    <div
      className="flex flex-1 items-center justify-center px-8 py-16"
      role="status"
      aria-label="Loading page content"
    >
      <div className="layoffproof-loader-ring" aria-hidden />
    </div>
  );
}

function ShellPage({
  requireSubscription,
  children,
}: {
  requireSubscription: boolean;
  children: ReactNode;
}) {
  return (
    <ProtectedRoute requireSubscription={requireSubscription}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Persistent app shell: sidebar stays mounted while only the main content area
 * swaps on navigation (no full-page reload flash).
 */
export function LayoffProofAppShell() {
  const [location] = useLocation();

  if (!isLayoffProofShellPath(location)) {
    return null;
  }

  const activeNavId = resolveLayoffProofNavId(location);
  const needsSubscription = layoffProofShellRequiresSubscription(location);

  return (
    <ShellPage requireSubscription={needsSubscription}>
      <LayoffProofLayout activeNavId={activeNavId}>
        <LayoffProofShellChromeProvider>
          <div className="flex min-h-0 flex-1 flex-col">
            <LayoffProofShellHeader path={location} />
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <Suspense fallback={<MainContentLoader />}>
                <Switch>
                  <Route path="/dashboard" component={LayoffProofDashboard} />
                  <Route path="/all-activities" component={AllActivitiesPage} />
                  <Route path="/lay-offs" component={Dashboard} />
                  <Route path="/profile" component={Profile} />
                  <Route path="/manage-subscription" component={ManageSubscription} />
                  <Route path="/affiliate" component={Affiliate} />
                  <Route path="/subscribe" component={Subscribe} />
                  <Route path="/resume-builder" component={ResumeBuilder} />
                  <Route path="/cover-letter" component={CoverLetter} />
                  <Route
                    path="/interview-preparation"
                    component={InterviewPreparation}
                  />
                  <Route path="/linkedin-optimizer" component={LinkedInOptimizer} />
                  <Route path="/recruiter-outreach" component={RecruiterOutreach} />
                  <Route path="/career-path-analyzer" component={CareerPathAnalyzer} />
                  <Route path="/skills-assessment" component={SkillsAssessment} />
                  <Route
                    path="/auto-job-apply-dashboard"
                    component={AutoJobApplyDashboard}
                  />
                  <Route path="/auto-job-apply" component={AutoJobApply} />
                  <Route path="/job-board" component={JobBoardPage} />
                </Switch>
              </Suspense>
            </div>
          </div>
        </LayoffProofShellChromeProvider>
      </LayoffProofLayout>
    </ShellPage>
  );
}
