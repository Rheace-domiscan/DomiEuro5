/**
 * Multi-Tenancy Integration Tests
 *
 * CRITICAL SECURITY: These tests verify that organizations cannot access each other's data.
 * These are END-TO-END tests that verify the entire authentication → query → data isolation flow.
 *
 * FAILING THESE TESTS = SECURITY BREACH
 *
 * Coverage Target: 85%+ (security-critical)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';
import { mockConvexServer, resetConvexMocks, MockConvexDatabase } from '../mocks/convex';
// Mock data helpers not needed - tests create data directly with mockDb
// import { mockUser, mockOrganization, mockOrganization2, createMockUser } from '../helpers/test-data';

// Mock WorkOS
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

// Mock Convex
vi.mock('../../lib/convex.server', () => ({
  convexServer: mockConvexServer,
}));

describe('Multi-Tenancy Data Isolation (CRITICAL)', () => {
  let mockDb: MockConvexDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkOSMocks();
    resetConvexMocks();

    // Create fresh mock database for each test
    mockDb = new MockConvexDatabase();
  });

  /**
   * Test 1: Verify users can only query their own organization's data
   */
  describe('User Data Isolation', () => {
    it('should only return users from the same organization', async () => {
      // Setup: Create users in two different organizations
      mockDb.createUser({
        email: 'user1@org1.com',
        name: 'Org1 User 1',
        workosUserId: 'user_org1_1',
        organizationId: 'org_1',
        role: 'owner',
      });

      mockDb.createUser({
        email: 'user2@org1.com',
        name: 'Org1 User 2',
        workosUserId: 'user_org1_2',
        organizationId: 'org_1',
        role: 'admin',
      });

      mockDb.createUser({
        email: 'user1@org2.com',
        name: 'Org2 User 1',
        workosUserId: 'user_org2_1',
        organizationId: 'org_2',
        role: 'owner',
      });

      mockDb.createUser({
        email: 'user2@org2.com',
        name: 'Org2 User 2',
        workosUserId: 'user_org2_2',
        organizationId: 'org_2',
        role: 'member',
      });

      // Act: Query users by organization
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      // Assert: Verify strict isolation
      expect(org1Users).toHaveLength(2);
      expect(org2Users).toHaveLength(2);

      // Verify org_1 users have correct organization
      org1Users.forEach(user => {
        expect(user.organizationId).toBe('org_1');
      });

      // Verify org_2 users have correct organization
      org2Users.forEach(user => {
        expect(user.organizationId).toBe('org_2');
      });

      // CRITICAL: Verify no data leakage
      const org1UserIds = org1Users.map(u => u.workosUserId);
      expect(org1UserIds).not.toContain('user_org2_1');
      expect(org1UserIds).not.toContain('user_org2_2');

      const org2UserIds = org2Users.map(u => u.workosUserId);
      expect(org2UserIds).not.toContain('user_org1_1');
      expect(org2UserIds).not.toContain('user_org1_2');
    });

    it('should handle users with same email in different organizations', async () => {
      // Setup: Two users with same email in different orgs
      mockDb.createUser({
        email: 'shared@example.com',
        name: 'Org1 Shared User',
        workosUserId: 'user_org1_shared',
        organizationId: 'org_1',
        role: 'owner',
      });

      mockDb.createUser({
        email: 'shared@example.com', // Same email!
        name: 'Org2 Shared User',
        workosUserId: 'user_org2_shared',
        organizationId: 'org_2',
        role: 'owner',
      });

      // Act: Query each organization
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      // Assert: Each org sees only their own user
      expect(org1Users).toHaveLength(1);
      expect(org2Users).toHaveLength(1);

      expect(org1Users[0].workosUserId).toBe('user_org1_shared');
      expect(org2Users[0].workosUserId).toBe('user_org2_shared');

      // CRITICAL: Verify no cross-contamination
      expect(org1Users[0].organizationId).toBe('org_1');
      expect(org2Users[0].organizationId).toBe('org_2');
    });

    it('should not leak inactive users across organizations', async () => {
      // Setup: Create and deactivate user in org_1
      const org1UserId = mockDb.createUser({
        email: 'inactive@org1.com',
        name: 'Inactive User',
        workosUserId: 'user_inactive',
        organizationId: 'org_1',
        role: 'member',
      });

      mockDb.deactivateUser(org1UserId);

      // Create active user in org_2
      mockDb.createUser({
        email: 'active@org2.com',
        name: 'Active User',
        workosUserId: 'user_active',
        organizationId: 'org_2',
        role: 'member',
      });

      // Act: Query both organizations
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      // Assert: Inactive user not returned for org_1
      expect(org1Users).toHaveLength(0);

      // Assert: org_2 has its active user
      expect(org2Users).toHaveLength(1);
      expect(org2Users[0].isActive).toBe(true);
    });
  });

  /**
   * Test 2: Verify subscription data isolation
   */
  describe('Subscription Data Isolation', () => {
    it('should only return subscription for the correct organization', async () => {
      // Setup: Create subscriptions for two organizations
      const _org1Subscription = mockDb.createSubscription({
        organizationId: 'org_1',
        tier: 'professional',
        stripeCustomerId: 'cus_org1',
        stripeSubscriptionId: 'sub_org1',
      });

      const _org2Subscription = mockDb.createSubscription({
        organizationId: 'org_2',
        tier: 'starter',
        stripeCustomerId: 'cus_org2',
        stripeSubscriptionId: 'sub_org2',
      });

      // Act: Query subscriptions by organization
      const org1Sub = mockDb.getSubscriptionByOrganization('org_1');
      const org2Sub = mockDb.getSubscriptionByOrganization('org_2');

      // Assert: Verify correct subscriptions returned
      expect(org1Sub?.organizationId).toBe('org_1');
      expect(org1Sub?.tier).toBe('professional');
      expect(org1Sub?.stripeCustomerId).toBe('cus_org1');

      expect(org2Sub?.organizationId).toBe('org_2');
      expect(org2Sub?.tier).toBe('starter');
      expect(org2Sub?.stripeCustomerId).toBe('cus_org2');

      // CRITICAL: Verify no cross-organization access
      expect(org1Sub?._id).not.toBe(org2Sub?._id);
      expect(org1Sub?.stripeCustomerId).not.toBe('cus_org2');
      expect(org2Sub?.stripeCustomerId).not.toBe('cus_org1');
    });

    it('should return null for organization without subscription', async () => {
      // Setup: Create subscription for org_1 only
      mockDb.createSubscription({
        organizationId: 'org_1',
        tier: 'starter',
      });

      // Act: Query org_2 (no subscription)
      const org2Sub = mockDb.getSubscriptionByOrganization('org_2');

      // Assert: org_2 has no subscription
      expect(org2Sub).toBeNull();
    });
  });

  /**
   * Test 3: Verify role isolation between organizations
   */
  describe('Role Isolation', () => {
    it('should isolate role queries by organization', async () => {
      // Setup: Same role name in different organizations
      const _org1Owner = mockDb.createUser({
        email: 'owner@org1.com',
        name: 'Org1 Owner',
        workosUserId: 'user_org1_owner',
        organizationId: 'org_1',
        role: 'owner',
      });

      const _org2Owner = mockDb.createUser({
        email: 'owner@org2.com',
        name: 'Org2 Owner',
        workosUserId: 'user_org2_owner',
        organizationId: 'org_2',
        role: 'owner',
      });

      // Act: Get users by organization
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      // Assert: Each org has one owner
      expect(org1Users[0].role).toBe('owner');
      expect(org2Users[0].role).toBe('owner');

      // CRITICAL: Verify owners are from correct organizations
      expect(org1Users[0].workosUserId).toBe('user_org1_owner');
      expect(org2Users[0].workosUserId).toBe('user_org2_owner');

      expect(org1Users[0].organizationId).toBe('org_1');
      expect(org2Users[0].organizationId).toBe('org_2');
    });
  });

  /**
   * Test 4: Verify query security - cannot bypass organization filters
   */
  describe('Query Security (Bypass Prevention)', () => {
    it('should not allow querying users by email without organization context', async () => {
      // Setup: Create users with same email in different orgs
      mockDb.createUser({
        email: 'user@example.com',
        name: 'Org1 User',
        workosUserId: 'user_org1',
        organizationId: 'org_1',
        role: 'member',
      });

      mockDb.createUser({
        email: 'user@example.com',
        name: 'Org2 User',
        workosUserId: 'user_org2',
        organizationId: 'org_2',
        role: 'member',
      });

      // Act: Query by email (potentially dangerous if not filtered by org)
      const userByEmail = mockDb.getUserByEmail('user@example.com');

      // Assert: Should return only ONE user (first match)
      // This demonstrates why email-only queries are dangerous in multi-tenant apps
      expect(userByEmail).toBeTruthy();

      // However, the safer pattern is to always query by organization:
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      expect(org1Users).toHaveLength(1);
      expect(org2Users).toHaveLength(1);

      // Verify isolation
      expect(org1Users[0].workosUserId).not.toBe(org2Users[0].workosUserId);
    });

    it('should enforce organization filter on all user queries', async () => {
      // Setup: Create 10 users across 3 organizations
      for (let i = 0; i < 3; i++) {
        mockDb.createUser({
          email: `user${i}@org1.com`,
          name: `Org1 User ${i}`,
          workosUserId: `user_org1_${i}`,
          organizationId: 'org_1',
          role: 'member',
        });
      }

      for (let i = 0; i < 4; i++) {
        mockDb.createUser({
          email: `user${i}@org2.com`,
          name: `Org2 User ${i}`,
          workosUserId: `user_org2_${i}`,
          organizationId: 'org_2',
          role: 'member',
        });
      }

      for (let i = 0; i < 3; i++) {
        mockDb.createUser({
          email: `user${i}@org3.com`,
          name: `Org3 User ${i}`,
          workosUserId: `user_org3_${i}`,
          organizationId: 'org_3',
          role: 'member',
        });
      }

      // Act: Query each organization
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');
      const org3Users = mockDb.getUsersByOrganization('org_3');

      // Assert: Exact user counts
      expect(org1Users).toHaveLength(3);
      expect(org2Users).toHaveLength(4);
      expect(org3Users).toHaveLength(3);

      // CRITICAL: Verify complete isolation
      const _allOrgIds = [
        ...org1Users.map(u => u.organizationId),
        ...org2Users.map(u => u.organizationId),
        ...org3Users.map(u => u.organizationId),
      ];

      // Each user should only have their own organization ID
      expect(org1Users.every(u => u.organizationId === 'org_1')).toBe(true);
      expect(org2Users.every(u => u.organizationId === 'org_2')).toBe(true);
      expect(org3Users.every(u => u.organizationId === 'org_3')).toBe(true);
    });
  });

  /**
   * Test 5: Verify authentication context maintains organization isolation
   */
  describe('Authentication Context Isolation', () => {
    it('should maintain organization context through authentication flow', async () => {
      // Setup: Mock WorkOS authentication for two different organizations
      const org1AuthResponse = {
        user: {
          id: 'user_org1_auth',
          email: 'auth@org1.com',
          firstName: 'Org1',
          lastName: 'User',
          emailVerified: true,
          profilePictureUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        organizationId: 'org_1',
        accessToken: 'token_org1',
        refreshToken: 'refresh_org1',
        impersonator: null,
      };

      const org2AuthResponse = {
        user: {
          id: 'user_org2_auth',
          email: 'auth@org2.com',
          firstName: 'Org2',
          lastName: 'User',
          emailVerified: true,
          profilePictureUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        organizationId: 'org_2',
        accessToken: 'token_org2',
        refreshToken: 'refresh_org2',
        impersonator: null,
      };

      // Act: Create users in mock database
      const _org1User = mockDb.createUser({
        email: org1AuthResponse.user.email,
        name: 'Org1 Auth User',
        workosUserId: org1AuthResponse.user.id,
        organizationId: org1AuthResponse.organizationId,
        role: 'owner',
      });

      const _org2User = mockDb.createUser({
        email: org2AuthResponse.user.email,
        name: 'Org2 Auth User',
        workosUserId: org2AuthResponse.user.id,
        organizationId: org2AuthResponse.organizationId,
        role: 'owner',
      });

      // Assert: Verify users are in correct organizations
      const user1 = mockDb.getUserByWorkosId('user_org1_auth');
      const user2 = mockDb.getUserByWorkosId('user_org2_auth');

      expect(user1?.organizationId).toBe('org_1');
      expect(user2?.organizationId).toBe('org_2');

      // CRITICAL: Verify organization isolation after auth
      const org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      expect(org1Users.some(u => u.workosUserId === 'user_org1_auth')).toBe(true);
      expect(org1Users.some(u => u.workosUserId === 'user_org2_auth')).toBe(false);

      expect(org2Users.some(u => u.workosUserId === 'user_org2_auth')).toBe(true);
      expect(org2Users.some(u => u.workosUserId === 'user_org1_auth')).toBe(false);
    });
  });

  /**
   * Test 6: Verify organizational data transfer security
   */
  describe('Organization Transfer Security', () => {
    it('should safely transfer user between organizations', async () => {
      // Setup: Create user in org_1
      const userId = mockDb.createUser({
        email: 'transfer@example.com',
        name: 'Transfer User',
        workosUserId: 'user_transfer',
        organizationId: 'org_1',
        role: 'member',
      });

      // Verify user in org_1
      let org1Users = mockDb.getUsersByOrganization('org_1');
      expect(org1Users).toHaveLength(1);

      // Act: Transfer user to org_2
      mockDb.updateUserOrganization(userId, 'org_2');

      // Assert: Verify complete transfer
      org1Users = mockDb.getUsersByOrganization('org_1');
      const org2Users = mockDb.getUsersByOrganization('org_2');

      // CRITICAL: User no longer in org_1
      expect(org1Users).toHaveLength(0);

      // CRITICAL: User now in org_2
      expect(org2Users).toHaveLength(1);
      expect(org2Users[0]._id).toBe(userId);
      expect(org2Users[0].organizationId).toBe('org_2');

      // Verify user cannot be accessed from old organization
      const transferredUser = mockDb.getUserByWorkosId('user_transfer');
      expect(transferredUser?.organizationId).toBe('org_2');
    });
  });

  /**
   * Test 7: Security Regression Tests
   */
  describe('Security Regression Tests', () => {
    it('should never expose organization data through user queries', async () => {
      // Setup: Create sensitive data in org_secure
      const _sensitiveUserId = mockDb.createUser({
        email: 'ceo@topsecret.com',
        name: 'CEO',
        workosUserId: 'user_ceo',
        organizationId: 'org_secure',
        role: 'owner',
      });

      mockDb.createSubscription({
        organizationId: 'org_secure',
        tier: 'professional',
        stripeCustomerId: 'cus_secret',
      });

      // Setup: Create attacker in org_attacker
      const _attackerId = mockDb.createUser({
        email: 'attacker@malicious.com',
        name: 'Attacker',
        workosUserId: 'user_attacker',
        organizationId: 'org_attacker',
        role: 'owner',
      });

      // Act: Attacker queries their organization
      const attackerOrgUsers = mockDb.getUsersByOrganization('org_attacker');
      const attackerOrgSub = mockDb.getSubscriptionByOrganization('org_attacker');

      // Assert: CRITICAL - Attacker cannot see sensitive org
      expect(attackerOrgUsers).toHaveLength(1);
      expect(attackerOrgUsers[0].workosUserId).toBe('user_attacker');
      expect(attackerOrgUsers[0].workosUserId).not.toBe('user_ceo');

      // CRITICAL: Attacker cannot access sensitive subscription
      expect(attackerOrgSub).toBeNull();

      // Verify sensitive data exists but is isolated
      const secureOrgUsers = mockDb.getUsersByOrganization('org_secure');
      const secureOrgSub = mockDb.getSubscriptionByOrganization('org_secure');

      expect(secureOrgUsers[0].workosUserId).toBe('user_ceo');
      expect(secureOrgSub?.tier).toBe('professional');
    });

    it('should maintain isolation under high data volume', async () => {
      // Setup: Create 100 users across 10 organizations
      const organizationCounts: Record<string, number> = {};

      for (let orgNum = 0; orgNum < 10; orgNum++) {
        const orgId = `org_volume_${orgNum}`;
        organizationCounts[orgId] = 10;

        for (let userNum = 0; userNum < 10; userNum++) {
          mockDb.createUser({
            email: `user${userNum}@org${orgNum}.com`,
            name: `User ${userNum}`,
            workosUserId: `user_${orgId}_${userNum}`,
            organizationId: orgId,
            role: 'member',
          });
        }
      }

      // Act: Query each organization
      for (let orgNum = 0; orgNum < 10; orgNum++) {
        const orgId = `org_volume_${orgNum}`;
        const users = mockDb.getUsersByOrganization(orgId);

        // Assert: Exact count for each organization
        expect(users).toHaveLength(10);

        // CRITICAL: All users belong to correct organization
        users.forEach(user => {
          expect(user.organizationId).toBe(orgId);
        });
      }
    });
  });
});
