/**
 * Convex Subscriptions Unit Tests (Phase 7)
 *
 * These tests exercise the core business logic in convex/subscriptions.ts using the
 * `convex-test` harness. Coverage focus areas:
 * - Subscription creation/update lifecycle
 * - Grace period calculations
 * - Seat management helpers (pending downgrades, seat availability)
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

describe('convex/subscriptions', () => {
  const organizationId = 'org_test_123';
  const stripeCustomerId = 'cus_test_123';
  const stripeSubscriptionId = 'sub_test_123';
  const baseTimestamp = new Date('2025-01-01T00:00:00Z');
  const billingInterval = 'monthly' as const;

  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTimestamp);
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function seedSubscription() {
    const currentPeriodStart = baseTimestamp.getTime();
    const currentPeriodEnd = currentPeriodStart + 30 * 24 * 60 * 60 * 1000;

    const subscriptionId = await t.mutation(api.subscriptions.create, {
      organizationId,
      stripeCustomerId,
      stripeSubscriptionId,
      tier: 'starter',
      status: 'active',
      billingInterval,
      seatsIncluded: 5,
      seatsTotal: 5,
      seatsActive: 4,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    return subscriptionId;
  }

  it('creates and retrieves subscription for an organization', async () => {
    await seedSubscription();

    const record = await t.query(api.subscriptions.getByOrganization, {
      organizationId,
    });

    expect(record).toBeDefined();
    expect(record?.tier).toBe('starter');
    expect(record?.accessStatus).toBe('active');
    expect(record?.seatsIncluded).toBe(5);
    expect(record?.seatsTotal).toBe(5);
    expect(record?.seatsActive).toBe(4);
  });

  it('updates subscription status and seat totals', async () => {
    const subscriptionId = await seedSubscription();

    await t.mutation(api.subscriptions.update, {
      subscriptionId,
      status: 'past_due',
      seatsTotal: 8,
    });

    const updated = await t.query(api.subscriptions.getByOrganization, { organizationId });

    expect(updated?.status).toBe('past_due');
    expect(updated?.seatsTotal).toBe(8);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(baseTimestamp.getTime());
  });

  it('starts and ends grace period with correct timestamps', async () => {
    const subscriptionId = await seedSubscription();

    const gracePeriodDays = 28;
    await t.mutation(api.subscriptions.startGracePeriod, {
      subscriptionId,
      gracePeriodDays,
    });

    const withGrace = await t.query(api.subscriptions.getByOrganization, { organizationId });
    expect(withGrace?.accessStatus).toBe('grace_period');
    expect(withGrace?.gracePeriodEndsAt).toBe(
      baseTimestamp.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
    );

    await t.mutation(api.subscriptions.endGracePeriod, {
      subscriptionId,
      paymentSuccessful: false,
    });

    const ended = await t.query(api.subscriptions.getByOrganization, { organizationId });
    expect(ended?.accessStatus).toBe('locked');
    expect(ended?.gracePeriodEndsAt).toBeUndefined();
  });

  it('sets and clears pending downgrade metadata', async () => {
    const subscriptionId = await seedSubscription();
    const effectiveDate = baseTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000;

    await t.mutation(api.subscriptions.setPendingDowngrade, {
      subscriptionId,
      tier: 'starter',
      effectiveDate,
    });

    const pending = await t.query(api.subscriptions.getByOrganization, { organizationId });
    expect(pending?.pendingDowngrade).toEqual({ tier: 'starter', effectiveDate });

    await t.mutation(api.subscriptions.clearPendingDowngrade, { subscriptionId });

    const cleared = await t.query(api.subscriptions.getByOrganization, { organizationId });
    expect(cleared?.pendingDowngrade).toBeUndefined();
  });

  it('calculates seat availability statistics', async () => {
    const subscriptionId = await seedSubscription();

    // Increase active seats to exceed allocation
    await t.mutation(api.subscriptions.updateSeats, {
      subscriptionId,
      seatsActive: 7,
      seatsTotal: 6,
    });

    const stats = await t.query(api.subscriptions.getStats, { organizationId });

    expect(stats.hasSubscription).toBe(true);
    expect(stats.seatsIncluded).toBe(5);
    expect(stats.seatsTotal).toBe(6);
    expect(stats.seatsActive).toBe(7);
    expect(stats.seatsAvailable).toBe(-1);
    expect(stats.isOverLimit).toBe(true);
  });
});
