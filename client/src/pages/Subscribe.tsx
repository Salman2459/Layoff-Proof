// Filename: src/pages/Subscribe.tsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  CreditCard,
  CheckCircle,
  Lock,
  X,
  XCircle,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, getQueryFn } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import {
  SubscribeFAQ,
  SubscribeFeatureHighlights,
  SubscribePricingHero,
  SubscribeTrustBar,
} from "@/components/layoffproof/subscription/SubscribePageSections";
import {
  CouponField,
  OrderSummaryCard,
  PaymentDetailsCard,
  SubscribeCheckoutHeader,
  checkoutLabel,
  stripeFieldWrap,
} from "@/components/layoffproof/subscription/SubscribeCheckoutView";
import {
  planCardActionLabel,
  planTagline,
  resolveCurrentCatalogPlanId,
  subscribeButtonClass,
} from "@/components/layoffproof/subscription/subscribe-plan-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { hasSubscriberAccess } from "@/lib/subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomSliderCard } from "@/components/customSliderCard";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PriceBreakdown {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponName?: string;
  discountPercentage?: number;
}

function defaultBreakdownFromPlanCents(cents: number | null | undefined): PriceBreakdown | null {
  if (cents == null || !Number.isFinite(cents) || cents <= 0) return null;
  return {
    originalAmount: cents,
    discountAmount: 0,
    finalAmount: cents,
  };
}

/** User-facing summary when verification returns usable discount amounts */
function couponSuccessSummary(b: Pick<PriceBreakdown, "discountAmount" | "discountPercentage">): string | null {
  const offCents = Math.max(0, b.discountAmount ?? 0);
  if (offCents <= 0) return null;
  const dollars = (offCents / 100).toFixed(2);
  if (typeof b.discountPercentage === "number" && Number.isFinite(b.discountPercentage)) {
    return `${b.discountPercentage}% discount · save $${dollars}`;
  }
  return `Save $${dollars} with this code`;
}

function couponSuccessHintFromMeta(meta: {
  discountPercentage?: number | null;
  amountOffCents?: number | null;
}): string {
  const pct =
    typeof meta.discountPercentage === "number" && Number.isFinite(meta.discountPercentage)
      ? meta.discountPercentage
      : null;
  const fixed =
    typeof meta.amountOffCents === "number" && meta.amountOffCents > 0
      ? meta.amountOffCents
      : null;
  if (pct != null) return `${pct}% off with this code`;
  if (fixed != null) return `Save $${(fixed / 100).toFixed(2)} with this code`;
  return "Coupon is valid.";
}

async function fetchSubscriptionBreakdownBody(coupon: string) {
  return apiRequest("POST", "/api/stripe/get-price-breakdown", {
    coupon: coupon || "",
  });
}

type StripeCatalogProduct = {
  isResumeEngine?: boolean;
  id: string; 
  name: string;
  description?: string | null;
  default_price?: {
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  } | null;
  metadata?: Record<string, string>;
};

type PlanChangePreview = {
  currency: string;
  renewalDate: string | null;
  prorationDate: number;
  payToday: number;
  isDowngrade?: boolean;
  lines: Array<{
    id: string;
    amount: number;
    description: string | null;
    proration: boolean;
  }>;
};

