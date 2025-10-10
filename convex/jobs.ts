/* eslint-disable no-console */

import { internalMutation } from './_generated/server';

export const sendUsageSummary = internalMutation(async ctx => {
  const organizations = await ctx.db.query('subscriptions').collect();

  const summaries = organizations.map(subscription => ({
    organizationId: subscription.organizationId,
    tier: subscription.tier,
    seatsActive: subscription.seatsActive,
    seatsTotal: subscription.seatsTotal,
  }));

  // Placeholder: in production, hand off to email or analytics pipeline.
  console.info('[jobs] usage summary', summaries);

  return summaries.length;
});
