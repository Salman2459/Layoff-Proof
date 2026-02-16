import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import ElevateLanding from "@/pages/elevate-landing";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Analytics from "@/pages/analytics";
import PricingNew from "@/pages/Pricing";
import Subscription from "@/pages/subscription";
import AdminDashboard from "@/pages/admin";
import EnhancedHomepage from "@/pages/enhanced-homepage";
import RiskScanner from "@/pages/risk-scanner";
import AuthLanding from "@/pages/auth-landing";
import AuthEnhanced from "@/pages/auth-enhanced";
import MagicLogin from "@/pages/magic-login";
import CareerToolsHub from "@/pages/career-tools-hub";
import LayoffTracker from "@/pages/layoff-tracker";
import ResumeBuilder from "@/pages/resume-builder";
import CoverLetter from "@/pages/cover-letter";
import InterviewPreparation from "@/pages/interview-preparation";
import LinkedInOptimizer from "@/pages/linkedin-optimizer";
import RecruiterOutreach from "@/pages/recruiter-outreach";
import PromotionPlanner from "@/pages/PromotionPlanner";
import JobSearchOptimizer from "@/pages/job-search-optimizer";
import SalaryNegotiator from "@/pages/salary-negotiator";
import CareerPathAnalyzer from "@/pages/career-path-analyzer";
import SkillsAssessment from "@/pages/skills-assessment";
import PortfolioBuilder from "@/pages/portfolio-builder";
import NetworkingAssistant from "@/pages/networking-assistant";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import Subscribe from "@/pages/Subscribe";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/pricing" component={PricingNew} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/auth" component={AuthEnhanced} />
      <Route path="/magic-login" component={MagicLogin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/risk-scanner" component={RiskScanner} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Career Tools */}
      <Route path="/tools" component={CareerToolsHub} />
      <Route path="/tools/layoff-tracker" component={LayoffTracker} />
      <Route path="/tools/resume-builder" component={ResumeBuilder} />
      <Route path="/tools/cover-letter" component={CoverLetter} />
      <Route path="/tools/interview-preparation" component={InterviewPreparation} />
      <Route path="/tools/linkedin-optimizer" component={LinkedInOptimizer} />
      <Route path="/tools/recruiter-outreach" component={RecruiterOutreach} />
      <Route path="/tools/promotion-planner" component={PromotionPlanner} />
      <Route path="/tools/job-search-optimizer" component={JobSearchOptimizer} />
      <Route path="/tools/salary-negotiator" component={SalaryNegotiator} />
      <Route path="/tools/career-path-analyzer" component={CareerPathAnalyzer} />
      <Route path="/tools/skills-assessment" component={SkillsAssessment} />
      <Route path="/tools/portfolio-builder" component={PortfolioBuilder} />
      <Route path="/tools/networking-assistant" component={NetworkingAssistant} />
      
      {/* Main homepage - accessible to all users */}
      <Route path="/" component={ElevateLanding} />
      <Route path="/old-home" component={CareerToolsHub} />
      <Route component={NotFound} />
    </Switch>
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
