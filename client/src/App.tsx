import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/PageLoader";
import { LayoffProofAppShell } from "@/components/layoffproof/LayoffProofAppShell";
import { isLayoffProofShellPath } from "@/components/layoffproof/layoffproof-shell-paths";

const NotFound = lazy(() => import("@/pages/not-found"));
const ElevateLanding = lazy(() => import("@/pages/elevate-landing"));
const LayoffProofLandingPage = lazy(() => import("@/pages/layoffproof-landing"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Subscription = lazy(() => import("@/pages/subscription"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const RiskScanner = lazy(() => import("@/pages/risk-scanner"));
const AuthEnhanced = lazy(() => import("@/pages/auth-enhanced"));
const MagicLogin = lazy(() => import("@/pages/magic-login"));
const PromotionPlanner = lazy(() => import("@/pages/PromotionPlanner"));
const JobSearchOptimizer = lazy(() => import("@/pages/job-search-optimizer"));
const SalaryNegotiator = lazy(() => import("@/pages/salary-negotiator"));
const PortfolioBuilder = lazy(() => import("@/pages/portfolio-builder"));
const NetworkingAssistant = lazy(() => import("@/pages/networking-assistant"));
const Signup = lazy(() => import("@/pages/Signup"));
const Login = lazy(() => import("@/pages/Login"));
const GoogleOAuthCallback = lazy(() => import("@/pages/google-oauth-callback"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//code.tidio.co/eijmmrvjhztkzw9by8dvmiysdyjyejni.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Persistent shell: sidebar stays mounted; only main content swaps.
  if (isLayoffProofShellPath(location)) {
    return <LayoffProofAppShell />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <Route path="/auth/google/callback" component={GoogleOAuthCallback} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/auth" component={AuthEnhanced} />
        <Route path="/magic-login" component={MagicLogin} />

        <Route path="/dashboard">
          <Redirect to="/lay-offs" />
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

        <Route path="/promotion-planner">
          <ProtectedRoute requireSubscription>
            <PromotionPlanner />
          </ProtectedRoute>
        </Route>
        <Route path="/job-search-optimizer">
          <ProtectedRoute requireSubscription>
            <JobSearchOptimizer />
          </ProtectedRoute>
        </Route>
        <Route path="/salary-negotiator">
          <ProtectedRoute requireSubscription>
            <SalaryNegotiator />
          </ProtectedRoute>
        </Route>
        <Route path="/portfolio-builder">
          <ProtectedRoute requireSubscription>
            <PortfolioBuilder />
          </ProtectedRoute>
        </Route>
        <Route path="/networking-assistant">
          <ProtectedRoute requireSubscription>
            <NetworkingAssistant />
          </ProtectedRoute>
        </Route>

        {/* Legacy /tools/* redirects */}
        <Route path="/tools/resume-builder"><Redirect to="/resume-builder" /></Route>
        <Route path="/tools/cover-letter"><Redirect to="/cover-letter" /></Route>
        <Route path="/tools/interview-preparation"><Redirect to="/interview-preparation" /></Route>
        <Route path="/tools/linkedin-optimizer"><Redirect to="/linkedin-optimizer" /></Route>
        <Route path="/tools/recruiter-outreach"><Redirect to="/recruiter-outreach" /></Route>
        <Route path="/tools/promotion-planner"><Redirect to="/promotion-planner" /></Route>
        <Route path="/tools/job-search-optimizer"><Redirect to="/job-search-optimizer" /></Route>
        <Route path="/tools/salary-negotiator"><Redirect to="/salary-negotiator" /></Route>
        <Route path="/tools/career-path-analyzer"><Redirect to="/career-path-analyzer" /></Route>
        <Route path="/tools/skills-assessment"><Redirect to="/skills-assessment" /></Route>
        <Route path="/tools/portfolio-builder"><Redirect to="/portfolio-builder" /></Route>
        <Route path="/tools/networking-assistant"><Redirect to="/networking-assistant" /></Route>
        <Route path="/tools/auto-job-apply-dashboard"><Redirect to="/auto-job-apply-dashboard" /></Route>
        <Route path="/tools/auto-job-apply"><Redirect to="/auto-job-apply" /></Route>

        <Route path="/privacy-policy" component={PrivacyPolicyPage} />

        <Route path="/" component={LayoffProofLandingPage} />
        <Route path="/layoff-proof" component={ElevateLanding} />
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
