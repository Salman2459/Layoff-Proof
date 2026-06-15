/**
 * Stripe webhooks → source of truth for subscription / payment state in DB.
 * Register POST /api/stripe/webhook with express.raw({ type: "application/json" }})
 * BEFORE express.json() in server/index.ts.
 *
 * DB column `subscription_status` (`users.subscription_status`) is written from this handler
 * only (Stripe subscription lifecycle). REST routes do not set it.
 * New email signups default to `inactive` in `storage.createEmailUser` until a webhook activates paid access.
 * Events that set it:
 * - checkout.session.completed (active)
 * - checkout.session.async_payment_failed (inactive, subscription mode)
 * - invoice.payment_succeeded, invoice.paid (active; syncs subscription fields when invoice has a subscription)
 * - invoice.payment_failed (inactive)
 * - customer.subscription.created / updated (active | inactive from Stripe subscription.status)
 * - customer.subscription.deleted (inactive)
 * - payment_intent.succeeded (active for non–resume_engine_addon intents)
 */
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { stripe, cancelSubscriptionAtPeriodEnd } from "./stripe";
import { storage } from "./storage";

function customerIdOnly(
  c: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  if (c === null || c === undefined) return undefined;
  if (typeof c === "string") return c;
  if ("deleted" in c && c.deleted) return undefined;
  return (c as Stripe.Customer).id;
}

/** Map Stripe Subscription.status → DB `subscription_status` (only `active` | `inactive`). */
function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
  sub?: Pick<Stripe.Subscription, "cancel_at_period_end" | "current_period_end">,
): "active" | "inactive" {
  if (status === "active" || status === "trialing") return "active";

  const periodEndSec = sub?.current_period_end;
  if (periodEndSec && periodEndSec * 1000 > Date.now()) {
    // Still inside a paid period (e.g. cancel_at_period_end until renewal date).
    if (status === "canceled" || sub?.cancel_at_period_end) return "active";
  }

  return "inactive";
}

async function resolveUserId(opts: {
  stripeCustomerId?: string | null;
  clientReferenceId?: string | null;
  metadataUserId?: string | null;
}): Promise<string | undefined> {
  if (opts.metadataUserId?.trim()) return opts.metadataUserId.trim();
  if (opts.clientReferenceId?.trim()) return opts.clientReferenceId.trim();
  const cid = opts.stripeCustomerId?.trim();
  if (!cid) return undefined;

  const existing = await storage.getUserByStripeCustomerId(cid);
  if (existing) return existing.id;

  try {
    const c = await stripe.customers.retrieve(cid);
    if (c.deleted) return undefined;
    const uid = c.metadata?.userId;
    return uid?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function applySubscriptionStripeFields(
  userId: string,
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
) {
  const sub = (await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price.product"],
  })) as Stripe.Subscription;

  const periodEndRaw = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const periodEnd = typeof periodEndRaw === "number" ? periodEndRaw : 0;
  const endMs = periodEnd * 1000;

  let productId: string | undefined;
  const item = sub.items?.data?.[0];
  const rawPrice = item?.price as Stripe.Price | string | undefined;
  if (typeof rawPrice === "string") {
    const price = await stripe.prices.retrieve(rawPrice, {
      expand: ["product"],
    });
    const prod = price.product;
    productId =
      typeof prod === "string"
        ? prod
        : prod && !(prod as Stripe.DeletedProduct).deleted
          ? (prod as Stripe.Product).id
          : undefined;
  } else if (rawPrice && typeof rawPrice === "object") {
    const prod = rawPrice.product;
    productId =
      typeof prod === "string"
        ? prod
        : prod &&
            typeof prod === "object" &&
            !("deleted" in prod && (prod as Stripe.DeletedProduct).deleted)
          ? (prod as Stripe.Product).id
          : undefined;
  }

  await storage.updateUser(userId, {
    stripeCustomerId,
    stripeSubscriptionId: sub.id,
    subscriptionStatus: mapStripeSubscriptionStatus(sub.status, sub),
    subscriptionEndDate: new Date(endMs),
    ...(productId ? { subscriptionPlan: productId } : {}),
  });
}

