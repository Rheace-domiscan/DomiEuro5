/**
 * Example Integration Test
 *
 * This file demonstrates how to write integration tests with Vitest.
 * Use this as a reference when writing your own integration tests.
 *
 * Integration tests should:
 * - Test multiple components/functions working together
 * - Use mocks for external services (WorkOS, Convex, Stripe)
 * - Test realistic workflows and user journeys
 * - Verify data flows correctly through the system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';
import { mockConvexServer, resetConvexMocks, setupConvexQueryMocks } from '../mocks/convex';
import { mockUser, mockConvexUser, mockOrganization } from '../helpers/test-data';

// Mock the external dependencies
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: mockConvexServer,
}));

describe('Example Integration Tests - User Authentication Flow', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetWorkOSMocks();
    resetConvexMocks();
  });

  /**
   * Integration test example: Testing the complete auth flow
   * This tests multiple functions working together
   */
  describe('Complete Authentication Flow', () => {
    it('should authenticate user and sync to Convex', async () => {
      // Arrange: Set up mock responses
      mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue({
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
      });

      mockConvexServer.query.mockResolvedValue(mockConvexUser);
      mockConvexServer.mutation.mockResolvedValue('jx7abc123');

      // Act: Simulate the authentication flow
      // (In real integration tests, you'd call the actual auth functions)
      const authCode = 'test_auth_code';
      const authResult = await mockWorkOS.userManagement.authenticateWithCode({
        clientId: 'test_client_id',
        code: authCode,
      });

      // Verify user was authenticated
      expect(authResult.user.id).toBe(mockUser.id);
      expect(authResult.organizationId).toBe(mockOrganization.id);

      // Act: Check if user exists in Convex
      const convexUser = await mockConvexServer.query('users:getUserByWorkosId', {
        workosUserId: authResult.user.id,
      });

      // Assert: Verify the complete flow worked
      expect(mockWorkOS.userManagement.authenticateWithCode).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        code: authCode,
      });
      expect(mockConvexServer.query).toHaveBeenCalledWith('users:getUserByWorkosId', {
        workosUserId: mockUser.id,
      });
      expect(convexUser).toEqual(mockConvexUser);
    });

    it('should create new user in Convex if not exists', async () => {
      // Arrange: User doesn't exist in Convex yet
      mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue({
        user: {
          id: 'user_new123',
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          emailVerified: true,
          profilePictureUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        organizationId: mockOrganization.id,
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        impersonator: null,
      });

      // User doesn't exist yet
      mockConvexServer.query.mockResolvedValue(null);
      // Create user mutation succeeds
      mockConvexServer.mutation.mockResolvedValue('jx7new123');

      // Act: Authenticate and create user
      const authResult = await mockWorkOS.userManagement.authenticateWithCode({
        clientId: 'test_client_id',
        code: 'test_code',
      });

      const existingUser = await mockConvexServer.query('users:getUserByWorkosId', {
        workosUserId: authResult.user.id,
      });

      // User doesn't exist, so create them
      if (!existingUser) {
        await mockConvexServer.mutation('users:createUser', {
          email: authResult.user.email,
          name: `${authResult.user.firstName} ${authResult.user.lastName}`,
          workosUserId: authResult.user.id,
          organizationId: authResult.organizationId,
        });
      }

      // Assert: Verify user creation was called
      expect(existingUser).toBeNull();
      expect(mockConvexServer.mutation).toHaveBeenCalledWith('users:createUser', {
        email: 'newuser@example.com',
        name: 'New User',
        workosUserId: 'user_new123',
        organizationId: mockOrganization.id,
      });
    });
  });

  /**
   * Integration test example: Testing role synchronization
   */
  describe('Role Synchronization', () => {
    it('should sync role from WorkOS to Convex', async () => {
      // Arrange: User has owner role in WorkOS
      mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
        data: [
          {
            id: 'om_test123',
            userId: mockUser.id,
            organizationId: mockOrganization.id,
            role: {
              slug: 'owner',
            },
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        listMetadata: {
          after: null,
          before: null,
        },
      });

      mockConvexServer.mutation.mockResolvedValue(null);

      // Act: Fetch membership and sync role
      const memberships = await mockWorkOS.userManagement.listOrganizationMemberships({
        userId: mockUser.id,
        organizationId: mockOrganization.id,
      });

      const role = memberships.data[0]?.role?.slug || 'member';

      await mockConvexServer.mutation('users:updateUserRole', {
        workosUserId: mockUser.id,
        role,
      });

      // Assert: Verify role was synced
      expect(role).toBe('owner');
      expect(mockConvexServer.mutation).toHaveBeenCalledWith('users:updateUserRole', {
        workosUserId: mockUser.id,
        role: 'owner',
      });
    });

    it('should default to member role if no role set in WorkOS', async () => {
      // Arrange: No role set in membership
      mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
        data: [
          {
            id: 'om_test123',
            userId: mockUser.id,
            organizationId: mockOrganization.id,
            role: undefined as unknown as { slug: string },
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        listMetadata: {
          after: null,
          before: null,
        },
      });

      mockConvexServer.mutation.mockResolvedValue(null);

      // Act: Fetch membership and sync role
      const memberships = await mockWorkOS.userManagement.listOrganizationMemberships({
        userId: mockUser.id,
        organizationId: mockOrganization.id,
      });

      const role = memberships.data[0]?.role?.slug || 'member';

      await mockConvexServer.mutation('users:updateUserRole', {
        workosUserId: mockUser.id,
        role,
      });

      // Assert: Verify default role was used
      expect(role).toBe('member');
      expect(mockConvexServer.mutation).toHaveBeenCalledWith('users:updateUserRole', {
        workosUserId: mockUser.id,
        role: 'member',
      });
    });
  });

  /**
   * Integration test example: Error handling
   */
  describe('Error Handling', () => {
    it('should handle WorkOS authentication failure gracefully', async () => {
      // Arrange: WorkOS authentication fails
      mockWorkOS.userManagement.authenticateWithCode.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      // Act & Assert: Verify error is thrown
      await expect(
        mockWorkOS.userManagement.authenticateWithCode({
          clientId: 'test_client_id',
          code: 'invalid_code',
        })
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should handle Convex database errors gracefully', async () => {
      // Arrange: Convex mutation fails
      mockConvexServer.mutation.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert: Verify error is thrown
      await expect(
        mockConvexServer.mutation('users:createUser', {
          email: 'test@example.com',
          name: 'Test User',
          workosUserId: 'user_123',
          organizationId: 'org_123',
        })
      ).rejects.toThrow('Database connection failed');
    });
  });
});

/**
 * Integration Testing Tips:
 *
 * 1. Test Workflows: Test complete user journeys, not just individual functions
 * 2. Mock External Services: Use mocks for WorkOS, Convex, Stripe to avoid real API calls
 * 3. Test Data Flow: Verify data moves correctly through the system
 * 4. Error Scenarios: Test what happens when external services fail
 * 5. State Management: Verify state changes correctly (e.g., user created, role updated)
 * 6. Async Operations: Use async/await and test asynchronous workflows
 * 7. Mock Setup: Reset mocks in beforeEach() to ensure test isolation
 * 8. Realistic Data: Use test fixtures that match real-world data structures
 */
