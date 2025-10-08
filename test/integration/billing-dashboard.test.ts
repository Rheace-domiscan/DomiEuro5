/**
 * Billing Dashboard Route Tests (Phase 7)
 *
 * Validates loader/action behaviour for app/routes/settings/billing.tsx:
 * - Access control (owner/admin vs manager)
 * - Stripe portal redirect handling
 * - Seat preview + seat addition flows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Stripe from 'stripe';
import type { User } from '~/lib/auth.server';
import { createMockRequest } from '../helpers/test-utils';

vi.mock('~/lib/auth.server', () => ({
  requireUser: vi.fn(),
  requireRole: vi.fn(),
  requireTier: vi.fn(),
  getUser: vi.fn(),
  createOrganization: vi.fn(),
  createOrganizationMembership: vi.fn(),
  inviteOrAddUserToOrganization: vi.fn(),
  inviteUserToOrganization: vi.fn(),
  deactivateOrganizationMembership: vi.fn(),
  reactivateOrganizationMembership: vi.fn(),
  updateOrganizationMembershipRole: vi.fn(),
  getOrganizationMembershipForUser: vi.fn(),
  listOrganizations: vi.fn(),
  syncUserRoleFromWorkOS: vi.fn(),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
  createOrUpdateUserInConvex: vi.fn(),
}));

vi.mock('~/lib/stripe.server', () => ({
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
  createStripeCustomer: vi.fn(),
  getStripeCustomer: vi.fn(),
  getStripeSubscription: vi.fn(),
  updateStripeSubscription: vi.fn(),
  settleSubscriptionInvoice: vi.fn(),
  getAdditionalSeatPriceId: vi.fn(() => 'price_additional'),
  getStripePriceId: vi.fn(() => 'price_base'),
  getPublishableKeyPreview: vi.fn(() => 'pk_test_preview'),
  getStripeMode: vi.fn(() => 'test'),
  getTierFromPriceId: vi.fn(() => 'starter'),
  verifyWebhookSignature: vi.fn(),
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
import { requireUser } from '~/lib/auth.server';
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
  if (result instanceof Response) {
    return (await result.json()) as T;
  }

  if (result && typeof result === 'object' && 'data' in result) {
    return (result as { data: T }).data;
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

type PreviewSeatChangeResponse = {
  intent: 'previewSeatChange';
  mode: 'add' | 'remove';
  ok: true;
  preview: {
    immediateAmount: number;
    additionalSeatsAfter: number;
    seatsAfter: number;
  };
};

type ApplySeatChangeResponse = {
  intent: 'applySeatChange';
  mode: 'add' | 'remove';
  ok: true;
  seatsChanged: number;
  newSeatTotal: number;
};

function makeStripeResponse<T>(payload: T): Stripe.Response<T> {
  return {
    ...payload,
    lastResponse: {
      headers: {},
      requestId: 'req_mock',
      statusCode: 200,
    },
  } as Stripe.Response<T>;
}

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
    vi.mocked(requireUser).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query)
      .mockResolvedValueOnce(subscriptionRecord)
      .mockResolvedValueOnce(statsRecord)
      .mockResolvedValueOnce(billingHistory);

    const response = await loader({
      request: createMockRequest('/settings/billing'),
      params: {},
      context: {},
    });

    const payload = await resolveLoaderData<{
      subscription: { tier: string; seatsTotal: number };
    }>(response);
    expect(payload.subscription).toMatchObject({ tier: 'starter', seatsTotal: 6 });
    expect(convexServer.query).toHaveBeenCalledTimes(3);
  });

  it('redirects managers to /dashboard', async () => {
    const managerUser: User = {
      ...ownerUser,
      role: 'manager',
    };

    vi.mocked(requireUser).mockResolvedValue(managerUser);
    vi.mocked(convexServer.query)
      .mockResolvedValueOnce({ ...subscriptionRecord, accessStatus: 'active' })
      .mockResolvedValueOnce({ ...statsRecord, accessStatus: 'active' })
      .mockResolvedValueOnce(billingHistory);

    await expect(
      loader({
        request: createMockRequest('/settings/billing'),
        params: {},
        context: {},
      })
    ).rejects.toMatchObject({ headers: new globalThis.Headers({ Location: '/dashboard' }) });
  });
});

describe('billing settings action', () => {
  it('opens Stripe billing portal for manageBilling intent', async () => {
    vi.mocked(requireUser).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);
    vi.mocked(createBillingPortalSession).mockResolvedValue({
      url: 'https://stripe.test/portal',
    } as unknown as Stripe.BillingPortal.Session);

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new globalThis.URLSearchParams({ intent: 'manageBilling' }),
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

  it('returns seat preview details for previewSeatChange intent', async () => {
    vi.mocked(requireUser).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);

    stripeSubscriptionsRetrieve.mockResolvedValue(
      makeStripeResponse<Stripe.Subscription>({
        id: 'sub_test_123',
        customer: 'cus_test_123',
        items: {
          data: [
            {
              id: 'si_base',
              price: { id: 'price_base' } as unknown as Stripe.Price,
              quantity: 1,
            },
          ],
        },
      } as unknown as Stripe.Subscription)
    );

    stripeInvoicesCreatePreview.mockResolvedValue(
      makeStripeResponse<Stripe.Invoice>({
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
      } as unknown as Stripe.Invoice)
    );

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new globalThis.URLSearchParams({
        intent: 'previewSeatChange',
        mode: 'add',
        seats: '2',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await resolveLoaderData<PreviewSeatChangeResponse>(response);

    expect(payload.intent).toBe('previewSeatChange');
    expect(payload.mode).toBe('add');
    expect(payload.ok).toBe(true);
    expect(payload.preview.immediateAmount).toBe(1500);
    expect(payload.preview.additionalSeatsAfter).toBe(3);
    expect(payload.preview.seatsAfter).toBe(8);
    expect(getStripePriceId).toHaveBeenCalledWith('starter', 'monthly');
    expect(getAdditionalSeatPriceId).toHaveBeenCalled();
  });

  it('adds seats and updates subscription totals for applySeatChange intent', async () => {
    vi.mocked(requireUser).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValue(subscriptionRecord);
    stripeSubscriptionsRetrieve.mockResolvedValue(
      makeStripeResponse<Stripe.Subscription>({
        id: 'sub_test_123',
        customer: 'cus_test_123',
        items: {
          data: [
            {
              id: 'si_base',
              price: { id: 'price_base' } as unknown as Stripe.Price,
              quantity: 1,
            },
          ],
        },
      } as unknown as Stripe.Subscription)
    );
    stripeInvoicesCreatePreview.mockResolvedValue(
      makeStripeResponse<Stripe.Invoice>({
        amount_due: 0,
        currency: 'gbp',
        lines: { data: [] },
      } as unknown as Stripe.Invoice)
    );

    stripeSubscriptionsUpdate.mockResolvedValue(
      makeStripeResponse<Stripe.Subscription>({
        id: 'sub_test_123',
      } as unknown as Stripe.Subscription)
    );
    vi.mocked(convexServer.mutation).mockResolvedValue(null);

    const request = createMockRequest('/settings/billing', {
      method: 'POST',
      body: new globalThis.URLSearchParams({
        intent: 'applySeatChange',
        mode: 'add',
        seats: '2',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await resolveLoaderData<ApplySeatChangeResponse>(response);

    expect(payload.intent).toBe('applySeatChange');
    expect(payload.mode).toBe('add');
    expect(payload.ok).toBe(true);
    expect(payload.seatsChanged).toBe(2);
    expect(payload.newSeatTotal).toBe(8);
    expect(convexServer.mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ seatsTotal: 8 })
    );
    expect(stripeSubscriptionsUpdate).toHaveBeenCalled();
  });
});
