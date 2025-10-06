import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

describe('convex/analytics', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T00:00:00Z'));
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function seedConversion(options: {
    organizationId: string;
    triggerFeature?: string;
    daysOnFreeTier: number;
  }) {
    await t.mutation(api.users.createUser, {
      email: `${options.organizationId}@example.com`,
      name: `User ${options.organizationId}`,
      workosUserId: `workos_${options.organizationId}`,
      organizationId: options.organizationId,
    });

    if (options.daysOnFreeTier > 0) {
      vi.advanceTimersByTime(options.daysOnFreeTier * DAY_IN_MS);
    }

    await t.mutation(api.subscriptions.create, {
      organizationId: options.organizationId,
      stripeCustomerId: `cus_${options.organizationId}`,
      stripeSubscriptionId: `sub_${options.organizationId}`,
      tier: 'starter',
      status: 'active',
      billingInterval: 'monthly',
      seatsIncluded: 5,
      seatsTotal: 5,
      seatsActive: 0,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * DAY_IN_MS,
      cancelAtPeriodEnd: false,
      upgradedFrom: 'free',
      upgradeTriggerFeature: options.triggerFeature,
    });
  }

  it('aggregates conversion metrics by feature', async () => {
    await seedConversion({
      organizationId: 'org_analytics',
      triggerFeature: 'dashboard-analytics',
      daysOnFreeTier: 3,
    });
    await seedConversion({
      organizationId: 'org_api',
      triggerFeature: 'dashboard-api',
      daysOnFreeTier: 6,
    });
    await seedConversion({ organizationId: 'org_unknown', daysOnFreeTier: 1 });

    const metrics = await t.query(api.analytics.getConversionMetrics, {});

    expect(metrics.totalConversions).toBe(3);
    expect(metrics.byFeature['dashboard-analytics']).toBe(1);
    expect(metrics.byFeature['dashboard-api']).toBe(1);
    expect(metrics.byFeature.unknown).toBe(1);
    expect(metrics.averageDaysOnFreeTier).toBe(Math.round((3 + 6 + 1) / 3));
    expect(metrics.conversions[0]?.upgradedAt).toBeGreaterThan(0);
    expect(metrics.conversions[0]?.organizationId).toBeDefined();
  });
});
