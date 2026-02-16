// Run this script once to create a Stripe price for $19/month in test mode
// Usage: npx tsx server/create-stripe-price.ts

import { stripe } from "./stripe";

async function createTestPrice() {
  try {
    console.log("Creating Stripe product and price for testing...");
    
    // First create a product
    const product = await stripe.products.create({
      name: 'Layoff Proof Pro',
      description: 'Complete career resilience platform with AI-powered tools',
      metadata: {
        type: 'subscription',
        environment: 'test',
      },
    });
    
    console.log("✓ Product created:", product.id);
    
    // Then create the price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1900, // $19.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'pro',
        environment: 'test',
      },
    });
    
    console.log("✓ Price created:", price.id);
    console.log("\n🎉 Success! Add this environment variable:");
    console.log(`STRIPE_PRICE_ID=${price.id}`);
    console.log("\nThis price ID should be used in your subscription endpoints.");
    
  } catch (error) {
    console.error("❌ Error creating Stripe price:", error);
  }
}

// Run the script
createTestPrice();