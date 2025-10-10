import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const DEFAULT_TASKS = [
  { key: 'connect_domain', label: 'Connect your custom domain' },
  { key: 'invite_team', label: 'Invite your teammates' },
  { key: 'configure_billing', label: 'Configure billing & pricing' },
  { key: 'set_branding', label: 'Update brand theme and logos' },
] as const;

export const getProgress = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('onboardingProgress')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .first();

    const tasks =
      record?.tasks ??
      DEFAULT_TASKS.map(task => ({
        key: task.key,
        completed: false,
        completedAt: undefined,
      }));

    return {
      tasks,
      updatedAt: record?.updatedAt ?? null,
      checklist: DEFAULT_TASKS.map(task => ({
        key: task.key,
        label: task.label,
        completed: tasks.find(entry => entry.key === task.key)?.completed ?? false,
        completedAt: tasks.find(entry => entry.key === task.key)?.completedAt ?? null,
      })),
    };
  },
});

export const toggleTask = mutation({
  args: {
    organizationId: v.string(),
    key: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('onboardingProgress')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .first();

    const now = Date.now();

    const tasks = (
      record?.tasks ??
      DEFAULT_TASKS.map(task => ({
        key: task.key,
        completed: false,
        completedAt: undefined,
      }))
    ).map(task =>
      task.key === args.key
        ? {
            ...task,
            completed: args.completed,
            completedAt: args.completed ? now : undefined,
          }
        : task
    );

    if (record) {
      await ctx.db.patch(record._id, {
        tasks,
        updatedAt: now,
      });
      return record._id;
    }

    return await ctx.db.insert('onboardingProgress', {
      organizationId: args.organizationId,
      tasks,
      updatedAt: now,
    });
  },
});