/** Subscription (or paid) invoice → refresh Stripe fields and set DB `subscription_status` to active. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const cid = customerIdOnly(invoice.customer);
  const userId = await resolveUserId({ stripeCustomerId: cid });
  if (!userId) {
    console.warn("invoice paid: could not resolve user", invoice.id);
    return;
  }

  await storage.updateUser(userId, { stripeCustomerId: cid ?? undefined });

  const invExtended = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subRef = invExtended.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    await applySubscriptionStripeFields(userId, sub, cid!);
    const paidCents = typeof invoice.amount_paid === "number" ? invoice.amount_paid : 0;
    const existing = await storage.getUser(userId);
    if (paidCents === 0 && existing?.subscriptionViaCoupon && !sub.cancel_at_period_end) {
      await cancelSubscriptionAtPeriodEnd(subId);
    }
    await storage.updateUser(userId, {
      subscriptionStatus: "active",
      ...(paidCents > 0 ? { subscriptionViaCoupon: false } : {}),
    });
  } else {
    const paidCents = typeof invoice.amount_paid === "number" ? invoice.amount_paid : 0;
    await storage.updateUser(userId, {
      subscriptionStatus: "active",
      ...(paidCents > 0 ? { subscriptionViaCoupon: false } : {}),
    });
  }
}

/**
 * Handles verified Stripe webhook events. All subscription/payment writes to DB go here.
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    res.status(500).json({ message: "Webhook not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ message: "Webhook body must be raw (use express.raw)" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("Stripe webhook signature error:", message);
    res.status(400).json({ message: `Webhook Error: ${message}` });
    return;
  }

  try {
    console.log("event.type", event.type);
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const cid = customerIdOnly(session.customer);
        const userId = await resolveUserId({
          stripeCustomerId: cid,
          clientReferenceId: session.client_reference_id ?? undefined,
          metadataUserId: session.metadata?.userId ?? undefined,
        });
        if (!userId) {
          console.warn("checkout.session.completed: could not resolve user", session.id);
          break;
        }

        await storage.updateUser(userId, { stripeCustomerId: cid ?? undefined });

        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscriptionStripeFields(userId, sub, cid!);
          // Checkout completed with payment OK — grant paid access regardless of Stripe status race.
          await storage.updateUser(userId, { subscriptionStatus: "active" });
          if (session.metadata?.planId || session.metadata?.plan) {
            await storage.updateUser(userId, {
              subscriptionPlan:
                session.metadata.planId ?? session.metadata.plan ?? "pro",
            });
          }
        } else {
          await storage.updateUser(userId, {
            subscriptionStatus: "active",
            subscriptionPlan:
              session.metadata?.planId ?? session.metadata?.plan ?? "pro",
          });
        }
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const cid = customerIdOnly(session.customer);
        const userId = await resolveUserId({
          stripeCustomerId: cid,
          clientReferenceId: session.client_reference_id ?? undefined,
          metadataUserId: session.metadata?.userId ?? undefined,
        });
        if (!userId) {
          console.warn(
            "checkout.session.async_payment_failed: could not resolve user",
            session.id,
          );
          break;
        }
        if (session.mode === "subscription") {
          await storage.updateUser(userId, {
            subscriptionStatus: "inactive",
            stripeCustomerId: cid ?? undefined,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const cid = customerIdOnly(invoice.customer);
        const userId = await resolveUserId({ stripeCustomerId: cid });
        if (!userId) break;

        await storage.updateUser(userId, {
          subscriptionStatus: "inactive",
          stripeCustomerId: cid ?? undefined,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const cid = customerIdOnly(sub.customer);
        const userId = await resolveUserId({ stripeCustomerId: cid });
        if (!userId) {
          console.warn(`${event.type}: could not resolve user`, sub.id);
          break;
        }
        await applySubscriptionStripeFields(userId, sub, cid!);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cid = customerIdOnly(sub.customer);
        const userId = await resolveUserId({ stripeCustomerId: cid });
        if (!userId) break;

        await storage.updateUser(userId, {
          subscriptionStatus: "inactive",
          subscriptionViaCoupon: false,
          stripeSubscriptionId: null,
          stripeCustomerId: cid ?? undefined,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type === "resume_engine_addon") {
          const cid = customerIdOnly(pi.customer);
          const userId = await resolveUserId({
            stripeCustomerId: cid,
            metadataUserId: pi.metadata?.userId ?? undefined,
          });
          if (!userId) {
            console.warn("resume_engine_addon payment: could not resolve user", pi.id);
            break;
          }

          // Intentionally do NOT mutate subscription fields for add-ons.
          await storage.updateUser(userId, { stripeCustomerId: cid ?? undefined });
          break;
        }
        const cid = customerIdOnly(pi.customer);
        const userId = await resolveUserId({
          stripeCustomerId: cid,
          metadataUserId: pi.metadata?.userId ?? undefined,
        });
        if (!userId) {
          console.warn("payment_intent.succeeded: could not resolve user", pi.id);
          break;
        }

        await storage.updateUser(userId, {
          subscriptionStatus: "active",
          stripeCustomerId: cid ?? undefined,
          subscriptionPlan: pi.metadata?.plan ?? pi.metadata?.planId ?? "pro",
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type === "resume_engine_addon") {
          break;
        }
        const cid = customerIdOnly(pi.customer);
        const userId = await resolveUserId({
          stripeCustomerId: cid,
          metadataUserId: pi.metadata?.userId ?? undefined,
        });
        if (!userId) {
          console.warn("payment_intent.payment_failed: could not resolve user", pi.id);
          break;
        }

        await storage.updateUser(userId, {
          subscriptionStatus: "inactive",
          stripeCustomerId: cid ?? undefined,
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", event.type, e);
    res.status(500).json({ message: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
}
