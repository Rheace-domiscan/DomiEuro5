import { query } from './_generated/server';

interface ConversionRecord {
  organizationId: string;
  upgradedAt: number;
  triggerFeature: string | null;
  daysOnFreeTier: number;
}

interface ConversionMetrics {
  totalConversions: number;
  byFeature: Record<string, number>;
  averageDaysOnFreeTier: number | null;
  conversions: ConversionRecord[];
}

export const getConversionMetrics = query({
  args: {},
  handler: async ctx => {
    const subscriptions = await ctx.db
      .query('subscriptions')
      .filter(q => q.neq(q.field('conversionTracking'), undefined))
      .collect();

    const conversions: ConversionRecord[] = [];
    const byFeature: Record<string, number> = {};

    for (const subscription of subscriptions) {
      const tracking = subscription.conversionTracking;
      if (!tracking) {
        continue;
      }

      const triggerFeature = tracking.triggerFeature ?? 'unknown';

      conversions.push({
        organizationId: subscription.organizationId,
        upgradedAt: tracking.upgradedAt,
        triggerFeature: tracking.triggerFeature ?? null,
        daysOnFreeTier: tracking.daysOnFreeTier,
      });

      byFeature[triggerFeature] = (byFeature[triggerFeature] ?? 0) + 1;
    }

    const totalConversions = conversions.length;

    const averageDaysOnFreeTier =
      totalConversions > 0
        ? Math.round(
            conversions.reduce((sum, conversion) => sum + conversion.daysOnFreeTier, 0) /
              totalConversions
          )
        : null;

    const sortedConversions = conversions.sort((a, b) => b.upgradedAt - a.upgradedAt);

    const metrics: ConversionMetrics = {
      totalConversions,
      byFeature,
      averageDaysOnFreeTier,
      conversions: sortedConversions,
    };

    return metrics;
  },
});
