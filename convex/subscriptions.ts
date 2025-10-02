/**
 * Convex Subscription Functions
 *
 * This file contains database operations for managing subscriptions:
 * - Create, read, update subscription records
 * - Track subscription status and seat usage
 * - Handle grace periods and downgrades
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * List all subscriptions (for testing)
 */
export const list = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('subscriptions').collect();
  },
});

/**
 * Get subscription by organization ID
 *
 * **CRITICAL**: This enforces multi-tenancy isolation
 */
export const getByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .first();

    return subscription;
  },
});

/**
 * Get subscription by Stripe customer ID
 */
export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripe_customer', q => q.eq('stripeCustomerId', args.stripeCustomerId))
      .first();

    return subscription;
  },
});

/**
 * Get subscription by Stripe subscription ID
 */
export const getByStripeSubscriptionId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_stripe_subscription', q =>
        q.eq('stripeSubscriptionId', args.stripeSubscriptionId)
      )
      .first();

    return subscription;
  },
});

/**
 * Create a new subscription
 *
 * Called when a Stripe checkout session completes or subscription is created
 */
export const create = mutation({
  args: {
    organizationId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    tier: v.string(),
    status: v.string(),
    billingInterval: v.string(),
    seatsIncluded: v.number(),
    seatsTotal: v.number(),
    seatsActive: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    upgradedFrom: v.optional(v.string()),
    upgradeTriggerFeature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const subscriptionId = await ctx.db.insert('subscriptions', {
      organizationId: args.organizationId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      tier: args.tier,
      status: args.status,
      billingInterval: args.billingInterval,
      seatsIncluded: args.seatsIncluded,
      seatsTotal: args.seatsTotal,
      seatsActive: args.seatsActive,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
      accessStatus: 'active',
      upgradedFrom: args.upgradedFrom,
      upgradedAt: args.upgradedFrom ? now : undefined,
      upgradeTriggerFeature: args.upgradeTriggerFeature,
      createdAt: now,
      updatedAt: now,
    });

    return subscriptionId;
  },
});

/**
 * Update an existing subscription
 *
 * Called when Stripe sends subscription update webhooks
 */
export const update = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    tier: v.optional(v.string()),
    status: v.optional(v.string()),
    billingInterval: v.optional(v.string()),
    seatsIncluded: v.optional(v.number()),
    seatsTotal: v.optional(v.number()),
    seatsActive: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    accessStatus: v.optional(v.string()),
    pendingDowngrade: v.optional(
      v.object({
        tier: v.string(),
        effectiveDate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { subscriptionId, ...updates } = args;

    await ctx.db.patch(subscriptionId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return subscriptionId;
  },
});

/**
 * Update subscription status
 *
 * Convenience function for common status changes
 */
export const updateStatus = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    status: v.string(),
    accessStatus: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: args.status,
      accessStatus: args.accessStatus,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: Date.now(),
    });

    return args.subscriptionId;
  },
});

/**
 * Start grace period for failed payment
 *
 * Gives the customer 28 days to update payment method
 */
export const startGracePeriod = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    gracePeriodDays: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const gracePeriodEndsAt = now + args.gracePeriodDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.subscriptionId, {
      status: 'past_due',
      accessStatus: 'grace_period',
      gracePeriodStartedAt: now,
      gracePeriodEndsAt,
      updatedAt: now,
    });

    return args.subscriptionId;
  },
});

/**
 * End grace period (payment successful or grace period expired)
 */
export const endGracePeriod = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    paymentSuccessful: v.boolean(),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      gracePeriodStartedAt: undefined,
      gracePeriodEndsAt: undefined,
      updatedAt: Date.now(),
    };

    if (args.paymentSuccessful) {
      // Payment successful - restore active status
      updates.status = 'active';
      updates.accessStatus = 'active';
    } else {
      // Grace period expired - lock account
      updates.status = 'past_due';
      updates.accessStatus = 'locked';
    }

    await ctx.db.patch(args.subscriptionId, updates);

    return args.subscriptionId;
  },
});

/**
 * Set pending downgrade
 *
 * Stores information about a scheduled tier downgrade
 */
export const setPendingDowngrade = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    tier: v.string(),
    effectiveDate: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      pendingDowngrade: {
        tier: args.tier,
        effectiveDate: args.effectiveDate,
      },
      updatedAt: Date.now(),
    });

    return args.subscriptionId;
  },
});

/**
 * Clear pending downgrade
 *
 * Called when downgrade is canceled or completed
 */
export const clearPendingDowngrade = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      pendingDowngrade: undefined,
      updatedAt: Date.now(),
    });

    return args.subscriptionId;
  },
});

/**
 * Update seat count
 *
 * Called when seats are added or users are deactivated
 */
export const updateSeats = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    seatsTotal: v.optional(v.number()),
    seatsActive: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.seatsTotal !== undefined) {
      updates.seatsTotal = args.seatsTotal;
    }

    if (args.seatsActive !== undefined) {
      updates.seatsActive = args.seatsActive;
    }

    await ctx.db.patch(args.subscriptionId, updates);

    return args.subscriptionId;
  },
});

/**
 * Get all subscriptions in grace period
 *
 * Used by cron job to check for expired grace periods
 */
export const getGracePeriodSubscriptions = query({
  args: {},
  handler: async ctx => {
    const subscriptions = await ctx.db
      .query('subscriptions')
      .withIndex('by_access_status', q => q.eq('accessStatus', 'grace_period'))
      .collect();

    return subscriptions;
  },
});

/**
 * Get subscription statistics for organization
 *
 * Returns seat usage and subscription status
 */
export const getStats = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .first();

    if (!subscription) {
      return {
        hasSubscription: false,
        tier: 'free',
        seatsIncluded: 1,
        seatsTotal: 1,
        seatsActive: 0,
        seatsAvailable: 1,
        isOverLimit: false,
        status: 'active',
        accessStatus: 'active',
      };
    }

    const seatsAvailable = subscription.seatsTotal - subscription.seatsActive;
    const isOverLimit = subscription.seatsActive > subscription.seatsTotal;

    return {
      hasSubscription: true,
      tier: subscription.tier,
      seatsIncluded: subscription.seatsIncluded,
      seatsTotal: subscription.seatsTotal,
      seatsActive: subscription.seatsActive,
      seatsAvailable,
      isOverLimit,
      status: subscription.status,
      accessStatus: subscription.accessStatus,
      pendingDowngrade: subscription.pendingDowngrade,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  },
});

/**
 * Delete a subscription
 *
 * Used when subscription is canceled and period has ended
 */
export const remove = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
    return true;
  },
});
