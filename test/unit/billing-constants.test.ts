/**
 * Billing Constants Tests
 *
 * CRITICAL: This file tests billing configuration that Phase 5 will use for Stripe integration.
 * Incorrect values here = incorrect customer charges = revenue loss.
 *
 * Coverage Target: >80% (business-critical billing logic)
 */

import { describe, it, expect } from 'vitest';
import {
  ROLES,
  TIERS,
  PER_SEAT_PRICE,
  TIER_CONFIG,
  PERMISSIONS,
  hasPermission,
  canAccessTier,
} from '~/lib/billing-constants';

describe('Billing Constants', () => {
  /**
   * Test ROLES constant
   */
  describe('ROLES', () => {
    it('should define all 5 roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(5);
    });

    it('should have correct role values', () => {
      expect(ROLES.OWNER).toBe('owner');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.SALES).toBe('sales');
      expect(ROLES.TEAM_MEMBER).toBe('team_member');
    });

    it('should have string type for all roles', () => {
      // TypeScript `as const` provides compile-time immutability
      // Runtime immutability would require Object.freeze()
      expect(typeof ROLES.OWNER).toBe('string');
      expect(typeof ROLES.ADMIN).toBe('string');
      expect(typeof ROLES.MANAGER).toBe('string');
      expect(typeof ROLES.SALES).toBe('string');
      expect(typeof ROLES.TEAM_MEMBER).toBe('string');
    });
  });

  /**
   * Test TIERS constant
   */
  describe('TIERS', () => {
    it('should define all 3 tiers', () => {
      expect(Object.keys(TIERS)).toHaveLength(3);
    });

    it('should have correct tier values', () => {
      expect(TIERS.FREE).toBe('free');
      expect(TIERS.STARTER).toBe('starter');
      expect(TIERS.PROFESSIONAL).toBe('professional');
    });

    it('should have string type for all tiers', () => {
      // TypeScript `as const` provides compile-time immutability
      // Runtime immutability would require Object.freeze()
      expect(typeof TIERS.FREE).toBe('string');
      expect(typeof TIERS.STARTER).toBe('string');
      expect(typeof TIERS.PROFESSIONAL).toBe('string');
    });
  });

  /**
   * Test PER_SEAT_PRICE constant
   */
  describe('PER_SEAT_PRICE', () => {
    it('should be £10 per seat in pence', () => {
      expect(PER_SEAT_PRICE).toBe(1000); // £10 = 1000 pence
    });

    it('should be a number', () => {
      expect(typeof PER_SEAT_PRICE).toBe('number');
    });

    it('should be positive', () => {
      expect(PER_SEAT_PRICE).toBeGreaterThan(0);
    });
  });

  /**
   * Test TIER_CONFIG - FREE tier
   */
  describe('TIER_CONFIG.free', () => {
    it('should have correct name', () => {
      expect(TIER_CONFIG.free.name).toBe('Free');
    });

    it('should include exactly 1 seat', () => {
      expect(TIER_CONFIG.free.seats.included).toBe(1);
    });

    it('should have seat limits of 1', () => {
      expect(TIER_CONFIG.free.seats.min).toBe(1);
      expect(TIER_CONFIG.free.seats.max).toBe(1);
    });

    it('should be free (£0 monthly and annual)', () => {
      expect(TIER_CONFIG.free.price.monthly).toBe(0);
      expect(TIER_CONFIG.free.price.annual).toBe(0);
    });

    it('should include only basic features', () => {
      expect(TIER_CONFIG.free.features).toEqual(['features:basic']);
    });
  });

  /**
   * Test TIER_CONFIG - STARTER tier
   */
  describe('TIER_CONFIG.starter', () => {
    it('should have correct name', () => {
      expect(TIER_CONFIG.starter.name).toBe('Starter');
    });

    it('should include 5 seats', () => {
      expect(TIER_CONFIG.starter.seats.included).toBe(5);
    });

    it('should have seat limits of 5-19', () => {
      expect(TIER_CONFIG.starter.seats.min).toBe(5);
      expect(TIER_CONFIG.starter.seats.max).toBe(19);
    });

    it('should cost £50/month in pence', () => {
      expect(TIER_CONFIG.starter.price.monthly).toBe(5000); // £50 = 5000 pence
    });

    it('should cost £500/year in pence (2 months free)', () => {
      expect(TIER_CONFIG.starter.price.annual).toBe(50000); // £500 = 50000 pence
      // Verify 2 months free: annual should be 10x monthly
      expect(TIER_CONFIG.starter.price.annual).toBe(TIER_CONFIG.starter.price.monthly * 10);
    });

    it('should include starter features', () => {
      expect(TIER_CONFIG.starter.features).toContain('features:basic');
      expect(TIER_CONFIG.starter.features).toContain('features:analytics');
      expect(TIER_CONFIG.starter.features).toContain('features:api_limited');
      expect(TIER_CONFIG.starter.features).toContain('features:email_support');
    });
  });

  /**
   * Test TIER_CONFIG - PROFESSIONAL tier
   */
  describe('TIER_CONFIG.professional', () => {
    it('should have correct name', () => {
      expect(TIER_CONFIG.professional.name).toBe('Professional');
    });

    it('should include 20 seats', () => {
      expect(TIER_CONFIG.professional.seats.included).toBe(20);
    });

    it('should have seat limits of 20-40', () => {
      expect(TIER_CONFIG.professional.seats.min).toBe(20);
      expect(TIER_CONFIG.professional.seats.max).toBe(40);
    });

    it('should cost £250/month in pence', () => {
      expect(TIER_CONFIG.professional.price.monthly).toBe(25000); // £250 = 25000 pence
    });

    it('should cost £2500/year in pence (2 months free)', () => {
      expect(TIER_CONFIG.professional.price.annual).toBe(250000); // £2500 = 250000 pence
      // Verify 2 months free: annual should be 10x monthly
      expect(TIER_CONFIG.professional.price.annual).toBe(
        TIER_CONFIG.professional.price.monthly * 10
      );
    });

    it('should include all professional features', () => {
      expect(TIER_CONFIG.professional.features).toContain('features:basic');
      expect(TIER_CONFIG.professional.features).toContain('features:analytics');
      expect(TIER_CONFIG.professional.features).toContain('features:api_unlimited');
      expect(TIER_CONFIG.professional.features).toContain('features:priority_support');
      expect(TIER_CONFIG.professional.features).toContain('features:sla');
      expect(TIER_CONFIG.professional.features).toContain('features:advanced_reporting');
    });
  });

  /**
   * Test tier hierarchy and seat progression
   */
  describe('Tier Progression', () => {
    it('should have non-overlapping seat ranges', () => {
      // Free: 1-1
      // Starter: 5-19
      // Professional: 20-40
      expect(TIER_CONFIG.free.seats.max).toBeLessThan(TIER_CONFIG.starter.seats.min);
      expect(TIER_CONFIG.starter.seats.max).toBeLessThan(TIER_CONFIG.professional.seats.min);
    });

    it('should have increasing prices: free < starter < professional', () => {
      expect(TIER_CONFIG.free.price.monthly).toBe(0);
      expect(TIER_CONFIG.starter.price.monthly).toBeGreaterThan(TIER_CONFIG.free.price.monthly);
      expect(TIER_CONFIG.professional.price.monthly).toBeGreaterThan(
        TIER_CONFIG.starter.price.monthly
      );
    });

    it('should have increasing features: free ⊂ starter ⊂ professional', () => {
      // All tiers should have basic features
      expect(TIER_CONFIG.free.features).toContain('features:basic');
      expect(TIER_CONFIG.starter.features).toContain('features:basic');
      expect(TIER_CONFIG.professional.features).toContain('features:basic');

      // Starter should have more features than free
      expect(TIER_CONFIG.starter.features.length).toBeGreaterThan(
        TIER_CONFIG.free.features.length
      );

      // Professional should have more features than starter
      expect(TIER_CONFIG.professional.features.length).toBeGreaterThan(
        TIER_CONFIG.starter.features.length
      );
    });
  });

  /**
   * Test PERMISSIONS
   */
  describe('PERMISSIONS', () => {
    it('should define billing permissions', () => {
      expect(PERMISSIONS['billing:view']).toBeDefined();
      expect(PERMISSIONS['billing:manage']).toBeDefined();
    });

    it('should define seat management permissions', () => {
      expect(PERMISSIONS['seats:add']).toBeDefined();
      expect(PERMISSIONS['seats:remove']).toBeDefined();
    });

    it('should define user management permissions', () => {
      expect(PERMISSIONS['users:invite']).toBeDefined();
      expect(PERMISSIONS['users:manage']).toBeDefined();
      expect(PERMISSIONS['users:deactivate']).toBeDefined();
    });

    it('should define organization permissions', () => {
      expect(PERMISSIONS['org:transfer_ownership']).toBeDefined();
    });

    it('should define feature permissions', () => {
      expect(PERMISSIONS['features:analytics']).toBeDefined();
      expect(PERMISSIONS['features:api_limited']).toBeDefined();
      expect(PERMISSIONS['features:api_unlimited']).toBeDefined();
      expect(PERMISSIONS['features:priority_support']).toBeDefined();
    });

    it('should only allow owner to manage billing', () => {
      expect(PERMISSIONS['billing:manage']).toEqual(['owner']);
    });

    it('should allow owner and admin to view billing', () => {
      expect(PERMISSIONS['billing:view']).toEqual(['owner', 'admin']);
    });

    it('should only allow owner to transfer ownership', () => {
      expect(PERMISSIONS['org:transfer_ownership']).toEqual(['owner']);
    });
  });

  /**
   * Test hasPermission function
   */
  describe('hasPermission()', () => {
    it('should return true when role has permission', () => {
      expect(hasPermission('owner', 'billing:manage')).toBe(true);
      expect(hasPermission('owner', 'billing:view')).toBe(true);
      expect(hasPermission('admin', 'billing:view')).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      expect(hasPermission('admin', 'billing:manage')).toBe(false);
      expect(hasPermission('manager', 'billing:view')).toBe(false);
      expect(hasPermission('sales', 'billing:manage')).toBe(false);
      expect(hasPermission('team_member', 'billing:view')).toBe(false);
    });

    it('should return false for non-existent permissions', () => {
      expect(hasPermission('owner', 'non:existent')).toBe(false);
      expect(hasPermission('admin', 'fake:permission')).toBe(false);
    });

    it('should handle all roles for feature permissions', () => {
      expect(hasPermission('owner', 'features:analytics')).toBe(true);
      expect(hasPermission('admin', 'features:analytics')).toBe(true);
      expect(hasPermission('manager', 'features:analytics')).toBe(true);
      expect(hasPermission('sales', 'features:analytics')).toBe(true);
      expect(hasPermission('team_member', 'features:analytics')).toBe(false);
    });
  });

  /**
   * Test canAccessTier function
   */
  describe('canAccessTier()', () => {
    it('should allow free tier to access free features', () => {
      expect(canAccessTier('free', 'free')).toBe(true);
    });

    it('should not allow free tier to access starter features', () => {
      expect(canAccessTier('free', 'starter')).toBe(false);
    });

    it('should not allow free tier to access professional features', () => {
      expect(canAccessTier('free', 'professional')).toBe(false);
    });

    it('should allow starter tier to access free and starter features', () => {
      expect(canAccessTier('starter', 'free')).toBe(true);
      expect(canAccessTier('starter', 'starter')).toBe(true);
    });

    it('should not allow starter tier to access professional features', () => {
      expect(canAccessTier('starter', 'professional')).toBe(false);
    });

    it('should allow professional tier to access all features', () => {
      expect(canAccessTier('professional', 'free')).toBe(true);
      expect(canAccessTier('professional', 'starter')).toBe(true);
      expect(canAccessTier('professional', 'professional')).toBe(true);
    });

    it('should enforce tier hierarchy correctly', () => {
      // Test all combinations
      const tiers = ['free', 'starter', 'professional'] as const;

      for (let i = 0; i < tiers.length; i++) {
        for (let j = 0; j < tiers.length; j++) {
          const userTier = tiers[i];
          const requiredTier = tiers[j];
          const shouldHaveAccess = i >= j;

          expect(canAccessTier(userTier, requiredTier)).toBe(shouldHaveAccess);
        }
      }
    });
  });

  /**
   * Pricing calculation tests (CRITICAL for Phase 5)
   */
  describe('Pricing Calculations', () => {
    it('should calculate correct monthly price for 10 starter seats', () => {
      const basePriceMonthly = TIER_CONFIG.starter.price.monthly;
      const includedSeats = TIER_CONFIG.starter.seats.included;
      const totalSeats = 10;
      const additionalSeats = totalSeats - includedSeats; // 10 - 5 = 5

      const totalPrice = basePriceMonthly + additionalSeats * PER_SEAT_PRICE;
      expect(totalPrice).toBe(10000); // £50 + (5 * £10) = £100 = 10000 pence
    });

    it('should calculate correct monthly price for 30 professional seats', () => {
      const basePriceMonthly = TIER_CONFIG.professional.price.monthly;
      const includedSeats = TIER_CONFIG.professional.seats.included;
      const totalSeats = 30;
      const additionalSeats = totalSeats - includedSeats; // 30 - 20 = 10

      const totalPrice = basePriceMonthly + additionalSeats * PER_SEAT_PRICE;
      expect(totalPrice).toBe(35000); // £250 + (10 * £10) = £350 = 35000 pence
    });

    it('should not charge additional seats when at included limit', () => {
      const basePriceMonthly = TIER_CONFIG.starter.price.monthly;
      const includedSeats = TIER_CONFIG.starter.seats.included;
      const totalSeats = includedSeats; // exactly 5

      const additionalSeats = totalSeats - includedSeats;
      expect(additionalSeats).toBe(0);

      const totalPrice = basePriceMonthly + additionalSeats * PER_SEAT_PRICE;
      expect(totalPrice).toBe(5000); // £50 = 5000 pence
    });

    it('should calculate annual savings correctly', () => {
      // Starter: annual = 10x monthly (2 months free)
      const starterMonthlyCost = TIER_CONFIG.starter.price.monthly * 12;
      const starterAnnualCost = TIER_CONFIG.starter.price.annual;
      const starterSavings = starterMonthlyCost - starterAnnualCost;
      expect(starterSavings).toBe(TIER_CONFIG.starter.price.monthly * 2); // 2 months free

      // Professional: annual = 10x monthly (2 months free)
      const proPonthlyCost = TIER_CONFIG.professional.price.monthly * 12;
      const proAnnualCost = TIER_CONFIG.professional.price.annual;
      const proSavings = proPonthlyCost - proAnnualCost;
      expect(proSavings).toBe(TIER_CONFIG.professional.price.monthly * 2); // 2 months free
    });
  });
});
