import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
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
const GoogleOAuthCallback = lazy(() => import("@/pages/google-oauth-callback"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const ManageSubscription = lazy(() => import("@/pages/manage-subscription"));
const AutoJobApply = lazy(() => import("@/pages/auto-job-apply"));
const AutoJobApplyDashboard = lazy(
  () => import("@/pages/auto-job-apply-dashboard")
);
const JobBoardPage = lazy(() => import("@/pages/job-board"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));

function Router() {

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//code.tidio.co/eijmmrvjhztkzw9by8dvmiysdyjyejni.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script); // Cleanup on unmount
    };
  }, []);

  
  return (
    <Suspense fallback={<PageLoader overlay />}>
    <Switch>
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/auth/google/callback" component={GoogleOAuthCallback} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
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
      <Route path="/manage-subscription">
        <ProtectedRoute>
          <ManageSubscription />
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

      {/* Career Tools — paid subscription required */}
      <Route path="/tools/resume-builder">
        <ProtectedRoute requireSubscription>
          <ResumeBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/cover-letter">
        <ProtectedRoute requireSubscription>
          <CoverLetter />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/interview-preparation">
        <ProtectedRoute requireSubscription>
          <InterviewPreparation />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/linkedin-optimizer">
        <ProtectedRoute requireSubscription>
          <LinkedInOptimizer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/recruiter-outreach">
        <ProtectedRoute requireSubscription>
          <RecruiterOutreach />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/promotion-planner">
        <ProtectedRoute requireSubscription>
          <PromotionPlanner />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/job-search-optimizer">
        <ProtectedRoute requireSubscription>
          <JobSearchOptimizer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/salary-negotiator">
        <ProtectedRoute requireSubscription>
          <SalaryNegotiator />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/career-path-analyzer">
        <ProtectedRoute requireSubscription>
          <CareerPathAnalyzer />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/skills-assessment">
        <ProtectedRoute requireSubscription>
          <SkillsAssessment />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/portfolio-builder">
        <ProtectedRoute requireSubscription>
          <PortfolioBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/networking-assistant">
        <ProtectedRoute requireSubscription>
          <NetworkingAssistant />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/auto-job-apply">
        <ProtectedRoute requireSubscription>
          <AutoJobApply />
        </ProtectedRoute>
      </Route>
      <Route path="/tools/auto-job-apply-dashboard">
        <ProtectedRoute requireSubscription>
          <AutoJobApplyDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/job-board">
        <ProtectedRoute requireSubscription>
          <JobBoardPage />
        </ProtectedRoute>
      </Route>

      <Route path="/privacy-policy" component={PrivacyPolicyPage} />

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
