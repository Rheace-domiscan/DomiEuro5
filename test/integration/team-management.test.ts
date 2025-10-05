/**
 * Team Management Route Tests (Phase 8)
 *
 * Validates loader/action behaviour for app/routes/settings.team._index.tsx:
 * - Role-based access (owner/admin vs manager)
 * - Invite flow responses for owner/admin roles
 * - Membership management operations (deactivate/reactivate)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redirect } from 'react-router';
import type { User } from '~/lib/auth.server';
import { createMockRequest } from '../helpers/test-utils';

vi.mock('~/lib/auth.server', () => ({
  requireRole: vi.fn(),
  inviteOrAddUserToOrganization: vi.fn(),
  getOrganizationMembershipForUser: vi.fn(),
  deactivateOrganizationMembership: vi.fn(),
  reactivateOrganizationMembership: vi.fn(),
  createOrganizationMembership: vi.fn(),
  updateOrganizationMembershipRole: vi.fn(),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
  createOrUpdateUserInConvex: vi.fn(),
}));

import { loader, action } from '../../app/routes/settings.team._index';
import {
  requireRole,
  inviteOrAddUserToOrganization,
  getOrganizationMembershipForUser,
  deactivateOrganizationMembership,
  reactivateOrganizationMembership,
  createOrganizationMembership as _createOrganizationMembership,
  updateOrganizationMembershipRole,
} from '~/lib/auth.server';
import { convexServer, createOrUpdateUserInConvex } from '../../lib/convex.server';

type InviteResult = Awaited<ReturnType<typeof inviteOrAddUserToOrganization>>;
type MembershipResult = NonNullable<Awaited<ReturnType<typeof getOrganizationMembershipForUser>>>;

async function readResponse<T>(result: unknown): Promise<T> {
  if (result && typeof (result as Response).json === 'function') {
    return (await (result as Response).json()) as T;
  }

  if (
    result &&
    typeof result === 'object' &&
    result !== null &&
    'data' in (result as Record<string, unknown>)
  ) {
    return (result as Record<string, unknown>).data as T;
  }

  return result as T;
}

const ownerUser: User = {
  id: 'user_owner_1',
  email: 'owner@example.com',
  organizationId: 'org_123',
  role: 'owner',
};

const adminUser: User = {
  ...ownerUser,
  id: 'user_admin_1',
  email: 'admin@example.com',
  role: 'admin',
};

const teamMembers = [
  {
    _id: 'user_convex_1',
    email: 'owner@example.com',
    name: 'Owner User',
    role: 'owner',
    isActive: true,
    createdAt: Date.now() - 1000,
    workosUserId: 'user_owner_1',
    organizationId: 'org_123',
  },
  {
    _id: 'user_convex_2',
    email: 'manager@example.com',
    name: 'Manager User',
    role: 'manager',
    isActive: true,
    createdAt: Date.now(),
    workosUserId: 'user_manager_1',
    organizationId: 'org_123',
  },
];

const seatStats = {
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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('team settings loader', () => {
  it('returns team data for owner', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query)
      .mockResolvedValueOnce(teamMembers)
      .mockResolvedValueOnce(seatStats);

    const response = await loader({
      request: createMockRequest('/settings/team'),
      params: {},
      context: {},
    });

    const payload = await readResponse<{
      members: typeof teamMembers;
      seatStats: typeof seatStats;
    }>(response);
    expect(payload.members).toHaveLength(2);
    expect(payload.seatStats.seatsTotal).toBe(6);
    expect(convexServer.query).toHaveBeenCalledTimes(2);
  });

  it('redirects managers to /dashboard', async () => {
    vi.mocked(requireRole).mockImplementation(() => {
      throw redirect('/dashboard');
    });

    await expect(
      loader({
        request: createMockRequest('/settings/team'),
        params: {},
        context: {},
      })
    ).rejects.toMatchObject({ headers: new globalThis.Headers({ Location: '/dashboard' }) });
  });
});

describe('team settings invite action', () => {
  it('allows owner to invite a new admin user', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(inviteOrAddUserToOrganization).mockResolvedValue({
      type: 'invited',
      invitation: { id: 'invite_123' } as NonNullable<InviteResult['invitation']>,
      user: null,
    } as InviteResult);

    const request = createMockRequest('/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new globalThis.URLSearchParams({
        intent: 'invite',
        email: 'new-admin@example.com',
        role: 'admin',
      }),
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await readResponse<{ ok: boolean; message: string; refresh: boolean }>(
      response
    );

    expect(payload.ok).toBe(true);
    expect(payload.message).toContain('Invitation sent');
    expect(payload.refresh).toBe(false);
    expect(inviteOrAddUserToOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new-admin@example.com',
        organizationId: 'org_123',
        roleSlug: 'admin',
      })
    );
  });

  it('allows admin to invite a team member and triggers refresh when membership created', async () => {
    vi.mocked(requireRole).mockResolvedValue(adminUser);
    vi.mocked(inviteOrAddUserToOrganization).mockResolvedValue({
      type: 'membership_created',
      workosUserId: 'user_new_1',
      membershipId: 'mem_999',
      user: {
        id: 'user_new_1',
        email: 'teammate@example.com',
        firstName: 'Team',
        lastName: 'Mate',
      },
    } as InviteResult);
    vi.mocked(convexServer.query).mockResolvedValueOnce(null); // existing Convex user lookup

    const request = createMockRequest('/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new globalThis.URLSearchParams({
        intent: 'invite',
        email: 'teammate@example.com',
        role: 'member',
      }),
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await readResponse<{ ok: boolean; message: string; refresh: boolean }>(
      response
    );

    expect(payload.ok).toBe(true);
    expect(payload.refresh).toBe(true);
    expect(createOrUpdateUserInConvex).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_new_1', email: 'teammate@example.com' })
    );
    expect(convexServer.mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        workosUserId: 'user_new_1',
        role: 'member',
      })
    );
  });
});

describe('team settings membership actions', () => {
  it('deactivates a user and WorkOS membership', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValueOnce(teamMembers[1]);
    vi.mocked(getOrganizationMembershipForUser).mockResolvedValue({
      id: 'mem_123',
      status: 'active',
      role: { slug: 'manager' },
    } as MembershipResult);

    const request = createMockRequest('/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new globalThis.URLSearchParams({ intent: 'deactivate', userId: 'user_convex_2' }),
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await readResponse<{ ok: boolean }>(response);

    expect(payload.ok).toBe(true);
    expect(deactivateOrganizationMembership).toHaveBeenCalledWith('mem_123');
    expect(convexServer.mutation).toHaveBeenCalledWith(expect.anything(), { id: 'user_convex_2' });
  });

  it('reactivates a user and updates membership role', async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerUser);
    vi.mocked(convexServer.query).mockResolvedValueOnce({
      ...teamMembers[1],
      isActive: false,
    });
    vi.mocked(getOrganizationMembershipForUser).mockResolvedValue({
      id: 'mem_456',
      status: 'inactive',
      role: { slug: 'member' },
    } as MembershipResult);

    const request = createMockRequest('/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new globalThis.URLSearchParams({ intent: 'reactivate', userId: 'user_convex_2' }),
    });

    const response = await action({ request, params: {}, context: {} });
    const payload = await readResponse<{ ok: boolean }>(response);

    expect(payload.ok).toBe(true);
    expect(reactivateOrganizationMembership).toHaveBeenCalledWith('mem_456');
    expect(updateOrganizationMembershipRole).toHaveBeenCalledWith('mem_456', 'manager');
    expect(convexServer.mutation).toHaveBeenCalledWith(expect.anything(), { id: 'user_convex_2' });
  });
});
