/**
 * Convex Subscriptions Functions
 *
 * CRUD operations for subscriptions table.
 * This file will be expanded in Phase 5 with full Stripe integration.
 */

import { v } from 'convex/values';
import { query } from './_generated/server';

/**
 * List all subscriptions (for testing Phase 1)
 */
export const list = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('subscriptions').collect();
  },
});

/**
 * Get subscription by organization ID
 */
export const getByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .first();
  },
});
