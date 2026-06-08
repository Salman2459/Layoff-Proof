import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { SubscriptionEmptyIllustration } from "./SubscriptionEmptyIllustration";
import { WhyUpgradeSection } from "./WhyUpgradeSection";

export function SubscriptionEmptyState() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white px-6 py-12 text-center shadow-sm sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute left-6 top-8 h-28 w-28 opacity-30"
          aria-hidden
          style={{
            backgroundImage: "radial-gradient(#c4b5fd 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
        <div className="pointer-events-none absolute -right-6 bottom-6 h-40 w-40 rounded-full bg-[#c4b5fd]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-4 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#ede9fe]/40 blur-3xl" />

        <div className="relative">
          <SubscriptionEmptyIllustration />
          <h2 className="text-xl font-bold text-[#0f172a]">No Active Subscription</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#64748b]">
            You do not have an active paid subscription yet. Explore our plans to unlock premium
            features and power your job search.
          </p>
          <Link
            href="/subscribe"
            className="mt-8 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7c3aed] sm:w-auto"
          >
            View Plans
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <WhyUpgradeSection />
    </div>
  );
}
