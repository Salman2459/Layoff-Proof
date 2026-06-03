import { and, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { stripe } from "../stripe";
import { isCouponAccessPeriodExpired } from "../subscriptionAccess";

/**
 * Marks promo-month subscribers inactive once `subscription_end_date` has passed.
 * Promo signups use `cancel_at_period_end`; Stripe ends the sub at period end — this syncs DB if webhooks lag.
 */
export async function expirePromoSubscriptions(): Promise<void> {
  const now = new Date();
  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.subscriptionViaCoupon, true),
        eq(users.subscriptionStatus, "active"),
        lt(users.subscriptionEndDate, now),
      ),
    );

  for (const row of rows) {
    if (
      !isCouponAccessPeriodExpired({
        subscriptionViaCoupon: row.subscriptionViaCoupon,
        subscriptionEndDate: row.subscriptionEndDate,
        subscriptionStatus: row.subscriptionStatus,
      })
    ) {
      continue;
    }

    if (row.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
        if (sub.status !== "canceled") {
          await stripe.subscriptions.cancel(row.stripeSubscriptionId);
        }
      } catch (err) {
        console.warn(
          "expirePromoSubscriptions: could not cancel Stripe sub",
          row.stripeSubscriptionId,
          err,
        );
      }
    }

    await db
      .update(users)
      .set({
        subscriptionStatus: "inactive",
        subscriptionViaCoupon: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.id));

    console.log(`Promo period ended → inactive: user ${row.id}`);
  }
}
