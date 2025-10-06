import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
    // WorkOS integration fields
    workosUserId: v.string(), // Required - every user must have a WorkOS ID
    organizationId: v.string(), // Required - every user must belong to an organization
    // Role field for RBAC
    role: v.optional(v.string()), // Role: 'owner', 'admin', 'manager', 'sales', 'team_member'
  })
    .index('by_email', ['email'])
    .index('by_workos_user_id', ['workosUserId'])
    .index('by_organization', ['organizationId'])
    .index('by_created_at', ['createdAt']),

  subscriptions: defineTable({
    organizationId: v.string(), // Links to organization
    stripeCustomerId: v.string(), // Stripe customer ID
    stripeSubscriptionId: v.string(), // Stripe subscription ID
    tier: v.string(), // 'free', 'starter', 'professional'
    status: v.string(), // 'active', 'canceled', 'past_due', 'trialing', 'paused'
    billingInterval: v.string(), // 'monthly' or 'annual'
    seatsIncluded: v.number(), // Base seats included in plan
    seatsTotal: v.number(), // Total seats (included + additional)
    seatsActive: v.number(), // Current active users
    currentPeriodStart: v.number(), // Unix timestamp
    currentPeriodEnd: v.number(), // Unix timestamp
    cancelAtPeriodEnd: v.boolean(), // True if scheduled for cancellation
    // Grace period tracking
    accessStatus: v.string(), // 'active', 'grace_period', 'locked', 'read_only'
    gracePeriodStartedAt: v.optional(v.number()), // Unix timestamp when grace period started
    gracePeriodEndsAt: v.optional(v.number()), // Unix timestamp when grace period ends
    // Pending changes
    pendingDowngrade: v.optional(
      v.object({
        tier: v.string(),
        effectiveDate: v.number(),
      })
    ),
    // Conversion tracking
    upgradedFrom: v.optional(v.string()), // Previous tier
    upgradedAt: v.optional(v.number()), // Unix timestamp
    upgradeTriggerFeature: v.optional(v.string()), // Which feature triggered upgrade
    conversionTracking: v.optional(
      v.object({
        freeTierCreatedAt: v.number(),
        upgradedAt: v.number(),
        triggerFeature: v.optional(v.string()),
        daysOnFreeTier: v.number(),
      })
    ),
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_stripe_customer', ['stripeCustomerId'])
    .index('by_stripe_subscription', ['stripeSubscriptionId'])
    .index('by_status', ['status'])
    .index('by_access_status', ['accessStatus']),

  billingHistory: defineTable({
    organizationId: v.string(),
    subscriptionId: v.string(), // Reference to subscriptions table
    eventType: v.string(), // 'subscription_created', 'payment_succeeded', 'payment_failed', etc.
    stripeEventId: v.string(), // Stripe webhook event ID for idempotency
    amount: v.optional(v.number()), // Amount in pence (for payment events)
    currency: v.optional(v.string()), // Currency code (e.g., 'gbp')
    status: v.string(), // 'succeeded', 'failed', 'pending'
    description: v.string(), // Human-readable description
    metadata: v.optional(v.any()), // Additional event data as JSON
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_organization', ['organizationId'])
    .index('by_subscription', ['subscriptionId'])
    .index('by_event_type', ['eventType'])
    .index('by_stripe_event_id', ['stripeEventId'])
    .index('by_created_at', ['createdAt']),

  auditLog: defineTable({
    organizationId: v.string(),
    userId: v.optional(v.string()), // User who performed action (optional for system actions)
    action: v.string(), // 'user_invited', 'role_changed', 'subscription_upgraded', etc.
    targetType: v.string(), // 'user', 'subscription', 'organization'
    targetId: v.string(), // ID of the affected entity
    changes: v.optional(v.any()), // Object with before/after values
    metadata: v.optional(v.any()), // Additional context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_action', ['action'])
    .index('by_target', ['targetType', 'targetId'])
    .index('by_created_at', ['createdAt']),
});
