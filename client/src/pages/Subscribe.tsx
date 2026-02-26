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
import { Check, Loader2, CreditCard, XCircle, CheckCircle, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";

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

// Price Display Component
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
      const response = await apiRequest("POST", "/api/stripe/get-price-breakdown", {
        coupon: couponCode || ""
      });
      const data =  response;

      if (response.ok) {
        setPriceBreakdown(data.breakdown);
      }
    } catch (error) {
      console.error("Error fetching price breakdown:", error);
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
        const confirmResponse = await apiRequest("POST", "/api/stripe/confirm-subscription", {
          planId
        });
        const confirmData = await confirmResponse.json();

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
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
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
const PlanSelection = ({ onPlanSelect }:any) => {
  const [isLoading, setIsLoading] = useState<"weekly" | "monthly" | null>(null);

  const handleSelect = async (planId: "weekly" | "monthly") => {
    setIsLoading(planId);
    await onPlanSelect(planId);
    setIsLoading(null);
  };

  const features = [
    "AI-powered Resume Builder",
    "Unlimited resume downloads",
    "Smart Cover Letter Generator",
    "AI Interview Preparation",
    "LinkedIn Profile Optimizer",
    "Real-time Layoff Tracker",
    "Priority support",
  ];

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Weekly Pro</CardTitle>
          <div className="text-3xl font-bold text-blue-600">
            $19<span className="text-lg font-normal text-gray-500">/week</span>
          </div>
          <CardDescription>Perfect for a short-term job search.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => handleSelect('weekly')}
            disabled={!!isLoading}
          >
            {isLoading === 'weekly' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
            ) : (
              "Choose Weekly"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-blue-500 ring-2 ring-blue-500 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Badge className="bg-blue-600 text-white">Best Value</Badge>
          </div>
          <CardTitle className="text-2xl">Monthly Pro</CardTitle>
          <div className="text-3xl font-bold text-blue-600">
            $29<span className="text-lg font-normal text-gray-500">/month</span>
          </div>
          <CardDescription>Get full access and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => handleSelect('monthly')}
            disabled={!!isLoading}
          >
            {isLoading === 'monthly' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
            ) : (
              "Choose Monthly"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Main Component
export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const [coupon, setCoupon] = useState("");


  const handlePlanSelect = async (planId: "weekly" | "monthly") => {
    try {
      console.log("🚀 Creating subscription for plan:", planId);
      const response = await apiRequest("POST", "/api/stripe/create-subscription", {
        planId,
        coupon: coupon.trim() || undefined
      });
      const data = response

      console.log("📦 Subscription response:", data);

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setSelectedPlan({
          id: planId,
          name: planId === 'weekly' ? 'Weekly Pro' : 'Monthly Pro'
        });
        console.log("✅ Client secret received");
      } else {
        throw new Error("No client secret received from server");
      }
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      toast({
        title: "Setup Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshPayment = async () => {
    if (selectedPlan) {
      console.log("🔄 Refreshing payment for expired client secret...");
      await handlePlanSelect(selectedPlan.id as "weekly" | "monthly");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GlobalHeader />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
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