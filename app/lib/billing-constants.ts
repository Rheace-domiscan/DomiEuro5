/**
 * Billing Constants
 *
 * This file contains all billing configuration constants including
 * tier definitions, pricing, seat limits, and role permissions.
 */

import type { TierConfigMap, PermissionMap, UserRole, SubscriptionTier } from '~/types/billing';

/**
 * Role constants
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  TEAM_MEMBER: 'team_member',
} as const;

/**
 * Tier constants
 */
export const TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
} as const;

/**
 * Per-seat pricing (additional seats beyond included)
 * £10/seat/month in pence
 */
export const PER_SEAT_PRICE = 1000; // £10 in pence

/**
 * Tier configuration with pricing and limits
 *
 * Pricing is in pence (£1 = 100 pence)
 * - Free: 1 seat, £0
 * - Starter: 5-19 seats, £50/mo or £500/year
 * - Professional: 20-40 seats, £250/mo or £2500/year
 *
 * Additional seats: £10/seat/month for all paid tiers
 */
export const TIER_CONFIG: TierConfigMap = {
  free: {
    name: 'Free',
    seats: {
      included: 1,
      min: 1,
      max: 1,
    },
    price: {
      monthly: 0,
      annual: 0,
    },
    features: ['features:basic'],
  },
  starter: {
    name: 'Starter',
    seats: {
      included: 5,
      min: 5,
      max: 19,
    },
    price: {
      monthly: 5000, // £50 in pence
      annual: 50000, // £500 in pence (2 months free: 10 * £50)
    },
    features: [
      'features:basic',
      'features:analytics',
      'features:api_limited',
      'features:email_support',
    ],
  },
  professional: {
    name: 'Professional',
    seats: {
      included: 20,
      min: 20,
      max: 40,
    },
    price: {
      monthly: 25000, // £250 in pence
      annual: 250000, // £2500 in pence (2 months free: 10 * £250)
    },
    features: [
      'features:basic',
      'features:analytics',
      'features:api_unlimited',
      'features:priority_support',
      'features:sla',
      'features:advanced_reporting',
    ],
  },
};

/**
 * Permission definitions by role
 *
 * This maps permissions to the roles that have them.
 * Used for role-based access control throughout the application.
 */
export const PERMISSIONS: PermissionMap = {
  // Billing permissions
  'billing:view': ['owner', 'admin'],
  'billing:manage': ['owner'],

  // Seat management
  'seats:add': ['owner', 'admin'],
  'seats:remove': ['owner'],

  // User management
  'users:invite': ['owner', 'admin'],
  'users:manage': ['owner', 'admin'],
  'users:deactivate': ['owner', 'admin'],

  // Organization management
  'org:transfer_ownership': ['owner'],

  // Feature access by tier
  'features:analytics': ['owner', 'admin', 'manager', 'sales'],
  'features:api_limited': ['owner', 'admin', 'manager', 'sales'],
  'features:api_unlimited': ['owner', 'admin', 'manager', 'sales'],
  'features:priority_support': ['owner', 'admin'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission as keyof PermissionMap];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

/**
 * Check if a role can access a specific tier
 */
export function canAccessTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    starter: 1,
    professional: 2,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  return TIER_CONFIG[tier].name;
}

/**
 * Get tier price in pounds
 */
export function getTierPrice(tier: SubscriptionTier, interval: 'monthly' | 'annual'): number {
  return TIER_CONFIG[tier].price[interval] / 100; // Convert pence to pounds
}

/**
 * Calculate total cost for a subscription
 */
export function calculateSubscriptionCost(
  tier: SubscriptionTier,
  interval: 'monthly' | 'annual',
  totalSeats: number
): number {
  if (tier === 'free') return 0;

  const config = TIER_CONFIG[tier];
  const basePrice = config.price[interval];
  const includedSeats = config.seats.included;
  const additionalSeats = Math.max(0, totalSeats - includedSeats);

  // Calculate additional seat cost
  // For annual billing, multiply monthly seat price by 10 (2 months free)
  const additionalSeatCost = additionalSeats * PER_SEAT_PRICE * (interval === 'annual' ? 10 : 1);

  return basePrice + additionalSeatCost;
}

/**
 * Format price for display
 */
export function formatPrice(priceInPence: number, showPence = false): string {
  const pounds = Math.floor(priceInPence / 100);
  const pence = priceInPence % 100;

  if (showPence || pence > 0) {
    return `£${pounds}.${pence.toString().padStart(2, '0')}`;
  }

  return `£${pounds}`;
}

/**
 * Grace period duration in days
 */
export const GRACE_PERIOD_DAYS = 28;

/**
 * Grace period duration in milliseconds
 */
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Billing interval display names
 */
export const BILLING_INTERVAL_DISPLAY = {
  monthly: 'Monthly',
  annual: 'Annual',
} as const;

/**
 * Status display names and colors
 */
export const STATUS_DISPLAY = {
  active: { label: 'Active', color: 'green' },
  canceled: { label: 'Canceled', color: 'red' },
  past_due: { label: 'Past Due', color: 'yellow' },
  trialing: { label: 'Trial', color: 'blue' },
  paused: { label: 'Paused', color: 'gray' },
  incomplete: { label: 'Incomplete', color: 'yellow' },
  incomplete_expired: { label: 'Expired', color: 'red' },
} as const;

/**
 * Access status display names
 */
export const ACCESS_STATUS_DISPLAY = {
  active: { label: 'Active', color: 'green' },
  grace_period: { label: 'Grace Period', color: 'yellow' },
  locked: { label: 'Locked', color: 'red' },
  read_only: { label: 'Read Only', color: 'orange' },
} as const;
