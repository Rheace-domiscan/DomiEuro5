import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
    // WorkOS integration fields
    workosUserId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_organization", ["organizationId"])
    .index("by_created_at", ["createdAt"]),
});