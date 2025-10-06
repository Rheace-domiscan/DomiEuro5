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
import { api, internal } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
    expect(withGrace?.gracePeriodStartedAt).toBe(baseTimestamp.getTime());
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

  it('does not reset grace period when already active', async () => {
    const subscriptionId = await seedSubscription();

    await t.mutation(api.subscriptions.startGracePeriod, {
      subscriptionId,
      gracePeriodDays: 28,
    });

    const initial = await t.query(api.subscriptions.getByOrganization, { organizationId });

    expect(initial?.gracePeriodStartedAt).toBe(baseTimestamp.getTime());

    vi.advanceTimersByTime(5 * DAY_IN_MS);

    await t.mutation(api.subscriptions.startGracePeriod, {
      subscriptionId,
      gracePeriodDays: 28,
    });

    const afterRetry = await t.query(api.subscriptions.getByOrganization, { organizationId });

    expect(afterRetry?.gracePeriodStartedAt).toBe(initial?.gracePeriodStartedAt);
    expect(afterRetry?.gracePeriodEndsAt).toBe(initial?.gracePeriodEndsAt);
  });

  it('locks subscriptions when grace period expires', async () => {
    const subscriptionId = await seedSubscription();

    await t.mutation(api.subscriptions.startGracePeriod, {
      subscriptionId,
      gracePeriodDays: 28,
    });

    vi.advanceTimersByTime(29 * DAY_IN_MS);

    await t.mutation(internal.subscriptions.checkGracePeriods, {});

    const locked = await t.query(api.subscriptions.getByOrganization, { organizationId });
    expect(locked?.accessStatus).toBe('locked');

    const events = await t.query(api.billingHistory.getByOrganization, {
      organizationId,
      limit: 5,
    });

    expect(events?.some(event => event.eventType === 'grace_period.expired')).toBe(true);
  });

  it('captures conversion tracking when upgrading from free', async () => {
    await t.mutation(api.users.createUser, {
      email: 'owner@example.com',
      name: 'Owner',
      workosUserId: 'user_owner_01',
      organizationId,
    });

    vi.advanceTimersByTime(5 * DAY_IN_MS);

    await t.mutation(api.subscriptions.create, {
      organizationId,
      stripeCustomerId,
      stripeSubscriptionId,
      tier: 'starter',
      status: 'active',
      billingInterval,
      seatsIncluded: 5,
      seatsTotal: 5,
      seatsActive: 4,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * DAY_IN_MS,
      cancelAtPeriodEnd: false,
      upgradedFrom: 'free',
      upgradeTriggerFeature: 'dashboard-analytics',
    });

    const subscription = await t.query(api.subscriptions.getByOrganization, { organizationId });

    expect(subscription?.upgradedFrom).toBe('free');
    expect(subscription?.conversionTracking?.triggerFeature).toBe('dashboard-analytics');
    expect(subscription?.conversionTracking?.daysOnFreeTier).toBe(5);
    expect(subscription?.conversionTracking?.freeTierCreatedAt).toBe(baseTimestamp.getTime());
  });
});
