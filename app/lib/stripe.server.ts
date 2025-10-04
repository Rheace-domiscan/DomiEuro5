/**
 * Stripe Server Utilities
 *
 * This file handles Stripe integration on the server-side including:
 * - Stripe client initialization
 * - Checkout session creation
 * - Customer creation and management
 * - Webhook signature verification
 */

import Stripe from 'stripe';
import { TIER_CONFIG } from '~/lib/billing-constants';
import type { SubscriptionTier } from '~/types/billing';

/**
 * Validate Stripe environment variables
 *
 * DESIGN DECISION: Runs at import time (not runtime)
 * Rationale: Fail-fast approach prevents server from starting with invalid config.
 * Alternative: Runtime validation would allow pages to load but fail during checkout.
 * Trade-off: Import-time validation catches config errors immediately but requires
 * all env vars to be present even for non-billing pages.
 */
function validateStripeConfig() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  if (!process.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY environment variable is required');
  }

  // Prevent accidentally deploying with test keys in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      throw new Error(
        'STRIPE_SECRET_KEY is a test key. Production requires a live key (sk_live_...)'
      );
    }
    if (process.env.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
      throw new Error(
        'VITE_STRIPE_PUBLISHABLE_KEY is a test key. Production requires a live key (pk_live_...)'
      );
    }
  }
}

// Validate on module import (see function comment for rationale)
validateStripeConfig();

/**
 * Initialize Stripe client
 *
 * DESIGN DECISION: API version is hard-coded (not auto-updated)
 * Rationale: Manual version updates provide stability and allow testing before upgrading.
 * Auto-updates could introduce breaking changes in production without warning.
 * Update process: Review Stripe changelog, test in staging, update version string here.
 *
 * Current version: 2025-09-30.clover
 * Last reviewed: 2025-10-03 (Phase 5)
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover', // Hard-coded for stability (see comment above)
  typescript: true,
});

/**
 * Finalize and charge the next invoice for a subscription.
 *
 * Used after mid-cycle seat adjustments to ensure prorations are collected immediately
 * (rather than waiting for the next billing cycle). Also handles the inverse case where
 * removing seats produces a credit-only invoice by finalizing it so the balance applies
 * right away.
 */
