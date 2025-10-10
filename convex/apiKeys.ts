import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .collect();

    return keys.map(key => ({
      _id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
      lastUsedAt: key.lastUsedAt ?? null,
      revokedAt: key.revokedAt ?? null,
    }));
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    keyPrefix: v.string(),
    hashedKey: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert('apiKeys', {
      organizationId: args.organizationId,
      name: args.name,
      keyPrefix: args.keyPrefix,
      hashedKey: args.hashedKey,
      createdAt: now,
      createdBy: args.createdBy,
      lastUsedAt: undefined,
      revokedAt: undefined,
    });
  },
});

export const revoke = mutation({
  args: { apiKeyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.apiKeyId);
    if (!existing) {
      throw new Error('API key not found');
    }

    await ctx.db.patch(args.apiKeyId, {
      revokedAt: Date.now(),
    });

    return args.apiKeyId;
  },
});

export const markUsed = mutation({
  args: { keyPrefix: v.string() },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query('apiKeys')
      .withIndex('by_key_prefix', q => q.eq('keyPrefix', args.keyPrefix))
      .first();

    if (!key) {
      return null;
    }

    await ctx.db.patch(key._id, {
      lastUsedAt: Date.now(),
    });

    return key._id;
  },
});
