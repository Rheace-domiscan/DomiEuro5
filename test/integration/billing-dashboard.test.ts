/**
 * Billing Dashboard Route Tests (Phase 7)
 *
 * Validates loader/action behaviour for app/routes/settings/billing.tsx:
 * - Access control (owner/admin vs manager)
 * - Stripe portal redirect handling
 * - Seat preview + seat addition flows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { redirect } from 'react-router';
import type { User } from '~/lib/auth.server';
import { createMockRequest } from '../helpers/test-utils';

vi.mock('~/lib/auth.server', () => ({
  requireRole: vi.fn(),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
}));

vi.mock('~/lib/stripe.server', () => ({
  createBillingPortalSession: vi.fn(),
  getAdditionalSeatPriceId: vi.fn(() => 'price_additional'),
  getStripePriceId: vi.fn(() => 'price_base'),
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    invoices: {
      createPreview: vi.fn(),
    },
  },
}));

import { loader, action } from '../../app/routes/settings/billing';
import { requireRole } from '~/lib/auth.server';
import { convexServer } from '../../lib/convex.server';
import {
  createBillingPortalSession,
  getAdditionalSeatPriceId,
  getStripePriceId,
  stripe,
} from '~/lib/stripe.server';

const stripeSubscriptionsRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const stripeSubscriptionsUpdate = vi.mocked(stripe.subscriptions.update);
const stripeInvoicesCreatePreview = vi.mocked(stripe.invoices.createPreview);

async function resolveLoaderData<T>(result: unknown): Promise<T> {
  if (result && typeof (result as Response).json === 'function') {
    return ((await (result as Response).json()) as T);
  }
  if (result && typeof result === 'object' && result !== null && 'data' in (result as Record<string, unknown>)) {
    return ((result as Record<string, unknown>).data as T);
  }
  return result as T;
}

const ownerUser: User = {
  id: 'user_owner_1',
  email: 'owner@example.com',
  firstName: 'Owner',
  lastName: 'User',
  organizationId: 'org_123',
  role: 'owner',
};

const managerUser: User = {
  ...ownerUser,
  role: 'manager',
};

const subscriptionRecord = {
  _id: 'sub_record_1',
  organizationId: 'org_123',
  stripeCustomerId: 'cus_test_123',
  stripeSubscriptionId: 'sub_test_123',
  tier: 'starter',
  status: 'active',
  billingInterval: 'monthly',
  seatsIncluded: 5,
  seatsTotal: 6,
  seatsActive: 5,
  currentPeriodStart: Date.now(),
  currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
  cancelAtPeriodEnd: false,
  accessStatus: 'active',
  pendingDowngrade: undefined,
  gracePeriodEndsAt: undefined,
  gracePeriodStartedAt: undefined,
};

const statsRecord = {
  hasSubscription: true,
  tier: 'starter',
  seatsIncluded: 5,
  seatsTotal: 6,
  seatsActive: 5,
  seatsAvailable: 1,
  isOverLimit: false,
  status: 'active',
  accessStatus: 'active',
  pendingDowngrade: undefined,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
};

const billingHistory = [
  {
    _id: 'evt_1',
    eventType: 'invoice.payment_succeeded',
    description: 'Invoice paid',
    amount: 5000,
    currency: 'gbp',
    status: 'succeeded',
    createdAt: Date.now(),
  },
];

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...originalEnv,
    STRIPE_PRICE_STARTER_MONTHLY: 'price_base',
    STRIPE_PRICE_ADDITIONAL_SEAT: 'price_additional',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('billing settings loader', () => {
  it('returns subscription data for owner', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query)
      .mockResolvedValueOnce(subscriptionRecord)
      .mockResolvedValueOnce(statsRecord)
      .mockResolvedValueOnce(billingHistory);

    const response = await loader({
      request: createMockRequest('/settings/billing'),
      params: {},
      context: {},
    });

    const payload = await resolveLoaderData<any>(response);
    expect(payload.subscription).toMatchObject({ tier: 'starter', seatsTotal: 6 });
    expect(convexServer.query).toHaveBeenCalledTimes(3);
  });

  it('redirects managers to /dashboard', async () => {
    vi.mocked(requireRole).mockImplementation(() => {
      throw redirect('/dashboard');
    });

    await expect(
      loader({
        request: createMockRequest('/settings/billing'),
        params: {},
        context: {},
      })
    ).rejects.toMatchObject({ headers: new Headers({ Location: '/dashboard' }) });
  });
});

describe('billing settings action', () => {
  it('opens Stripe billing portal for manageBilling intent', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);
    vi.mocked(createBillingPortalSession).mockResolvedValue({
      url: 'https://stripe.test/portal',
    } as any);

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new URLSearchParams({ intent: 'manageBilling' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    try {
      await action({ request, params: {}, context: {} });
      throw new Error('Expected redirect');
    } catch (error) {
      const response = error as Response;
      expect(response.headers.get('Location')).toBe('https://stripe.test/portal');
      expect(createBillingPortalSession).toHaveBeenCalledWith(
        'cus_test_123',
        expect.stringContaining('/settings/billing')
      );
    }
  });

  it('returns seat preview details for previewSeats intent', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);

    stripeSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_test_123',
      customer: 'cus_test_123',
      items: {
        data: [
          {
            id: 'si_base',
            price: { id: 'price_base' },
            quantity: 1,
          },
        ],
      },
    } as any);

    stripeInvoicesCreatePreview.mockResolvedValue({
      amount_due: 1500,
      currency: 'gbp',
      lines: {
        data: [
          {
            description: 'Seat proration',
            amount: 1500,
            currency: 'gbp',
            parent: {
              subscription_item_details: { proration: true },
              invoice_item_details: null,
            },
          },
        ],
      },
    } as any);

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new URLSearchParams({ intent: 'previewSeats', seatsToAdd: '2' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await resolveLoaderData<any>(response);

    expect(payload.intent).toBe('previewSeats');
    expect(payload.ok).toBe(true);
    expect(payload.preview.immediateAmount).toBe(1500);
    expect(payload.preview.additionalSeatsAfter).toBe(3);
    expect(getStripePriceId).toHaveBeenCalledWith('starter', 'monthly');
    expect(getAdditionalSeatPriceId).toHaveBeenCalled();
  });

  it('adds seats and updates subscription totals for addSeats intent', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);
    stripeSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_test_123',
      customer: 'cus_test_123',
      items: {
        data: [
          {
            id: 'si_base',
            price: { id: 'price_base' },
            quantity: 1,
          },
        ],
      },
    } as any);
    stripeInvoicesCreatePreview.mockResolvedValue({
      amount_due: 0,
      currency: 'gbp',
      lines: { data: [] },
    } as any);

    stripeSubscriptionsUpdate.mockResolvedValue({} as any);
    vi.mocked(convexServer.mutation).mockResolvedValue(null);

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new URLSearchParams({ intent: 'addSeats', seatsToAdd: '2' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await resolveLoaderData<any>(response);

    expect(payload.intent).toBe('addSeats');
    expect(payload.ok).toBe(true);
    expect(payload.seatsAdded).toBe(2);
    expect(convexServer.mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ seatsTotal: 8 })
    );
    expect(stripeSubscriptionsUpdate).toHaveBeenCalled();
  });
});
