/**
 * Billing TypeScript Type Definitions
 *
 * This file contains all TypeScript types for the billing system,
 * providing type safety across the application.
 */

/**
 * Subscription tier types
 */
export type SubscriptionTier = 'free' | 'starter' | 'professional';

/**
 * Subscription status from Stripe
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'paused'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * Billing interval for subscriptions
 */
export type BillingInterval = 'monthly' | 'annual';

/**
 * Access status for organizations
 */
export type AccessStatus = 'active' | 'grace_period' | 'locked' | 'read_only';

/**
 * User roles in the system
 */
export type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'team_member';

/**
 * Subscription data structure
 */
export interface Subscription {
  _id: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  seatsIncluded: number;
  seatsTotal: number;
  seatsActive: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  accessStatus: AccessStatus;
  gracePeriodStartedAt?: number;
  gracePeriodEndsAt?: number;
  pendingDowngrade?: {
    tier: SubscriptionTier;
    effectiveDate: number;
  };
  upgradedFrom?: SubscriptionTier;
  upgradedAt?: number;
  upgradeTriggerFeature?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Billing history event types
 */
export type BillingEventType =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_created'
  | 'seats_added'
  | 'seats_removed'
  | 'tier_upgraded'
  | 'tier_downgraded';

/**
 * Billing history event
 */
export interface BillingHistoryEvent {
  _id: string;
  organizationId: string;
  subscriptionId: string;
  eventType: BillingEventType;
  stripeEventId: string;
  amount?: number;
  currency?: string;
  status: 'succeeded' | 'failed' | 'pending';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * Audit log action types
 */
export type AuditAction =
  | 'user_invited'
  | 'user_activated'
  | 'user_deactivated'
  | 'role_changed'
  | 'subscription_created'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_canceled'
  | 'seats_added'
  | 'seats_removed'
  | 'ownership_transferred'
  | 'billing_updated';

/**
 * Audit log target types
 */
export type AuditTargetType = 'user' | 'subscription' | 'organization';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  _id: string;
  organizationId: string;
  userId?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

/**
 * Tier configuration
 */
export interface TierConfig {
  name: string;
  seats: {
    included: number;
    min: number;
    max: number;
  };
  price: {
    monthly: number; // in pence
    annual: number; // in pence
  };
  features: string[];
}

/**
 * Tier configuration map
 */
export type TierConfigMap = Record<SubscriptionTier, TierConfig>;

/**
 * Stripe price IDs configuration
 */
export interface StripePriceIds {
  starterMonthly: string;
  starterAnnual: string;
  proMonthly: string;
  proAnnual: string;
  additionalSeat: string;
}

/**
 * Seat usage information
 */
export interface SeatUsage {
  included: number;
  total: number;
  active: number;
  available: number;
  isOverLimit: boolean;
  overage: number;
}

/**
 * Permission types for role-based access control
 */
export type Permission =
  | 'billing:view'
  | 'billing:manage'
  | 'seats:add'
  | 'seats:remove'
  | 'users:invite'
  | 'users:manage'
  | 'users:deactivate'
  | 'org:transfer_ownership'
  | 'features:analytics'
  | 'features:api_limited'
  | 'features:api_unlimited'
  | 'features:priority_support';

/**
 * Permission map by role
 */
export type PermissionMap = Record<Permission, UserRole[]>;
