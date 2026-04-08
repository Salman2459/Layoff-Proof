import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Info, Sparkles } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import { cn } from "@/lib/utils";

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
    "Priority email support",
  ],
  trialFeatures: [
    "Basic Resume Builder (1 template)",
    "3 resume downloads during trial",
    "Basic Cover Letter Generator",
    "Access to Layoff Tracker",
    "Limited Interview Preparation",
  ],
  buttonText: "Subscribe Plan",
};

const showcase = [
  {
    title: "AI Resume Builder",
    body: "Create professional resumes with our intelligent builder",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    tile: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    title: "Interview Prep",
    body: "Practice with AI-generated questions and get scored feedback",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    tile: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    title: "Layoff Tracker",
    body: "Stay informed about industry layoffs and company health",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
    tile: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    title: "LinkedIn Optimizer",
    body: "Optimize your LinkedIn profile for maximum visibility",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
      />
    ),
    tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
] as const;

const faqs = [
  {
    q: "How does the 7-day free trial work?",
    a: "Start your free trial with no credit card required. You'll have access to basic features for 7 days. After the trial, continue with full access until you choose to cancel or your account will be paused until you choose to subscribe.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period, and no future charges will be made.",
  },
  {
    q: "What's included in the subscription?",
    a: "Full access to all our AI-powered career tools: Resume Builder with 4 templates, unlimited downloads, Cover Letter Generator, Interview Prep, LinkedIn Optimizer, Recruiter Outreach scripts, and real-time Layoff Tracker with company monitoring.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 30-day money-back guarantee. If you're not satisfied with Layoff Proof within the first 30 days of your paid subscription, we'll provide a full refund.",
  },
] as const;

export default function Pricing() {
  const [showTrialFeatures, setShowTrialFeatures] = useState(false);

  const handleStartTrial = () => {
    window.location.href = "/subscribe";
  };

  return (
    <div className="min-h-screen lp-page-mesh">
      <GlobalHeader />

      <main>
        {/* Hero */}
        <section className="relative px-4 pb-10 pt-14 sm:px-6 lg:px-8">
          <div
            className="pointer-events-none absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-24 h-56 w-56 rounded-full bg-violet-400/15 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 border border-violet-200/60 bg-violet-100/90 px-3 py-1 text-violet-800 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-950/50 dark:text-violet-200"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Start Your{" "}
              <span className="lp-gradient-text">Career Journey</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              Unlock your career potential with our comprehensive suite of
              AI-powered tools. Start with a{" "}
              <span className="font-semibold text-foreground">
                7-day free trial
              </span>
              , then continue with full access.
            </p>
          </div>
        </section>

        {/* Pricing card */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md">
            <div className="lp-ring-frame shadow-2xl shadow-teal-900/10 dark:shadow-black/40">
              <Card className="relative border-0 bg-card shadow-none rounded-[13px]">
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="flex items-center gap-1.5 border-0 px-4 py-1.5 text-primary-foreground shadow-md lp-gradient-fill">
                    <Star className="h-4 w-4 fill-current" />
                    <span>7-Day Free Trial</span>
                  </Badge>
                </div>

                <CardHeader className="pb-6 pt-10 text-center">
                  <CardTitle className="text-3xl font-bold text-card-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="mt-4 text-base text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-6">
                  <div className="rounded-xl border border-border/80 bg-gradient-to-br from-teal-500/[0.07] via-card to-violet-500/[0.06] p-4 dark:from-teal-500/10 dark:to-violet-500/10">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-card-foreground">
                        {showTrialFeatures
                          ? "Trial features (7 days)"
                          : "Full features (after trial)"}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTrialFeatures(!showTrialFeatures)}
                        className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <Info className="mr-1 h-4 w-4" />
                        {showTrialFeatures ? "Show full" : "Show trial"}
                      </Button>
                    </div>
                    <ul className="space-y-3">
                      {(showTrialFeatures ? plan.trialFeatures : plan.features).map(
                        (feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-left text-sm text-card-foreground/90"
                          >
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col px-6 pb-8 pt-2">
                  <Button
                    size="lg"
                    className={cn(
                      "w-full border-0 py-6 text-lg font-semibold text-primary-foreground",
                      "lp-gradient-fill shadow-lg shadow-teal-900/15 ring-1 ring-black/5 transition",
                      "hover:opacity-[0.97] dark:ring-white/10"
                    )}
                    onClick={handleStartTrial}
                  >
                    {plan.buttonText}
                  </Button>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Secure checkout · Cancel anytime
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="border-y border-border/60 bg-card/60 py-20 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
              Everything You Need to{" "}
              <span className="lp-gradient-text">Succeed</span>
            </h2>
            <p className="mx-auto mb-14 max-w-2xl text-center text-muted-foreground">
              One subscription connects every tool in your career stack.
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {showcase.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm transition hover:border-primary/20 hover:shadow-md"
                >
                  <div
                    className={cn(
                      "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                      item.tile
                    )}
                  >
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-3xl">
            <h2 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
              Frequently Asked <span className="lp-gradient-text">Questions</span>
            </h2>
            <p className="mb-12 text-center text-muted-foreground">
              Straight answers about trials, billing, and what you get.
            </p>

            <div className="space-y-4">
              {faqs.map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-primary/15 hover:shadow-md"
                >
                  <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                    {item.q}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
}
