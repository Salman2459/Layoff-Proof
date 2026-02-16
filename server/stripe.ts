import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// Create or get a Stripe customer for a user
export async function getOrCreateStripeCustomer(user: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string;
}): Promise<string> {
  // If user already has a Stripe customer ID, return it
  if (user.stripeCustomerId) {
    try {
      // Verify the customer still exists in Stripe
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch (error) {
      console.error("Stripe customer not found, creating new one:", error);
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
    metadata: {
      userId: user.id,
    },
  });

  return customer.id;
}

// Create a setup intent for trial users to save payment method
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      type: 'trial_setup',
    },
  });
}

// Create a subscription for the user after trial
export async function createSubscription(
  customerId: string,
  priceId: string,
  paymentMethodId?: string
): Promise<Stripe.Subscription> {
  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      type: 'monthly_subscription',
    },
  };

  // If payment method is provided, use it
  if (paymentMethodId) {
    subscriptionData.default_payment_method = paymentMethodId;
  } else {
    // Otherwise, collect payment method during checkout
    subscriptionData.payment_behavior = 'default_incomplete';
  }

  return await stripe.subscriptions.create(subscriptionData);
}

// Create a one-time payment intent (alternative to subscription)
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  currency: string = 'usd'
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      type: 'one_time_payment',
    },
  });
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Get subscription details
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent'],
  });
}

// Create a test price for $19/month (only needed once)
export async function createTestPrice(): Promise<Stripe.Price> {
  // First create a product
  const product = await stripe.products.create({
    name: 'Layoff Proof Pro',
    description: 'Complete career resilience platform with AI-powered tools',
    metadata: {
      type: 'subscription',
    },
  });

  // Then create the price
  return await stripe.prices.create({
    product: product.id,
    unit_amount: 1900, // $19.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      plan: 'pro',
    },
  });
}