/**
 * Authentication Tests (auth.server.ts)
 *
 * CRITICAL SECURITY: This file tests authentication and authorization logic.
 * These tests ensure session management, role enforcement, and access control work correctly.
 *
 * Coverage Target: 85%+ (security-critical code)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';
import { mockConvexServer, resetConvexMocks } from '../mocks/convex';
import { mockUser, mockOrganization } from '../helpers/test-data';
import { createMockRequest } from '../helpers/test-utils';

// Mock dependencies BEFORE importing auth.server
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

vi.mock('~/lib/workos.server', () => ({
  workos: mockWorkOS,
  WORKOS_CLIENT_ID: 'test_client_id',
  WORKOS_REDIRECT_URI: 'http://localhost:5173/auth/callback',
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: mockConvexServer,
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    redirect: vi.fn((path: string, init?: unknown) => {
      const error: any = new Error(`Redirect to ${path}`);
      error.status = 302;
      error.headers =
        init && typeof init === 'object' && 'headers' in init ? (init as any).headers : {};
      throw error;
    }),
  };
});

vi.mock('~/lib/session.server', () => {
  const mockSessionInstance = {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    unset: vi.fn(),
    flash: vi.fn(),
  };

  return {
    getSession: vi.fn().mockResolvedValue(mockSessionInstance),
    commitSession: vi.fn().mockResolvedValue('session_cookie_value'),
    destroySession: vi.fn().mockResolvedValue('destroyed_session_cookie'),
    sessionStorage: {
      getSession: vi.fn().mockResolvedValue(mockSessionInstance),
      commitSession: vi.fn().mockResolvedValue('session_cookie_value'),
      destroySession: vi.fn().mockResolvedValue('destroyed_session_cookie'),
    },
  };
});

// Import auth module AFTER mocks are set up
import * as authModule from '~/lib/auth.server';
import * as sessionModule from '~/lib/session.server';

describe('Authentication Module (auth.server.ts)', () => {
  let mockSession: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetWorkOSMocks();
    resetConvexMocks();

    // Get fresh mockSession instance from getSession
    mockSession = await sessionModule.getSession(createMockRequest('/'));
  });

  describe('getUser()', () => {
    it('should return user when authenticated with valid session', async () => {
      const request = createMockRequest('/dashboard');

      // Mock session data
      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        if (key === 'role') return 'owner';
        return undefined;
      });

      // Mock WorkOS response
      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const user = await authModule.getUser(request);

      expect(user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        organizationId: mockOrganization.id,
        role: 'owner',
      });
    });

    it('should return null when no userId in session', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue(undefined);

      const user = await authModule.getUser(request);

      expect(user).toBeNull();
      expect(mockWorkOS.userManagement.getUser).not.toHaveBeenCalled();
    });

    it('should fetch role from Convex when not in session', async () => {
      const request = createMockRequest('/dashboard');

      // Mock session with userId but no role
      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue('admin');

      const user = await authModule.getUser(request);

      expect(mockConvexServer.query).toHaveBeenCalled();
      expect(user?.role).toBe('admin');
    });

    it('should return null when WorkOS getUser fails', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return 'invalid_user_id';
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockRejectedValue(new Error('User not found'));

      const user = await authModule.getUser(request);

      expect(user).toBeNull();
    });

    it('should handle missing optional fields', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: null,
        lastName: null,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue(null);

      const user = await authModule.getUser(request);

      expect(user).toBeTruthy();
      expect(user?.firstName).toBeUndefined();
      expect(user?.lastName).toBeUndefined();
      expect(user?.role).toBeUndefined();
    });
  });

  describe('requireUser()', () => {
    it('should return user when authenticated', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        if (key === 'role') return 'owner';
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const user = await authModule.requireUser(request);

      expect(user).toBeTruthy();
      expect(user.id).toBe(mockUser.id);
    });

    it('should redirect to /auth/login when not authenticated', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue(undefined);

      await expect(authModule.requireUser(request)).rejects.toThrow('Redirect to /auth/login');
    });

    it('should redirect when session is invalid', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue('invalid_user_id');
      mockWorkOS.userManagement.getUser.mockRejectedValue(new Error('User not found'));

      await expect(authModule.requireUser(request)).rejects.toThrow('Redirect to /auth/login');
    });
  });

  describe('requireRole()', () => {
    it('should return user when user has required role', async () => {
      const request = createMockRequest('/admin');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'role') return 'owner';
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const user = await authModule.requireRole(request, ['owner', 'admin']);

      expect(user).toBeTruthy();
      expect(user.role).toBe('owner');
    });

    it('should redirect to /dashboard when user lacks required role', async () => {
      const request = createMockRequest('/admin');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'role') return 'member';
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      await expect(authModule.requireRole(request, ['owner', 'admin'])).rejects.toThrow(
        'Redirect to /dashboard'
      );
    });

    it('should redirect when user has no role', async () => {
      const request = createMockRequest('/admin');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue(null);

      await expect(authModule.requireRole(request, ['owner'])).rejects.toThrow(
        'Redirect to /dashboard'
      );
    });

    it('should redirect to login if not authenticated', async () => {
      const request = createMockRequest('/admin');

      mockSession.get.mockReturnValue(undefined);

      await expect(authModule.requireRole(request, ['owner'])).rejects.toThrow(
        'Redirect to /auth/login'
      );
    });
  });

  describe('requireTier()', () => {
    it('should return user when organization has required tier', async () => {
      const request = createMockRequest('/premium-feature');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        if (key === 'role') return 'owner';
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue({
        _id: 'sub_123',
        organizationId: mockOrganization.id,
        tier: 'professional',
      });

      const user = await authModule.requireTier(request, 'starter');

      expect(user).toBeTruthy();
      expect(mockConvexServer.query).toHaveBeenCalled();
    });

    it('should redirect to /pricing when organization lacks required tier', async () => {
      const request = createMockRequest('/premium-feature');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue({
        _id: 'sub_123',
        organizationId: mockOrganization.id,
        tier: 'free',
      });

      await expect(authModule.requireTier(request, 'professional')).rejects.toThrow(
        'Redirect to /pricing'
      );
    });

    it('should redirect to /auth/create-organization when user has no organization', async () => {
      const request = createMockRequest('/premium-feature');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      await expect(authModule.requireTier(request, 'starter')).rejects.toThrow(
        'Redirect to /auth/create-organization'
      );
    });

    it('should redirect to /pricing when organization has no subscription', async () => {
      const request = createMockRequest('/premium-feature');

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'userId') return mockUser.id;
        if (key === 'organizationId') return mockOrganization.id;
        return undefined;
      });

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockConvexServer.query.mockResolvedValue(null);

      await expect(authModule.requireTier(request, 'starter')).rejects.toThrow(
        'Redirect to /pricing'
      );
    });
  });

  describe('createUserSession()', () => {
    it('should create session with userId and redirect to default path', async () => {
      await expect(authModule.createUserSession('user_123')).rejects.toThrow('Redirect to /');

      expect(mockSession.set).toHaveBeenCalledWith('userId', 'user_123');
    });

    it('should create session with userId and custom redirect path', async () => {
      await expect(authModule.createUserSession('user_123', '/dashboard')).rejects.toThrow(
        'Redirect to /dashboard'
      );
    });

    it('should store organizationId in session when provided', async () => {
      await expect(
        authModule.createUserSession('user_123', '/dashboard', 'org_456')
      ).rejects.toThrow();

      expect(mockSession.set).toHaveBeenCalledWith('userId', 'user_123');
      expect(mockSession.set).toHaveBeenCalledWith('organizationId', 'org_456');
    });

    it('should store role in session when provided', async () => {
      await expect(
        authModule.createUserSession('user_123', '/dashboard', 'org_456', 'owner')
      ).rejects.toThrow();

      expect(mockSession.set).toHaveBeenCalledWith('role', 'owner');
    });

    it('should not store organizationId or role when not provided', async () => {
      const setCallsBefore = mockSession.set.mock.calls.length;

      await expect(authModule.createUserSession('user_123', '/')).rejects.toThrow();

      const _setCallsAfter = mockSession.set.mock.calls.length;
      const newCalls = mockSession.set.mock.calls.slice(setCallsBefore);

      // Should only have one set call for userId
      expect(newCalls.filter(([key]: [string, any]) => key === 'userId')).toHaveLength(1);
      expect(newCalls.filter(([key]: [string, any]) => key === 'organizationId')).toHaveLength(0);
      expect(newCalls.filter(([key]: [string, any]) => key === 'role')).toHaveLength(0);
    });
  });

  describe('syncUserRoleFromWorkOS()', () => {
    it('should sync owner role from WorkOS to Convex', async () => {
      mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
        data: [
          {
            id: 'om_123',
            userId: mockUser.id,
            organizationId: mockOrganization.id,
            role: { slug: 'owner' },
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        listMetadata: { after: null, before: null },
      });

      mockConvexServer.mutation.mockResolvedValue(null);

      const role = await authModule.syncUserRoleFromWorkOS(mockUser.id, mockOrganization.id);

      expect(role).toBe('owner');
      expect(mockConvexServer.mutation).toHaveBeenCalled();
    });

    it('should default to member role when no role set in WorkOS', async () => {
      mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
        data: [
          {
            id: 'om_123',
            userId: mockUser.id,
            organizationId: mockOrganization.id,
            role: undefined as any,
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        listMetadata: { after: null, before: null },
      });

      mockConvexServer.mutation.mockResolvedValue(null);

      const role = await authModule.syncUserRoleFromWorkOS(mockUser.id, mockOrganization.id);

      expect(role).toBe('member');
    });

    it('should return member role when WorkOS API fails', async () => {
      mockWorkOS.userManagement.listOrganizationMemberships.mockRejectedValue(
        new Error('WorkOS API error')
      );

      const role = await authModule.syncUserRoleFromWorkOS(mockUser.id, mockOrganization.id);

      expect(role).toBe('member');
      expect(mockConvexServer.mutation).not.toHaveBeenCalled();
    });

    it('should handle empty memberships array', async () => {
      mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
        data: [],
        listMetadata: { after: null, before: null },
      });

      mockConvexServer.mutation.mockResolvedValue(null);

      const role = await authModule.syncUserRoleFromWorkOS(mockUser.id, mockOrganization.id);

      expect(role).toBe('member');
    });
  });

  describe('logout()', () => {
    it('should destroy session and redirect to login', async () => {
      const request = createMockRequest('/dashboard');

      await expect(authModule.logout(request)).rejects.toThrow('Redirect to /auth/login');

      expect(sessionModule.getSession).toHaveBeenCalledWith(request);
      expect(sessionModule.destroySession).toHaveBeenCalled();
    });
  });

  describe('getAuthorizationUrl()', () => {
    it('should generate WorkOS authorization URL without state or organizationId', () => {
      const _url = authModule.getAuthorizationUrl();

      expect(mockWorkOS.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        redirectUri: 'http://localhost:5173/auth/callback',
        provider: 'authkit',
      });
    });

    it('should include state when provided', () => {
      const _url = authModule.getAuthorizationUrl('test_state');

      expect(mockWorkOS.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        redirectUri: 'http://localhost:5173/auth/callback',
        provider: 'authkit',
        state: 'test_state',
      });
    });

    it('should include organizationId when provided', () => {
      const _url = authModule.getAuthorizationUrl(undefined, 'org_123');

      expect(mockWorkOS.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        redirectUri: 'http://localhost:5173/auth/callback',
        provider: 'authkit',
        organizationId: 'org_123',
      });
    });

    it('should include both state and organizationId when provided', () => {
      const _url = authModule.getAuthorizationUrl('test_state', 'org_123');

      expect(mockWorkOS.userManagement.getAuthorizationUrl).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        redirectUri: 'http://localhost:5173/auth/callback',
        provider: 'authkit',
        state: 'test_state',
        organizationId: 'org_123',
      });
    });
  });

  describe('authenticateWithCode()', () => {
    it('should successfully authenticate with valid code', async () => {
      const mockAuthResponse = {
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
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        impersonator: null,
      };

      mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue(mockAuthResponse);

      const result = await authModule.authenticateWithCode('auth_code_123');

      expect(result).toEqual(mockAuthResponse);
      expect(mockWorkOS.userManagement.authenticateWithCode).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        code: 'auth_code_123',
      });
    });

    it('should throw error with invalid code', async () => {
      mockWorkOS.userManagement.authenticateWithCode.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      await expect(authModule.authenticateWithCode('invalid_code')).rejects.toThrow(
        'Invalid authorization code'
      );
    });
  });

  describe('authenticateWithOrganizationSelection()', () => {
    it('should authenticate with organization selection', async () => {
      const mockAuthResponse = {
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
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        impersonator: null,
      };

      mockWorkOS.userManagement.authenticateWithOrganizationSelection.mockResolvedValue(
        mockAuthResponse
      );

      const result = await authModule.authenticateWithOrganizationSelection(
        'pending_token_123',
        mockOrganization.id
      );

      expect(result).toEqual(mockAuthResponse);
      expect(mockWorkOS.userManagement.authenticateWithOrganizationSelection).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        pendingAuthenticationToken: 'pending_token_123',
        organizationId: mockOrganization.id,
      });
    });

    it('should throw error when organization selection fails', async () => {
      mockWorkOS.userManagement.authenticateWithOrganizationSelection.mockRejectedValue(
        new Error('Invalid token')
      );

      await expect(
        authModule.authenticateWithOrganizationSelection('invalid_token', mockOrganization.id)
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('createOrganization()', () => {
    it('should create organization with name', async () => {
      const mockOrg = {
        id: 'org_new_123',
        name: 'New Organization',
        allowProfilesOutsideOrganization: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        domains: [],
      };

      mockWorkOS.organizations.createOrganization.mockResolvedValue(mockOrg);

      const result = await authModule.createOrganization('New Organization');

      expect(result).toEqual(mockOrg);
      expect(mockWorkOS.organizations.createOrganization).toHaveBeenCalledWith({
        name: 'New Organization',
      });
    });

    it('should trim organization name', async () => {
      const mockOrg = {
        id: 'org_new_123',
        name: 'Trimmed Org',
        allowProfilesOutsideOrganization: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        domains: [],
      };

      mockWorkOS.organizations.createOrganization.mockResolvedValue(mockOrg);

      await authModule.createOrganization('  Trimmed Org  ');

      expect(mockWorkOS.organizations.createOrganization).toHaveBeenCalledWith({
        name: 'Trimmed Org',
      });
    });

    it('should throw error when organization creation fails', async () => {
      mockWorkOS.organizations.createOrganization.mockRejectedValue(
        new Error('Organization already exists')
      );

      await expect(authModule.createOrganization('Duplicate Org')).rejects.toThrow(
        'Organization already exists'
      );
    });
  });

  describe('createOrganizationMembership()', () => {
    it('should create membership with owner role by default', async () => {
      const mockMembership = {
        id: 'om_123',
        userId: mockUser.id,
        organizationId: mockOrganization.id,
        role: { slug: 'owner' },
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockWorkOS.userManagement.createOrganizationMembership.mockResolvedValue(mockMembership);

      const result = await authModule.createOrganizationMembership(
        mockOrganization.id,
        mockUser.id
      );

      expect(result).toEqual(mockMembership);
      expect(mockWorkOS.userManagement.createOrganizationMembership).toHaveBeenCalledWith({
        organizationId: mockOrganization.id,
        userId: mockUser.id,
        roleSlug: 'owner',
      });
    });

    it('should create membership with custom role', async () => {
      const mockMembership = {
        id: 'om_123',
        userId: mockUser.id,
        organizationId: mockOrganization.id,
        role: { slug: 'admin' },
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockWorkOS.userManagement.createOrganizationMembership.mockResolvedValue(mockMembership);

      await authModule.createOrganizationMembership(mockOrganization.id, mockUser.id, 'admin');

      expect(mockWorkOS.userManagement.createOrganizationMembership).toHaveBeenCalledWith({
        organizationId: mockOrganization.id,
        userId: mockUser.id,
        roleSlug: 'admin',
      });
    });

    it('should throw error when membership creation fails', async () => {
      mockWorkOS.userManagement.createOrganizationMembership.mockRejectedValue(
        new Error('User already member')
      );

      await expect(
        authModule.createOrganizationMembership(mockOrganization.id, mockUser.id)
      ).rejects.toThrow('User already member');
    });
  });

  describe('listOrganizations()', () => {
    it('should list all organizations', async () => {
      const mockOrgs = [mockOrganization, { ...mockOrganization, id: 'org_456' }];

      mockWorkOS.organizations.listOrganizations.mockResolvedValue({
        data: mockOrgs,
        listMetadata: { after: null, before: null },
      });

      const result = await authModule.listOrganizations();

      expect(result).toEqual(mockOrgs);
      expect(mockWorkOS.organizations.listOrganizations).toHaveBeenCalled();
    });

    it('should throw error when listing fails', async () => {
      mockWorkOS.organizations.listOrganizations.mockRejectedValue(new Error('API error'));

      await expect(authModule.listOrganizations()).rejects.toThrow('API error');
    });
  });

  describe('refreshTokenWithOrganization()', () => {
    it('should refresh token with organization', async () => {
      const mockAuthResponse = {
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
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        impersonator: null,
      };

      mockWorkOS.userManagement.authenticateWithRefreshToken.mockResolvedValue(mockAuthResponse);

      const result = await authModule.refreshTokenWithOrganization(
        'refresh_token_123',
        mockOrganization.id
      );

      expect(result).toEqual(mockAuthResponse);
      expect(mockWorkOS.userManagement.authenticateWithRefreshToken).toHaveBeenCalledWith({
        clientId: 'test_client_id',
        refreshToken: 'refresh_token_123',
        organizationId: mockOrganization.id,
      });
    });

    it('should throw error when refresh fails', async () => {
      mockWorkOS.userManagement.authenticateWithRefreshToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      await expect(
        authModule.refreshTokenWithOrganization('invalid_token', mockOrganization.id)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  /**
   * Security Regression Tests
   * These tests verify critical security boundaries are maintained
   */
  describe('Security Regression Tests', () => {
    it('should never expose session data in response', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue(mockUser.id);

      mockWorkOS.userManagement.getUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        emailVerified: true,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const user = await authModule.getUser(request);

      // User object should not contain session or token data
      expect(user).not.toHaveProperty('session');
      expect(user).not.toHaveProperty('accessToken');
      expect(user).not.toHaveProperty('refreshToken');
    });

    it('should enforce authentication before role checks', async () => {
      const request = createMockRequest('/admin');

      mockSession.get.mockReturnValue(undefined);

      // requireRole should redirect to login (not dashboard) when not authenticated
      await expect(authModule.requireRole(request, ['owner'])).rejects.toThrow(
        'Redirect to /auth/login'
      );
    });

    it('should not allow bypassing requireUser with invalid session', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue('malicious_user_id');
      mockWorkOS.userManagement.getUser.mockRejectedValue(new Error('Unauthorized'));

      await expect(authModule.requireUser(request)).rejects.toThrow('Redirect to /auth/login');
    });

    it('should not leak user data when WorkOS query fails', async () => {
      const request = createMockRequest('/dashboard');

      mockSession.get.mockReturnValue(mockUser.id);
      mockWorkOS.userManagement.getUser.mockRejectedValue(new Error('User not found'));

      const user = await authModule.getUser(request);

      expect(user).toBeNull();
      // Should not throw or return partial data
    });
  });
});
