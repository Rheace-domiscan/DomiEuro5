/**
 * WorkOS SDK Mock
 *
 * Provides mock implementations of WorkOS SDK methods for testing.
 * Import this in tests that interact with WorkOS APIs.
 *
 * @example
 * ```typescript
 * import { mockWorkOS } from '~/test/mocks/workos';
 *
 * mockWorkOS.userManagement.getUser.mockResolvedValue({
 *   id: 'user_123',
 *   email: 'test@example.com',
 *   ...
 * });
 * ```
 */

import { vi } from 'vitest';

/**
 * Mock WorkOS User object
 */
export const mockWorkOSUser = {
  id: 'user_01HTEST123456789',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  profilePictureUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock WorkOS Organization object
 */
export const mockWorkOSOrganization = {
  id: 'org_01HTEST123456789',
  name: 'Test Organization',
  allowProfilesOutsideOrganization: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  domains: [],
};

/**
 * Mock WorkOS OrganizationMembership object
 */
export const mockWorkOSMembership = {
  id: 'om_01HTEST123456789',
  userId: mockWorkOSUser.id,
  organizationId: mockWorkOSOrganization.id,
  role: {
    slug: 'owner',
  },
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock WorkOS AuthenticationResponse object
 */
export const mockAuthenticationResponse = {
  user: mockWorkOSUser,
  organizationId: mockWorkOSOrganization.id,
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
  impersonator: null,
};

/**
 * Mock WorkOS SDK
 *
 * This object structure mirrors the actual WorkOS SDK.
 */
export const mockWorkOS = {
  userManagement: {
    getUser: vi.fn().mockResolvedValue(mockWorkOSUser),

    listOrganizationMemberships: vi.fn().mockResolvedValue({
      data: [mockWorkOSMembership],
      listMetadata: {
        after: null,
        before: null,
      },
    }),

    authenticateWithCode: vi.fn().mockResolvedValue(mockAuthenticationResponse),

    authenticateWithOrganizationSelection: vi.fn().mockResolvedValue(mockAuthenticationResponse),

    authenticateWithRefreshToken: vi.fn().mockResolvedValue(mockAuthenticationResponse),

    getAuthorizationUrl: vi.fn().mockReturnValue('https://auth.workos.com/authorize?...'),

    revokeSession: vi.fn().mockResolvedValue(undefined),

    createOrganizationMembership: vi.fn().mockResolvedValue(mockWorkOSMembership),

    deleteOrganizationMembership: vi.fn().mockResolvedValue(undefined),

    updateOrganizationMembership: vi.fn().mockResolvedValue({
      ...mockWorkOSMembership,
      role: { slug: 'admin' },
    }),
  },

  organizations: {
    createOrganization: vi.fn().mockResolvedValue(mockWorkOSOrganization),

    getOrganization: vi.fn().mockResolvedValue(mockWorkOSOrganization),

    listOrganizations: vi.fn().mockResolvedValue({
      data: [mockWorkOSOrganization],
      listMetadata: {
        after: null,
        before: null,
      },
    }),

    updateOrganization: vi.fn().mockResolvedValue(mockWorkOSOrganization),

    deleteOrganization: vi.fn().mockResolvedValue(undefined),
  },

  portal: {
    generateLink: vi.fn().mockResolvedValue({
      link: 'https://portal.workos.com/...',
    }),
  },
};

/**
 * Reset all WorkOS mocks
 *
 * Call this in beforeEach() or afterEach() to reset mock state between tests.
 */
export function resetWorkOSMocks() {
  vi.clearAllMocks();

  // Reset to default mock implementations
  mockWorkOS.userManagement.getUser.mockResolvedValue(mockWorkOSUser);
  mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
    data: [mockWorkOSMembership],
    listMetadata: { after: null, before: null },
  });
  mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue(mockAuthenticationResponse);
  mockWorkOS.userManagement.revokeSession.mockResolvedValue(undefined);
  mockWorkOS.organizations.createOrganization.mockResolvedValue(mockWorkOSOrganization);
  mockWorkOS.organizations.listOrganizations.mockResolvedValue({
    data: [mockWorkOSOrganization],
    listMetadata: { after: null, before: null },
  });
}

/**
 * Mock WorkOS module
 *
 * Use this in vi.mock() to replace the actual WorkOS SDK.
 *
 * @example
 * ```typescript
 * vi.mock('@workos-inc/node', () => ({
 *   WorkOS: vi.fn(() => mockWorkOS),
 * }));
 * ```
 */
export const WorkOSMock = vi.fn(() => mockWorkOS);
