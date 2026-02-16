import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Info } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";

const plan = {
  name: "Layoff Proof Pro",
  description: "Complete career resilience platform with 7-day free trial",
  trialDays: 7,
  features: [
    "AI-powered Resume Builder with 4 premium templates",
    "Unlimited resume downloads and exports",
    "Smart Cover Letter Generator",
    "AI Interview Question Generator & Scorer",
    "LinkedIn Profile Optimizer",
    "Recruiter Outreach Script Generator",
    "Real-time Layoff Tracker with alerts",
    "Advanced company monitoring (up to 50)",
    "Resume analytics and insights",
    "Priority email support"
  ],
  trialFeatures: [
    "Basic Resume Builder (1 template)",
    "3 resume downloads during trial",
    "Basic Cover Letter Generator",
    "Access to Layoff Tracker",
    "Limited Interview Preparation"
  ],
  buttonText: "Subscribe Plan",
  popular: true,
  color: "border-blue-500"
};

export default function Pricing() {
  const [showTrialFeatures, setShowTrialFeatures] = useState(false);

  const handleStartTrial = () => {
    // Redirect to Stripe payment page
    window.location.href = "/subscribe";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GlobalHeader />

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Start Your Career Journey
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Unlock your career potential with our comprehensive suite of AI-powered tools.
            Start with a 7-day free trial, then continue
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-md mx-auto mb-16">
          <Card className={`relative ${plan.color} ring-2 ring-blue-500 shadow-xl transform transition-all duration-300 hover:scale-105`}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-600 text-white px-4 py-1 flex items-center space-x-1">
                <Star className="w-4 h-4 fill-current" />
                <span>7-Day Free Trial</span>
              </Badge>
            </div>

            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                {plan.name}
              </CardTitle>
              <div className="flex items-baseline justify-center space-x-2">
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-4 text-lg">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Trial Features Toggle */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {showTrialFeatures ? "Trial Features (7 days)" : "Full Features (after trial)"}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTrialFeatures(!showTrialFeatures)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Info className="w-4 h-4 mr-1" />
                    {showTrialFeatures ? "Show Full" : "Show Trial"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {(showTrialFeatures ? plan.trialFeatures : plan.features).map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
                size="lg"
                onClick={handleStartTrial}
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Features Showcase */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Everything You Need to Succeed
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Resume Builder</h3>
              <p className="text-gray-600 dark:text-gray-300">Create professional resumes with our intelligent builder</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Interview Prep</h3>
              <p className="text-gray-600 dark:text-gray-300">Practice with AI-generated questions and get scored feedback</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Layoff Tracker</h3>
              <p className="text-gray-600 dark:text-gray-300">Stay informed about industry layoffs and company health</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">LinkedIn Optimizer</h3>
              <p className="text-gray-600 dark:text-gray-300">Optimize your LinkedIn profile for maximum visibility</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                How does the 7-day free trial work?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Start your free trial with no credit card required. You'll have access to basic features for 7 days. After the trial, continue with full access until you choose to cancel or your account will be paused until you choose to subscribe.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period, and no future charges will be made.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What's included in the subscription?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Full access to all our AI-powered career tools: Resume Builder with 4 templates, unlimited downloads, Cover Letter Generator, Interview Prep, LinkedIn Optimizer, Recruiter Outreach scripts, and real-time Layoff Tracker with company monitoring.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We offer a 30-day money-back guarantee. If you're not satisfied with Layoff Proof within the first 30 days of your paid subscription, we'll provide a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>

      <GlobalFooter />
    </div>
  );
}