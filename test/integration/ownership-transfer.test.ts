/**
 * Ownership Transfer Route Tests (Phase 12)
 */

import { URLSearchParams } from 'node:url';
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import type { User } from '~/lib/auth.server';
import { createMockRequest } from '../helpers/test-utils';
import { loader, action } from '../../app/routes/settings.team.transfer-ownership';

vi.mock('~/lib/auth.server', () => ({
  requireRole: vi.fn(),
  getOrganizationMembershipForUser: vi.fn(),
  updateOrganizationMembershipRole: vi.fn(),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
  createOrUpdateUserInConvex: vi.fn(),
}));

vi.mock('~/lib/session.server', () => ({
  getSession: vi.fn(),
  commitSession: vi.fn(),
}));

vi.mock('~/lib/stripe.server', () => ({
  stripe: {
    customers: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('~/lib/logger', () => ({
  logError: vi.fn(),
}));

const { requireRole, getOrganizationMembershipForUser, updateOrganizationMembershipRole } =
  await import('~/lib/auth.server');
const { convexServer } = await import('../../lib/convex.server');
const { getSession, commitSession } = await import('~/lib/session.server');
const { stripe } = await import('~/lib/stripe.server');

const ownerUser: User = {
  id: 'user_owner_1',
  email: 'owner@example.com',
  organizationId: 'org_123',
  role: 'owner',
};

const adminMember = {
  _id: 'user_convex_admin',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  isActive: true,
  createdAt: Date.now(),
  workosUserId: 'user_admin_1',
  organizationId: 'org_123',
};

async function readLoaderData<T>(result: unknown): Promise<T> {
  if (result instanceof Response) {
    return (await result.json()) as T;
  }

  if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>)) {
    return (result as Record<string, unknown>).data as T;
  }

  return result as T;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ownership transfer loader', () => {
  it('returns eligible admins sorted by join date', async () => {
    (requireRole as Mock).mockResolvedValue(ownerUser);

    const members = [
      { ...adminMember, createdAt: Date.now() - 1000 },
      {
        _id: 'user_convex_admin_2',
        email: 'admin2@example.com',
        name: 'Admin Two',
        role: 'admin',
        isActive: true,
        createdAt: Date.now(),
        workosUserId: 'user_admin_2',
        organizationId: 'org_123',
      },
      {
        _id: 'user_convex_manager',
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'manager',
        isActive: true,
        createdAt: Date.now(),
        workosUserId: 'user_manager_1',
        organizationId: 'org_123',
      },
      {
        _id: 'user_convex_inactive',
        email: 'inactive@example.com',
        name: 'Inactive User',
        role: 'admin',
        isActive: false,
        createdAt: Date.now(),
        workosUserId: 'user_inactive',
        organizationId: 'org_123',
      },
    ];

    (convexServer.query as Mock).mockResolvedValueOnce(members);

    const response = await loader({
      request: createMockRequest('/settings/team/transfer-ownership'),
      params: {},
      context: {} as never,
    });

    const data = await readLoaderData<{
      eligibleAdmins: Array<{ workosUserId: string; email: string }>;
    }>(response);

    expect(data.eligibleAdmins).toHaveLength(2);
    expect(data.eligibleAdmins[0].workosUserId).toBe('user_admin_1');
    expect(data.eligibleAdmins[1].workosUserId).toBe('user_admin_2');
  });
});

describe('ownership transfer action', () => {
  it('promotes admin to owner and demotes previous owner', async () => {
    (requireRole as Mock).mockResolvedValue(ownerUser);

    const queryMock = convexServer.query as Mock;
    queryMock
      .mockResolvedValueOnce(adminMember) // Fetch target admin from Convex
      .mockResolvedValueOnce({
        stripeCustomerId: 'cus_123',
        organizationId: 'org_123',
      });

    const mutationMock = convexServer.mutation as Mock;
    mutationMock.mockResolvedValue(undefined);

    (getOrganizationMembershipForUser as Mock)
      .mockResolvedValueOnce({
        id: 'membership_owner',
        role: { slug: 'owner' },
      })
      .mockResolvedValueOnce({
        id: 'membership_admin',
        role: { slug: 'admin' },
      });

    (updateOrganizationMembershipRole as Mock).mockResolvedValue(undefined);

    const sessionStore = new Map<string, unknown>();
    const mockSession = {
      set: vi.fn((key: string, value: unknown) => sessionStore.set(key, value)),
      get: vi.fn((key: string) => sessionStore.get(key)),
    };

    (getSession as Mock).mockResolvedValue(mockSession);
    (commitSession as Mock).mockResolvedValue('__mock_session__');

    (stripe.customers.retrieve as Mock).mockResolvedValue({
      id: 'cus_123',
      email: 'owner@example.com',
    });

    const stripeUpdateSpy = stripe.customers.update as Mock;
    stripeUpdateSpy.mockResolvedValue({ id: 'cus_123' });

    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const formData = new URLSearchParams({ targetWorkosUserId: 'user_admin_1' });
    const request = createMockRequest('/settings/team/transfer-ownership', {
      method: 'POST',
      body: formData,
    });

    const result = await action({
      request,
      params: {},
      context: {} as never,
    });

    expect(result instanceof Response).toBe(true);
    if (result instanceof Response) {
      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toBe('/settings/team?transfer=success');
    }

    expect(commitSession).toHaveBeenCalledWith(mockSession);

    expect(updateOrganizationMembershipRole).toHaveBeenCalledWith('membership_admin', 'owner');
    expect(updateOrganizationMembershipRole).toHaveBeenCalledWith('membership_owner', 'admin');

    expect(mutationMock).toHaveBeenCalledWith(expect.anything(), {
      workosUserId: 'user_admin_1',
      role: 'owner',
    });
    expect(mutationMock).toHaveBeenCalledWith(expect.anything(), {
      workosUserId: 'user_owner_1',
      role: 'admin',
    });

    expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_123');
    expect(stripeUpdateSpy).toHaveBeenCalledWith('cus_123', {
      email: 'admin@example.com',
      name: 'Admin User',
    });

    expect(mockSession.set).toHaveBeenCalledWith('role', 'admin');
    expect(consoleInfoSpy).toHaveBeenCalled();

    consoleInfoSpy.mockRestore();
  });
});
