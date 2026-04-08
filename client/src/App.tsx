import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/PageLoader";

const NotFound = lazy(() => import("@/pages/not-found"));
const ElevateLanding = lazy(() => import("@/pages/elevate-landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Profile = lazy(() => import("@/pages/profile"));
const Analytics = lazy(() => import("@/pages/analytics"));
const PricingNew = lazy(() => import("@/pages/Pricing"));
const Subscription = lazy(() => import("@/pages/subscription"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const RiskScanner = lazy(() => import("@/pages/risk-scanner"));
const AuthEnhanced = lazy(() => import("@/pages/auth-enhanced"));
const MagicLogin = lazy(() => import("@/pages/magic-login"));
const ResumeBuilder = lazy(() => import("@/pages/resume-builder"));
const CoverLetter = lazy(() => import("@/pages/cover-letter"));
const InterviewPreparation = lazy(() => import("@/pages/interview-preparation"));
const LinkedInOptimizer = lazy(() => import("@/pages/linkedin-optimizer"));
const RecruiterOutreach = lazy(() => import("@/pages/recruiter-outreach"));
const PromotionPlanner = lazy(() => import("@/pages/PromotionPlanner"));
const JobSearchOptimizer = lazy(() => import("@/pages/job-search-optimizer"));
const SalaryNegotiator = lazy(() => import("@/pages/salary-negotiator"));
const CareerPathAnalyzer = lazy(() => import("@/pages/career-path-analyzer"));
const SkillsAssessment = lazy(() => import("@/pages/skills-assessment"));
const PortfolioBuilder = lazy(() => import("@/pages/portfolio-builder"));
const NetworkingAssistant = lazy(() => import("@/pages/networking-assistant"));
const Signup = lazy(() => import("@/pages/Signup"));
const Login = lazy(() => import("@/pages/Login"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const AutoJobApply = lazy(() => import("@/pages/auto-job-apply"));
const AutoJobApplyDashboard = lazy(
  () => import("@/pages/auto-job-apply-dashboard")
);

function Router() {
  return (
    <Suspense fallback={<PageLoader overlay />}>
    <Switch>
      <Route path="/pricing" component={PricingNew} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/auth" component={AuthEnhanced} />
      <Route path="/magic-login" component={MagicLogin} />

      <Route path="/subscribe">
        <ProtectedRoute>
          <Subscribe />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/subscription">
        <ProtectedRoute>
          <Subscription />
        </ProtectedRoute>
      </Route>
      <Route path="/risk-scanner">
        <ProtectedRoute>
          <RiskScanner />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      {/* Career Tools */}
      <Route path="/tools/resume-builder">
        <ProtectedRoute>
          <ResumeBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/cover-letter">
        <ProtectedRoute>
          <CoverLetter />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/interview-preparation">
        <ProtectedRoute>
          <InterviewPreparation />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/linkedin-optimizer">
        <ProtectedRoute>
          <LinkedInOptimizer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/recruiter-outreach">
        <ProtectedRoute>
          <RecruiterOutreach />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/promotion-planner">
        <ProtectedRoute>
          <PromotionPlanner />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/job-search-optimizer">
        <ProtectedRoute>
          <JobSearchOptimizer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/salary-negotiator">
        <ProtectedRoute>
          <SalaryNegotiator />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/career-path-analyzer">
        <ProtectedRoute>
          <CareerPathAnalyzer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/skills-assessment">
        <ProtectedRoute>
          <SkillsAssessment />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/portfolio-builder">
        <ProtectedRoute>
          <PortfolioBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/networking-assistant">
        <ProtectedRoute>
          <NetworkingAssistant />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/auto-job-apply">
        <ProtectedRoute>
          <AutoJobApply />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/auto-job-apply-dashboard">
        <ProtectedRoute>
          <AutoJobApplyDashboard />
        </ProtectedRoute>
      </Route>

      {/* Main homepage - accessible to all users */}
      <Route path="/" component={ElevateLanding} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
