/**
 * Convex Client Mock
 *
 * Provides mock implementations of Convex client methods for testing.
 * Import this in tests that interact with Convex database.
 *
 * @example
 * ```typescript
 * import { mockConvexServer } from '~/test/mocks/convex';
 *
 * mockConvexServer.query.mockResolvedValue({ id: '123', name: 'Test' });
 * ```
 */

import { vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Mock Convex User object
 */
export const mockConvexUser = {
  _id: 'jx7abc123' as Id<'users'>,
  _creationTime: Date.now(),
  email: 'test@example.com',
  name: 'Test User',
  workosUserId: 'user_01HTEST123456789',
  organizationId: 'org_01HTEST123456789',
  role: 'owner',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: true,
};

/**
 * Mock Convex Subscription object
 */
export const mockConvexSubscription = {
  _id: 'jx7sub123' as Id<'subscriptions'>,
  _creationTime: Date.now(),
  organizationId: 'org_01HTEST123456789',
  tier: 'starter',
  stripeCustomerId: 'cus_test123',
  stripeSubscriptionId: 'sub_test123',
  stripeStatus: 'active',
  billingInterval: 'monthly',
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
  status: {
    accessStatus: 'active',
    gracePeriodEndsAt: null,
  },
  currentPeriod: {
    start: Date.now(),
    end: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
  },
  metadata: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Mock Convex Billing History object
 */
export const mockConvexBillingHistory = {
  _id: 'jx7bill123' as Id<'billingHistory'>,
  _creationTime: Date.now(),
  organizationId: 'org_01HTEST123456789',
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
 * Mock Convex Server
 *
 * This object provides mocked query and mutation methods.
 */
export const mockConvexServer = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
};

/**
 * Reset all Convex mocks
 *
 * Call this in beforeEach() or afterEach() to reset mock state between tests.
 */
export function resetConvexMocks() {
  vi.clearAllMocks();

  // Reset to default implementations
  mockConvexServer.query.mockResolvedValue(null);
  mockConvexServer.mutation.mockResolvedValue(null);
  mockConvexServer.action.mockResolvedValue(null);
}

/**
 * Mock Convex query responses by function name
 *
 * Helper to set up common query responses.
 *
 * @example
 * ```typescript
 * setupConvexQueryMocks({
 *   'users:getUserByWorkosId': mockConvexUser,
 *   'subscriptions:getByOrganization': mockConvexSubscription,
 * });
 * ```
 */
export function setupConvexQueryMocks(mocks: Record<string, unknown>) {
  mockConvexServer.query.mockImplementation((functionName: unknown) => {
    const funcName = String(functionName);
    const mockValue = mocks[funcName];
    return Promise.resolve(mockValue !== undefined ? mockValue : null);
  });
}

/**
 * Mock Convex mutation responses by function name
 *
 * Helper to set up common mutation responses.
 *
 * @example
 * ```typescript
 * setupConvexMutationMocks({
 *   'users:createUser': 'jx7abc123',
 *   'users:updateUserRole': null,
 * });
 * ```
 */
export function setupConvexMutationMocks(mocks: Record<string, unknown>) {
  mockConvexServer.mutation.mockImplementation((functionName: unknown) => {
    const funcName = String(functionName);
    const mockValue = mocks[funcName];
    return Promise.resolve(mockValue !== undefined ? mockValue : null);
  });
}

/**
 * Create mock Convex database for testing
 *
 * Provides an in-memory database that simulates Convex behavior.
 * Useful for integration tests that need to verify data persistence.
 */
export class MockConvexDatabase {
  private users: Map<string, typeof mockConvexUser> = new Map();
  private subscriptions: Map<string, typeof mockConvexSubscription> = new Map();
  private billingHistory: Map<string, typeof mockConvexBillingHistory> = new Map();
  private nextId: number = 1;

  /**
   * Create a user in the mock database
   */
  createUser(data: {
    email: string;
    name: string;
    workosUserId: string;
    organizationId: string;
    role?: string;
  }): string {
    const id = `jx7_user_${this.nextId++}`;
    const now = Date.now();

    const user: typeof mockConvexUser = {
      _id: id as Id<'users'>,
      _creationTime: now,
      email: data.email,
      name: data.name,
      workosUserId: data.workosUserId,
      organizationId: data.organizationId,
      role: data.role || 'member',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    this.users.set(id, user);
    return id;
  }

  /**
   * Add a user to the mock database
   */
  addUser(user: typeof mockConvexUser) {
    this.users.set(user._id, user);
  }

  /**
   * Get user by ID
   */
  getUser(id: string) {
    return this.users.get(id) || null;
  }

  /**
   * Get user by WorkOS ID
   */
  getUserByWorkosId(workosUserId: string) {
    return Array.from(this.users.values()).find(u => u.workosUserId === workosUserId) || null;
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string) {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  /**
   * Get users by organization
   */
  getUsersByOrganization(organizationId: string) {
    return Array.from(this.users.values()).filter(
      u => u.organizationId === organizationId && u.isActive
    );
  }

  /**
   * Deactivate a user
   */
  deactivateUser(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
      user.updatedAt = Date.now();
    }
  }

  /**
   * Update user organization
   */
  updateUserOrganization(userId: string, newOrganizationId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.organizationId = newOrganizationId;
      user.updatedAt = Date.now();
    }
  }

  /**
   * Create a subscription in the mock database
   */
  createSubscription(data: {
    organizationId: string;
    tier: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): string {
    const id = `jx7_sub_${this.nextId++}`;
    const now = Date.now();

    const subscription: typeof mockConvexSubscription = {
      _id: id as Id<'subscriptions'>,
      _creationTime: now,
      organizationId: data.organizationId,
      tier: data.tier,
      stripeCustomerId: data.stripeCustomerId ?? mockConvexSubscription.stripeCustomerId,
      stripeSubscriptionId:
        data.stripeSubscriptionId ?? mockConvexSubscription.stripeSubscriptionId,
      stripeStatus: mockConvexSubscription.stripeStatus,
      billingInterval: mockConvexSubscription.billingInterval,
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
        accessStatus: mockConvexSubscription.status.accessStatus,
        gracePeriodEndsAt: null,
      },
      currentPeriod: {
        start: now,
        end: now,
      },
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(id, subscription);
    return id;
  }

  /**
   * Add a subscription to the mock database
   */
  addSubscription(subscription: typeof mockConvexSubscription) {
    this.subscriptions.set(subscription._id, subscription);
  }

  /**
   * Get subscription by organization
   */
  getSubscriptionByOrganization(organizationId: string) {
    return (
      Array.from(this.subscriptions.values()).find(s => s.organizationId === organizationId) || null
    );
  }

  /**
   * Clear all data
   */
  clear() {
    this.users.clear();
    this.subscriptions.clear();
    this.billingHistory.clear();
  }
}

/**
 * Global mock database instance for tests
 */
export const mockDatabase = new MockConvexDatabase();
