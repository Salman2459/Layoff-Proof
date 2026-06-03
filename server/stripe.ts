import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function getOrCreateStripeCustomer(user: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string;
}): Promise<string> {
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch (error) {
      console.error("Stripe customer not found, creating new one:", error);
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : undefined,
    metadata: { userId: user.id },
  });

  return customer.id;
}

/** Whether the Stripe customer (or their subscription) has a default payment method on file. */
export async function customerHasPaymentMethod(
  customerId: string,
  subscriptionId?: string | null,
): Promise<boolean> {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) return false;

  const invoicePm = customer.invoice_settings?.default_payment_method;
  if (invoicePm && typeof invoicePm === "object") return true;
  if (typeof invoicePm === "string" && invoicePm) return true;

  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const subPm = sub.default_payment_method;
    if (subPm && typeof subPm === "string") return true;
    if (subPm && typeof subPm === "object") return true;
  }

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });
  return methods.data.length > 0;
}

// ✅ Added couponId parameter
export async function createSubscription(
  customerId: string,
  priceId: string,
  paymentMethodId?: string,
  couponId?: string          // <-- NEW
): Promise<Stripe.Subscription> {
  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    expand: ['latest_invoice.payment_intent'],
    metadata: { type: 'monthly_subscription' },
  };

  if (paymentMethodId) {
    subscriptionData.default_payment_method = paymentMethodId;
  } else {
    subscriptionData.payment_behavior = 'default_incomplete';
  }

  // ✅ Apply coupon if provided
  if (couponId) {
    subscriptionData.discounts = [{ coupon: couponId }];
  }

  return await stripe.subscriptions.create(subscriptionData);
}

// ✅ Fixed: skip PaymentIntent if amount is 0 (100% coupon)
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  currency: string = 'usd',
  couponId?: string          // <-- NEW
): Promise<Stripe.PaymentIntent | null> {

  // Apply coupon discount if provided
  let finalAmount = amount;
  if (couponId) {
    const coupon = await stripe.coupons.retrieve(couponId);
    if (coupon.percent_off === 100 || (coupon.amount_off && coupon.amount_off >= amount * 100)) {
      // ✅ 100% off — no PaymentIntent needed, handle via checkout session
      return null;
    }
    if (coupon.percent_off) {
      finalAmount = amount * (1 - coupon.percent_off / 100);
    } else if (coupon.amount_off) {
      finalAmount = Math.max(0, amount - coupon.amount_off / 100);
    }
  }

  // ✅ Guard: never create a $0 PaymentIntent
  if (finalAmount <= 0) return null;

  return await stripe.paymentIntents.create({
    amount: Math.round(finalAmount * 100),
    currency,
    customer: customerId,
    description: "Subscription creation",
    automatic_payment_methods: { enabled: true },
    metadata: {
      type: 'one_time_payment',
      ...(couponId && { couponId }),
    },
  });
}

// ✅ NEW: Create Checkout Session (handles $0 orders natively)
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  couponId?: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(couponId
      ? { discounts: [{ coupon: couponId }] }
      : { allow_promotion_codes: true }
    ),
  });
}

export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
    metadata: { type: 'trial_setup' },
  });
}

/** Schedule cancellation at end of current billing period (no immediate cut-off). */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent'],
  });
}

export async function createTestPrice(): Promise<Stripe.Price> {
  const product = await stripe.products.create({
    name: 'Layoff Proof Pro',
    description: 'Complete career resilience platform with AI-powered tools',
    metadata: { type: 'subscription' },
  });

  return await stripe.prices.create({
    product: product.id,
    unit_amount: 1900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro' },
  });
}

