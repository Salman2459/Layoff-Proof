import { Link } from "wouter";
import {
  Bot,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Loader2,
  Star,
  Target,
} from "lucide-react";
import { planTagline } from "./subscribe-plan-ui";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  default_price?: {
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  } | null;
};

function planVisual(name: string) {
  if (name.includes("Autopilot")) {
    return { Icon: Bot, tile: "bg-violet-100 text-violet-600" };
  }
  if (name.includes("Pro")) {
    return { Icon: Star, tile: "bg-pink-100 text-pink-600" };
  }
  return { Icon: Target, tile: "bg-teal-100 text-teal-600" };
}

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type ManageSubscriptionActiveProps = {
  currentPlan: Plan | undefined;
  catalog: Plan[];
  statusLabel: string;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
  renewalOrEndDate: string | Date | null | undefined;
  formatDate: (value: string | Date | null | undefined) => string;
  currentProductId: string | null;
  purchasedPlanId: string | undefined;
  canCancel: boolean;
  cancelPending: boolean;
  onCancelClick: () => void;
};

export function ManageSubscriptionActive({
  currentPlan,
  catalog,
  statusLabel,
  isActive,
  cancelAtPeriodEnd,
  renewalOrEndDate,
  formatDate,
  currentProductId,
  purchasedPlanId,
  canCancel,
  cancelPending,
  onCancelClick,
}: ManageSubscriptionActiveProps) {
  const planName = currentPlan?.name ?? "Layoff Proof subscription";
  const description =
    currentPlan?.description?.trim() ||
    planTagline(planName) ||
    "Your monthly subscription with access to AI career tools.";

  const sortedPlans = [...catalog].sort(
    (a, b) =>
      (b.default_price?.unit_amount ?? 0) - (a.default_price?.unit_amount ?? 0)
  );

  const isCurrentPlan = (planId: string) =>
    planId === currentPlan?.id ||
    planId === currentProductId ||
    planId === purchasedPlanId;

  return (
    <div className="relative mx-auto max-w-3xl space-y-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[#ede9fe]/50 blur-3xl" />

      {/* Current plan */}
      <section className="relative rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
            <CreditCard className="h-4 w-4" strokeWidth={2} />
            Current Plan
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold text-white",
              isActive && !cancelAtPeriodEnd ? "bg-teal-500" : "bg-amber-500"
            )}
          >
            {statusLabel}
          </span>
        </div>

        <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">{planName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748b]">
          {description}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Price
            </p>
            <p className="mt-1 text-lg font-bold text-[#0f172a]">
              {formatMoney(currentPlan?.default_price?.unit_amount ?? null)}
              {currentPlan?.default_price?.recurring?.interval ? (
                <span className="text-base font-medium text-[#64748b]">
                  {" "}
                  / {currentPlan.default_price.recurring.interval}
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              <Calendar className="h-3.5 w-3.5" />
              {cancelAtPeriodEnd ? "Access ends" : "Renews / ends"}
            </p>
            <p className="mt-1 text-lg font-bold text-[#0f172a]">
              {formatDate(renewalOrEndDate)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-5 flex items-start gap-2.5 rounded-xl border px-4 py-3.5 text-sm",
            cancelAtPeriodEnd
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-teal-100 bg-teal-50/80 text-teal-900"
          )}
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" strokeWidth={2.5} />
          <span>
            {cancelAtPeriodEnd
              ? `Your plan stays active until ${formatDate(renewalOrEndDate)}. After that, paid tools will be locked and you will not be charged again.`
              : "You have full access to all AI career tools on your current plan."}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/subscribe"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
            Change plan
          </Link>
          {canCancel ? (
            <button
              type="button"
              onClick={onCancelClick}
              disabled={cancelPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc2626] disabled:opacity-60"
            >
              {cancelPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              )}
              Cancel subscription
            </button>
          ) : null}
        </div>
      </section>

      {/* All available plans */}
      <section className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:p-7">
        <h3 className="text-base font-bold text-[#0f172a]">All available plans</h3>

        <div className="mt-4 space-y-3">
          {sortedPlans.length === 0 ? (
            <p className="text-sm text-[#64748b]">No plans loaded.</p>
          ) : (
            sortedPlans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.id);
              const { Icon, tile } = planVisual(plan.name);
              return (
                <Link
                  key={plan.id}
                  href="/subscribe"
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3.5 transition hover:shadow-sm",
                    isCurrent
                      ? "border-teal-400 bg-teal-50/60"
                      : "border-[#e8ecf4] bg-white hover:border-[#c7d2fe]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      tile
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0f172a]">
                      {plan.name}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      <span className="font-semibold text-[#334155]">
                        {formatMoney(plan.default_price?.unit_amount ?? null)}
                      </span>
                      {plan.default_price?.recurring?.interval
                        ? ` / ${plan.default_price.recurring.interval}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isCurrent && (
                      <>
                        <Check className="h-4 w-4 text-teal-600" strokeWidth={2.5} />
                        <span className="rounded-full bg-teal-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          Selected
                        </span>
                      </>
                    )}
                    <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <Link
          href="/subscribe"
          className="mt-5 inline-flex text-sm font-semibold text-[#8b5cf6] no-underline hover:text-[#7c3aed]"
        >
          Upgrade or change plan on Subscribe →
        </Link>
      </section>
    </div>
  );
}
