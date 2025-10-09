#!/usr/bin/env tsx

/* eslint-disable no-console */

import type { FunctionReference } from 'convex/server';
import { ConvexHttpClient } from 'convex/browser';
import { internal } from '../convex/_generated/api';

const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  console.error(
    'CONVEX_URL is required to seed demo data. Run `npx convex dev` to obtain the URL.'
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

const now = Date.now();
const monthInMs = 30 * 24 * 60 * 60 * 1000;

const demoOrganizations = [
  {
    organizationId: 'org_demo_free',
    name: 'Northwind Trial LLC',
    tier: 'free',
    status: 'active',
    billingInterval: 'monthly',
    seatsIncluded: 1,
    seatsTotal: 1,
    seatsActive: 1,
    stripeCustomerId: 'cus_demo_free',
    stripeSubscriptionId: 'sub_demo_free',
    currentPeriodStart: now - 7 * 24 * 60 * 60 * 1000,
    currentPeriodEnd: now + 23 * 24 * 60 * 60 * 1000,
    members: [
      {
        email: 'owner@northwind.test',
        name: 'Morgan Owner',
        workosUserId: 'user_demo_northwind_owner',
        role: 'owner',
        isActive: true,
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
      },
    ],
    billingHistory: [
      {
        eventType: 'subscription_created',
        status: 'succeeded',
        description: 'Northwind Trial created Free plan',
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    organizationId: 'org_demo_starter',
    name: 'Acme Growth Co',
    tier: 'starter',
    status: 'active',
    billingInterval: 'monthly',
    seatsIncluded: 5,
    seatsTotal: 12,
    seatsActive: 9,
    stripeCustomerId: 'cus_demo_starter',
    stripeSubscriptionId: 'sub_demo_starter',
    currentPeriodStart: now - 5 * 24 * 60 * 60 * 1000,
    currentPeriodEnd: now + 25 * 24 * 60 * 60 * 1000,
    members: [
      {
        email: 'owner@acme.test',
        name: 'Alex Owner',
        workosUserId: 'user_demo_acme_owner',
        role: 'owner',
        isActive: true,
        createdAt: now - 120 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'admin@acme.test',
        name: 'Jamie Admin',
        workosUserId: 'user_demo_acme_admin',
        role: 'admin',
        isActive: true,
        createdAt: now - 110 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'manager@acme.test',
        name: 'Riley Manager',
        workosUserId: 'user_demo_acme_manager',
        role: 'manager',
        isActive: true,
        createdAt: now - 90 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'sales@acme.test',
        name: 'Jordan Sales',
        workosUserId: 'user_demo_acme_sales',
        role: 'sales',
        isActive: true,
        createdAt: now - 80 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member1@acme.test',
        name: 'Taylor Member',
        workosUserId: 'user_demo_acme_member1',
        role: 'team_member',
        isActive: true,
        createdAt: now - 70 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member2@acme.test',
        name: 'Casey Member',
        workosUserId: 'user_demo_acme_member2',
        role: 'team_member',
        isActive: true,
        createdAt: now - 65 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member3@acme.test',
        name: 'Alexis Member',
        workosUserId: 'user_demo_acme_member3',
        role: 'team_member',
        isActive: true,
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member4@acme.test',
        name: 'Skyler Member',
        workosUserId: 'user_demo_acme_member4',
        role: 'team_member',
        isActive: true,
        createdAt: now - 55 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'inactive@acme.test',
        name: 'Inactive Member',
        workosUserId: 'user_demo_acme_inactive',
        role: 'team_member',
        isActive: false,
        createdAt: now - 50 * 24 * 60 * 60 * 1000,
      },
    ],
    billingHistory: [
      {
        eventType: 'invoice.payment_succeeded',
        status: 'succeeded',
        amount: 10000,
        currency: 'gbp',
        description: 'Starter plan payment',
        createdAt: now - monthInMs,
      },
      {
        eventType: 'invoice.payment_succeeded',
        status: 'succeeded',
        amount: 12000,
        currency: 'gbp',
        description: 'Starter plan with extra seats',
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
      },
    ],
    auditLog: [
      {
        action: 'users:invite',
        targetType: 'user',
        targetId: 'user_demo_acme_member4',
        userId: 'user_demo_acme_admin',
        metadata: { email: 'member4@acme.test' },
        createdAt: now - 55 * 24 * 60 * 60 * 1000,
      },
      {
        action: 'billing:seat_added',
        targetType: 'subscription',
        targetId: 'sub_demo_starter',
        userId: 'user_demo_acme_owner',
        metadata: { seatsChanged: 2 },
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    organizationId: 'org_demo_professional',
    name: 'Globex Enterprises',
    tier: 'professional',
    status: 'past_due',
    billingInterval: 'annual',
    seatsIncluded: 20,
    seatsTotal: 26,
    seatsActive: 22,
    stripeCustomerId: 'cus_demo_professional',
    stripeSubscriptionId: 'sub_demo_professional',
    currentPeriodStart: now - 200 * 24 * 60 * 60 * 1000,
    currentPeriodEnd: now - 5 * 24 * 60 * 60 * 1000,
    members: [
      {
        email: 'owner@globex.test',
        name: 'Quinn Owner',
        workosUserId: 'user_demo_globex_owner',
        role: 'owner',
        isActive: true,
        createdAt: now - 400 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'admin@globex.test',
        name: 'Blair Admin',
        workosUserId: 'user_demo_globex_admin',
        role: 'admin',
        isActive: true,
        createdAt: now - 300 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'finance@globex.test',
        name: 'River Finance',
        workosUserId: 'user_demo_globex_finance',
        role: 'manager',
        isActive: true,
        createdAt: now - 200 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'it@globex.test',
        name: 'Harper IT',
        workosUserId: 'user_demo_globex_it',
        role: 'manager',
        isActive: true,
        createdAt: now - 190 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'saleslead@globex.test',
        name: 'Rowan Sales Lead',
        workosUserId: 'user_demo_globex_saleslead',
        role: 'sales',
        isActive: true,
        createdAt: now - 180 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member@globex.test',
        name: 'Sawyer Member',
        workosUserId: 'user_demo_globex_member',
        role: 'team_member',
        isActive: true,
        createdAt: now - 160 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'member2@globex.test',
        name: 'Dakota Member',
        workosUserId: 'user_demo_globex_member2',
        role: 'team_member',
        isActive: true,
        createdAt: now - 150 * 24 * 60 * 60 * 1000,
      },
      {
        email: 'former@globex.test',
        name: 'Former Member',
        workosUserId: 'user_demo_globex_former',
        role: 'team_member',
        isActive: false,
        createdAt: now - 140 * 24 * 60 * 60 * 1000,
      },
    ],
    billingHistory: [
      {
        eventType: 'invoice.payment_failed',
        status: 'failed',
        description: 'Annual payment failed',
        amount: 250000,
        currency: 'gbp',
        createdAt: now - 12 * 24 * 60 * 60 * 1000,
      },
      {
        eventType: 'invoice.payment_failed',
        status: 'failed',
        description: 'Retry attempt declined',
        amount: 250000,
        currency: 'gbp',
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
      },
    ],
    auditLog: [
      {
        action: 'billing:payment_failed',
        targetType: 'subscription',
        targetId: 'sub_demo_professional',
        metadata: { attempts: 2 },
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
      },
    ],
  },
];

async function main() {
  try {
    const seedDemoMutation = internal.demoSeed
      .seedDemoData as unknown as FunctionReference<'mutation'>;

    const result = (await client.mutation(seedDemoMutation, {
      organizations: demoOrganizations,
      reset: true,
    })) as Array<{ organizationId: string; usersCreated: number }>;

    console.log('Demo data seeded successfully:\n');
    result.forEach(entry => {
      console.log(` • ${entry.organizationId} (${entry.usersCreated} active users)`);
    });
  } catch (error) {
    console.error('Failed to seed demo data');
    console.error(error);
    process.exit(1);
  }
}

await main();