const stripeCardElementOptions = {
  style: {
    base: {
      fontSize: "15px",
      color: "#0f172a",
      fontFamily: "Inter, system-ui, sans-serif",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};

function PlanChangeCardPayment({
  clientSecret,
  payToday,
  currency,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  payToday: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardNumberElement);
    if (!card) {
      toast({
        title: "Error",
        description: "Card field not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (error) throw error;
      if (!paymentIntent?.id) {
        throw new Error("Payment did not complete.");
      }
      await apiRequest("POST", "/api/stripe/complete-plan-change-payment", {
        paymentIntentId: paymentIntent.id,
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Payment failed",
        description: getApiErrorMessage(error, "Could not complete payment."),
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Due now</span>
          <span className="font-semibold">{formatMoney(payToday, currency)}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Enter your card to pay the prorated upgrade amount and save it for renewals.
      </p>
      <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Card number</label>
          <div className="p-3 border rounded-md dark:border-gray-600">
            <CardNumberElement
              options={{
                ...stripeCardElementOptions,
                showIcon: true,
                placeholder: "1234 1234 1234 1234",
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Expiration</label>
            <div className="p-3 border rounded-md dark:border-gray-600">
              <CardExpiryElement
                options={{ ...stripeCardElementOptions, placeholder: "MM / YY" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CVC</label>
            <div className="p-3 border rounded-md dark:border-gray-600">
              <CardCvcElement
                options={{ ...stripeCardElementOptions, placeholder: "CVC" }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Back
        </Button>
        <Button
          type="button"
          className={purplePrimaryBtnClass}
          onClick={handlePay}
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay & upgrade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

const purplePrimaryBtnClass =
  "bg-[#8b5cf6] text-white hover:bg-[#7c3aed] focus-visible:ring-[#8b5cf6]/40";

const formatMoney = (amount: number, currency: string) => {
  const value = (amount ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
};

/** Client-side navigation after payment — avoids full page reload. */
async function navigateToDashboard(
  queryClient: QueryClient,
  setLocation: (path: string) => void,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] }),
  ]);
  setLocation("/dashboard");
}

// Stripe Checkout Form
const CheckoutForm = ({
  planId,
  planName,
  clientSecret: initialClientSecret,
  onRefreshPayment,
  coupon,
  setCoupon,
  subscriptionDraftReady,
  defaultPriceCents,
  checkoutMode,
}: {
  planId: string;
  planName: string;
  clientSecret: string;
  onRefreshPayment: () => Promise<void>;
  coupon: string;
  setCoupon: (v: string) => void;
  /** Breakdown APIs need a Stripe subscription in `incomplete` (pending first payment). */
  subscriptionDraftReady: boolean;
  /** Catalog/list price — shows Price Breakdown immediately before API returns */
  defaultPriceCents: number | null;
  checkoutMode: "subscription" | "resume_engine";
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const goToDashboard = useCallback(
    () => navigateToDashboard(queryClient, setLocation),
    [queryClient, setLocation],
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClientSecret, setCurrentClientSecret] = useState(initialClientSecret);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(() =>
    defaultBreakdownFromPlanCents(defaultPriceCents),
  );
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessHint, setCouponSuccessHint] = useState<string | null>(null);
  /** Stale-async guard so rapid typing doesn't leave loaders stuck */
  const couponBreakdownSeq = useRef(0);
  const [couponApplyTick, setCouponApplyTick] = useState(0);

  useEffect(() => {
    const d = defaultBreakdownFromPlanCents(defaultPriceCents);
    if (d) setPriceBreakdown(d);
  }, [defaultPriceCents]);

  useEffect(() => {
    if (checkoutMode !== "subscription") {
      const d = defaultBreakdownFromPlanCents(defaultPriceCents);
      setIsCheckingCoupon(false);
      setCouponError(null);
      setCouponSuccessHint(null);
      setBreakdownLoading(false);
      if (d) setPriceBreakdown(d);
      return;
    }
    const seq = ++couponBreakdownSeq.current;
    const stillCurrent = () => seq === couponBreakdownSeq.current;
    const trimmed = coupon.trim();
    const debounceMs = trimmed ? 500 : 0;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (!stillCurrent()) return;

        if (!trimmed) {
          setIsCheckingCoupon(false);
          setCouponError(null);
          setCouponSuccessHint(null);
          if (subscriptionDraftReady) {
            setBreakdownLoading(true);
            try {
              const data = await fetchSubscriptionBreakdownBody("");
              if (!stillCurrent()) return;
              if (data?.breakdown) setPriceBreakdown(data.breakdown as PriceBreakdown);
            } catch (error) {
              if (!stillCurrent()) return;
              const msg = getApiErrorMessage(error);
              if (msg.includes("No active subscription draft")) {
                const d = defaultBreakdownFromPlanCents(defaultPriceCents);
                if (d) setPriceBreakdown(d);
                return;
              }
              console.error("Error fetching price breakdown:", error);
              toast({
                title: "Price update",
                description: msg,
                variant: "destructive",
              });
            } finally {
              if (stillCurrent()) setBreakdownLoading(false);
            }
          } else {
            const d = defaultBreakdownFromPlanCents(defaultPriceCents);
            if (d) setPriceBreakdown(d);
          }
          return;
        }

        setIsCheckingCoupon(true);
        setCouponError(null);
        setCouponSuccessHint(null);
        setBreakdownLoading(true);

        try {
          const body: {
            code: string;
            unitAmountCents?: number;
            planId?: string;
          } = { code: trimmed };
          if (planId.trim()) {
            body.planId = planId.trim();
          }
          if (
            typeof defaultPriceCents === "number" &&
            Number.isFinite(defaultPriceCents) &&
            defaultPriceCents > 0
          ) {
            body.unitAmountCents = Math.round(defaultPriceCents);
          }

          const data = (await apiRequest("POST", "/api/stripe/verify-coupon", body)) as {
            breakdown?: PriceBreakdown | null;
            meta?: {
              couponName?: string;
              discountPercentage?: number | null;
              amountOffCents?: number | null;
            };
          };

          if (!stillCurrent()) return;

          if (data?.breakdown) {
            setPriceBreakdown(data.breakdown);
            const summary = couponSuccessSummary(data.breakdown);
            setCouponSuccessHint(summary ?? "This coupon is valid.");
          } else if (data?.meta) {
            setCouponSuccessHint(couponSuccessHintFromMeta(data.meta));
          } else {
            setCouponSuccessHint("This coupon is valid.");
          }
          setCouponError(null);

          if (subscriptionDraftReady) {
            try {
              const sub = await fetchSubscriptionBreakdownBody(trimmed);
              if (!stillCurrent()) return;
              if (sub?.breakdown) setPriceBreakdown(sub.breakdown as PriceBreakdown);
            } catch {
              /* keep verify-coupon preview totals */
            }
          }
        } catch (error) {
          if (!stillCurrent()) return;
          const msg = getApiErrorMessage(error);

          setCouponSuccessHint(null);
          setCouponError(msg || "This coupon code is not valid.");

          if (subscriptionDraftReady) {
            try {
              const base = await fetchSubscriptionBreakdownBody("");
              if (!stillCurrent()) return;
              if (base?.breakdown) setPriceBreakdown(base.breakdown as PriceBreakdown);
            } catch {
              const d = defaultBreakdownFromPlanCents(defaultPriceCents);
              if (d) setPriceBreakdown(d);
            }
          } else {
            const d = defaultBreakdownFromPlanCents(defaultPriceCents);
            if (d) setPriceBreakdown(d);
          }
        } finally {
          if (stillCurrent()) {
            setIsCheckingCoupon(false);
            setBreakdownLoading(false);
          }
        }
      })();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [coupon, subscriptionDraftReady, defaultPriceCents, planId]);

  const stripeElementOptions = stripeCardElementOptions;

  const goToDashboardAfterSubscribe = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
    setLocation("/dashboard");
  }, [queryClient, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    let clientSecretForPayment = currentClientSecret;
    let paymentRequired = true;

    try {

      if (checkoutMode === "subscription" && coupon.trim() && !isCouponApplied) {
        const response = await apiRequest("POST", "/api/stripe/apply-coupon", { coupon, planId });
        const data =  response;


        setIsCouponApplied(true);

        if (data.paymentRequired === false) {
          if (data.breakdown) setPriceBreakdown(data.breakdown);
          toast({
            title: "Subscription activated",
            description:
              data.message ?? "Your promo code was applied. You now have full access.",
          });
          await goToDashboard();
          setIsProcessing(false);
          return;
        }

        if (data.clientSecret) {
          clientSecretForPayment = data.clientSecret;
          setCurrentClientSecret(data.clientSecret);
        }

        if (data.breakdown) {
          setPriceBreakdown(data.breakdown);
        }
      }



      // If we reach here and final amount is 0, skip payment
      if (priceBreakdown && priceBreakdown.finalAmount === 0) {
        console.log("✅ Final amount is $0, redirecting...");
        await goToDashboard();
        return;
      }

      // Process payment
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        toast({
          title: "Error",
          description: "Card element not found.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      console.log(`[PAYMENT] Confirming payment...`);
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecretForPayment,
        {
          payment_method: { card: cardNumberElement },
        }
      );

      if (error) {
        console.error("❌ Stripe Payment Error:", error);
        if (error.code === 'resource_missing' || error.message?.includes('No such payment_intent')) {
          toast({
            title: "Payment Session Expired",
            description: "We've refreshed your session. Please try again.",
            variant: "destructive",
          });
          await onRefreshPayment();
        } else {
          toast({
            title: "Payment Failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log("✅ Payment succeeded:", paymentIntent.id);

        if (checkoutMode === "subscription") {
          // Confirm subscription on backend
          const confirmData = await apiRequest("POST", "/api/stripe/confirm-subscription", {
            planId,
          });

          if (confirmData.success) {
            await goToDashboard();
          } else {
            toast({
              title: "Activation Error",
              description: "Payment succeeded but activation failed. Please contact support.",
              variant: "destructive",
            });
            setIsProcessing(false);
          }
        } else {
          // One-time add-on payment: no subscription confirmation
          toast({
            title: "Payment successful",
            description: "Your Resume Engine add-on payment was received.",
          });
          await goToDashboard();
        }
      }
    } catch (error) {
      console.error("❌ Unexpected error during payment:", error);
      toast({
        title: "Payment Error",
        description: getApiErrorMessage(
          error,
          "An unexpected error occurred. Please try again."
        ),
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const submitLabel =
    priceBreakdown?.finalAmount === 0
      ? "Activate Free Subscription"
      : checkoutMode === "resume_engine"
        ? `Pay for ${planName}`
        : `Subscribe to ${planName}`;

  return (
    <form onSubmit={handleSubmit}>
      {checkoutMode === "subscription" && (
        <SubscribeCheckoutHeader planName={planName} />
      )}

      <div
        className={cn(
          "grid gap-6",
          checkoutMode === "subscription" ? "lg:grid-cols-2 lg:gap-8" : "max-w-lg mx-auto"
        )}
      >
        <PaymentDetailsCard>
          <div className="space-y-4">
            <div>
              <label className={checkoutLabel}>Card number</label>
              <div className={stripeFieldWrap}>
                <CardNumberElement
                  options={{
                    ...stripeElementOptions,
                    showIcon: true,
                    placeholder: "1234 1234 1234 1234",
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={checkoutLabel}>Expiration date</label>
                <div className={stripeFieldWrap}>
                  <CardExpiryElement
                    options={{ ...stripeElementOptions, placeholder: "MM / YY" }}
                  />
                </div>
              </div>
              <div>
                <label className={checkoutLabel}>Security code</label>
                <div className={stripeFieldWrap}>
                  <CardCvcElement
                    options={{ ...stripeElementOptions, placeholder: "CVC" }}
                  />
                </div>
              </div>
            </div>
            {checkoutMode === "subscription" && (
              <CouponField
                value={coupon}
                onChange={setCoupon}
                onApply={() => setCouponApplyTick((t) => t + 1)}
                isChecking={isCheckingCoupon}
                isApplied={isCouponApplied}
                isProcessing={isProcessing}
                error={couponError}
                successHint={couponSuccessHint}
              />
            )}
          </div>
        </PaymentDetailsCard>

        <OrderSummaryCard
          planName={planName}
          breakdown={priceBreakdown}
          isUpdating={breakdownLoading || isCheckingCoupon}
          submitButton={
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" strokeWidth={2} />
                  {submitLabel}
                </>
              )}
            </button>
          }
        />
      </div>
    </form>
  );
};

type SubscriptionStatusPayload = {
  hasSubscription?: boolean;
  status?: string;
  plan?: string | null;
  currentProductId?: string | null;
};

// Plan Selection Cards
const PlanSelection = ({
  onPlanSelect,
}: {
  onPlanSelect: (plan: StripeCatalogProduct) => Promise<void> | void;
}) => {
  const { user } = useAuth();
  const purchasedPlanId = (user as any)?.subscriptionPlan as string | undefined;

  const { data: subStatus } = useQuery<SubscriptionStatusPayload | null>({
    queryKey: ["/api/stripe/subscription-status"],
    queryFn: getQueryFn<SubscriptionStatusPayload | null>({ on401: "returnNull" }),
    enabled: !!user,
  });

  const hasSub = hasSubscriberAccess({
    user: user as any,
    stripePayload: subStatus ?? undefined,
  });

  const currentStripeProductId =
    typeof subStatus?.currentProductId === "string"
      ? subStatus.currentProductId
      : null;

  const [isLoading, setIsLoading] = useState<"loading" | string | null>(null);
  const [plans, setPlans] = useState<StripeCatalogProduct[]>([]);
  const [resumeEngineModalOpen, setResumeEngineModalOpen] = useState(false);
  const [resumeEngineCheckout, setResumeEngineCheckout] = useState<{
    clientSecret: string;
    addonPriceCents: number;
    jobsPerMonth: number;
  } | null>(null);
  const [resumeEngineCheckoutLoading, setResumeEngineCheckoutLoading] = useState(false);
  const { toast } = useToast();

  const currentCatalogPlanId = useMemo(
    () =>
      resolveCurrentCatalogPlanId(plans, {
        hasAccess: hasSub,
        currentProductId: currentStripeProductId,
        purchasedPlanId,
        stripePlanLabel: subStatus?.plan,
      }),
    [plans, hasSub, currentStripeProductId, purchasedPlanId, subStatus?.plan],
  );

  const showAsCurrentPlanInUi = useCallback(
    (planId: string) => currentCatalogPlanId === planId,
    [currentCatalogPlanId],
  );

  const currentPlanCard = useMemo(() => {
    if (!currentCatalogPlanId) return undefined;
    return plans.find((p) => p.id === currentCatalogPlanId);
  }, [currentCatalogPlanId, plans]);

  const displayPlans = useMemo(
    () =>
      plans
        .filter((p) => p.name !== "TradePilot AI (Careers & Community)")
        .slice()
        .reverse(),
    [plans],
  );

  const handleSelect = async (plan: StripeCatalogProduct) => {
    setIsLoading(plan.id);
    await onPlanSelect(plan);
    setIsLoading(null);
  };

 
useEffect(() => {
  setIsLoading("loading");
    const fetchPlan = async () => {
      try {
        const response = await apiRequest("GET", "/api/stripe/catalog");
        const isResumeEngine = response.map((p: StripeCatalogProduct) => ({...p, isResumeEngine:false}) );
        setPlans(isResumeEngine);
        
      } catch (error) {
        console.error("Error fetching plans:", error);
      }finally{
        setIsLoading(null);
      }
    };
    fetchPlan();
  }, []);

  const startResumeEngineCheckout = async (opts: {
    addonPriceCents: number;
    jobsPerMonth: number;
  }) => {
    setResumeEngineCheckoutLoading(true);
    try {
      const data = (await apiRequest(
        "POST",
        "/api/stripe/create-resume-engine-addon-payment",
        {
          addonPriceCents: opts.addonPriceCents,
          jobsPerMonth: opts.jobsPerMonth,
        },
      )) as { clientSecret?: string };

      if (!data?.clientSecret) throw new Error("No client secret received from server");

      setResumeEngineCheckout({
        clientSecret: data.clientSecret,
        addonPriceCents: opts.addonPriceCents,
        jobsPerMonth: opts.jobsPerMonth,
      });
    } catch (error) {
      toast({
        title: "Setup Error",
        description: getApiErrorMessage(
          error,
          "Failed to initialize add-on payment. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setResumeEngineCheckoutLoading(false);
    }
  };





  return (
    <>
    <div className="grid items-stretch gap-6 pb-4 lg:grid-cols-3 lg:gap-5 lg:pb-6 xl:gap-6">
 {
  isLoading === "loading" ? (
    <>
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-[520px] w-full rounded-2xl animate-pulse" />
      ))}
    </>
  ) : (
  <>
  {displayPlans.map((plan: StripeCatalogProduct, planIdx: number) => {
    const isCurrent = showAsCurrentPlanInUi(plan.id);

    const showMarkedFeatures =["Auto-Apply","Tailored Resume","Tailored Cover","Recruiter DM","Resume Engine","Layoff Radar"]
    const excludeFeatures = ["Layoff Radar"];
    const isProPlan = plan.name === "Layoff Proof AI - Pro";
    /** Only before checkout: steer guests to Pro. Active paid users should see only green “current plan”, no second highlight. */
    const showDefaultFeatured = isProPlan && !isCurrent && !hasSub;

    const hasStripeSubscriptionId = Boolean(
      (user as { stripeSubscriptionId?: string | null })?.stripeSubscriptionId,
    );
    const subscriptionIncomplete =
      (subStatus?.status ?? "").toLowerCase() === "incomplete";
    const priceCents = plan?.default_price?.unit_amount ?? 0;
    const currentPriceBasis = currentPlanCard?.default_price?.unit_amount ?? 0;
    const canManagePlan =
      hasSub &&
      currentPlanCard != null &&
      hasStripeSubscriptionId &&
      !subscriptionIncomplete;
    const actionLabel = planCardActionLabel({
      isCurrent,
      isResumeEngine: plan.isResumeEngine === true,
      canManagePlan,
      planPriceCents: priceCents,
      currentPlanPriceCents: currentPriceBasis,
    });

    const isSelectedPlan = isCurrent || isLoading === plan.id;
    const subscribeBtnClass = subscribeButtonClass({
      isSelected: isSelectedPlan,
      isFeatured: showDefaultFeatured,
    });
    const tagline = planTagline(plan.name, plan.description);

    return (
      <article
        key={plan.id}
        className={cn(
          "relative flex flex-col rounded-2xl border bg-white p-6 pt-8 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition",
          isCurrent
            ? "border-2 border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/30"
            : showDefaultFeatured
              ? "z-10 border-2 border-[#8b5cf6] shadow-[0_20px_50px_-15px_rgba(139,92,246,0.28)] lg:scale-[1.03]"
              : "border-[#e8ecf4]"
        )}
      >
        {showDefaultFeatured && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#8b5cf6] px-4 py-1 text-[11px] font-semibold text-white shadow-sm">
            Most Popular
          </span>
        )}

        <div className="text-center">
          {isCurrent && (
            <span className="mb-3 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">
              Your current plan
            </span>
          )}
          <h3 className="text-[17px] font-bold leading-snug text-[#0f172a]">{plan?.name}</h3>
          <p className="mt-3 text-[32px] font-bold leading-none text-[#8b5cf6]">
            ${((plan?.default_price?.unit_amount ?? 0) / 100).toFixed(2)}
            <span className="text-[15px] font-normal text-[#94a3b8]">
              /{plan?.default_price?.recurring?.interval ?? "month"}
            </span>
          </p>
          {tagline ? (
            <p className="mx-auto mt-3 max-w-[260px] text-[13px] leading-relaxed text-[#64748b]">
              {tagline}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex-1">
<ul className="w-full space-y-2.5 text-left">
  {Object.entries(plan?.metadata ?? {}).map(
    ([key, value], idx: number) => {
      const label = String(value);

      const isResumeEngine =
        showMarkedFeatures.some((feature) =>
          label.includes(feature)
        ) &&
        !excludeFeatures.some((feature) =>
          label.includes(feature)
        );

      const isCurrentPlan = showAsCurrentPlanInUi(plan.id);

      const isResumeEngineFeature =
        value.startsWith("Resume Engine");

      const shouldShowPlus =
        isResumeEngine &&
        displayPlans.length > planIdx + 1 &&
        (!isCurrentPlan || !isResumeEngineFeature);

      const shouldShowButton =
        isResumeEngine &&
        isResumeEngineFeature &&
        isCurrentPlan &&
        displayPlans.length > planIdx + 1;

      const statusIcon =
        planIdx === 0 &&
        showMarkedFeatures.some((feature) =>
          label.includes(feature)
        ) ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
        ) : planIdx !== 0 ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2.5} />
        );

      return (
        <li
          key={idx}
          className="flex items-start gap-2.5"
        >
          {statusIcon}

          <div className="flex items-center gap-1">
            <span className="text-[13px] leading-snug text-[#475569]">
              {label}
              {shouldShowPlus ? " +" : ""}
            </span>

            {shouldShowButton && (
              <button
                type="button"
                className="inline-flex rounded-md p-0.5 text-blue-600 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50"
                aria-label="Resume Engine add-on options"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setResumeEngineModalOpen(true);

                  setPlans((prev) =>
                    prev.map((p) =>
                      p.id === plan.id
                        ? {
                            ...p,
                            isResumeEngine: true,
                          }
                        : p
                    )
                  );
                }}
              >
                <Plus
                  className="h-4 w-4 flex-shrink-0"
                  strokeWidth={1.2}
                  aria-hidden
                />
              </button>
            )}
          </div>
        </li>
      );
    }
  )}
</ul>
        </div>

        <button
          type="button"
          onClick={() => handleSelect(plan)}
          disabled={plan.isResumeEngine ? false : isCurrent || isLoading === plan.id}
          className={cn(
            "mt-8 flex h-11 w-full shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold transition disabled:cursor-not-allowed",
            subscribeBtnClass,
            isSelectedPlan ? "disabled:opacity-100" : "disabled:opacity-60"
          )}
        >
          {isLoading === plan.id ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...
            </>
          ) : (
            actionLabel
          )}
        </button>
      </article>
    );
  })}

  </>
  
  )
}
    </div>

    <Dialog
      open={resumeEngineModalOpen}
      onOpenChange={(open) => {
        setResumeEngineModalOpen(open);
        if (!open) setResumeEngineCheckout(null);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resume Engine add-on</DialogTitle>
          <DialogDescription>
            Choose how many applications you want to power with Resume Engine each month.
          </DialogDescription>
        </DialogHeader>
        {resumeEngineCheckout ? (
          <div className="mx-auto w-full max-w-md space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResumeEngineCheckout(null)}
                disabled={resumeEngineCheckoutLoading}
              >
                Back
              </Button>
              <div className="text-sm text-muted-foreground">
                {resumeEngineCheckout.jobsPerMonth.toLocaleString()} apps/mo
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center">
              Complete Your Payment for Resume Engine add-on ({resumeEngineCheckout.jobsPerMonth.toLocaleString()} apps/mo)
            </h2>

            <Elements stripe={stripePromise} options={{ clientSecret: resumeEngineCheckout.clientSecret }}>
              <CheckoutForm
                planId={"resume_engine_addon"}
                planName={`Resume Engine add-on (${resumeEngineCheckout.jobsPerMonth.toLocaleString()} apps/mo)`}
                clientSecret={resumeEngineCheckout.clientSecret}
                onRefreshPayment={() =>
                  startResumeEngineCheckout({
                    addonPriceCents: resumeEngineCheckout.addonPriceCents,
                    jobsPerMonth: resumeEngineCheckout.jobsPerMonth,
                  })
                }
                coupon={""}
                setCoupon={() => {}}
                subscriptionDraftReady={false}
                defaultPriceCents={resumeEngineCheckout.addonPriceCents}
                checkoutMode="resume_engine"
              />
            </Elements>
          </div>
        ) : (
          <CustomSliderCard
            setPlans={setPlans}
            setResumeEngineModalOpen={setResumeEngineModalOpen}
            onCheckout={startResumeEngineCheckout}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

// Main Component
function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    name: string;
    unitAmount: number | null;
  } | null>(null);
  const { toast } = useToast();
  const [coupon, setCoupon] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [planChangePayment, setPlanChangePayment] = useState<{
    clientSecret: string;
    payToday: number;
    currency: string;
  } | null>(null);

  const { data: checkoutStripeStatus, isFetched: stripeStatusFetched } = useQuery<{
    status?: string;
    hasSubscription?: boolean;
    subscriptionViaCoupon?: boolean;
    hasDefaultPaymentMethod?: boolean;
  } | null>({
    queryKey: ["/api/stripe/subscription-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    // Ensure we have the latest user payload (includes subscription fields).
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
  }, [queryClient]);

  const subscriberAccess = hasSubscriberAccess({
    user: user as any,
    stripePayload: checkoutStripeStatus ?? undefined,
  });
  const hasStripeSubscriptionId = Boolean(
    (user as { stripeSubscriptionId?: string | null })?.stripeSubscriptionId,
  );

  /** Stripe `incomplete` = first payment pending; DB stays `inactive` until paid. */
  const subscriptionDraftReady =
    Boolean((user as { stripeSubscriptionId?: string | null })?.stripeSubscriptionId) &&
    checkoutStripeStatus?.status === "incomplete";

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<StripeCatalogProduct | null>(null);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplyingChange, setIsApplyingChange] = useState(false);
  const [isPreparingCardPayment, setIsPreparingCardPayment] = useState(false);

  const needsCardForPlanUpgrade =
    stripeStatusFetched &&
    Boolean(preview) &&
    !preview?.isDowngrade &&
    (preview?.payToday ?? 0) > 0 &&
    !checkoutStripeStatus?.hasDefaultPaymentMethod;

  const openPreview = async (plan: StripeCatalogProduct) => {
    setPreviewTarget(plan);
    setPreview(null);
    setPlanChangePayment(null);
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    try {
      const data = await apiRequest("POST", "/api/stripe/preview-plan-change", {
        newPlanId: plan.id,
      });
      setPreview({
        currency: data.currency,
        renewalDate: typeof data.renewalDate === "string" ? data.renewalDate : null,
        prorationDate: data.prorationDate,
        payToday: typeof data.payToday === "number" ? data.payToday : 0,
        isDowngrade: typeof data.isDowngrade === "boolean" ? data.isDowngrade : undefined,
        lines: Array.isArray(data.lines) ? data.lines : [],
      });
    } catch (error) {
      setIsPreviewOpen(false);
      toast({
        title: "Preview failed",
        description: getApiErrorMessage(error, "Failed to preview plan change."),
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const finishPlanChangeSuccess = () => {
    void navigateToDashboard(queryClient, setLocation);
  };

  const startPlanChangeCardPayment = useCallback(async () => {
    if (!previewTarget || !preview || planChangePayment) return;
    setIsPreparingCardPayment(true);
    try {
      const data = await apiRequest("POST", "/api/stripe/change-plan", {
        newPlanId: previewTarget.id,
        prorationDate: preview.prorationDate,
      });

      if (data?.clientSecret && data?.requiresPaymentMethod) {
        setPlanChangePayment({
          clientSecret: data.clientSecret,
          payToday: typeof data.payToday === "number" ? data.payToday : preview.payToday,
          currency: preview.currency,
        });
        return;
      }

      if (data?.applied || data?.isDowngrade) {
        finishPlanChangeSuccess();
        return;
      }

      throw new Error("Could not start card payment for this upgrade.");
    } catch (error) {
      toast({
        title: "Payment setup failed",
        description: getApiErrorMessage(error, "Failed to prepare card payment."),
        variant: "destructive",
      });
    } finally {
      setIsPreparingCardPayment(false);
    }
  }, [previewTarget, preview, planChangePayment, toast]);

  useEffect(() => {
    if (!isPreviewOpen || isLoadingPreview || !preview || planChangePayment) return;
    if (!needsCardForPlanUpgrade || isPreparingCardPayment) return;
    void startPlanChangeCardPayment();
  }, [
    isPreviewOpen,
    isLoadingPreview,
    preview,
    planChangePayment,
    needsCardForPlanUpgrade,
    isPreparingCardPayment,
    startPlanChangeCardPayment,
  ]);

  const applyPlanChange = async () => {
    if (!previewTarget || !preview) return;
    if (needsCardForPlanUpgrade) {
      await startPlanChangeCardPayment();
      return;
    }
    setIsApplyingChange(true);
    try {
      const data = await apiRequest("POST", "/api/stripe/change-plan", {
        newPlanId: previewTarget.id,
        prorationDate: preview.prorationDate,
      });

      if (data?.applied || data?.isDowngrade) {
        finishPlanChangeSuccess();
        return;
      }

      if (data?.clientSecret && data?.requiresPaymentMethod) {
        setPlanChangePayment({
          clientSecret: data.clientSecret,
          payToday: typeof data.payToday === "number" ? data.payToday : preview.payToday,
          currency: preview.currency,
        });
        return;
      }

      if (data?.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize.");
        const result = await stripe.confirmCardPayment(data.clientSecret);
        if (result.error) throw result.error;
      }

      finishPlanChangeSuccess();
    } catch (error) {
      toast({
        title: "Plan change failed",
        description: getApiErrorMessage(error, "Failed to change plan."),
        variant: "destructive",
      });
    } finally {
      setIsApplyingChange(false);
    }
  };


  const handlePlanSelect = async (plan: StripeCatalogProduct) => {
    const subscriptionIncomplete = checkoutStripeStatus?.status === "incomplete";
    const canChangePlan =
      subscriberAccess && hasStripeSubscriptionId && !subscriptionIncomplete;

    if (canChangePlan) {
      await openPreview(plan);
      return;
    }
    try {
      console.log("🚀 Creating subscription for plan:", plan.id);
      const response = await apiRequest("POST", "/api/stripe/create-subscription", {
        planId: plan.id,
        coupon: coupon.trim() || undefined
      });
      const data = response

      console.log("📦 Subscription response:", data);

      if (data.clientSecret) {
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({
          queryKey: ["/api/stripe/subscription-status"],
        });
        setClientSecret(data.clientSecret);
        setSelectedPlan({
          id: plan.id,
          name: plan.name,
          unitAmount: plan.default_price?.unit_amount ?? null,
        });
        console.log("✅ Client secret received");
      } else {
        throw new Error("No client secret received from server");
      }
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      toast({
        title: "Setup Error",
        description: getApiErrorMessage(
          error,
          "Failed to initialize payment. Please try again."
        ),
        variant: "destructive",
      });
    }
  };

  const handleRefreshPayment = async () => {
    // Refresh logic depends on having the full plan object; keeping this as a no-op for now.
    // If you want refresh, store the selected Stripe product id + name and re-call create-subscription.
  };

  const isAuthenticated = Boolean(user);
  const planSelectionContent = !clientSecret ? (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <SubscribePricingHero />
        <div className="mb-12 lg:mb-14">
          <PlanSelection onPlanSelect={handlePlanSelect} />
        </div>
        <SubscribeTrustBar />
        <SubscribeFeatureHighlights />
        <SubscribeFAQ />
      </div>
    </div>
  ) : (
    <div className="relative bg-white px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#ede9fe]/60 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            planId={selectedPlan?.id || ""}
            planName={selectedPlan?.name || ""}
            clientSecret={clientSecret}
            onRefreshPayment={handleRefreshPayment}
            coupon={coupon}
            setCoupon={setCoupon}
            subscriptionDraftReady={subscriptionDraftReady}
            defaultPriceCents={selectedPlan?.unitAmount ?? null}
            checkoutMode="subscription"
          />
        </Elements>
      </div>
    </div>
  );

  const planChangeDialog = (
    <Dialog
          open={isPreviewOpen}
          onOpenChange={(open) => {
            setIsPreviewOpen(open);
            if (!open) setPlanChangePayment(null);
          }}
        >
          <DialogContent className={planChangePayment ? "max-w-lg" : undefined}>
            <DialogHeader>
              <DialogTitle>
                {planChangePayment ? "Add payment method" : "Plan change preview"}
              </DialogTitle>
              <DialogDescription>
                {planChangePayment
                  ? `Pay ${formatMoney(planChangePayment.payToday, planChangePayment.currency)} now to upgrade.`
                  : previewTarget
                    ? `Switch to ${previewTarget.name}.`
                    : "Review your changes."}
              </DialogDescription>
            </DialogHeader>

            {planChangePayment ? (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: planChangePayment.clientSecret }}
              >
                <PlanChangeCardPayment
                  clientSecret={planChangePayment.clientSecret}
                  payToday={planChangePayment.payToday}
                  currency={planChangePayment.currency}
                  onCancel={() => {
                    setPlanChangePayment(null);
                    setIsPreviewOpen(false);
                  }}
                  onSuccess={finishPlanChangeSuccess}
                />
              </Elements>
            ) : isLoadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due now</span>
                    <span className="font-semibold">
                      {formatMoney(preview.payToday, preview.currency)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {preview.lines
                      .filter((l) => l.amount !== 0 && l.proration)
                      .slice(0, 6)
                      .map((l) => (
                        <div key={l.id} className="flex items-start justify-between gap-3">
                          <span className="line-clamp-2">
                            {l.proration ? "Proration: " : ""}
                            {l.description ?? "Line item"}
                          </span>
                          <span className="shrink-0">
                            {formatMoney(l.amount, preview.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {preview.renewalDate ? (
                  <div className="text-xs text-muted-foreground">
                    Next renewal on{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(preview.renewalDate)}
                    </span>
                    .
                  </div>
                ) : null}

                {preview.lines.some((l) => !l.proration && l.amount !== 0) ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next renewal</span>
                      <span className="font-semibold">
                        {formatMoney(
                          preview.lines
                            .filter((l) => !l.proration)
                            .reduce((sum, l) => sum + (l.amount ?? 0), 0),
                          preview.currency,
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}

                {needsCardForPlanUpgrade && isPreparingCardPayment ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing secure card payment…
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Due now is the prorated difference for the current billing period. Next renewal is
                  shown separately.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No preview available.</div>
            )}

            {!planChangePayment && !needsCardForPlanUpgrade ? (
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  disabled={isApplyingChange}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={purplePrimaryBtnClass}
                  onClick={applyPlanChange}
                  disabled={!previewTarget || !preview || isApplyingChange}
                >
                  {isApplyingChange ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying…
                    </>
                  ) : preview?.isDowngrade ? (
                    "Confirm downgrade"
                  ) : preview?.payToday === 0 ? (
                    "Confirm change"
                  ) : (
                    "Confirm change"
                  )}
                </Button>
              </DialogFooter>
            ) : !planChangePayment && needsCardForPlanUpgrade ? (
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  disabled={isPreparingCardPayment}
                >
                  Cancel
                </Button>
              </DialogFooter>
            ) : null}
          </DialogContent>
        </Dialog>
  );

  if (isAuthenticated) {
    const name = greeting(user?.firstName, user?.lastName);
    return (
      <LayoffProofLayout activeNavId="subscription">
        <LayoffProofDashboardHeader greeting={name} />
        <div className="flex-1 bg-white">{planSelectionContent}</div>
        {planChangeDialog}
      </LayoffProofLayout>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <GlobalHeader />
      {planSelectionContent}
      {planChangeDialog}
      <GlobalFooter />
    </div>
  );
}