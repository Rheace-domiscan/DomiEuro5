/**
 * Example Unit Test
 *
 * This file demonstrates how to write unit tests with Vitest.
 * Use this as a reference when writing your own tests.
 *
 * Unit tests should:
 * - Test pure functions and business logic
 * - Use mocks for external dependencies
 * - Be fast and isolated
 * - Test happy paths AND error cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasPermission, hasRole, hasTierAccess, ROLES, TIERS, type Role } from '~/lib/permissions';

describe('Example Unit Tests - Permissions', () => {
  /**
   * beforeEach runs before each test
   * Use it to reset mocks or set up common test data
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPermission()', () => {
    /**
     * Test naming convention: "should [expected behavior] when [condition]"
     * This makes test intent clear and failure messages helpful
     */
    it('should return true when role has permission', () => {
      // Arrange: Set up test data
      const role = ROLES.OWNER;
      const permission = 'billing:manage';

      // Act: Execute the function being tested
      const result = hasPermission(role, permission);

      // Assert: Verify the result
      expect(result).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      const role = ROLES.TEAM_MEMBER;
      const permission = 'billing:manage';

      const result = hasPermission(role, permission);

      expect(result).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const role = undefined;
      const permission = 'billing:manage';

      const result = hasPermission(role, permission);

      expect(result).toBe(false);
    });

    it('should return false when permission does not exist', () => {
      const role = ROLES.OWNER;
      const permission = 'nonexistent:permission';

      const result = hasPermission(role, permission);

      expect(result).toBe(false);
    });

    /**
     * Testing multiple scenarios with test.each()
     * This reduces code duplication for similar test cases
     */
    it.each([
      [ROLES.OWNER, 'billing:view', true],
      [ROLES.ADMIN, 'billing:view', true],
      [ROLES.MANAGER, 'billing:view', false],
      [ROLES.OWNER, 'billing:manage', true],
      [ROLES.ADMIN, 'billing:manage', false],
    ])('should return %s for role %s with permission %s', (role, permission, expected) => {
      expect(hasPermission(role, permission)).toBe(expected);
    });
  });

  describe('hasRole()', () => {
    it('should return true when role is in allowed list', () => {
      const role = ROLES.ADMIN;
      const allowedRoles = [ROLES.OWNER, ROLES.ADMIN];

      const result = hasRole(role, allowedRoles);

      expect(result).toBe(true);
    });

    it('should return false when role is not in allowed list', () => {
      const role = ROLES.TEAM_MEMBER;
      const allowedRoles = [ROLES.OWNER, ROLES.ADMIN];

      const result = hasRole(role, allowedRoles);

      expect(result).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const role = undefined;
      const allowedRoles = [ROLES.OWNER];

      const result = hasRole(role, allowedRoles);

      expect(result).toBe(false);
    });

    it('should return false when allowed roles list is empty', () => {
      const role = ROLES.OWNER;
      const allowedRoles: Role[] = [];

      const result = hasRole(role, allowedRoles);

      expect(result).toBe(false);
    });
  });

  describe('hasTierAccess()', () => {
    it('should return true for exact tier match', () => {
      const currentTier = TIERS.STARTER;
      const requiredTier = TIERS.STARTER;

      const result = hasTierAccess(currentTier, requiredTier);

      expect(result).toBe(true);
    });

    it('should return true when current tier is higher than required', () => {
      const currentTier = TIERS.PROFESSIONAL;
      const requiredTier = TIERS.STARTER;

      const result = hasTierAccess(currentTier, requiredTier);

      expect(result).toBe(true);
    });

    it('should return false when current tier is lower than required', () => {
      const currentTier = TIERS.FREE;
      const requiredTier = TIERS.STARTER;

      const result = hasTierAccess(currentTier, requiredTier);

      expect(result).toBe(false);
    });

    it('should return false when current tier is undefined', () => {
      const currentTier = undefined;
      const requiredTier = TIERS.STARTER;

      const result = hasTierAccess(currentTier, requiredTier);

      expect(result).toBe(false);
    });

    /**
     * Testing tier hierarchy
     * This ensures the tier comparison logic works correctly
     */
    it.each([
      [TIERS.FREE, TIERS.FREE, true],
      [TIERS.FREE, TIERS.STARTER, false],
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
});

/**
 * Testing Tips:
 *
 * 1. Test Structure: Use describe() to group related tests
 * 2. Test Names: Use descriptive names that explain what's being tested
 * 3. AAA Pattern: Arrange (setup), Act (execute), Assert (verify)
 * 4. Test Coverage: Test happy paths, error cases, and edge cases
 * 5. Isolation: Each test should be independent and not rely on other tests
 * 6. Mocking: Use vi.fn() and vi.mock() to mock external dependencies
 * 7. Assertions: Use specific assertions (toBe, toEqual, toThrow, etc.)
 * 8. Speed: Unit tests should be fast (< 100ms each)
 */
