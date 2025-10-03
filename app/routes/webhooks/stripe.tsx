/**
 * Stripe Webhook Endpoint
 *
 * CRITICAL SECURITY: This endpoint handles Stripe webhook events
 * - Verifies webhook signatures to prevent unauthorized requests
 * - Processes subscription lifecycle events
 * - Logs all billing events for audit trail
 * - Implements idempotency to prevent duplicate processing
 */

import type { ActionFunctionArgs } from 'react-router';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '~/lib/stripe.server';
import { convexServer } from '../../../lib/convex.server';
import { TIER_CONFIG, GRACE_PERIOD_DAYS } from '~/lib/billing-constants';
import type { SubscriptionTier } from '~/types/billing';

/**
 * POST /webhooks/stripe
 *
 * Receives and processes Stripe webhook events
 */
export async function action({ request }: ActionFunctionArgs) {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Get raw body and signature
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (err) {
      const error = err as Error;
      return new Response(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription_schedule.created':
        await handleSubscriptionScheduleCreated(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      default:
        // Unhandled event type - no action needed
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_error) {
    return new Response('Webhook handler failed', { status: 500 });
  }
}

/**
 * Handle checkout.session.completed
 *
 * Creates subscription record when customer completes payment
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Only process subscription checkouts
  if (session.mode !== 'subscription') {
    return;
  }

  const { organizationId, tier, seats } = session.metadata || {};

  if (!organizationId || !tier || !seats) {
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    return;
  }

  // Check if subscription already exists
  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscriptionId,
  });

  if (existing) {
    return;
  }

  const tierConfig = TIER_CONFIG[tier as SubscriptionTier];
  const seatsNumber = parseInt(seats, 10);

  // Create subscription in Convex
  await convexServer.mutation('subscriptions:create' as any, {
    organizationId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscriptionId,
    tier,
    status: 'active',
    billingInterval: session.metadata?.interval || 'monthly',
    seatsIncluded: tierConfig.seats.included,
    seatsTotal: seatsNumber,
    seatsActive: 0,
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // Approximate
  });

  // Log billing event
  await convexServer.mutation('billingHistory:create' as any, {
    organizationId,
    subscriptionId: subscriptionId,
    eventType: 'checkout.session.completed',
    stripeEventId: event.id,
    status: 'succeeded',
    description: `Subscription created: ${tier} tier, ${seats} seats`,
    metadata: { sessionId: session.id },
  });
}

/**
 * Handle customer.subscription.created
 *
 * Syncs subscription details from Stripe
 */
async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const { organizationId, tier } = subscription.metadata || {};

  if (!organizationId) {
    return;
  }

  // Check if already exists
  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscription.id,
  });

  if (existing) {
    await updateSubscriptionFromStripe(subscription, existing._id);
    return;
  }

  const tierConfig = TIER_CONFIG[tier as SubscriptionTier];

  // Transform Stripe's interval ('month' | 'year') to internal format ('monthly' | 'annual')
  const stripeInterval = subscription.items.data[0]?.plan?.interval;
  const billingInterval =
    stripeInterval === 'month' ? 'monthly' : stripeInterval === 'year' ? 'annual' : 'monthly'; // Default fallback

  await convexServer.mutation('subscriptions:create' as any, {
    organizationId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    tier: tier || 'starter',
    status: subscription.status,
    billingInterval,
    seatsIncluded: tierConfig.seats.included,
    seatsTotal: tierConfig.seats.included,
    seatsActive: 0,
    currentPeriodStart: (subscription as any).current_period_start * 1000,
    currentPeriodEnd: (subscription as any).current_period_end * 1000,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
  });

  await convexServer.mutation('billingHistory:create' as any, {
    organizationId,
    subscriptionId: subscription.id,
    eventType: 'customer.subscription.created',
    stripeEventId: event.id,
    status: 'succeeded',
    description: `Subscription created in Stripe`,
  });
}

/**
 * Handle customer.subscription.updated
 *
 * Updates subscription status, seats, and other changes
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscription.id,
  });

  if (!existing) {
    return;
  }

  await updateSubscriptionFromStripe(subscription, existing._id);

  await convexServer.mutation('billingHistory:create' as any, {
    organizationId: existing.organizationId,
    subscriptionId: subscription.id,
    eventType: 'customer.subscription.updated',
    stripeEventId: event.id,
    status: 'succeeded',
    description: `Subscription updated: status=${subscription.status}`,
  });
}

/**
 * Handle subscription_schedule.created
 *
 * Tracks pending downgrades (scheduled at period end)
 */
