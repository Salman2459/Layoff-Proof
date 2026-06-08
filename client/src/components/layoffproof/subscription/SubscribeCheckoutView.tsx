import type { ReactNode } from "react";
import { CheckCircle2, ClipboardList, CreditCard, Lock, Target, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { planTagline } from "./subscribe-plan-ui";

export function planSummaryFeatures(planName: string): string[] {
  if (planName.includes("Autopilot")) {
    return [
      "Unlimited auto-apply & resume tailoring",
      "Full AI career toolkit access",
      "Priority automation workflows",
    ];
  }
  if (planName.includes("Pro")) {
    return [
      "Advanced AI resume & cover letter tools",
      "Interview prep & LinkedIn optimizer",
      "Targeted auto-apply up to 50 apps/mo",
    ];
  }
  return [
    "Real-time layoff alerts & company insights",
    "AI-powered risk scoring",
    "Personalized job recommendations",
  ];
}

export function SubscribeCheckoutHeader({ planName }: { planName: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[28px] font-bold tracking-tight text-[#0f172a] sm:text-[32px]">
        Complete Your Payment
      </h1>
      <p className="mt-2 text-sm text-[#64748b] sm:text-base">
        You&apos;re subscribing to{" "}
        <span className="font-semibold text-[#334155]">{planName}</span>
      </p>
    </div>
  );
}

export function PaymentDetailsCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ede9fe]">
          <CreditCard className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a]">Payment Details</h2>
      </div>
      {children}
      <div className="mt-6 flex items-center gap-2 text-xs text-[#64748b]">
        <Lock className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        Your payment information is secure and encrypted.
      </div>
    </div>
  );
}

type OrderSummaryProps = {
  planName: string;
  breakdown: {
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    couponName?: string;
    discountPercentage?: number;
  } | null;
  isUpdating?: boolean;
  submitButton: ReactNode;
};

export function OrderSummaryCard({
  planName,
  breakdown,
  isUpdating,
  submitButton,
}: OrderSummaryProps) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const tagline = planTagline(planName);
  const features = planSummaryFeatures(planName);

  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ede9fe]">
          <ClipboardList className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a]">Order Summary</h2>
      </div>

      <div className="rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6] shadow-sm">
            <Target className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#0f172a]">{planName}</p>
            <span className="mt-1 inline-flex rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#7c3aed]">
              Monthly Plan
            </span>
            {tagline ? (
              <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{tagline}</p>
            ) : null}
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs text-[#475569]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-3 border-t border-[#e8ecf4] pt-5 text-sm">
        <div className="flex items-center justify-between text-[#64748b]">
          <span>Subtotal</span>
          <span className="font-medium text-[#0f172a]">
            {breakdown ? formatPrice(breakdown.originalAmount) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[#64748b]">
          <span>Discount</span>
          <span className="font-medium text-emerald-600">
            {breakdown && breakdown.discountAmount > 0
              ? `-${formatPrice(breakdown.discountAmount)}`
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e8ecf4] pt-3">
          <span className="text-base font-bold text-[#0f172a]">Total</span>
          <span className="text-2xl font-bold text-[#8b5cf6]">
            {isUpdating ? (
              "..."
            ) : breakdown ? (
              breakdown.finalAmount === 0 ? (
                "FREE"
              ) : (
                formatPrice(breakdown.finalAmount)
              )
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>

      <div className="mt-6">{submitButton}</div>
      <p className="mt-3 text-center text-xs text-[#94a3b8]">
        Cancel anytime. No hidden charges.
      </p>
    </div>
  );
}

export const stripeFieldWrap =
  "rounded-xl border border-[#e2e8f0] bg-white px-3 py-3.5 transition focus-within:border-[#a5b4fc] focus-within:ring-2 focus-within:ring-[#c7d2fe]/60";

export const checkoutLabel = "mb-1.5 block text-sm font-medium text-[#334155]";

export function CouponField({
  value,
  onChange,
  onApply,
  isChecking,
  isApplied,
  isProcessing,
  error,
  successHint,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  isChecking: boolean;
  isApplied: boolean;
  isProcessing: boolean;
  error: string | null;
  successHint: string | null;
}) {
  return (
    <div>
      <label htmlFor="coupon" className={checkoutLabel}>
        Coupon code <span className="font-normal text-[#94a3b8]">(optional)</span>
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            id="coupon"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter coupon code if you have one"
            disabled={isApplied || isProcessing}
            className={cn(
              "w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60",
              error
                ? "border-red-400"
                : successHint
                  ? "border-emerald-400"
                  : "border-[#e2e8f0]"
            )}
          />
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={!value.trim() || isChecking || isApplied || isProcessing}
          className="shrink-0 rounded-xl bg-[#ede9fe] px-4 py-2 text-sm font-semibold text-[#7c3aed] transition hover:bg-[#ddd6fe] disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {successHint && !error && (
        <p className="mt-1.5 text-xs text-emerald-600">{successHint}</p>
      )}
    </div>
  );
}
