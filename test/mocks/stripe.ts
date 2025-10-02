/**
 * Stripe SDK Mock
 *
 * Provides mock implementations of Stripe SDK methods for testing.
 * Import this in tests that interact with Stripe APIs.
 *
 * @example
 * ```typescript
 * import { mockStripe } from '~/test/mocks/stripe';
 *
 * mockStripe.checkout.sessions.create.mockResolvedValue({
 *   id: 'cs_test_123',
 *   url: 'https://checkout.stripe.com/...',
 * });
 * ```
 */

import { vi } from 'vitest';

/**
 * Mock Stripe Customer object
 */
export const mockStripeCustomer = {
  id: 'cus_test123456789',
  object: 'customer' as const,
  email: 'test@example.com',
  name: 'Test User',
  metadata: {
    workosUserId: 'user_01HTEST123456789',
    organizationId: 'org_01HTEST123456789',
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Checkout Session object
 */
export const mockStripeCheckoutSession = {
  id: 'cs_test_123456789',
  object: 'checkout.session' as const,
  url: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
  customer: mockStripeCustomer.id,
  mode: 'subscription' as const,
  status: 'open' as const,
  metadata: {
    organizationId: 'org_01HTEST123456789',
    userId: 'user_01HTEST123456789',
    tier: 'starter',
  },
  created: Math.floor(Date.now() / 1000),
  expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
  livemode: false,
};

/**
 * Mock Stripe Subscription object
 */
export const mockStripeSubscription = {
  id: 'sub_test123456789',
  object: 'subscription' as const,
  customer: mockStripeCustomer.id,
  status: 'active' as const,
  items: {
    object: 'list' as const,
    data: [
      {
        id: 'si_test123',
        object: 'subscription_item' as const,
        price: {
          id: 'price_starter_monthly',
          object: 'price' as const,
          unit_amount: 5000, // £50 in pence
          currency: 'gbp',
          recurring: {
            interval: 'month' as const,
            interval_count: 1,
          },
        },
        quantity: 1,
      },
    ],
  },
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
  metadata: {
    organizationId: 'org_01HTEST123456789',
    tier: 'starter',
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Invoice object
 */
export const mockStripeInvoice = {
  id: 'in_test123456789',
  object: 'invoice' as const,
  customer: mockStripeCustomer.id,
  subscription: mockStripeSubscription.id,
  status: 'paid' as const,
  amount_due: 5000,
  amount_paid: 5000,
  currency: 'gbp',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Event object
 */
export const mockStripeEvent = {
  id: 'evt_test123456789',
  object: 'event' as const,
  type: 'checkout.session.completed' as const,
  data: {
    object: mockStripeCheckoutSession,
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Price object
 */
export const mockStripePrice = {
  id: 'price_starter_monthly',
  object: 'price' as const,
  active: true,
  currency: 'gbp',
  unit_amount: 5000, // £50 in pence
  recurring: {
    interval: 'month' as const,
    interval_count: 1,
  },
  product: 'prod_starter',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Product object
 */
export const mockStripeProduct = {
  id: 'prod_starter',
  object: 'product' as const,
  active: true,
  name: 'Starter Plan - Monthly',
  description: 'Starter subscription tier with 5 included seats',
  metadata: {
    tier: 'starter',
    seats_included: '5',
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe SDK
 *
 * This object structure mirrors the actual Stripe SDK.
 */
export const mockStripe = {
  customers: {
    create: vi.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
    update: vi.fn().mockResolvedValue(mockStripeCustomer),
    del: vi.fn().mockResolvedValue({ id: mockStripeCustomer.id, deleted: true }),
    list: vi.fn().mockResolvedValue({
      object: 'list',
      data: [mockStripeCustomer],
      has_more: false,
    }),
  },

  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
      retrieve: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
      expire: vi.fn().mockResolvedValue({ ...mockStripeCheckoutSession, status: 'expired' }),
      list: vi.fn().mockResolvedValue({
        object: 'list',
        data: [mockStripeCheckoutSession],
        has_more: false,
      }),
    },
  },

  subscriptions: {
    create: vi.fn().mockResolvedValue(mockStripeSubscription),
    retrieve: vi.fn().mockResolvedValue(mockStripeSubscription),
    update: vi.fn().mockResolvedValue(mockStripeSubscription),
    cancel: vi.fn().mockResolvedValue({ ...mockStripeSubscription, status: 'canceled' }),
    list: vi.fn().mockResolvedValue({
      object: 'list',
      data: [mockStripeSubscription],
      has_more: false,
    }),
  },

  invoices: {
    create: vi.fn().mockResolvedValue(mockStripeInvoice),
    retrieve: vi.fn().mockResolvedValue(mockStripeInvoice),
    update: vi.fn().mockResolvedValue(mockStripeInvoice),
    pay: vi.fn().mockResolvedValue({ ...mockStripeInvoice, status: 'paid' }),
    list: vi.fn().mockResolvedValue({
      object: 'list',
      data: [mockStripeInvoice],
      has_more: false,
    }),
  },

  prices: {
    create: vi.fn().mockResolvedValue(mockStripePrice),
    retrieve: vi.fn().mockResolvedValue(mockStripePrice),
    update: vi.fn().mockResolvedValue(mockStripePrice),
    list: vi.fn().mockResolvedValue({
      object: 'list',
      data: [mockStripePrice],
      has_more: false,
    }),
  },

  products: {
    create: vi.fn().mockResolvedValue(mockStripeProduct),
    retrieve: vi.fn().mockResolvedValue(mockStripeProduct),
    update: vi.fn().mockResolvedValue(mockStripeProduct),
    list: vi.fn().mockResolvedValue({
      object: 'list',
      data: [mockStripeProduct],
      has_more: false,
    }),
  },

  webhooks: {
    constructEvent: vi.fn().mockReturnValue(mockStripeEvent),
  },

  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'bps_test123',
        object: 'billing_portal.session',
        url: 'https://billing.stripe.com/session/...',
        customer: mockStripeCustomer.id,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
      }),
    },
  },
};

/**
 * Reset all Stripe mocks
 *
 * Call this in beforeEach() or afterEach() to reset mock state between tests.
 */
export function resetStripeMocks() {
  vi.clearAllMocks();

  // Reset to default mock implementations
  mockStripe.customers.create.mockResolvedValue(mockStripeCustomer);
  mockStripe.customers.retrieve.mockResolvedValue(mockStripeCustomer);
  mockStripe.checkout.sessions.create.mockResolvedValue(mockStripeCheckoutSession);
  mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockStripeCheckoutSession);
  mockStripe.subscriptions.create.mockResolvedValue(mockStripeSubscription);
  mockStripe.subscriptions.retrieve.mockResolvedValue(mockStripeSubscription);
  mockStripe.invoices.create.mockResolvedValue(mockStripeInvoice);
  mockStripe.invoices.retrieve.mockResolvedValue(mockStripeInvoice);
  mockStripe.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
}

/**
 * Mock Stripe webhook event constructor
 *
 * Creates a mock Stripe event for webhook testing.
 *
 * @example
 * ```typescript
 * const event = createMockStripeEvent('checkout.session.completed', mockStripeCheckoutSession);
 * ```
 */
export function createMockStripeEvent(type: string, data: unknown) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event' as const,
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  };
}

/**
 * Mock Stripe signature for webhook verification
 *
 * Use this to test webhook signature verification logic.
 */
export const mockStripeSignature = 't=1234567890,v1=mock_signature_hash';

/**
 * Mock Stripe webhook secret
 */
export const mockStripeWebhookSecret = 'whsec_test_mock_webhook_secret';

/**
 * Mock Stripe module
 *
 * Use this in vi.mock() to replace the actual Stripe SDK.
 *
 * @example
 * ```typescript
 * vi.mock('stripe', () => ({
 *   default: vi.fn(() => mockStripe),
 * }));
 * ```
 */
export const StripeMock = vi.fn(() => mockStripe);
