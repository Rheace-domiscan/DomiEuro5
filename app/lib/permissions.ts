/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * This file defines the 5 user roles and their associated permissions.
 * Roles are managed in WorkOS Dashboard and synced to Convex on login.
 *
 * Role Hierarchy (highest to lowest):
 * - Owner: Full access to everything including billing and ownership transfer
 * - Admin: Can manage users and view billing, but cannot manage billing or transfer ownership
 * - Manager: Full product access, cannot manage users or billing
 * - Sales: Access to sales-specific features only
 * - Team Member: Basic product access only
 */

/**
 * Available user roles
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  TEAM_MEMBER: 'member', // WorkOS uses 'member' as the slug, not 'team_member'
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Subscription tiers
 */
export const TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

/**
 * Permission definitions
 * Maps permissions to roles that have access
 */
export const PERMISSIONS: Record<string, Role[]> = {
  // Billing permissions
  'billing:view': [ROLES.OWNER, ROLES.ADMIN],
  'billing:manage': [ROLES.OWNER],

  // Seat management
  'seats:add': [ROLES.OWNER, ROLES.ADMIN],
  'seats:view': [ROLES.OWNER, ROLES.ADMIN],

  // User management
  'users:invite': [ROLES.OWNER, ROLES.ADMIN],
  'users:manage': [ROLES.OWNER, ROLES.ADMIN],
  'users:view': [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

  // Organization management
  'org:transfer_ownership': [ROLES.OWNER],
  'org:manage': [ROLES.OWNER],

  // Feature access (tier-based)
  'features:basic': [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.TEAM_MEMBER],
  'features:analytics': [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  'features:api_limited': [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  'features:api_unlimited': [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  'features:priority_support': [ROLES.OWNER, ROLES.ADMIN],
};

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 *
 * @param role - User's role
 * @param permission - Permission to check
 * @returns True if role has permission, false otherwise
 *
 * @example
 * ```typescript
 * if (hasPermission(user.role, 'billing:manage')) {
 *   // User can manage billing
 * }
 * ```
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[permission]?.includes(role as Role) ?? false;
}

/**
 * Check if a role is one of the allowed roles
 *
 * @param role - User's role
 * @param allowedRoles - Array of allowed roles
 * @returns True if role is in allowedRoles, false otherwise
 *
 * @example
 * ```typescript
 * if (hasRole(user.role, ['owner', 'admin'])) {
 *   // User is either owner or admin
 * }
 * ```
 */
export function hasRole(role: string | undefined, allowedRoles: Role[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role as Role);
}

/**
 * Check if a tier meets the minimum required tier
 *
 * @param currentTier - User's current tier
 * @param requiredTier - Minimum required tier
 * @returns True if currentTier >= requiredTier, false otherwise
 *
 * @example
 * ```typescript
 * if (hasTierAccess('professional', 'starter')) {
 *   // User has access (professional >= starter)
 * }
 * ```
 */
export function hasTierAccess(currentTier: string | undefined, requiredTier: Tier): boolean {
  if (!currentTier) return false;

  const tierHierarchy: Record<Tier, number> = {
    [TIERS.FREE]: 0,
    [TIERS.STARTER]: 1,
    [TIERS.PROFESSIONAL]: 2,
  };

  const currentTierLevel = tierHierarchy[currentTier as Tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (currentTierLevel === undefined || requiredTierLevel === undefined) {
    return false;
  }

  return currentTierLevel >= requiredTierLevel;
}

/**
 * Get human-readable role name
 *
 * @param role - Role constant
 * @returns Human-readable role name
 *
 * @example
 * ```typescript
 * getRoleName('team_member') // Returns "Team Member"
 * ```
 */
export function getRoleName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [ROLES.OWNER]: 'Owner',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.SALES]: 'Sales',
    [ROLES.TEAM_MEMBER]: 'Team Member',
  };

  return roleNames[role];
}

/**
 * Get human-readable tier name
 *
 * @param tier - Tier constant
 * @returns Human-readable tier name
 *
 * @example
 * ```typescript
 * getTierName('professional') // Returns "Professional"
 * ```
 */
export function getTierName(tier: Tier): string {
  const tierNames: Record<Tier, string> = {
    [TIERS.FREE]: 'Free',
    [TIERS.STARTER]: 'Starter',
    [TIERS.PROFESSIONAL]: 'Professional',
  };

  return tierNames[tier];
}
