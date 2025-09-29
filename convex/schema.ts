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
  })
    .index('by_email', ['email'])
    .index('by_workos_user_id', ['workosUserId'])
    .index('by_organization', ['organizationId'])
    .index('by_created_at', ['createdAt']),
});
