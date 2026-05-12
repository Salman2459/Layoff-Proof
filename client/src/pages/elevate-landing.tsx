import { Link } from "wouter";
import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Award,
  TrendingUp,
  FileText,
  Mail,
  Linkedin,
  MessageSquare,
  TrendingDown,
  Briefcase,
  Lock,
  Bot,
  type LucideProps,
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hasActiveSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { elevateLandingToolCards } from "./data.js";

/** Must match auto-job-apply: TOTAL_STEPS (8) + 1 after Documents step is saved */
const PROFILE_COMPLETE_STEP = 9;

type ToolIcon = ComponentType<LucideProps>;

const TOOL_CARD_ICONS: Record<string, ToolIcon> = {
  FileText,
  Mail,
  Users,
  Linkedin,
  MessageSquare,
  TrendingDown,
  Briefcase,
  Award,
  Bot,
};

type ToolCardTheme = {
  /** Top accent bar */
  bar: string;
  /** Icon tile background */
  iconTile: string;
  /** List bullet color */
  bullet: string;
};

function ToolPromoCard({
  title,
  description,
  features,
  icon: Icon,
  theme,
  popular,
  premium,
  comingSoonBadge,
  comingSoonButton,
  ctaLabel,
  ctaDisabled,
  onCtaClick,
}: {
  title: string;
  description: string;
  features: string[];
  icon: ToolIcon;
  theme: ToolCardTheme;
  popular?: boolean;
  premium?: boolean;
  /** Small accent badge in header for coming-soon cards */
  comingSoonBadge?: boolean;
  /** Gray disabled CTA */
  comingSoonButton?: boolean;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onCtaClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "shadow-md transition-[box-shadow,transform] duration-300 ease-out",
        "hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-0.5",
        "active:shadow-xl active:translate-y-0",
        "has-[button:active]:shadow-xl has-[button:active]:translate-y-0",
        "focus-within:shadow-2xl focus-within:shadow-primary/20 focus-within:-translate-y-0.5",
        "dark:hover:shadow-primary/25 dark:focus-within:shadow-primary/25"
      )}
    >
      <div
        className={cn("h-1.5 w-full shrink-0 bg-gradient-to-r", theme.bar)}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
                theme.iconTile
              )}
            >
              <Icon className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-left text-lg font-bold leading-snug text-card-foreground">
              {title}
            </h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {popular && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm",
                  "bg-gradient-to-r from-amber-400 to-yellow-500"
                )}
              >
                <Star className="h-3 w-3 fill-white text-white" />
                Popular
              </span>
            )}
            {premium && (
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                Premium
              </span>
            )}
            {comingSoonBadge && !premium && (
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold capitalize text-primary-foreground shadow-sm">
                coming soon
              </span>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <ul className="mb-6 flex flex-1 flex-col gap-2">
          {features.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2.5 text-sm text-card-foreground/90"
            >
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  theme.bullet
                )}
              />
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ul>

        {comingSoonButton ? (
          <Button
            type="button"
            disabled
            className={cn(
              "h-11 w-full cursor-not-allowed rounded-lg border border-border/80 bg-muted/90",
              "font-semibold text-muted-foreground shadow-sm hover:bg-muted/90"
            )}
          >
            Coming Soon
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onCtaClick}
            disabled={ctaDisabled}
            className={cn(
              "h-11 w-full rounded-lg border-0 font-semibold text-primary-foreground shadow-md",
              "lp-gradient-fill shadow-teal-900/10 transition hover:opacity-[0.97] disabled:opacity-60",
              "ring-1 ring-black/5 dark:ring-white/10"
            )}
          >
            {(ctaLabel ?? "").includes("Sign Up") && (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {ctaLabel ?? "Try Now"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ElevateLanding() {
  const { isAuthenticated } = useAuth();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiAutoApplyChecking, setAiAutoApplyChecking] = useState(false);

  const handleToolAccess = (toolPath: string) => {
    // Guests must sign up / log in first — do not send them to pricing before an account exists.
    if (!isAuthenticated) {
      window.location.href = "/signup";
      return;
    }

    if (!hasActiveSubscription(user)) {
      toast({
        title: "Subscription Required",
        description: "Please upgrade to access this tool.",
        variant: "destructive",
      });
      window.location.href = "/subscribe";
      return;
    }

    window.location.href = toolPath;
  };

  /** AI Auto Apply card: if profile is complete (step 8), go to dashboard; else go to form. */
  const handleAIAutoApplyAccess = async () => {
    if (!isAuthenticated) {
      window.location.href = "/signup";
      return;
    }

    if (!hasActiveSubscription(user)) {
      toast({
        title: "Subscription Required",
        description: "Please upgrade to access this tool.",
        variant: "destructive",
      });
      window.location.href = "/subscribe";
      return;
    }

    const userId = user?.id;
    if (!userId) {
      window.location.href = '/tools/auto-job-apply';
      return;
    }

    setAiAutoApplyChecking(true);
    try {
      const res = await fetch(`/api/profile/jobprofile/${userId}`, { credentials: 'include' });
      const json = await res.json();
      const profile = json.data ?? null;
      const currentStep = profile?.currentStep ?? 0;
      if (currentStep >= PROFILE_COMPLETE_STEP) {
        window.location.href = '/tools/auto-job-apply-dashboard';
      } else {
        window.location.href = '/tools/auto-job-apply';
      }
    } catch {
      window.location.href = '/tools/auto-job-apply';
    } finally {
      setAiAutoApplyChecking(false);
    }
  };

  return (
    <div className="min-h-screen lp-page-mesh">
      <GlobalHeader />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24" style={{ display: !isAuthenticated ? 'block' : 'none' }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className="border border-violet-200/60 bg-violet-100/90 text-violet-800 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-950/50 dark:text-violet-200"
              >
                ✨ AI-Powered Career Platform
              </Badge>

              <h1 className="text-5xl font-bold leading-tight text-foreground lg:text-6xl">
                Elevate Your{" "}
                <span className="lp-gradient-text">Career</span>
                <br />
                <span className="lp-gradient-text">Journey</span>
              </h1>

              <p className="max-w-lg text-xl leading-relaxed text-muted-foreground">
                Transform your job search & job security with our AI that helps you land your dream job faster & keep it!
              </p>
            </div>

            {/* Feature Benefits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  AI-powered career tools
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  ATS-optimized content
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Layoff tracker - Interview practice & prep
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  AI generated resume & cover letter
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Recruiter outreach generator
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Expert guidance</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="border-0 px-8 py-3 text-lg text-primary-foreground shadow-lg lp-gradient-fill"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-4 pt-4">
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-semibold text-gray-900">4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>50,000+ successful job placements</span>
              </div>
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
  <iframe
    width="560"
    height="315"
    src="https://www.youtube-nocookie.com/embed/odnex9mQJI4?si=hlcj1UlplWQDCLZB&controls=0&autoplay=1&mute=1"
    title="YouTube video player"
    frameBorder={0}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
    className="absolute inset-0 h-full w-full border-0"
  />
</div>
        </div>
      </main>

      {/* Tools Section */}
      <section className="border-y border-border/60 bg-card/80 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-foreground">
              Powerful AI Tools for Every{" "}
              <span className="lp-gradient-text">Career Stage</span>
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
              From resume building to interview preparation, our comprehensive toolkit has everything you need to succeed in your career journey.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {elevateLandingToolCards.map((card) => {
              const Icon = TOOL_CARD_ICONS[card.iconKey];
              if (!Icon) return null;

              const comingSoon = card.access === "coming-soon";
              const isAiAutoApply = card.access === "ai-auto-apply";
              const toolPath =
                card.access === "tool" ? card.toolPath : undefined;

              return (
                <ToolPromoCard
                  key={card.id}
                  title={card.title}
                  description={card.description}
                  features={card.features}
                  icon={Icon}
                  theme={card.theme}
                  popular={card.popular}
                  premium={card.premium}
                  comingSoonButton={comingSoon}
                  ctaLabel={
                    comingSoon
                      ? undefined
                      : isAiAutoApply
                        ? aiAutoApplyChecking
                          ? "Checking..."
                          : !isAuthenticated
                            ? "Sign Up to Access"
                            : "Try Now"
                        : !isAuthenticated
                          ? "Sign Up to Access"
                          : "Try Now"
                  }
                  ctaDisabled={isAiAutoApply ? aiAutoApplyChecking : undefined}
                  onCtaClick={
                    comingSoon
                      ? undefined
                      : isAiAutoApply
                        ? handleAIAutoApplyAccess
                        : toolPath
                          ? () => handleToolAccess(toolPath)
                          : undefined
                  }
                />
              );
            })}
          </div>
        </div>




      </section>

      {/* CTA Section */}
      <section
        className="lp-gradient-cta relative py-20 md:py-24"
        style={{ display: !isAuthenticated ? "block" : "none" }}
      >
        <div
          className="pointer-events-none absolute -left-24 top-1/2 z-[1] h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-cyan-300/25 blur-3xl motion-reduce:opacity-50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 z-[1] h-72 w-72 rounded-full bg-violet-400/18 blur-3xl motion-reduce:opacity-50"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-100/90">
            Take the next step
          </p>
          <h2 className="mb-5 text-balance text-3xl font-bold tracking-tight text-white drop-shadow-sm md:text-4xl">
            Ready to Transform Your Career?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-white/85 md:text-xl">
            Join thousands of professionals who have already elevated their
            careers with our AI-powered platform.
          </p>
          <Link href="/magic-login">
            <Button
              size="lg"
              className="group border-2 border-white/40 bg-white px-10 py-6 text-lg font-semibold text-teal-800 shadow-2xl shadow-teal-950/25 ring-4 ring-white/10 transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-teal-50 hover:shadow-teal-950/30"
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer relative">
        <div className="relative z-[2] mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-row gap-8 justify-between items-center">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg lp-gradient-fill shadow-md shadow-teal-600/20 ring-1 ring-primary/20">
                  <span className="text-sm font-bold text-primary-foreground">
                    LP
                  </span>
                </div>
                <span className="lp-gradient-text text-xl font-bold">
                  Layoff Proof
                </span>
              </Link>
              <p className=" text-sm leading-relaxed text-muted-foreground">
                Empowering careers with AI-powered tools and insights.
              </p>
            </div>

            <div className="clear-both">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Tools
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/tools/resume-builder"
                    className="transition-colors hover:text-primary"
                  >
                    Resume Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tools/cover-letter"
                    className="transition-colors hover:text-primary"
                  >
                    Cover Letter Generator
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tools/interview-preparation"
                    className="transition-colors hover:text-primary"
                  >
                    Interview Prep
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tools/linkedin-optimizer"
                    className="transition-colors hover:text-primary"
                  >
                    LinkedIn Optimizer
                  </Link>
                </li>
              </ul>
            </div>

            {/* <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Company
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    About
                  </a>
                </li>
                <li>
                  <Link
                    href="/subscribe"
                    className="transition-colors hover:text-primary"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Support
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div> */}
          </div>

          <div className="mt-8 border-t border-border pt-8">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Layoff Proof. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}