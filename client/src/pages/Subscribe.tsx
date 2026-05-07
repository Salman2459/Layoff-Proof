// Filename: src/pages/Subscribe.tsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  CreditCard,
  CheckCircle,
  Tag,
  X,
  XCircle,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, getQueryFn } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
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

/** Entitlement / plan-management UI is driven by DB `subscriptionStatus === "active"`, not Stripe heuristics alone. */
function isDbSubscriptionStatusActive(
  user: { subscriptionStatus?: unknown } | null | undefined,
): boolean {
  return ((user as { subscriptionStatus?: unknown })?.subscriptionStatus ?? "")
    .toString()
    .toLowerCase()
    .trim() === "active";
}

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

const PriceBreakdown = ({
  breakdown,
  isUpdating,
}: {
  breakdown: PriceBreakdown | null;
  isUpdating?: boolean;
}) => {
  if (!breakdown) return null;

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 border">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Tag className="w-4 h-4" />
        Price Breakdown
        {/* {isUpdating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        ) : null} */}
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
          <span className="font-medium">{formatPrice(breakdown.originalAmount)}</span>
        </div>

        {breakdown.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center">
              Discount {breakdown.couponName && `(${breakdown.couponName})`}
              {breakdown.discountPercentage && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                  -{breakdown.discountPercentage}%
                </span>
              )}:
            </span>
            <span className="font-medium">-{formatPrice(breakdown.discountAmount)}</span>
          </div>
        )}

        <hr className="border-gray-200 dark:border-gray-600" />

        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span className={breakdown.finalAmount === 0 ? "text-green-600" : "text-gray-900 dark:text-gray-100"}>
            {breakdown.finalAmount === 0 ? "FREE" : formatPrice(breakdown.finalAmount)}
          </span>
        </div>

        {breakdown.finalAmount === 0 && (
          <div className="text-xs text-green-600 text-center mt-2 font-medium">
            🎉 Your coupon covers the full amount!
          </div>
        )}
      </div>
    </div>
  );
};

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
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
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

  useEffect(() => {
    const d = defaultBreakdownFromPlanCents(defaultPriceCents);
    if (d) setPriceBreakdown(d);
  }, [defaultPriceCents]);

  useEffect(() => {
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

  const stripeElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#111827',
        '::placeholder': {
          color: '#9CA3AF',
        },
      },
      invalid: {
        color: '#EF4444',
        iconColor: '#EF4444',
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    let clientSecretForPayment = currentClientSecret;
    let paymentRequired = true;

    try {

      if (coupon.trim() && !isCouponApplied) {
        const response = await apiRequest("POST", "/api/stripe/apply-coupon", { coupon, planId });
        const data =  response;


        setIsCouponApplied(true);

        if (data.paymentRequired === false) {
          // free subscription flow...
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
        window.location.href = `${window.location.origin}/`;
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

        // Confirm subscription on backend
        const confirmData = await apiRequest("POST", "/api/stripe/confirm-subscription", {
          planId,
        });

        if (confirmData.success) {
          window.location.href = `${window.location.origin}/`;
        } else {
          toast({
            title: "Activation Error",
            description: "Payment succeeded but activation failed. Please contact support.",
            variant: "destructive",
          });
          setIsProcessing(false);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 space-y-4 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Card number
          </label>
          <div className="p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500">
            <CardNumberElement options={{ ...stripeElementOptions, showIcon: true, placeholder: "1234 1234 1234 1234" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expiration date
            </label>
            <div className="p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500">
              <CardExpiryElement options={{ ...stripeElementOptions, placeholder: "MM / YY" }} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Security code
            </label>
            <div className="p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500">
              <CardCvcElement options={{ ...stripeElementOptions, placeholder: "CVC" }} />
            </div>
          </div>
        </div>
      </div>

      {/* <div>
        <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Coupon code (optional)
        </label>
        <div className="relative">
          <input
            id="coupon"
            type="text"
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value);
            }}
            placeholder="Enter coupon if you have one"
            aria-invalid={Boolean(couponError)}
            aria-describedby={couponError ? "coupon-error" : couponSuccessHint ? "coupon-success" : undefined}
            className={cn(
              "w-full p-3 pr-11 border rounded-md dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              couponError
                ? "border-red-500 dark:border-red-500"
                : couponSuccessHint
                  ? "border-green-600 dark:border-green-500"
                  : "dark:border-gray-600",
            )}
            disabled={isCouponApplied || isProcessing}
          />
          {isCheckingCoupon ? (
            <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-gray-400" aria-hidden />
          ) : couponSuccessHint && coupon.trim() && !couponError ? (
            <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-green-600" aria-hidden />
          ) : null}
        </div>
        {couponError && (
          <p id="coupon-error" role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {couponError}
          </p>
        ) }
      </div> */}

      <PriceBreakdown breakdown={priceBreakdown} isUpdating={breakdownLoading || isCheckingCoupon} />

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
        size="lg"
      >
        {isProcessing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
        ) : priceBreakdown?.finalAmount === 0 ? (
          <><CheckCircle className="mr-2 h-4 w-4" /> Activate Free Subscription</>
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" /> Subscribe to {planName}</>
        )}
      </Button>
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
  });

  const hasSub = hasSubscriberAccess({
    user: user as any,
    stripePayload: subStatus ?? undefined,
  });

  const dbSaysActivePaid = isDbSubscriptionStatusActive(user as any);

  const currentStripeProductId =
    typeof subStatus?.currentProductId === "string"
      ? subStatus.currentProductId
      : null;

  /** Tier aligned with Stripe / `subscriptionPlan` — used when DB is `active` (current plan + Upgrade/Downgrade). */
  const matchesPurchasedTier = useCallback(
    (planId: string) => {
      if (!hasSub) return false;
      if (currentStripeProductId && planId === currentStripeProductId) return true;
      if (
        purchasedPlanId &&
        planId === purchasedPlanId &&
        (!currentStripeProductId || purchasedPlanId.startsWith("prod_"))
      ) {
        return true;
      }
      return false;
    },
    [hasSub, currentStripeProductId, purchasedPlanId],
  );

  const showAsCurrentPlanInUi = useCallback(
    (planId: string) => dbSaysActivePaid && matchesPurchasedTier(planId),
    [dbSaysActivePaid, matchesPurchasedTier],
  );

  const [isLoading, setIsLoading] = useState<"loading" | string | null>(null);
  const [plans, setPlans] = useState<StripeCatalogProduct[]>([]);
  const [resumeEngineModalOpen, setResumeEngineModalOpen] = useState(false);
  const currentPlanCard = useMemo(() => {
    if (!dbSaysActivePaid || !hasSub) return undefined;
    return plans.find((p) => matchesPurchasedTier(p.id));
  }, [dbSaysActivePaid, hasSub, plans, matchesPurchasedTier]);

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





  return (
    <>
    <div className="grid md:grid-cols-3 gap-8">
 {
  isLoading === "loading" ? (
    <>
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-[500px] w-full rounded-xl animate-pulse" />
      ))}
    </>
  ) : (
  <>
  {plans?.slice()?.reverse()?.map((plan: StripeCatalogProduct, planIdx: number) => {
    const isCurrent = showAsCurrentPlanInUi(plan.id);
    const priceCents = plan.default_price?.unit_amount ?? 0;

    const currentPriceBasis = currentPlanCard?.default_price?.unit_amount ?? 0;
    const showUpgradeDowngrade =
      dbSaysActivePaid && hasSub && currentPlanCard != null;
    const isUpgrade =
      showUpgradeDowngrade && priceCents > currentPriceBasis;

    const actionLabel = isCurrent 
      ? "Current plan"
      : !dbSaysActivePaid
        ? "Subscribe"
        : !hasSub
          ? "Subscribe"
          : !showUpgradeDowngrade
            ? "Subscribe"
            : isUpgrade
              ? "Upgrade"
              : "Downgrade";


    const showMarkedFeatures =["Auto-Apply","Tailored Resume","Tailored Cover","Recruiter DM","Resume Engine","Layoff Radar"]
    const excludeFeatures = ["Layoff Radar"];
    const isProPlan = plan.name === "Layoff Proof AI - Pro";
    /** Only before checkout: steer guests to Pro. Active paid users should see only green “current plan”, no second highlight. */
    const showDefaultFeatured = isProPlan && !isCurrent && !dbSaysActivePaid;

    return (
      <Card
        key={plan.id}
        className={`flex flex-col justify-between rounded-xl transition-shadow ${
          isCurrent
            ? "border-2 border-emerald-600 ring-2 ring-emerald-500/50 shadow-xl dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25"
            : showDefaultFeatured
              ? "border-2 border-blue-600 shadow-lg dark:border-blue-500"
              : "border border-gray-200 dark:border-gray-700"
        }`}
      >
        <CardHeader className="text-center space-y-2">
          <div className="flex flex-wrap justify-center gap-2">
            {isCurrent ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0">Your current plan</Badge>
            ) : showDefaultFeatured ? (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 shadow-sm">
                Most popular
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-lg">{plan?.name}</CardTitle>
          <div className="text-3xl font-bold text-blue-600">
            ${((plan?.default_price?.unit_amount ?? 0) / 100).toFixed(2)}
            <span className="text-lg font-normal text-gray-500">
              /{plan?.default_price?.recurring?.interval ?? "mo"}
            </span>
          </div>
          {/* <CardDescription>{plan?.description}</CardDescription> */}
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {Object.entries(plan?.metadata ?? {}).map(([key, value], idx: number) => {
              const label = String(value);
              const isResumeEngine = showMarkedFeatures.some((feature) => label.includes(feature)) && 
              !excludeFeatures.some((feature) => label.includes(feature)) ;
              const statusIcon =
                planIdx === 0 && showMarkedFeatures.some((feature) => label.includes(feature)) ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : planIdx !== 0 ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                );
              return (
                <li key={idx} className="flex items-center gap-2">
                  {statusIcon}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}  {isResumeEngine  ? "+" : ""}</span>
                  {/* {isResumeEngine && planIdx < plans.length - 1 ? (
                    <button
                      type="button"
                      className="inline-flex rounded-md p-0.5 text-blue-600 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50"
                      aria-label="Resume Engine add-on options"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setResumeEngineModalOpen(true);
                        setPlans((pre)=>pre.map((p)=>p.id === plan.id ? {...p, isResumeEngine: true} : p));
                      }}
                    >
                      <Plus className="h-4 w-4 flex-shrink-0" strokeWidth={1.2} aria-hidden />
                    </button>
                   
                  ) : null} */}
                </li>
              );
            })}
          </ul>
        </CardContent>
        {console.log("plans", plan)as any}
        <CardFooter>
          <Button
            variant={isCurrent ? "outline" : "default"}
            className={
              showDefaultFeatured
                ? "w-full bg-blue-600 hover:bg-blue-700 text-white"
                : "w-full"
            }
            onClick={() => handleSelect(plan)}
            disabled={plan.isResumeEngine ? false : (!!isLoading && isLoading === plan.id) || isCurrent}
          >
            {isLoading === plan.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...
              </>
            ) : (
              plan.isResumeEngine === true ? "Add Resume Engine" : actionLabel
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  })}

  </>
  
  )
}
    </div>

    <Dialog open={resumeEngineModalOpen} onOpenChange={setResumeEngineModalOpen}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resume Engine add-on</DialogTitle>
          <DialogDescription>
            Choose how many applications you want to power with Resume Engine each month.
          </DialogDescription>
        </DialogHeader>
        <CustomSliderCard setPlans={setPlans}   setResumeEngineModalOpen={setResumeEngineModalOpen}/>
      </DialogContent>
    </Dialog>
    </>
  );
};

// Main Component
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

  const { data: checkoutStripeStatus } = useQuery<{
    status?: string;
    hasSubscription?: boolean;
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
  const dbSaysActivePaid = isDbSubscriptionStatusActive(user as any);
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

  const openPreview = async (plan: StripeCatalogProduct) => {
    setPreviewTarget(plan);
    setPreview(null);
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

  const applyPlanChange = async () => {
    if (!previewTarget || !preview) return;
    setIsApplyingChange(true);
    try {
      const data = await apiRequest("POST", "/api/stripe/change-plan", {
        newPlanId: previewTarget.id,
        prorationDate: preview.prorationDate,
      });

      if (data?.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize.");
        const result = await stripe.confirmCardPayment(data.clientSecret);
        if (result.error) throw result.error;
      }

      window.location.href = `${window.location.origin}/`;
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
    // Plan-change preview only when the database marks an active paid subscription (not Stripe/trial inference alone).
    if (dbSaysActivePaid && subscriberAccess && hasStripeSubscriptionId) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GlobalHeader />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {!clientSecret ? (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Choose Your Plan
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Unlock all premium features to supercharge your career
                </p>
              </div>
              <PlanSelection onPlanSelect={handlePlanSelect} />

              {/* Feature highlights */}
              <section className="mt-16 border-y border-border/60 bg-card/60 py-20 backdrop-blur-sm">
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
                            item.tile,
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
                    Frequently Asked{" "}
                    <span className="lp-gradient-text">Questions</span>
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
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-center mb-6">
                Complete Your Payment for {selectedPlan?.name}
              </h2>
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
                />

              </Elements>
            </div>
          )}
        </div>
      </div>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan change preview</DialogTitle>
            <DialogDescription>
              {previewTarget ? `Switch to ${previewTarget.name}.` : "Review your changes."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingPreview ? (
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

              <p className="text-xs text-muted-foreground">
                Due now is the prorated difference for the current billing period. Next renewal is shown separately.
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No preview available.</div>
          )}

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
              onClick={applyPlanChange}
              disabled={!previewTarget || !preview || isApplyingChange}
            >
              {isApplyingChange ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying…
                </>
              ) : (
                "Confirm change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <GlobalFooter />
    </div>
  );
}