import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  HelpCircle,
  Lock,
  MessageCircle,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { SubscribeHeroIllustration } from "./SubscribeHeroIllustration";
import { cn } from "@/lib/utils";

const trustItems = [

  {
    icon: Zap,
    title: "Cancel Anytime",
    description: "You can cancel your plan anytime. No questions asked.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Your payments are safe with bank-level encryption.",
  },
  {
    icon: Users,
    title: "Trusted by 10K+ Users",
    description: "Join thousands who landed their dream job.",
  },
] as const;

const showcase = [
  {
    title: "AI Resume Builder",
    body: "Create professional resumes with our intelligent builder",
    icon: FileText,
    tile: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Interview Prep",
    body: "Practice with AI-generated questions and get scored feedback",
    icon: HelpCircle,
    tile: "bg-violet-50 text-violet-600",
  },
  {
    title: "Layoff Tracker",
    body: "Stay informed about industry layoffs and company health",
    icon: Zap,
    tile: "bg-sky-50 text-sky-600",
  },
  {
    title: "LinkedIn Optimizer",
    body: "Optimize your LinkedIn profile for maximum visibility",
    icon: MessageCircle,
    tile: "bg-amber-50 text-amber-600",
  },
] as const;

const faqs = [
  {
    q: "When do I get access to the tools?",
    a: "As soon as your subscription payment is confirmed, your account is activated and you can use every AI career tool.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
  {
    q: "What's included in the subscription?",
    a: "Full access to AI-powered career tools: Resume Builder, Cover Letter Generator, Interview Prep, LinkedIn Optimizer, Job Tracker, and more.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 14-day money-back guarantee. If you're not satisfied within the first 14 days, we'll provide a full refund.",
  },
] as const;

export function SubscribePricingHero() {
  return (
    <div className="relative mb-8 flex flex-col items-start justify-between gap-6 pt-2 lg:flex-row lg:items-center">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-[#8b5cf6]">Choose Your Plan</p>
        <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-tight text-[#0f172a] sm:text-[34px]">
          Unlock Premium Features and{" "}
          <span className="text-[#8b5cf6]">Supercharge</span> Your Career
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#64748b]">
          Choose the perfect plan for your job search needs.
        </p>
      </div>
      <SubscribeHeroIllustration />
    </div>
  );
}

export function SubscribeTrustBar() {
  return (
    <div className="mb-10 rounded-2xl bg-[#f5f3ff] px-5 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <Icon className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubscribeFeatureHighlights() {
  return (
    <section className="py-10">
      <div className="text-center">
        <h2 className="text-[28px] font-bold text-[#0f172a] sm:text-[30px]">
          Everything You Need to <span className="text-[#8b5cf6]">Succeed</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#64748b]">
          One subscription connects every tool in your career stack.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.map(({ title, body, icon: Icon, tile }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#e8ecf4] bg-white p-6 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
            >
              <div
                className={cn(
                  "mx-auto mb-4 flex h-[56px] w-[56px] items-center justify-center rounded-2xl",
                  tile
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="text-[15px] font-bold text-[#0f172a]">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SubscribeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="pb-14 pt-4">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-[28px] font-bold text-[#0f172a] sm:text-[30px]">
          Frequently Asked <span className="text-[#8b5cf6]">Questions</span>
        </h2>
        <p className="mt-3 text-center text-sm text-[#64748b]">
          Straight answers about billing and what you get.
        </p>

        <div className="mt-8 divide-y divide-[#e8ecf4] overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#fafafa]"
                >
                  <span className="text-[15px] font-medium text-[#0f172a]">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#94a3b8] transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#f1f5f9] bg-[#fafafa] px-5 py-4">
                    <p className="text-sm leading-relaxed text-[#64748b]">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