export async function settleSubscriptionInvoice(options: {
  customerId: string;
  subscriptionId: string;
}): Promise<Stripe.Invoice | null> {
  const { customerId, subscriptionId } = options;

  const findInvoice = async (status: Stripe.Invoice.Status) => {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      status,
      limit: 1,
    });

    return invoices.data[0] ?? null;
  };

  let invoice = (await findInvoice('open')) ?? (await findInvoice('draft'));

  if (!invoice) {
    invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscriptionId,
      collection_method: 'charge_automatically',
      auto_advance: false,
    });
  }

  if (!invoice) {
    return null;
  }

  if (invoice.status === 'draft') {
    invoice = await stripe.invoices.finalizeInvoice(invoice.id, {
      auto_advance: false,
    });
  }

  if (invoice.status === 'open' && invoice.collection_method === 'charge_automatically') {
    try {
      invoice = await stripe.invoices.pay(invoice.id);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Failed to charge seat adjustment invoice: ${error.message}`
          : 'Failed to charge seat adjustment invoice'
      );
    }
  }

  return invoice;
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false;
}

/**
 * Get Stripe price ID for a specific tier and billing interval
 *
 * @param tier - The subscription tier (starter or professional)
 * @param interval - The billing interval (monthly or annual)
 * @returns The Stripe price ID from environment variables
 * @throws Error if price ID is not configured
 */
export function getStripePriceId(
  tier: Exclude<SubscriptionTier, 'free'>,
  interval: 'monthly' | 'annual'
): string {
  const envVar = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
  const priceId = process.env[envVar];

  if (!priceId) {
    throw new Error(
      `${envVar} environment variable is not configured. Please add it to your .env file.`
    );
  }

  return priceId;
}

/**
 * Get tier from Stripe price ID (reverse lookup)
 *
 * @param priceId - The Stripe price ID to look up
 * @returns The subscription tier or null if not found
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const priceEnvVars: Record<string, SubscriptionTier> = {
    STRIPE_PRICE_STARTER_MONTHLY: 'starter',
    STRIPE_PRICE_STARTER_ANNUAL: 'starter',
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: 'professional',
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: 'professional',
  };

  for (const [envVar, tier] of Object.entries(priceEnvVars)) {
    if (process.env[envVar] === priceId) {
      return tier;
    }
  }

  return null;
}

/**
 * Get additional seat price ID
 *
 * @returns The Stripe price ID for additional seats
 * @throws Error if price ID is not configured
 */
export function getAdditionalSeatPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ADDITIONAL_SEAT;

  if (!priceId) {
    throw new Error(
      'STRIPE_PRICE_ADDITIONAL_SEAT environment variable is not configured. Please add it to your .env file.'
    );
  }

  return priceId;
}

/**
 * Create a Stripe customer
 *
 * @param email - Customer email address
 * @param name - Customer name
 * @param organizationId - Internal organization ID for metadata
 * @returns Stripe customer object
 */
export async function createStripeCustomer(data: {
  email: string;
  name: string;
  organizationId: string;
}): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email: data.email,
    name: data.name,
    metadata: {
      organizationId: data.organizationId,
    },
  });

  return customer;
}

/**
 * Create a Stripe checkout session
 *
 * This initiates the payment flow for a subscription upgrade or new subscription.
 *
 * @param params - Checkout session parameters
 * @returns Stripe checkout session object
 */
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  interval: 'monthly' | 'annual';
  seats: number;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  upgradeTriggerFeature?: string;
}): Promise<Stripe.Checkout.Session> {
  const {
    customerId,
    customerEmail,
    tier,
    interval,
    seats,
    organizationId,
    successUrl,
    cancelUrl,
  } = params;

  // Get the base subscription price ID
  const basePriceId = getStripePriceId(tier, interval);

  // Calculate additional seats needed
  const includedSeats = TIER_CONFIG[tier].seats.included;
  const additionalSeats = Math.max(0, seats - includedSeats);

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: basePriceId,
      quantity: 1,
    },
  ];

  // Add additional seats if needed
  if (additionalSeats > 0) {
    const additionalSeatPriceId = getAdditionalSeatPriceId();
    lineItems.push({
      price: additionalSeatPriceId,
      quantity: additionalSeats,
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    customer_email: customerId ? undefined : customerEmail, // Only set email if no customer ID
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      tier,
      interval,
      seats: seats.toString(),
      ...(params.upgradeTriggerFeature ? { upgradeTriggerFeature: params.upgradeTriggerFeature } : {}),
    },
    subscription_data: {
      metadata: {
        organizationId,
        tier,
        interval,
        seats: seats.toString(),
        ...(params.upgradeTriggerFeature
          ? { upgradeTriggerFeature: params.upgradeTriggerFeature }
          : {}),
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: customerId
      ? {
          address: 'auto',
        }
      : undefined,
  });

  return session;
}

/**
 * Create a Stripe billing portal session
 *
 * This allows customers to manage their subscription, payment methods, and billing history.
 *
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to return to after managing billing
 * @returns Stripe billing portal session object
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Verify Stripe webhook signature
 *
 * CRITICAL SECURITY: This prevents unauthorized webhook requests.
 * Always verify signatures before processing webhook events.
 *
 * @param payload - Raw request body (as string or buffer)
 * @param signature - Stripe-Signature header value
 * @returns Verified Stripe event object
 * @throws Error if signature is invalid
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is not configured. This is required for webhook security.'
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Retrieve a Stripe customer by ID
 *
 * @param customerId - Stripe customer ID
 * @returns Stripe customer object
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    throw new Error(`Customer ${customerId} has been deleted`);
  }

  return customer as Stripe.Customer;
}

/**
 * Retrieve a Stripe subscription by ID
 *
 * @param subscriptionId - Stripe subscription ID
 * @returns Stripe subscription object
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'schedule'],
  });

  return subscription;
}

/**
 * Update a Stripe subscription
 *
 * Useful for adding seats or changing billing interval
 *
 * @param subscriptionId - Stripe subscription ID
 * @param params - Update parameters
 * @returns Updated Stripe subscription object
 */
export async function updateStripeSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, params);

  return subscription;
}