async function handleSubscriptionScheduleCreated(event: Stripe.Event) {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const subscriptionId = schedule.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscriptionId,
  });

  if (!existing) {
    return;
  }

  // Store pending downgrade info
  const futurePhase = schedule.phases[schedule.phases.length - 1];
  if (futurePhase) {
    await convexServer.mutation('subscriptions:setPendingDowngrade' as any, {
      subscriptionId: existing._id,
      tier: 'starter', // Extract from schedule if available
      effectiveDate: futurePhase.start_date * 1000,
    });
  }

  await convexServer.mutation('billingHistory:create' as any, {
    organizationId: existing.organizationId,
    subscriptionId: subscriptionId,
    eventType: 'subscription_schedule.created',
    stripeEventId: event.id,
    status: 'succeeded',
    description: 'Downgrade scheduled for end of billing period',
  });
}

/**
 * Handle invoice.payment_succeeded
 *
 * Records successful payment and ends grace period if active
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return;
  }

  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscriptionId,
  });

  if (!existing) {
    return;
  }

  // End grace period if active
  if (existing.accessStatus === 'grace_period') {
    await convexServer.mutation('subscriptions:endGracePeriod' as any, {
      subscriptionId: existing._id,
      paymentSuccessful: true,
    });
  }

  // Log payment
  await convexServer.mutation('billingHistory:create' as any, {
    organizationId: existing.organizationId,
    subscriptionId: subscriptionId,
    eventType: 'invoice.payment_succeeded',
    stripeEventId: event.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    description: `Payment succeeded: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`,
    metadata: { invoiceId: invoice.id },
  });
}

/**
 * Handle invoice.payment_failed
 *
 * Starts grace period for failed payment
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return;
  }

  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscriptionId,
  });

  if (!existing) {
    return;
  }

  // Start grace period
  await convexServer.mutation('subscriptions:startGracePeriod' as any, {
    subscriptionId: existing._id,
    gracePeriodDays: GRACE_PERIOD_DAYS,
  });

  // Log failed payment
  await convexServer.mutation('billingHistory:create' as any, {
    organizationId: existing.organizationId,
    subscriptionId: subscriptionId,
    eventType: 'invoice.payment_failed',
    stripeEventId: event.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    description: `Payment failed: ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()}`,
    metadata: { invoiceId: invoice.id, attemptCount: invoice.attempt_count },
  });
}

/**
 * Handle customer.subscription.deleted
 *
 * Marks subscription as canceled and sets read-only access
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const existing = await convexServer.query('subscriptions:getByStripeSubscriptionId' as any, {
    stripeSubscriptionId: subscription.id,
  });

  if (!existing) {
    return;
  }

  // Update status to canceled with read-only access
  await convexServer.mutation('subscriptions:updateStatus' as any, {
    subscriptionId: existing._id,
    status: 'canceled',
    accessStatus: 'read_only',
    cancelAtPeriodEnd: false,
  });

  await convexServer.mutation('billingHistory:create' as any, {
    organizationId: existing.organizationId,
    subscriptionId: subscription.id,
    eventType: 'customer.subscription.deleted',
    stripeEventId: event.id,
    status: 'succeeded',
    description: 'Subscription canceled and deleted',
  });
}

/**
 * Helper: Update subscription from Stripe subscription object
 */
async function updateSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  convexSubscriptionId: string
) {
  const updates: any = {
    subscriptionId: convexSubscriptionId,
    status: subscription.status,
    currentPeriodStart: (subscription as any).current_period_start * 1000,
    currentPeriodEnd: (subscription as any).current_period_end * 1000,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
  };

  // Update access status based on subscription status
  if (subscription.status === 'active') {
    updates.accessStatus = 'active';
  } else if (subscription.status === 'past_due') {
    updates.accessStatus = 'grace_period';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    updates.accessStatus = 'read_only';
  }

  await convexServer.mutation('subscriptions:update' as any, updates);
}
