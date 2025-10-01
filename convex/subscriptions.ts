/**
 * Convex Subscriptions Functions
 *
 * CRUD operations for subscriptions table.
 * This file will be expanded in Phase 5 with full Stripe integration.
 */

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
