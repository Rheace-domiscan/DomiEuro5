/**
 * Convex Billing History Unit Tests (Phase 7)
 *
 * Validates billing history mutations/queries with the convex-test harness.
 * Focus:
 * - Idempotent event logging (stripeEventId dedupe)
 * - Query helpers for organizations and subscriptions
 */

import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

describe('convex/billingHistory', () => {
  const organizationId = 'org_history_123';
  const subscriptionId = 'sub_history_123';
  const stripeEventId = 'evt_test_history';
  const timestamp = new Date('2025-02-01T12:00:00Z');

  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(timestamp);
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createEvent(overrides: Partial<Record<string, unknown>> = {}) {
    return await t.mutation(api.billingHistory.create, {
      organizationId,
      subscriptionId,
      eventType: 'invoice.payment_succeeded',
      stripeEventId,
      amount: 5000,
      currency: 'gbp',
      status: 'succeeded',
      description: 'Invoice paid',
      ...overrides,
    });
  }

  it('writes billing history records and returns them by organization', async () => {
    await createEvent();

    const events = await t.query(api.billingHistory.getByOrganization, {
      organizationId,
      limit: 10,
    });

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.subscriptionId).toBe(subscriptionId);
    expect(event.eventType).toBe('invoice.payment_succeeded');
    expect(event.amount).toBe(5000);
    expect(event.createdAt).toBe(timestamp.getTime());
  });

  it('deduplicates events by stripeEventId', async () => {
    const firstId = await createEvent();
    const secondId = await createEvent();

    expect(secondId).toEqual(firstId);

    const events = await t.query(api.billingHistory.getByOrganization, {
      organizationId,
    });

    expect(events).toHaveLength(1);
  });

  it('retrieves billing events by subscription id', async () => {
    await createEvent();
    await createEvent({
      stripeEventId: 'evt_test_history_2',
      subscriptionId: 'sub_history_other',
    });

    const events = await t.query(api.billingHistory.getBySubscription, {
      subscriptionId,
      limit: 5,
    });

    expect(events).toHaveLength(1);
    expect(events[0].subscriptionId).toBe(subscriptionId);
  });

  it('checks if a Stripe event has already been processed', async () => {
    await createEvent();

    const alreadyProcessed = await t.query(api.billingHistory.isEventProcessed, {
      stripeEventId,
    });

    const newEventProcessed = await t.query(api.billingHistory.isEventProcessed, {
      stripeEventId: 'evt_new_event',
    });

    expect(alreadyProcessed).toBe(true);
    expect(newEventProcessed).toBe(false);
  });

  it('filters events by event type', async () => {
    await createEvent({
      eventType: 'invoice.payment_failed',
      stripeEventId: 'evt_failed_1',
      status: 'failed',
    });
    await createEvent({
      eventType: 'invoice.payment_succeeded',
      stripeEventId: 'evt_succeeded_1',
    });

    const failures = await t.query(api.billingHistory.getByEventType, {
      organizationId,
      eventType: 'invoice.payment_failed',
      limit: 10,
    });

    expect(failures).toHaveLength(1);
    expect(failures[0].eventType).toBe('invoice.payment_failed');
  });

  it('returns recent payment failures for an organization', async () => {
    await createEvent({
      eventType: 'invoice.payment_failed',
      stripeEventId: 'evt_failed_2',
      status: 'failed',
    });
    await createEvent({
      eventType: 'invoice.payment_failed',
      stripeEventId: 'evt_failed_3',
      status: 'failed',
    });
    await createEvent({
      eventType: 'invoice.payment_succeeded',
      stripeEventId: 'evt_success_ignore',
    });

    const failures = await t.query(api.billingHistory.getPaymentFailures, {
      organizationId,
      limit: 5,
    });

    expect(failures).toHaveLength(2);
    expect(failures.every(event => event.eventType === 'invoice.payment_failed')).toBe(true);
  });

  it('returns successful payments for an organization', async () => {
    await createEvent({
      eventType: 'invoice.payment_succeeded',
      stripeEventId: 'evt_success_1',
    });
    await createEvent({
      eventType: 'invoice.payment_succeeded',
      stripeEventId: 'evt_success_2',
    });
    await createEvent({
      eventType: 'invoice.payment_failed',
      stripeEventId: 'evt_failed_ignore',
      status: 'failed',
    });

    const payments = await t.query(api.billingHistory.getSuccessfulPayments, {
      organizationId,
      limit: 10,
    });

    expect(payments).toHaveLength(2);
    expect(payments.every(event => event.eventType === 'invoice.payment_succeeded')).toBe(true);
  });
});
