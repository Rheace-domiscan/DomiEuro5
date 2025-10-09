import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

const billingHistoryShape = v.object({
  eventType: v.string(),
  status: v.string(),
  description: v.optional(v.string()),
  amount: v.optional(v.number()),
  currency: v.optional(v.string()),
  createdAt: v.optional(v.number()),
});

const auditLogShape = v.object({
  action: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  metadata: v.optional(v.any()),
  userId: v.optional(v.string()),
  createdAt: v.optional(v.number()),
});

const memberShape = v.object({
  email: v.string(),
  name: v.string(),
  workosUserId: v.string(),
  role: v.string(),
  isActive: v.boolean(),
  createdAt: v.optional(v.number()),
});

const organizationShape = v.object({
  organizationId: v.string(),
  name: v.string(),
  tier: v.string(),
  status: v.string(),
  billingInterval: v.string(),
  seatsIncluded: v.number(),
  seatsTotal: v.number(),
  seatsActive: v.number(),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  members: v.array(memberShape),
  billingHistory: v.optional(v.array(billingHistoryShape)),
  auditLog: v.optional(v.array(auditLogShape)),
});

export const seedDemoData = internalMutation({
  args: {
    organizations: v.array(organizationShape),
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const shouldReset = args.reset ?? true;
    const processed: Array<{ organizationId: string; usersCreated: number }> = [];

    for (const org of args.organizations) {
      if (shouldReset) {
        const users = await ctx.db
          .query('users')
          .withIndex('by_organization', q => q.eq('organizationId', org.organizationId))
          .collect();

        for (const user of users) {
          await ctx.db.delete(user._id);
        }

        const subscriptions = await ctx.db
          .query('subscriptions')
          .withIndex('by_organization', q => q.eq('organizationId', org.organizationId))
          .collect();

        for (const subscription of subscriptions) {
          await ctx.db.delete(subscription._id);
        }

        const historyEntries = await ctx.db
          .query('billingHistory')
          .withIndex('by_organization', q => q.eq('organizationId', org.organizationId))
          .collect();

        for (const entry of historyEntries) {
          await ctx.db.delete(entry._id);
        }

        const auditEntries = await ctx.db
          .query('auditLog')
          .withIndex('by_organization', q => q.eq('organizationId', org.organizationId))
          .collect();

        for (const entry of auditEntries) {
          await ctx.db.delete(entry._id);
        }
      }

      const now = Date.now();

      await ctx.db.insert('subscriptions', {
        organizationId: org.organizationId,
        stripeCustomerId: org.stripeCustomerId,
        stripeSubscriptionId: org.stripeSubscriptionId,
        tier: org.tier,
        status: org.status,
        billingInterval: org.billingInterval,
        seatsIncluded: org.seatsIncluded,
        seatsTotal: org.seatsTotal,
        seatsActive: org.seatsActive,
        currentPeriodStart: org.currentPeriodStart,
        currentPeriodEnd: org.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        accessStatus: org.status === 'past_due' ? 'grace_period' : 'active',
        upgradedFrom: undefined,
        upgradedAt: undefined,
        upgradeTriggerFeature: undefined,
        conversionTracking: undefined,
        createdAt: now,
        updatedAt: now,
      });

      let activeCount = 0;
      for (const member of org.members) {
        await ctx.db.insert('users', {
          email: member.email,
          name: member.name,
          organizationId: org.organizationId,
          workosUserId: member.workosUserId,
          createdAt: member.createdAt ?? now,
          updatedAt: member.createdAt ?? now,
          isActive: member.isActive,
          role: member.role,
        });

        if (member.isActive) {
          activeCount += 1;
        }
      }

      if (org.billingHistory) {
        for (const entry of org.billingHistory) {
          await ctx.db.insert('billingHistory', {
            organizationId: org.organizationId,
            subscriptionId: org.stripeSubscriptionId,
            eventType: entry.eventType,
            stripeEventId: `${org.stripeSubscriptionId}-${entry.eventType}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            amount: entry.amount,
            currency: entry.currency,
            status: entry.status,
            description: entry.description ?? '',
            metadata: undefined,
            createdAt: entry.createdAt ?? now,
          });
        }
      }

      if (org.auditLog) {
        for (const item of org.auditLog) {
          await ctx.db.insert('auditLog', {
            organizationId: org.organizationId,
            userId: item.userId,
            action: item.action,
            targetType: item.targetType,
            targetId: item.targetId,
            changes: undefined,
            metadata: item.metadata ?? undefined,
            ipAddress: undefined,
            userAgent: undefined,
            createdAt: item.createdAt ?? now,
          });
        }
      }

      processed.push({ organizationId: org.organizationId, usersCreated: activeCount });
    }

    return processed;
  },
});
