import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.ts');

describe('convex/auditLog', () => {
  const organizationId = 'org_123';
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates audit entries and returns them in reverse chronological order', async () => {
    const baseTimestamp = Date.now();

    await t.mutation(api.auditLog.create, {
      organizationId,
      userId: 'user_1',
      action: 'ownership_transferred',
      targetType: 'organization',
      targetId: organizationId,
      changes: {
        previousOwner: {
          id: 'user_owner',
          role: {
            before: 'owner',
            after: 'admin',
          },
        },
        newOwner: {
          id: 'user_admin',
          role: {
            before: 'admin',
            after: 'owner',
          },
        },
      },
      metadata: {
        previousOwnerEmail: 'owner@example.com',
        newOwnerEmail: 'admin@example.com',
        billingEmailUpdated: true,
      },
      ipAddress: '203.0.113.10',
      userAgent: 'vitest/1.0',
    });

    vi.advanceTimersByTime(1000);

    await t.mutation(api.auditLog.create, {
      organizationId,
      userId: 'user_2',
      action: 'member_invited',
      targetType: 'user',
      targetId: 'user_invited',
    });

    await t.mutation(api.auditLog.create, {
      organizationId: 'org_other',
      userId: 'user_3',
      action: 'ignored',
      targetType: 'organization',
      targetId: 'org_other',
    });

    const logs = await t.query(api.auditLog.getRecentByOrganization, {
      organizationId,
      limit: 10,
    });

    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe('member_invited');
    expect(logs[0].createdAt).toBe(baseTimestamp + 1000);
    expect(logs[1].action).toBe('ownership_transferred');
    expect(logs[1].metadata).toEqual(
      expect.objectContaining({
        previousOwnerEmail: 'owner@example.com',
        billingEmailUpdated: true,
      })
    );
  });

  it('defaults to returning the 50 most recent entries when limit not provided', async () => {
    for (let index = 0; index < 55; index += 1) {
      await t.mutation(api.auditLog.create, {
        organizationId,
        userId: `user_${index}`,
        action: 'seat_updated',
        targetType: 'organization',
        targetId: organizationId,
      });
      vi.advanceTimersByTime(1);
    }

    const logs = await t.query(api.auditLog.getRecentByOrganization, {
      organizationId,
    });

    expect(logs).toHaveLength(50);
    expect(logs[0].createdAt).toBeGreaterThan(logs[logs.length - 1].createdAt);
  });
});
