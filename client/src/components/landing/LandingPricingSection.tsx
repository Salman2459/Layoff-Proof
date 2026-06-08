import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export type StripeCatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  default_price?: {
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  } | null;
  metadata?: Record<string, string>;
};

const SHOW_MARKED_FEATURES = [
  "Auto-Apply",
  "Tailored Resume",
  "Tailored Cover",
  "Recruiter DM",
  "Resume Engine",
  "Layoff Radar",
] as const;

const EXCLUDE_FEATURES = ["Layoff Radar"] as const;

function PlanFeatures({
  plan,
  planIdx,
  totalPlans,
}: {
  plan: StripeCatalogProduct;
  planIdx: number;
  totalPlans: number;
}) {
  return (
    <ul className="space-y-2.5">
      {Object.entries(plan.metadata ?? {}).map(([key, value]) => {
        const label = String(value);
        const isMarked =
          SHOW_MARKED_FEATURES.some((feature) => label.includes(feature)) &&
          !EXCLUDE_FEATURES.some((feature) => label.includes(feature));

        const showPlus = isMarked && totalPlans > planIdx + 1;

        const included =
          planIdx === 0
            ? SHOW_MARKED_FEATURES.some((feature) => label.includes(feature))
            : true;

        return (
          <li key={key} className="flex items-start gap-2">
            {included ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
            )}
            <span className="text-[13px] leading-snug text-[#475569]">
              {label}
              {showPlus ? " +" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PricingCardSkeleton() {
  return (
    <div className="flex min-h-[480px] animate-pulse flex-col rounded-2xl border border-[#e8ecf4] bg-white p-6">
      <div className="mx-auto h-6 w-32 rounded bg-[#e2e8f0]" />
      <div className="mx-auto mt-4 h-10 w-24 rounded bg-[#e2e8f0]" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-[#f1f5f9]" />
        ))}
      </div>
      <div className="mt-auto h-11 rounded-lg bg-[#e2e8f0]" />
    </div>
  );
}

export function LandingPricingSection() {
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";

  const { data: plans = [], isLoading } = useQuery<StripeCatalogProduct[]>({
    queryKey: ["/api/stripe/catalog"],
    queryFn: async () => apiRequest("GET", "/api/stripe/catalog"),
    staleTime: 5 * 60 * 1000,
  });

  const displayPlans = [...plans].reverse();

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#fafbff] py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5D5FEF]">
            Pricing
          </span>
          <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0f172a] sm:text-[40px]">
            Choose Your Plan
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#64748b]">
            Unlock all premium features to supercharge your career
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <PricingCardSkeleton key={i} />)
          ) : displayPlans.length === 0 ? (
            <p className="col-span-full text-center text-[15px] text-[#64748b]">
              Plans are loading unavailable right now. Please try again later.
            </p>
          ) : (
            displayPlans.map((plan, planIdx) => {
              const isProPlan = plan.name === "Layoff Proof AI - Pro";
              const priceCents = plan.default_price?.unit_amount ?? 0;
              const interval = plan.default_price?.recurring?.interval ?? "month";

              return (
                <article
                  key={plan.id}
                  className={cn(
                    "flex h-full min-h-[520px] flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md",
                    isProPlan
                      ? "border-2 border-[#5D5FEF] shadow-[0_16px_40px_-12px_rgba(93,95,239,0.25)]"
                      : "border-[#e8ecf4]"
                  )}
                >
                  <div className="text-center">
                    {isProPlan && (
                      <span className="mb-3 inline-flex rounded-full bg-[#5D5FEF] px-3 py-1 text-[11px] font-semibold text-white">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-[17px] font-bold text-[#0f172a]">{plan.name}</h3>
                    <p className="mt-3 text-[32px] font-bold text-[#5D5FEF]">
                      ${(priceCents / 100).toFixed(2)}
                      <span className="text-[15px] font-normal text-[#94a3b8]">/{interval}</span>
                    </p>
                  </div>

                  <div className="mt-6 flex-1">
                    <PlanFeatures
                      plan={plan}
                      planIdx={planIdx}
                      totalPlans={displayPlans.length}
                    />
                  </div>

                  <Link
                    href={ctaHref}
                    className={cn(
                      "mt-4 flex h-12 w-full shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white no-underline shadow-md transition",
                      isProPlan
                        ? "bg-[#5D5FEF] shadow-indigo-300/40 hover:bg-[#4F46E5]"
                        : "bg-[#14b8a6] shadow-teal-300/30 hover:bg-[#0d9488]"
                    )}
                  >
                    Subscribe
                  </Link>
                </article>
              );
            })
          )}
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[14px] text-[#64748b]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading plans…
          </div>
        )}
      </div>
    </section>
  );
}
