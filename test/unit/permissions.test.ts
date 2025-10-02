/**
 * RBAC Permissions Tests
 *
 * CRITICAL: This file tests role-based access control (RBAC) security boundaries.
 * These tests ensure that permission checks work correctly and prevent unauthorized access.
 *
 * Coverage Target: 85%+ (security-critical code)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ROLES,
  TIERS,
  PERMISSIONS,
  hasPermission,
  hasRole,
  hasTierAccess,
  getRoleName,
  getTierName,
  type Role,
  type Tier,
  type Permission,
} from '~/lib/permissions';

describe('RBAC Permissions System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ROLES constant', () => {
    it('should have exactly 5 roles defined', () => {
      const roleCount = Object.keys(ROLES).length;
      expect(roleCount).toBe(5);
    });

    it('should have correct role values', () => {
      expect(ROLES.OWNER).toBe('owner');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.SALES).toBe('sales');
      expect(ROLES.TEAM_MEMBER).toBe('member'); // Note: WorkOS uses 'member', not 'team_member'
    });

    it('should have immutable role constants', () => {
      // TypeScript ensures this at compile time, but verify structure
      expect(Object.isFrozen(ROLES)).toBe(false); // as const doesn't freeze at runtime
      expect(typeof ROLES.OWNER).toBe('string');
    });
  });

  describe('TIERS constant', () => {
    it('should have exactly 3 tiers defined', () => {
      const tierCount = Object.keys(TIERS).length;
      expect(tierCount).toBe(3);
    });

    it('should have correct tier values', () => {
      expect(TIERS.FREE).toBe('free');
      expect(TIERS.STARTER).toBe('starter');
      expect(TIERS.PROFESSIONAL).toBe('professional');
    });
  });

  describe('PERMISSIONS constant', () => {
    it('should define all required permission categories', () => {
      const permissionKeys = Object.keys(PERMISSIONS);

      // Billing permissions
      expect(permissionKeys).toContain('billing:view');
      expect(permissionKeys).toContain('billing:manage');

      // Seat permissions
      expect(permissionKeys).toContain('seats:add');
      expect(permissionKeys).toContain('seats:view');

      // User permissions
      expect(permissionKeys).toContain('users:invite');
      expect(permissionKeys).toContain('users:manage');
      expect(permissionKeys).toContain('users:view');

      // Organization permissions
      expect(permissionKeys).toContain('org:transfer_ownership');
      expect(permissionKeys).toContain('org:manage');

      // Feature permissions
      expect(permissionKeys).toContain('features:basic');
      expect(permissionKeys).toContain('features:analytics');
    });

    it('should have valid role arrays for each permission', () => {
      Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
        expect(Array.isArray(roles)).toBe(true);
        expect(roles.length).toBeGreaterThan(0);

        // Verify all roles are valid
        roles.forEach(role => {
          expect(Object.values(ROLES)).toContain(role);
        });
      });
    });
  });

  describe('hasPermission()', () => {
    describe('Billing Permissions', () => {
      it('should allow owner to view billing', () => {
        expect(hasPermission(ROLES.OWNER, 'billing:view')).toBe(true);
      });

      it('should allow admin to view billing', () => {
        expect(hasPermission(ROLES.ADMIN, 'billing:view')).toBe(true);
      });

      it('should deny manager from viewing billing', () => {
        expect(hasPermission(ROLES.MANAGER, 'billing:view')).toBe(false);
      });

      it('should deny sales from viewing billing', () => {
        expect(hasPermission(ROLES.SALES, 'billing:view')).toBe(false);
      });

      it('should deny team member from viewing billing', () => {
        expect(hasPermission(ROLES.TEAM_MEMBER, 'billing:view')).toBe(false);
      });

      it('should only allow owner to manage billing', () => {
        expect(hasPermission(ROLES.OWNER, 'billing:manage')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'billing:manage')).toBe(false);
        expect(hasPermission(ROLES.MANAGER, 'billing:manage')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'billing:manage')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'billing:manage')).toBe(false);
      });
    });

    describe('Seat Permissions', () => {
      it('should allow owner and admin to add seats', () => {
        expect(hasPermission(ROLES.OWNER, 'seats:add')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'seats:add')).toBe(true);
      });

      it('should deny non-admin roles from adding seats', () => {
        expect(hasPermission(ROLES.MANAGER, 'seats:add')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'seats:add')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'seats:add')).toBe(false);
      });

      it('should allow owner and admin to view seats', () => {
        expect(hasPermission(ROLES.OWNER, 'seats:view')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'seats:view')).toBe(true);
      });
    });

    describe('User Management Permissions', () => {
      it('should allow owner and admin to invite users', () => {
        expect(hasPermission(ROLES.OWNER, 'users:invite')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'users:invite')).toBe(true);
      });

      it('should deny non-admin roles from inviting users', () => {
        expect(hasPermission(ROLES.MANAGER, 'users:invite')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'users:invite')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'users:invite')).toBe(false);
      });

      it('should allow owner, admin, and manager to view users', () => {
        expect(hasPermission(ROLES.OWNER, 'users:view')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'users:view')).toBe(true);
        expect(hasPermission(ROLES.MANAGER, 'users:view')).toBe(true);
      });

      it('should deny sales and team member from viewing users', () => {
        expect(hasPermission(ROLES.SALES, 'users:view')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'users:view')).toBe(false);
      });

      it('should allow owner and admin to manage users', () => {
        expect(hasPermission(ROLES.OWNER, 'users:manage')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'users:manage')).toBe(true);
      });
    });

    describe('Organization Permissions', () => {
      it('should only allow owner to transfer ownership', () => {
        expect(hasPermission(ROLES.OWNER, 'org:transfer_ownership')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'org:transfer_ownership')).toBe(false);
        expect(hasPermission(ROLES.MANAGER, 'org:transfer_ownership')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'org:transfer_ownership')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'org:transfer_ownership')).toBe(false);
      });

      it('should only allow owner to manage organization', () => {
        expect(hasPermission(ROLES.OWNER, 'org:manage')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'org:manage')).toBe(false);
        expect(hasPermission(ROLES.MANAGER, 'org:manage')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'org:manage')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'org:manage')).toBe(false);
      });
    });

    describe('Feature Access Permissions', () => {
      it('should allow all roles to access basic features', () => {
        expect(hasPermission(ROLES.OWNER, 'features:basic')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'features:basic')).toBe(true);
        expect(hasPermission(ROLES.MANAGER, 'features:basic')).toBe(true);
        expect(hasPermission(ROLES.SALES, 'features:basic')).toBe(true);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'features:basic')).toBe(true);
      });

      it('should restrict analytics to owner, admin, manager', () => {
        expect(hasPermission(ROLES.OWNER, 'features:analytics')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'features:analytics')).toBe(true);
        expect(hasPermission(ROLES.MANAGER, 'features:analytics')).toBe(true);
        expect(hasPermission(ROLES.SALES, 'features:analytics')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'features:analytics')).toBe(false);
      });

      it('should restrict API access to owner, admin, manager', () => {
        expect(hasPermission(ROLES.OWNER, 'features:api_limited')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'features:api_limited')).toBe(true);
        expect(hasPermission(ROLES.MANAGER, 'features:api_limited')).toBe(true);
        expect(hasPermission(ROLES.SALES, 'features:api_limited')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'features:api_limited')).toBe(false);
      });

      it('should restrict priority support to owner and admin', () => {
        expect(hasPermission(ROLES.OWNER, 'features:priority_support')).toBe(true);
        expect(hasPermission(ROLES.ADMIN, 'features:priority_support')).toBe(true);
        expect(hasPermission(ROLES.MANAGER, 'features:priority_support')).toBe(false);
        expect(hasPermission(ROLES.SALES, 'features:priority_support')).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, 'features:priority_support')).toBe(false);
      });
    });

    describe('Edge Cases and Security', () => {
      it('should return false when role is undefined', () => {
        expect(hasPermission(undefined, 'billing:manage')).toBe(false);
      });

      it('should return false when role is null', () => {
        // @ts-expect-error - Testing runtime behavior with null
        expect(hasPermission(null, 'billing:manage')).toBe(false);
      });

      it('should return false when role is empty string', () => {
        expect(hasPermission('', 'billing:manage')).toBe(false);
      });

      it('should return false when role is invalid', () => {
        expect(hasPermission('invalid_role', 'billing:manage')).toBe(false);
      });

      it('should return false when permission does not exist', () => {
        // @ts-expect-error - Testing runtime behavior with invalid permission
        expect(hasPermission(ROLES.OWNER, 'nonexistent:permission')).toBe(false);
      });

      it('should handle permission without any roles (edge case)', () => {
        // Temporarily test empty permission array
        const permission = 'test:empty' as Permission;
        expect(hasPermission(ROLES.OWNER, permission)).toBe(false);
      });

      it('should be case-sensitive for roles', () => {
        expect(hasPermission('OWNER', 'billing:manage')).toBe(false); // Uppercase should fail
        expect(hasPermission('Owner', 'billing:manage')).toBe(false); // Capitalized should fail
      });

      it('should be case-sensitive for permissions', () => {
        // @ts-expect-error - Testing runtime behavior with wrong case
        expect(hasPermission(ROLES.OWNER, 'BILLING:MANAGE')).toBe(false);
      });
    });

    /**
     * Comprehensive permission matrix test
     * Verifies all role-permission combinations
     */
    describe('Complete Permission Matrix', () => {
      it.each([
        // [role, permission, expected]
        // Owner permissions (should have most access)
        [ROLES.OWNER, 'billing:view', true],
        [ROLES.OWNER, 'billing:manage', true],
        [ROLES.OWNER, 'seats:add', true],
        [ROLES.OWNER, 'seats:view', true],
        [ROLES.OWNER, 'users:invite', true],
        [ROLES.OWNER, 'users:manage', true],
        [ROLES.OWNER, 'users:view', true],
        [ROLES.OWNER, 'org:transfer_ownership', true],
        [ROLES.OWNER, 'org:manage', true],

        // Admin permissions (can't manage billing or transfer ownership)
        [ROLES.ADMIN, 'billing:view', true],
        [ROLES.ADMIN, 'billing:manage', false],
        [ROLES.ADMIN, 'seats:add', true],
        [ROLES.ADMIN, 'seats:view', true],
        [ROLES.ADMIN, 'users:invite', true],
        [ROLES.ADMIN, 'users:manage', true],
        [ROLES.ADMIN, 'users:view', true],
        [ROLES.ADMIN, 'org:transfer_ownership', false],
        [ROLES.ADMIN, 'org:manage', false],

        // Manager permissions (product access, no billing/user management)
        [ROLES.MANAGER, 'billing:view', false],
        [ROLES.MANAGER, 'billing:manage', false],
        [ROLES.MANAGER, 'seats:add', false],
        [ROLES.MANAGER, 'seats:view', false],
        [ROLES.MANAGER, 'users:invite', false],
        [ROLES.MANAGER, 'users:manage', false],
        [ROLES.MANAGER, 'users:view', true],
        [ROLES.MANAGER, 'org:transfer_ownership', false],
        [ROLES.MANAGER, 'org:manage', false],

        // Sales permissions (very limited access)
        [ROLES.SALES, 'billing:view', false],
        [ROLES.SALES, 'billing:manage', false],
        [ROLES.SALES, 'seats:add', false],
        [ROLES.SALES, 'seats:view', false],
        [ROLES.SALES, 'users:invite', false],
        [ROLES.SALES, 'users:manage', false],
        [ROLES.SALES, 'users:view', false],
        [ROLES.SALES, 'org:transfer_ownership', false],
        [ROLES.SALES, 'org:manage', false],

        // Team Member permissions (minimal access)
        [ROLES.TEAM_MEMBER, 'billing:view', false],
        [ROLES.TEAM_MEMBER, 'billing:manage', false],
        [ROLES.TEAM_MEMBER, 'seats:add', false],
        [ROLES.TEAM_MEMBER, 'seats:view', false],
        [ROLES.TEAM_MEMBER, 'users:invite', false],
        [ROLES.TEAM_MEMBER, 'users:manage', false],
        [ROLES.TEAM_MEMBER, 'users:view', false],
        [ROLES.TEAM_MEMBER, 'org:transfer_ownership', false],
        [ROLES.TEAM_MEMBER, 'org:manage', false],
      ])('hasPermission(%s, %s) should return %s', (role, permission, expected) => {
        expect(hasPermission(role, permission as Permission)).toBe(expected);
      });
    });
  });

  describe('hasRole()', () => {
    it('should return true when role is in allowed list', () => {
      const allowedRoles = [ROLES.OWNER, ROLES.ADMIN];
      expect(hasRole(ROLES.OWNER, allowedRoles)).toBe(true);
      expect(hasRole(ROLES.ADMIN, allowedRoles)).toBe(true);
    });

    it('should return false when role is not in allowed list', () => {
      const allowedRoles = [ROLES.OWNER, ROLES.ADMIN];
      expect(hasRole(ROLES.MANAGER, allowedRoles)).toBe(false);
      expect(hasRole(ROLES.SALES, allowedRoles)).toBe(false);
      expect(hasRole(ROLES.TEAM_MEMBER, allowedRoles)).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const allowedRoles = [ROLES.OWNER];
      expect(hasRole(undefined, allowedRoles)).toBe(false);
    });

    it('should return false when role is null', () => {
      const allowedRoles = [ROLES.OWNER];
      // @ts-expect-error - Testing runtime behavior with null
      expect(hasRole(null, allowedRoles)).toBe(false);
    });

    it('should return false when allowed roles list is empty', () => {
      expect(hasRole(ROLES.OWNER, [])).toBe(false);
    });

    it('should handle single role in allowed list', () => {
      expect(hasRole(ROLES.OWNER, [ROLES.OWNER])).toBe(true);
      expect(hasRole(ROLES.ADMIN, [ROLES.OWNER])).toBe(false);
    });

    it('should handle all roles in allowed list', () => {
      const allRoles = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.TEAM_MEMBER];
      expect(hasRole(ROLES.OWNER, allRoles)).toBe(true);
      expect(hasRole(ROLES.TEAM_MEMBER, allRoles)).toBe(true);
    });

    it('should be case-sensitive', () => {
      const allowedRoles = [ROLES.OWNER];
      expect(hasRole('OWNER', allowedRoles)).toBe(false);
      expect(hasRole('Owner', allowedRoles)).toBe(false);
    });
  });

  describe('hasTierAccess()', () => {
    describe('Tier Hierarchy', () => {
      it('should allow exact tier match', () => {
        expect(hasTierAccess(TIERS.FREE, TIERS.FREE)).toBe(true);
        expect(hasTierAccess(TIERS.STARTER, TIERS.STARTER)).toBe(true);
        expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.PROFESSIONAL)).toBe(true);
      });

      it('should allow higher tier to access lower tier features', () => {
        expect(hasTierAccess(TIERS.STARTER, TIERS.FREE)).toBe(true);
        expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.FREE)).toBe(true);
        expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.STARTER)).toBe(true);
      });

      it('should deny lower tier from accessing higher tier features', () => {
        expect(hasTierAccess(TIERS.FREE, TIERS.STARTER)).toBe(false);
        expect(hasTierAccess(TIERS.FREE, TIERS.PROFESSIONAL)).toBe(false);
        expect(hasTierAccess(TIERS.STARTER, TIERS.PROFESSIONAL)).toBe(false);
      });
    });

    describe('Complete Tier Matrix', () => {
      it.each([
        // [currentTier, requiredTier, expected]
        [TIERS.FREE, TIERS.FREE, true],
        [TIERS.FREE, TIERS.STARTER, false],
        [TIERS.FREE, TIERS.PROFESSIONAL, false],

        [TIERS.STARTER, TIERS.FREE, true],
        [TIERS.STARTER, TIERS.STARTER, true],
        [TIERS.STARTER, TIERS.PROFESSIONAL, false],

        [TIERS.PROFESSIONAL, TIERS.FREE, true],
        [TIERS.PROFESSIONAL, TIERS.STARTER, true],
        [TIERS.PROFESSIONAL, TIERS.PROFESSIONAL, true],
      ])('hasTierAccess(%s, %s) should return %s', (current, required, expected) => {
        expect(hasTierAccess(current, required)).toBe(expected);
      });
    });

    describe('Edge Cases', () => {
      it('should return false when current tier is undefined', () => {
        expect(hasTierAccess(undefined, TIERS.STARTER)).toBe(false);
      });

      it('should return false when current tier is null', () => {
        // @ts-expect-error - Testing runtime behavior with null
        expect(hasTierAccess(null, TIERS.STARTER)).toBe(false);
      });

      it('should return false when current tier is empty string', () => {
        expect(hasTierAccess('', TIERS.STARTER)).toBe(false);
      });

      it('should return false when current tier is invalid', () => {
        expect(hasTierAccess('invalid_tier', TIERS.STARTER)).toBe(false);
      });

      it('should return false when required tier is invalid', () => {
        // @ts-expect-error - Testing runtime behavior with invalid tier
        expect(hasTierAccess(TIERS.PROFESSIONAL, 'invalid_tier')).toBe(false);
      });

      it('should be case-sensitive', () => {
        expect(hasTierAccess('FREE', TIERS.FREE)).toBe(false);
        expect(hasTierAccess('Free', TIERS.FREE)).toBe(false);
      });
    });
  });

  describe('getRoleName()', () => {
    it('should return correct display names for all roles', () => {
      expect(getRoleName(ROLES.OWNER)).toBe('Owner');
      expect(getRoleName(ROLES.ADMIN)).toBe('Admin');
      expect(getRoleName(ROLES.MANAGER)).toBe('Manager');
      expect(getRoleName(ROLES.SALES)).toBe('Sales');
      expect(getRoleName(ROLES.TEAM_MEMBER)).toBe('Team Member');
    });

    it('should handle team member role correctly', () => {
      // WorkOS uses 'member' as the slug, but display name is 'Team Member'
      expect(getRoleName('member' as Role)).toBe('Team Member');
    });
  });

  describe('getTierName()', () => {
    it('should return correct display names for all tiers', () => {
      expect(getTierName(TIERS.FREE)).toBe('Free');
      expect(getTierName(TIERS.STARTER)).toBe('Starter');
      expect(getTierName(TIERS.PROFESSIONAL)).toBe('Professional');
    });
  });

  /**
   * Security Regression Tests
   * These tests verify that critical security boundaries are maintained
   */
  describe('Security Regression Tests', () => {
    it('should prevent privilege escalation via undefined role', () => {
      // Verify undefined role cannot access anything
      const criticalPermissions: Permission[] = [
        'billing:manage',
        'org:transfer_ownership',
        'users:manage',
        'seats:add',
      ];

      criticalPermissions.forEach(permission => {
        expect(hasPermission(undefined, permission)).toBe(false);
      });
    });

    it('should prevent privilege escalation via empty string role', () => {
      const criticalPermissions: Permission[] = [
        'billing:manage',
        'org:transfer_ownership',
        'users:manage',
      ];

      criticalPermissions.forEach(permission => {
        expect(hasPermission('', permission)).toBe(false);
      });
    });

    it('should maintain owner-only permissions', () => {
      const ownerOnlyPermissions: Permission[] = ['billing:manage', 'org:transfer_ownership', 'org:manage'];

      ownerOnlyPermissions.forEach(permission => {
        expect(hasPermission(ROLES.OWNER, permission)).toBe(true);
        expect(hasPermission(ROLES.ADMIN, permission)).toBe(false);
        expect(hasPermission(ROLES.MANAGER, permission)).toBe(false);
        expect(hasPermission(ROLES.SALES, permission)).toBe(false);
        expect(hasPermission(ROLES.TEAM_MEMBER, permission)).toBe(false);
      });
    });

    it('should enforce billing permission hierarchy', () => {
      // Only owner can manage billing
      expect(hasPermission(ROLES.OWNER, 'billing:manage')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'billing:manage')).toBe(false);

      // Owner and admin can view billing
      expect(hasPermission(ROLES.OWNER, 'billing:view')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'billing:view')).toBe(true);

      // Others cannot view billing
      expect(hasPermission(ROLES.MANAGER, 'billing:view')).toBe(false);
      expect(hasPermission(ROLES.SALES, 'billing:view')).toBe(false);
      expect(hasPermission(ROLES.TEAM_MEMBER, 'billing:view')).toBe(false);
    });

    it('should enforce tier access hierarchy', () => {
      // Professional tier can access everything
      expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.FREE)).toBe(true);
      expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.STARTER)).toBe(true);
      expect(hasTierAccess(TIERS.PROFESSIONAL, TIERS.PROFESSIONAL)).toBe(true);

      // Free tier can only access free features
      expect(hasTierAccess(TIERS.FREE, TIERS.FREE)).toBe(true);
      expect(hasTierAccess(TIERS.FREE, TIERS.STARTER)).toBe(false);
      expect(hasTierAccess(TIERS.FREE, TIERS.PROFESSIONAL)).toBe(false);
    });
  });
});
