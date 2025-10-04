/**
 * Stripe Server Utilities Tests
 *
 * Tests for app/lib/stripe.server.ts
 * - Stripe client configuration
 * - Checkout session creation
 * - Customer creation
 * - Webhook signature verification
 *
 * Coverage Target: >80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockStripe, resetStripeMocks, mockStripeSignature, mockStripeInvoice } from '../mocks/stripe';

// Mock Stripe SDK
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_SECRET_KEY: 'sk_test_mock123',
    VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
    STRIPE_PRICE_STARTER_MONTHLY: 'price_starter_monthly',
    STRIPE_PRICE_STARTER_ANNUAL: 'price_starter_annual',
    STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
    STRIPE_PRICE_PRO_ANNUAL: 'price_pro_annual',
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: 'price_pro_monthly',
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: 'price_pro_annual',
    STRIPE_PRICE_ADDITIONAL_SEAT: 'price_additional_seat',
  };
  resetStripeMocks();
});

afterEach(() => {
  process.env = originalEnv;
  vi.resetModules();
});

describe('Stripe Server Utilities', () => {
  describe('isTestMode()', () => {
    it('should return true when using test API key', async () => {
      const { isTestMode } = await import('~/lib/stripe.server');
      expect(isTestMode()).toBe(true);
    });

    it('should return false when using live API key', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_mock123';
      vi.resetModules();
      const { isTestMode } = await import('~/lib/stripe.server');
      expect(isTestMode()).toBe(false);
    });
  });

  describe('getStripePriceId()', () => {
    it('should return Starter monthly price ID', async () => {
      const { getStripePriceId } = await import('~/lib/stripe.server');
      const priceId = getStripePriceId('starter', 'monthly');
      expect(priceId).toBe('price_starter_monthly');
    });

    it('should return Starter annual price ID', async () => {
      const { getStripePriceId } = await import('~/lib/stripe.server');
      const priceId = getStripePriceId('starter', 'annual');
      expect(priceId).toBe('price_starter_annual');
    });

    it('should return Professional monthly price ID', async () => {
      const { getStripePriceId } = await import('~/lib/stripe.server');
      const priceId = getStripePriceId('professional', 'monthly');
      expect(priceId).toBe('price_pro_monthly');
    });

    it('should return Professional annual price ID', async () => {
      const { getStripePriceId } = await import('~/lib/stripe.server');
      const priceId = getStripePriceId('professional', 'annual');
      expect(priceId).toBe('price_pro_annual');
    });

    it('should throw error if price ID not configured', async () => {
      delete process.env.STRIPE_PRICE_STARTER_MONTHLY;
      vi.resetModules();
      const { getStripePriceId } = await import('~/lib/stripe.server');

      expect(() => getStripePriceId('starter', 'monthly')).toThrow(
        'STRIPE_PRICE_STARTER_MONTHLY environment variable is not configured'
      );
    });
  });

  describe('getAdditionalSeatPriceId()', () => {
    it('should return additional seat price ID', async () => {
      const { getAdditionalSeatPriceId } = await import('~/lib/stripe.server');
      const priceId = getAdditionalSeatPriceId();
      expect(priceId).toBe('price_additional_seat');
    });

    it('should throw error if price ID not configured', async () => {
      delete process.env.STRIPE_PRICE_ADDITIONAL_SEAT;
      vi.resetModules();
      const { getAdditionalSeatPriceId } = await import('~/lib/stripe.server');

      expect(() => getAdditionalSeatPriceId()).toThrow(
        'STRIPE_PRICE_ADDITIONAL_SEAT environment variable is not configured'
      );
    });
  });

  describe('createStripeCustomer()', () => {
    it('should create customer with email, name, and metadata', async () => {
      const { createStripeCustomer } = await import('~/lib/stripe.server');

      const customer = await createStripeCustomer({
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org_123',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          organizationId: 'org_123',
        },
      });

      expect(customer).toBeDefined();
      expect(customer.email).toBe('test@example.com');
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe API error'));
      const { createStripeCustomer } = await import('~/lib/stripe.server');

      await expect(
        createStripeCustomer({
          email: 'test@example.com',
          name: 'Test User',
          organizationId: 'org_123',
        })
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('createCheckoutSession()', () => {
    it('should create checkout session for Starter monthly with base seats only', async () => {
      const { createCheckoutSession } = await import('~/lib/stripe.server');

      const session = await createCheckoutSession({
        customerEmail: 'test@example.com',
        tier: 'starter',
        interval: 'monthly',
        seats: 5, // Only included seats
        organizationId: 'org_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer: undefined,
        customer_email: 'test@example.com',
        line_items: [
          {
            price: 'price_starter_monthly',
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          organizationId: 'org_123',
          tier: 'starter',
          interval: 'monthly',
          seats: '5',
        },
        subscription_data: {
          metadata: {
            organizationId: 'org_123',
            tier: 'starter',
            interval: 'monthly',
            seats: '5',
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: undefined,
      });

      expect(session).toBeDefined();
    });

    it('should create checkout session with additional seats', async () => {
      const { createCheckoutSession } = await import('~/lib/stripe.server');

      await createCheckoutSession({
        customerEmail: 'test@example.com',
        tier: 'starter',
        interval: 'monthly',
        seats: 10, // 5 included + 5 additional
        organizationId: 'org_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_starter_monthly',
              quantity: 1,
            },
            {
              price: 'price_additional_seat',
              quantity: 5, // 10 total - 5 included
            },
          ],
        })
      );
    });

    it('should create checkout session with existing customer ID', async () => {
      const { createCheckoutSession } = await import('~/lib/stripe.server');

      await createCheckoutSession({
        customerId: 'cus_existing123',
        customerEmail: 'test@example.com',
        tier: 'professional',
        interval: 'annual',
        seats: 25, // 20 included + 5 additional
        organizationId: 'org_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123',
          customer_email: undefined, // Should not set email when customer ID provided
          customer_update: {
            address: 'auto',
          },
        })
      );
    });

    it('should handle Stripe API errors during checkout creation', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Checkout creation failed'));
      const { createCheckoutSession } = await import('~/lib/stripe.server');

      await expect(
        createCheckoutSession({
          customerEmail: 'test@example.com',
          tier: 'starter',
          interval: 'monthly',
          seats: 5,
          organizationId: 'org_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Checkout creation failed');
    });
  });

  describe('createBillingPortalSession()', () => {
    it('should create billing portal session', async () => {
      const { createBillingPortalSession } = await import('~/lib/stripe.server');

      const session = await createBillingPortalSession('cus_123', 'https://example.com/billing');

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://example.com/billing',
      });

      expect(session).toBeDefined();
      expect(session.url).toBeDefined();
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.billingPortal.sessions.create.mockRejectedValue(
        new Error('Portal creation failed')
      );
      const { createBillingPortalSession } = await import('~/lib/stripe.server');

      await expect(
        createBillingPortalSession('cus_123', 'https://example.com/billing')
      ).rejects.toThrow('Portal creation failed');
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should verify valid webhook signature', async () => {
      const { verifyWebhookSignature } = await import('~/lib/stripe.server');

      const payload = JSON.stringify({ test: 'data' });
      const signature = mockStripeSignature;

      const event = verifyWebhookSignature(payload, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_mock'
      );
      expect(event).toBeDefined();
    });

    it('should throw error for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      const { verifyWebhookSignature } = await import('~/lib/stripe.server');

      const payload = JSON.stringify({ test: 'data' });
      const signature = 'invalid_signature';

      expect(() => verifyWebhookSignature(payload, signature)).toThrow(
        'Webhook signature verification failed: Invalid signature'
      );
    });

    it('should throw error if webhook secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      vi.resetModules();
      const { verifyWebhookSignature } = await import('~/lib/stripe.server');

      const payload = JSON.stringify({ test: 'data' });
      const signature = mockStripeSignature;

      expect(() => verifyWebhookSignature(payload, signature)).toThrow(
        'STRIPE_WEBHOOK_SECRET environment variable is not configured'
      );
    });
  });

  describe('getStripeCustomer()', () => {
    it('should retrieve customer by ID', async () => {
      const { getStripeCustomer } = await import('~/lib/stripe.server');

      const customer = await getStripeCustomer('cus_123');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(customer).toBeDefined();
    });

    it('should throw error if customer is deleted', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({ id: 'cus_123', deleted: true } as any);
      const { getStripeCustomer } = await import('~/lib/stripe.server');

      await expect(getStripeCustomer('cus_123')).rejects.toThrow(
        'Customer cus_123 has been deleted'
      );
    });
  });

  describe('getStripeSubscription()', () => {
    it('should retrieve subscription with expanded data', async () => {
      const { getStripeSubscription } = await import('~/lib/stripe.server');

      const subscription = await getStripeSubscription('sub_123');

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123', {
        expand: ['latest_invoice', 'schedule'],
      });
      expect(subscription).toBeDefined();
    });
  });

  describe('updateStripeSubscription()', () => {
    it('should update subscription with new parameters', async () => {
      const { updateStripeSubscription } = await import('~/lib/stripe.server');

      const params = {
        metadata: { seats: '10' },
      };

      const subscription = await updateStripeSubscription('sub_123', params);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', params);
      expect(subscription).toBeDefined();
    });
  });

  describe('settleSubscriptionInvoice()', () => {
    it('pays an open invoice immediately', async () => {
      const openInvoice = {
        ...mockStripeInvoice,
        id: 'in_open',
        status: 'open' as const,
        collection_method: 'charge_automatically' as const,
      };

      mockStripe.invoices.list
        .mockResolvedValueOnce({ object: 'list', data: [openInvoice], has_more: false })
        .mockResolvedValueOnce({ object: 'list', data: [], has_more: false });
      mockStripe.invoices.pay.mockResolvedValue({
        ...openInvoice,
        status: 'paid' as const,
      } as any);

      const { settleSubscriptionInvoice } = await import('~/lib/stripe.server');

      const invoice = await settleSubscriptionInvoice({
        customerId: 'cus_123',
        subscriptionId: 'sub_123',
      });

      expect(mockStripe.invoices.pay).toHaveBeenCalledWith('in_open');
      expect(invoice?.id).toBe('in_open');
    });

    it('creates and charges a new invoice when none exist', async () => {
      const draftInvoice = {
        ...mockStripeInvoice,
        id: 'in_draft',
        status: 'draft' as const,
        collection_method: 'charge_automatically' as const,
      };

      mockStripe.invoices.list
        .mockResolvedValueOnce({ object: 'list', data: [], has_more: false })
        .mockResolvedValueOnce({ object: 'list', data: [], has_more: false });

      mockStripe.invoices.create.mockResolvedValue(draftInvoice as any);
      mockStripe.invoices.finalizeInvoice.mockResolvedValue({
        ...draftInvoice,
        status: 'open' as const,
      } as any);
      mockStripe.invoices.pay.mockResolvedValue({
        ...draftInvoice,
        status: 'paid' as const,
      } as any);

      const { settleSubscriptionInvoice } = await import('~/lib/stripe.server');

      const invoice = await settleSubscriptionInvoice({
        customerId: 'cus_123',
        subscriptionId: 'sub_123',
      });

      expect(mockStripe.invoices.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        subscription: 'sub_123',
        collection_method: 'charge_automatically',
        auto_advance: false,
      });
      expect(mockStripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_draft', {
        auto_advance: false,
      });
      expect(mockStripe.invoices.pay).toHaveBeenCalledWith('in_draft');
      expect(invoice?.status).toBe('paid');
    });

    it('throws a helpful error when payment fails', async () => {
      const openInvoice = {
        ...mockStripeInvoice,
        id: 'in_fail',
        status: 'open' as const,
        collection_method: 'charge_automatically' as const,
      };

      mockStripe.invoices.list
        .mockResolvedValueOnce({ object: 'list', data: [openInvoice], has_more: false })
        .mockResolvedValueOnce({ object: 'list', data: [], has_more: false });

      mockStripe.invoices.pay.mockRejectedValue(new Error('Card declined'));

      const { settleSubscriptionInvoice } = await import('~/lib/stripe.server');

      await expect(
        settleSubscriptionInvoice({ customerId: 'cus_123', subscriptionId: 'sub_123' })
      ).rejects.toThrow('Failed to charge seat adjustment invoice: Card declined');
    });
  });
});

describe('Stripe Environment Validation', () => {
  it('should throw error if STRIPE_SECRET_KEY not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();

    await expect(async () => {
      await import('~/lib/stripe.server');
    }).rejects.toThrow('STRIPE_SECRET_KEY environment variable is required');
  });

  it('should throw error if VITE_STRIPE_PUBLISHABLE_KEY not set', async () => {
    delete process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    vi.resetModules();

    await expect(async () => {
      await import('~/lib/stripe.server');
    }).rejects.toThrow('VITE_STRIPE_PUBLISHABLE_KEY environment variable is required');
  });

  it('should throw error if test key used in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock123';
    vi.resetModules();

    await expect(async () => {
      await import('~/lib/stripe.server');
    }).rejects.toThrow('STRIPE_SECRET_KEY is a test key. Production requires a live key');
  });

  it('should throw error if test publishable key used in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_mock123';
    process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock123';
    vi.resetModules();

    await expect(async () => {
      await import('~/lib/stripe.server');
    }).rejects.toThrow('VITE_STRIPE_PUBLISHABLE_KEY is a test key. Production requires a live key');
  });
});
