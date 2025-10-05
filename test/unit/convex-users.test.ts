/**
 * Convex Users Unit Tests
 *
 * Exercises convex/users.ts via the convex-test harness to ensure business logic
 * maintains seat counts, role management, and organization scoping guarantees.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

const ORGANIZATION_ID = 'org_test_123';
const OTHER_ORG_ID = 'org_other_456';
const BASE_TIME = new Date('2025-01-10T10:00:00Z');

function daysFromBase(days: number) {
  return BASE_TIME.getTime() + days * 24 * 60 * 60 * 1000;
}

describe('convex/users', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function seedSubscription({
    organizationId = ORGANIZATION_ID,
    seatsActive = 0,
    seatsTotal = 5,
    seatsIncluded = 5,
    billingInterval = 'monthly',
  }: {
    organizationId?: string;
    seatsActive?: number;
    seatsTotal?: number;
    seatsIncluded?: number;
    billingInterval?: 'monthly' | 'annual' | string;
  } = {}) {
    const currentPeriodStart = BASE_TIME.getTime();
    const currentPeriodEnd = daysFromBase(30);

    return await t.mutation(api.subscriptions.create, {
      organizationId,
      stripeCustomerId: `cus_${organizationId}`,
      stripeSubscriptionId: `sub_${organizationId}`,
      tier: 'starter',
      status: 'active',
      billingInterval,
      seatsIncluded,
      seatsTotal,
      seatsActive,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });
  }

  async function createUser({
    email,
    name = 'Test User',
    workosUserId,
    organizationId = ORGANIZATION_ID,
  }: {
    email: string;
    name?: string;
    workosUserId: string;
    organizationId?: string;
  }) {
    return await t.mutation(api.users.createUser, {
      email,
      name,
      workosUserId,
      organizationId,
    });
  }

  it('creates a user and retrieves records by id, email, and WorkOS id', async () => {
    const userId = await createUser({
      email: 'owner@example.com',
      name: 'Owner User',
      workosUserId: 'workos_owner_1',
    });

    const user = await t.query(api.users.getUser, { id: userId });
    expect(user?.email).toBe('owner@example.com');
    expect(user?.isActive).toBe(true);
    expect(user?.createdAt).toBe(BASE_TIME.getTime());

    const byEmail = await t.query(api.users.getUserByEmail, { email: 'owner@example.com' });
    expect(byEmail?._id).toEqual(userId);

    const byWorkos = await t.query(api.users.getUserByWorkosId, { workosUserId: 'workos_owner_1' });
    expect(byWorkos?._id).toEqual(userId);

    const allUsers = await t.query(api.users.getAllUsers, {});
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0]._id).toEqual(userId);
  });

  it('updates user fields and refreshes the updatedAt timestamp', async () => {
    const userId = await createUser({
      email: 'initial@example.com',
      name: 'Initial Name',
      workosUserId: 'workos_initial',
    });

    const original = await t.query(api.users.getUser, { id: userId });
    expect(original?.updatedAt).toBe(BASE_TIME.getTime());

    vi.advanceTimersByTime(1_000);

    await t.mutation(api.users.updateUser, {
      id: userId,
      name: 'Updated Name',
      email: 'updated@example.com',
      isActive: false,
    });

    const updated = await t.query(api.users.getUser, { id: userId });
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.email).toBe('updated@example.com');
    expect(updated?.isActive).toBe(false);
    const originalUpdatedAt = original?.updatedAt ?? 0;
    expect(updated?.updatedAt ?? 0).toBeGreaterThan(originalUpdatedAt);
  });

  it('deactivates a user, recalculates seats, and updates the subscription', async () => {
    await seedSubscription({ seatsActive: 2, seatsTotal: 3 });

    const userIdA = await createUser({
      email: 'active1@example.com',
      workosUserId: 'workos_active_1',
    });

    await createUser({
      email: 'active2@example.com',
      workosUserId: 'workos_active_2',
    });

    const result = await t.mutation(api.users.deactivateUser, { id: userIdA });
    expect(result).toEqual({
      status: 'deactivated',
      seatsActive: 1,
      organizationId: ORGANIZATION_ID,
    });

    const subscription = await t.query(api.subscriptions.getByOrganization, {
      organizationId: ORGANIZATION_ID,
    });
    expect(subscription?.seatsActive).toBe(1);
    expect(subscription?.updatedAt).toBeGreaterThanOrEqual(BASE_TIME.getTime());
  });

  it('returns noop when deactivating an already inactive user', async () => {
    await seedSubscription({ seatsActive: 1, seatsTotal: 2 });

    const userId = await createUser({
      email: 'inactive@example.com',
      workosUserId: 'workos_inactive',
    });

    await t.mutation(api.users.deactivateUser, { id: userId });
    const second = await t.mutation(api.users.deactivateUser, { id: userId });

    expect(second).toEqual({ status: 'noop', seatsActive: 0, organizationId: ORGANIZATION_ID });
  });

  it('reactivates a user and restores seat counts', async () => {
    await seedSubscription({ seatsActive: 1, seatsTotal: 2 });

    const userId = await createUser({
      email: 'reactivate@example.com',
      workosUserId: 'workos_reactivate',
    });

    await t.mutation(api.users.deactivateUser, { id: userId });
    const reactivation = await t.mutation(api.users.reactivateUser, { id: userId });

    expect(reactivation).toEqual({
      status: 'reactivated',
      seatsActive: 1,
      organizationId: ORGANIZATION_ID,
    });

    const subscription = await t.query(api.subscriptions.getByOrganization, {
      organizationId: ORGANIZATION_ID,
    });
    expect(subscription?.seatsActive).toBe(1);
  });

  it('returns noop when reactivating an already active user', async () => {
    await seedSubscription({ seatsActive: 1, seatsTotal: 2 });

    const userId = await createUser({
      email: 'active@example.com',
      workosUserId: 'workos_active',
    });

    const response = await t.mutation(api.users.reactivateUser, { id: userId });
    expect(response).toEqual({ status: 'noop', seatsActive: 1, organizationId: ORGANIZATION_ID });
  });

  it('throws when attempting to deactivate or reactivate a missing user', async () => {
    const staleUserId = await createUser({
      email: 'delete-me@example.com',
      workosUserId: 'workos_delete_me',
    });

    await t.run(async ctx => {
      await ctx.db.delete(staleUserId);
      return null;
    });

    await expect(t.mutation(api.users.deactivateUser, { id: staleUserId })).rejects.toThrow(
      'User not found'
    );

    await expect(t.mutation(api.users.reactivateUser, { id: staleUserId })).rejects.toThrow(
      'User not found'
    );
  });

  it('filters users by organization and active status', async () => {
    const userOrg1 = await createUser({
      email: 'org1@example.com',
      workosUserId: 'workos_org1',
    });

    await createUser({
      email: 'org1.inactive@example.com',
      workosUserId: 'workos_org1_inactive',
    });

    await createUser({
      email: 'org2@example.com',
      workosUserId: 'workos_org2',
      organizationId: OTHER_ORG_ID,
    });

    await t.mutation(api.users.deactivateUser, { id: userOrg1 });

    const org1Users = await t.query(api.users.getUsersByOrganization, {
      organizationId: ORGANIZATION_ID,
    });
    const org2Users = await t.query(api.users.getUsersByOrganization, {
      organizationId: OTHER_ORG_ID,
    });

    expect(org1Users).toHaveLength(1);
    expect(org1Users[0].organizationId).toBe(ORGANIZATION_ID);
    expect(org1Users[0].isActive).toBe(true);

    expect(org2Users).toHaveLength(1);
    expect(org2Users[0].organizationId).toBe(OTHER_ORG_ID);
  });

  it('returns team members sorted by creation time and respects includeInactive flag', async () => {
    const first = await createUser({
      email: 'first@example.com',
      workosUserId: 'workos_first',
    });

    vi.advanceTimersByTime(500);

    const second = await createUser({
      email: 'second@example.com',
      workosUserId: 'workos_second',
    });

    vi.advanceTimersByTime(500);

    const third = await createUser({
      email: 'third@example.com',
      workosUserId: 'workos_third',
    });

    await t.mutation(api.users.deactivateUser, { id: second });

    const withInactive = await t.query(api.users.getTeamMembers, {
      organizationId: ORGANIZATION_ID,
      includeInactive: true,
    });

    expect(withInactive.map(member => member._id)).toEqual([first, second, third]);

    const activeOnly = await t.query(api.users.getTeamMembers, {
      organizationId: ORGANIZATION_ID,
      includeInactive: false,
    });

    expect(activeOnly.map(member => member._id)).toEqual([first, third]);
  });

  it('gets and updates user roles with member fallback', async () => {
    await createUser({
      email: 'role@example.com',
      workosUserId: 'workos_role',
    });

    const defaultRole = await t.query(api.users.getUserRole, { workosUserId: 'workos_role' });
    expect(defaultRole).toBe('member');

    await t.mutation(api.users.updateUserRole, {
      workosUserId: 'workos_role',
      role: 'admin',
    });

    const updatedRole = await t.query(api.users.getUserRole, { workosUserId: 'workos_role' });
    expect(updatedRole).toBe('admin');
  });

  it('throws when updating the role for a missing user', async () => {
    await expect(
      t.mutation(api.users.updateUserRole, {
        workosUserId: 'missing-user',
        role: 'owner',
      })
    ).rejects.toThrow('User not found');
  });
});
