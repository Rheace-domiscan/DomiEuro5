/**
 * Convex Audit Log Functions
 *
 * Provides utilities to record key billing and organization events.
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const create = mutation({
  args: {
    organizationId: v.string(),
    userId: v.optional(v.string()),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    changes: v.optional(v.any()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('auditLog', {
      organizationId: args.organizationId,
      userId: args.userId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      changes: args.changes,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

export const getRecentByOrganization = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query('auditLog')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .order('desc')
      .take(limit);
  },
});
