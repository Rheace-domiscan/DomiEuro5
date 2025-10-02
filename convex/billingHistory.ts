/**
 * Convex Billing History Functions
 *
 * This file contains database operations for logging billing events:
 * - Record payment events (succeeded, failed)
 * - Record subscription changes (created, updated, canceled)
 * - Query billing history for organizations
 * - Ensure idempotency using Stripe event IDs
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Record a billing event
 *
 * @param stripeEventId - Stripe event ID for idempotency (prevents duplicate event processing)
 */
export const create = mutation({
  args: {
    organizationId: v.string(),
    subscriptionId: v.string(),
    eventType: v.string(),
    stripeEventId: v.string(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate event (idempotency)
    const existingEvent = await ctx.db
      .query('billingHistory')
      .withIndex('by_stripe_event_id', q => q.eq('stripeEventId', args.stripeEventId))
      .first();

    if (existingEvent) {
      // Event already processed - return existing ID
      return existingEvent._id;
    }

    // Create new billing history record
    const eventId = await ctx.db.insert('billingHistory', {
      organizationId: args.organizationId,
      subscriptionId: args.subscriptionId,
      eventType: args.eventType,
      stripeEventId: args.stripeEventId,
      amount: args.amount,
      currency: args.currency ?? 'gbp',
      status: args.status,
      description: args.description,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Get billing history for an organization
 *
 * **CRITICAL**: This enforces multi-tenancy isolation
 */
export const getByOrganization = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50; // Default to 50 recent events

    const events = await ctx.db
      .query('billingHistory')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .order('desc') // Most recent first
      .take(limit);

    return events;
  },
});

/**
 * Get billing history for a subscription
 */
export const getBySubscription = query({
  args: {
    subscriptionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const events = await ctx.db
      .query('billingHistory')
      .withIndex('by_subscription', q => q.eq('subscriptionId', args.subscriptionId))
      .order('desc')
      .take(limit);

    return events;
  },
});

/**
 * Get billing events by type
 */
export const getByEventType = query({
  args: {
    organizationId: v.string(),
    eventType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const events = await ctx.db
      .query('billingHistory')
      .withIndex('by_event_type', q => q.eq('eventType', args.eventType))
      .filter(q => q.eq(q.field('organizationId'), args.organizationId))
      .order('desc')
      .take(limit);

    return events;
  },
});

/**
 * Check if Stripe event has been processed
 *
 * Used for idempotency checking before processing webhooks
 */
export const isEventProcessed = query({
  args: {
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('billingHistory')
      .withIndex('by_stripe_event_id', q => q.eq('stripeEventId', args.stripeEventId))
      .first();

    return event !== null;
  },
});

/**
 * Get all payment failures for an organization
 *
 * Useful for tracking payment issues
 */
export const getPaymentFailures = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const failures = await ctx.db
      .query('billingHistory')
      .withIndex('by_event_type', q => q.eq('eventType', 'invoice.payment_failed'))
      .filter(q => q.eq(q.field('organizationId'), args.organizationId))
      .order('desc')
      .take(limit);

    return failures;
  },
});

/**
 * Get all successful payments for an organization
 *
 * Useful for displaying invoice history
 */
export const getSuccessfulPayments = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const payments = await ctx.db
      .query('billingHistory')
      .withIndex('by_event_type', q => q.eq('eventType', 'invoice.payment_succeeded'))
      .filter(q => q.eq(q.field('organizationId'), args.organizationId))
      .order('desc')
      .take(limit);

    return payments;
  },
});
