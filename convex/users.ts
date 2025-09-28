import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    workosUserId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("users", {
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

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by WorkOS ID
export const getUserByWorkosId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", args.workosUserId))
      .first();
  },
});

// Get all users
export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Update user
export const updateUser = mutation({
  args: {
    id: v.id("users"),
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

// Delete user (soft delete by setting isActive to false)
export const deactivateUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Get users by organization
export const getUsersByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});