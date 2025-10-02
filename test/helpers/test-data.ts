/**
 * Test Data Fixtures
 *
 * Reusable test data objects for consistent testing across the application.
 * Import these fixtures in your tests instead of creating data manually.
 *
 * @example
 * ```typescript
 * import { mockUser, mockOrganization } from '~/test/helpers/test-data';
 *
 * test('user has organization', () => {
 *   expect(mockUser.organizationId).toBe(mockOrganization.id);
 * });
 * ```
 */

import type { Id } from '../../convex/_generated/dataModel';

/**
 * Mock User object (from app/lib/auth.server.ts User interface)
 */
export const mockUser = {
  id: 'user_01HTEST123456789',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  organizationId: 'org_01HTEST123456789',
  role: 'owner',
};

/**
 * Mock Admin user
 */
export const mockAdminUser = {
  ...mockUser,
  id: 'user_01HADMIN123456789',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

/**
 * Mock Manager user
 */
export const mockManagerUser = {
  ...mockUser,
  id: 'user_01HMANAGER123456',
  email: 'manager@example.com',
  firstName: 'Manager',
  lastName: 'User',
  role: 'manager',
};

/**
 * Mock Sales user
 */
export const mockSalesUser = {
  ...mockUser,
  id: 'user_01HSALES123456789',
  email: 'sales@example.com',
  firstName: 'Sales',
  lastName: 'User',
  role: 'sales',
};

/**
 * Mock Team Member user
 */
export const mockMemberUser = {
  ...mockUser,
  id: 'user_01HMEMBER123456',
  email: 'member@example.com',
  firstName: 'Team',
  lastName: 'Member',
  role: 'member',
};

/**
 * Mock Organization
 */
export const mockOrganization = {
  id: 'org_01HTEST123456789',
  name: 'Test Organization',
  allowProfilesOutsideOrganization: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  domains: [],
};

/**
 * Second mock organization for multi-tenancy testing
 */
export const mockOrganization2 = {
  ...mockOrganization,
  id: 'org_01HTEST987654321',
  name: 'Second Organization',
};

/**
 * Mock Convex User (from database)
 */
export const mockConvexUser = {
  _id: 'jx7abc123' as Id<'users'>,
  _creationTime: Date.now(),
  email: mockUser.email,
  name: 'Test User',
  workosUserId: mockUser.id,
  organizationId: mockOrganization.id,
  role: 'owner',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: true,
};

/**
 * Mock Convex User for second organization (multi-tenancy testing)
 */
export const mockConvexUser2 = {
  ...mockConvexUser,
  _id: 'jx7xyz789' as Id<'users'>,
  email: 'user2@example.com',
  name: 'User Two',
  workosUserId: 'user_01HTEST987654321',
  organizationId: mockOrganization2.id,
};

/**
 * Mock Free Tier Subscription
 */
export const mockFreeSubscription = {
  _id: 'jx7sub123' as Id<'subscriptions'>,
  _creationTime: Date.now(),
  organizationId: mockOrganization.id,
  tier: 'free' as const,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripeStatus: null,
  billingInterval: null,
  seats: {
    included: 1,
    current: 1,
    limit: 1,
  },
  pricing: {
    basePriceMonthly: 0,
    basePriceAnnual: 0,
    perSeatPrice: 0,
  },
  status: {
    accessStatus: 'active' as const,
    gracePeriodEndsAt: null,
  },
  currentPeriod: null,
  metadata: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Mock Starter Tier Subscription
 */
export const mockStarterSubscription = {
  ...mockFreeSubscription,
  _id: 'jx7sub456' as Id<'subscriptions'>,
  tier: 'starter' as const,
  stripeCustomerId: 'cus_test123',
  stripeSubscriptionId: 'sub_test123',
  stripeStatus: 'active' as const,
  billingInterval: 'monthly' as const,
  seats: {
    included: 5,
    current: 3,
    limit: 19,
  },
  pricing: {
    basePriceMonthly: 5000, // £50 in pence
    basePriceAnnual: 50000, // £500 in pence
    perSeatPrice: 1000, // £10 in pence
  },
  currentPeriod: {
    start: Date.now(),
    end: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

/**
 * Mock Professional Tier Subscription
 */
export const mockProfessionalSubscription = {
  ...mockStarterSubscription,
  _id: 'jx7sub789' as Id<'subscriptions'>,
  tier: 'professional' as const,
  stripeCustomerId: 'cus_test456',
  stripeSubscriptionId: 'sub_test456',
  seats: {
    included: 20,
    current: 15,
    limit: 40,
  },
  pricing: {
    basePriceMonthly: 25000, // £250 in pence
    basePriceAnnual: 250000, // £2500 in pence
    perSeatPrice: 1000, // £10 in pence
  },
};

/**
 * Mock Billing History Event
 */
export const mockBillingHistory = {
  _id: 'jx7bill123' as Id<'billingHistory'>,
  _creationTime: Date.now(),
  organizationId: mockOrganization.id,
  eventType: 'subscription.created' as const,
  stripeEventId: 'evt_test123',
  amount: 5000,
  currency: 'gbp',
  description: 'Subscription created',
  metadata: {},
  processedAt: Date.now(),
  createdAt: Date.now(),
};

/**
 * Mock WorkOS Organization Membership
 */
export const mockWorkOSMembership = {
  id: 'om_01HTEST123456789',
  userId: mockUser.id,
  organizationId: mockOrganization.id,
  role: {
    slug: 'owner',
  },
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock WorkOS Authentication Response
 */
export const mockAuthResponse = {
  user: {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    emailVerified: true,
    profilePictureUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  organizationId: mockOrganization.id,
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
  impersonator: null,
};

/**
 * Mock Stripe Customer
 */
export const mockStripeCustomer = {
  id: 'cus_test123',
  object: 'customer' as const,
  email: mockUser.email,
  name: 'Test User',
  metadata: {
    workosUserId: mockUser.id,
    organizationId: mockOrganization.id,
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
};

/**
 * Mock Stripe Checkout Session
 */
export const mockStripeCheckoutSession = {
  id: 'cs_test_123',
  object: 'checkout.session' as const,
  url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  customer: mockStripeCustomer.id,
  mode: 'subscription' as const,
  status: 'open' as const,
  metadata: {
    organizationId: mockOrganization.id,
    userId: mockUser.id,
    tier: 'starter',
  },
  created: Math.floor(Date.now() / 1000),
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  livemode: false,
};

/**
 * Create a mock user with custom properties
 *
 * @example
 * ```typescript
 * const customUser = createMockUser({ role: 'admin', email: 'admin@test.com' });
 * ```
 */
export function createMockUser(overrides: Partial<typeof mockUser> = {}) {
  return {
    ...mockUser,
    ...overrides,
  };
}

/**
 * Create a mock Convex user with custom properties
 *
 * @example
 * ```typescript
 * const customConvexUser = createMockConvexUser({ role: 'manager' });
 * ```
 */
export function createMockConvexUser(overrides: Partial<typeof mockConvexUser> = {}) {
  return {
    ...mockConvexUser,
    ...overrides,
  };
}

/**
 * Create a mock subscription with custom properties
 *
 * @example
 * ```typescript
 * const customSubscription = createMockSubscription({ tier: 'professional' });
 * ```
 */
export function createMockSubscription(overrides: Partial<typeof mockStarterSubscription> = {}) {
  return {
    ...mockStarterSubscription,
    ...overrides,
  };
}

/**
 * All mock users (for testing different roles)
 */
export const allMockUsers = {
  owner: mockUser,
  admin: mockAdminUser,
  manager: mockManagerUser,
  sales: mockSalesUser,
  member: mockMemberUser,
};

/**
 * All mock subscriptions (for testing different tiers)
 */
export const allMockSubscriptions = {
  free: mockFreeSubscription,
  starter: mockStarterSubscription,
  professional: mockProfessionalSubscription,
};
