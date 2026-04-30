// Filename: src/pages/Subscribe.tsx

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Check, Loader2, CreditCard, CheckCircle, Tag ,X, XCircle} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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

type StripeCatalogProduct = {
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

const PriceBreakdown = ({ breakdown }: { breakdown: PriceBreakdown | null }) => {
  if (!breakdown) return null;

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 border">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
        <Tag className="w-4 h-4 mr-2" />
        Price Breakdown
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
  setCoupon
}: {
  planId: string;
  planName: string;
  clientSecret: string;
  onRefreshPayment: () => Promise<void>;
  coupon: string;
  setCoupon: (v: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClientSecret, setCurrentClientSecret] = useState(initialClientSecret);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  useEffect(() => {
    fetchPriceBreakdown();
  }, []);

  const fetchPriceBreakdown = async (couponCode?: string) => {
    try {
      const data = await apiRequest("POST", "/api/stripe/get-price-breakdown", {
        coupon: couponCode || "",
      });
      if (data?.breakdown) {
        setPriceBreakdown(data.breakdown);
      }
    } catch (error) {
      console.error("Error fetching price breakdown:", error);
      toast({
        title: "Price update",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCouponCheck = async () => {
    if (!coupon.trim()) {
      setPriceBreakdown(null);
      await fetchPriceBreakdown();
      setIsCouponApplied(false);
      return;
    }

    setIsCheckingCoupon(true);
    await fetchPriceBreakdown(coupon.trim());
    setIsCheckingCoupon(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCouponCheck();
    }, 500);

    return () => clearTimeout(timer);
  }, [coupon]);

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

      <div>
        <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Coupon code (optional)
        </label>
        <div className="relative">
          <input
            id="coupon"
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Enter coupon if you have one"
            className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isCouponApplied}
          />
          {isCheckingCoupon && (
            <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      <PriceBreakdown breakdown={priceBreakdown} />

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

// Plan Selection Cards
const PlanSelection = ({
  onPlanSelect,
}: {
  onPlanSelect: (plan: StripeCatalogProduct) => Promise<void> | void;
}) => {
const {user} = useAuth();
const hasSub = hasActiveSubscription(user as any);
const purchasedPlanId = (user as any)?.subscriptionPlan as string | undefined;

  const [isLoading, setIsLoading] = useState<"loading" | string | null>(null);
  const [plans, setPlans] = useState<StripeCatalogProduct[]>([]);
  const purchasedPlan = useMemo(() => {
    if (!purchasedPlanId) return undefined;
    return plans.find((p) => p.id === purchasedPlanId);
  }, [plans, purchasedPlanId]);

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
        setPlans(Array.isArray(response) ? response : []);
        
      } catch (error) {
        console.error("Error fetching plans:", error);
      }finally{
        setIsLoading(null);
      }
    };
    fetchPlan();
  }, []);



  return (
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
    const isCurrent = hasSub && purchasedPlanId === plan.id;
    const priceCents = plan.default_price?.unit_amount ?? 0;

    const currentPrice =
      purchasedPlan?.default_price?.unit_amount ?? 0;
    const isUpgrade = hasSub && priceCents > currentPrice;

    const actionLabel = isCurrent
      ? "Current plan"
      : !hasSub
        ? "Subscribe"
        : isUpgrade
          ? "Upgrade"
          : "Downgrade";

    return (
      <Card
        key={plan.id}
        className={`flex flex-col justify-between ${
          isCurrent
            ? "border-blue-500 ring-2 ring-blue-500 shadow-xl"
            : !hasSub && plan.name === "Layoff Proof AI - Pro"
              ? "border-blue-500 ring-2 ring-blue-500 shadow-xl"
              : "border-gray-200"
        }`}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-lg">{plan?.name}</CardTitle>
          <div className="text-3xl font-bold text-blue-600">
            ${((plan?.default_price?.unit_amount ?? 0) / 100).toFixed(2)}
            <span className="text-lg font-normal text-gray-500">
              /{plan?.default_price?.recurring?.interval ?? "mo"}
            </span>
          </div>
          <CardDescription>{plan?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {Object.entries(plan?.metadata ?? {}).map(([key, value], idx: number) => (
              <li key={idx} className="flex items-center space-x-2">
                {planIdx === 0 && value.startsWith("Layoff Radar") ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : planIdx !== 0 ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className={`w-full ${plan.name === "Layoff Proof AI - Pro" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
            onClick={() => handleSelect(plan)}
            disabled={(!!isLoading && isLoading === plan.id) || isCurrent}
          >
            {isLoading === plan.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...
              </>
            ) : (
              actionLabel
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
  );
};

// Main Component
export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const [coupon, setCoupon] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Ensure we have the latest user payload (includes subscription fields).
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const hasActiveSub = hasActiveSubscription(user as any);

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
    if (hasActiveSub) {
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
        setClientSecret(data.clientSecret);
        setSelectedPlan({
          id: plan.id,
          name: plan.name
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