// Filename: src/pages/Subscribe.tsx

import { useState, useEffect } from "react";
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

  const [isLoading, setIsLoading] = useState<"loading" | string | null>(null);
  const [plans, setPlans] = useState<StripeCatalogProduct[]>([]);

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
  {plans?.slice()?.reverse()?.map((plan: StripeCatalogProduct,planIdx: number) => (
       <Card
       key={plan.id}
       className={`flex flex-col justify-between ${
        user?.subscriptionStatus ==="active"  && plan.id === user?.subscriptionPlan ? "border-blue-500 ring-2 ring-blue-500 shadow-xl" :                           // default grey
        user?.subscriptionStatus !== "active" && plan.name === "Layoff Proof AI - Pro" ? "border-blue-500 ring-2 ring-blue-500 shadow-xl" :
        "border-gray-200"
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
                { planIdx === 0 && value.startsWith("Layoff Radar") ?  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : planIdx !== 0 ?  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
              </li>
            ))}
         </ul>
       </CardContent>
       <CardFooter>
         <Button
           className={`w-full ${plan.name==="Layoff Proof AI - Pro" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
           onClick={() => handleSelect(plan)}
           disabled={!!isLoading && isLoading === plan.id  || user?.subscriptionStatus ==="active" && plan.id === user?.subscriptionPlan}
         >
           {isLoading === plan.id ? (
             <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
           ) : (
             `Choose ${plan.name}`
           )}
         </Button>
       </CardFooter>
     </Card>
  ))}

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


  const handlePlanSelect = async (plan: StripeCatalogProduct) => {
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
      <GlobalFooter />
    </div>
  );
}