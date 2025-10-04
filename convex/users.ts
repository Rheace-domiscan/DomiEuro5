import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';

async function countActiveUsers(ctx: MutationCtx, organizationId: string) {
  const activeUsers = await ctx.db
    .query('users')
    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
    .filter(q => q.eq(q.field('isActive'), true))
    .collect();

  return activeUsers.length;
}

async function recalculateSeatsActive(ctx: MutationCtx, organizationId: string) {
  const seatsActive = await countActiveUsers(ctx, organizationId);

  const subscription = await ctx.db
    .query('subscriptions')
    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
    .first();

  if (subscription) {
    await ctx.db.patch(subscription._id, {
      seatsActive,
      updatedAt: Date.now(),
    });
  }

  return {
    seatsActive,
    subscriptionId: subscription?._id ?? null,
  };
}

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    workosUserId: v.string(), // Required
    organizationId: v.string(), // Required
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      workosUserId: args.workosUserId,
      organizationId: args.organizationId,
    });
  },
});

export const getUser = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email))
      .first();
  },
});

// Get user by WorkOS ID
export const getUserByWorkosId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', q => q.eq('workosUserId', args.workosUserId))
      .first();
  },
});

// Get all users
export const getAllUsers = query({
  handler: async ctx => {
    return await ctx.db.query('users').collect();
  },
});

// Update user
export const updateUser = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Soft deactivate user (keeps record for seat history)
export const deactivateUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      const seatsActive = await countActiveUsers(ctx, user.organizationId);
      return {
        status: 'noop',
        seatsActive,
        organizationId: user.organizationId,
      };
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    const { seatsActive } = await recalculateSeatsActive(ctx, user.organizationId);

    return {
      status: 'deactivated',
      seatsActive,
      organizationId: user.organizationId,
    };
  },
});

export const reactivateUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isActive) {
      const seatsActive = await countActiveUsers(ctx, user.organizationId);
      return {
        status: 'noop',
        seatsActive,
        organizationId: user.organizationId,
      };
    }

    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: Date.now(),
    });

    const { seatsActive } = await recalculateSeatsActive(ctx, user.organizationId);

    return {
      status: 'reactivated',
      seatsActive,
      organizationId: user.organizationId,
    };
  },
});

// Get users by organization
export const getUsersByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

export const getTeamMembers = query({
  args: {
    organizationId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeInactive = args.includeInactive ?? true;

    const members = await ctx.db
      .query('users')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .collect();

    const filtered = includeInactive ? members : members.filter(member => member.isActive);

    return filtered.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get user role by WorkOS ID
export const getUserRole = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', q => q.eq('workosUserId', args.workosUserId))
      .first();

    return user?.role || 'member'; // Default to member (WorkOS default role slug)
  },
});

// Update user role
export const updateUserRole = mutation({
  args: {
    workosUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', q => q.eq('workosUserId', args.workosUserId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    return await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});
