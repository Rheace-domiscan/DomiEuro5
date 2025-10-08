# Convex Database Setup - DomiEuro

## Overview

This project now includes a fully configured Convex database with a `users` table that integrates with WorkOS authentication.

## Database Schema

### Users Table

- **email**: string — user’s email address (`by_email` index)
- **name**: string — user’s display name
- **createdAt**: number — Unix timestamp for creation (`by_created_at` index)
- **updatedAt**: number — Unix timestamp for last update
- **isActive**: boolean — soft-delete flag used for deactivation flows
- **workosUserId**: string — WorkOS user identifier (`by_workos_user_id` index, required)
- **organizationId**: string — WorkOS organization identifier (`by_organization` index, required)
- **role**: string | undefined — WorkOS role slug synced at login (owner, admin, manager, sales, team_member)

### Subscriptions Table (Billing System)

- **organizationId**: string — owning organization (`by_organization` index)
- **stripeCustomerId**: string — Stripe customer reference (`by_stripe_customer` index)
- **stripeSubscriptionId**: string — Stripe subscription reference (`by_stripe_subscription` index)
- **tier**: string — current tier slug (`free`, `starter`, `professional`)
- **status**: string — Stripe subscription status (`active`, `canceled`, `past_due`, etc.)
- **billingInterval**: string — `monthly` or `annual`
- **seatsIncluded**: number — seats bundled in the tier
- **seatsTotal**: number — total seats purchased (included + add-ons)
- **seatsActive**: number — active seats currently in use
- **currentPeriodStart** / **currentPeriodEnd**: number — Unix timestamps for the billing cycle
- **cancelAtPeriodEnd**: boolean — downgrade scheduled when the term ends
- **accessStatus**: string — internal access gate (`active`, `grace_period`, `locked`, `read_only`, `by_access_status` index)
- **gracePeriodStartedAt** / **gracePeriodEndsAt**: number | undefined — timestamps that frame the 28-day grace window
- **pendingDowngrade**: object | undefined — `{ tier, effectiveDate }` payload applied when downgrades schedule
- **upgradedFrom**: string | undefined — previous tier slug
- **upgradedAt**: number | undefined — Unix timestamp for the upgrade moment
- **upgradeTriggerFeature**: string | undefined — feature flag that prompted the upgrade
- **conversionTracking**: object | undefined — `{ freeTierCreatedAt, upgradedAt, triggerFeature?, daysOnFreeTier }`
- **createdAt** / **updatedAt**: number — bookkeeping timestamps (`by_status` index on status)

### BillingHistory Table

- **organizationId**: string — owning organization (`by_organization` index)
- **subscriptionId**: string — reference to `subscriptions` (`by_subscription` index)
- **eventType**: string — normalized event name (`subscription.created`, `invoice.payment_failed`, etc.)
- **stripeEventId**: string — Stripe webhook identifier used for idempotency (`by_stripe_event_id` index)
- **amount**: number | undefined — amount in pence for monetary events
- **currency**: string | undefined — ISO currency code (e.g., `gbp`)
- **status**: string — status of the event (`succeeded`, `failed`, `pending`)
- **description**: string — human-readable summary
- **metadata**: JSON | undefined — arbitrary extra data saved for audits
- **createdAt**: number — Unix timestamp (`by_created_at` index)

### AuditLog Table

- **organizationId**: string — owning organization (`by_organization` index)
- **userId**: string | undefined — actor who triggered the event (`by_user` index)
- **action**: string — event type (`subscription.upgraded`, `role.changed`, etc., `by_action` index)
- **targetType**: string — entity type being mutated (`user`, `subscription`, `organization`)
- **targetId**: string — identifier for the target entity (`by_target` composite index)
- **changes**: JSON | undefined — before/after payload for audits
- **metadata**: JSON | undefined — contextual data (reason, seat counts, etc.)
- **ipAddress** / **userAgent**: string | undefined — captured client context when available
- **createdAt**: number — Unix timestamp (`by_created_at` index)

## Available Functions

### User Queries

- `getAllUsers()` - Get all users
- `getUserByEmail(email)` - Get user by email address
- `getUserByWorkosId(workosUserId)` - Get user by WorkOS ID
- `getUsersByOrganization(organizationId)` - Get users in an organization
- `getUserRole(userId, organizationId)` - Get user's role in organization

### User Mutations

- `createUser({ email, name, workosUserId, organizationId, role })` - Create new user (workosUserId and organizationId are REQUIRED)
- `updateUser({ id, name?, email?, isActive?, role? })` - Update user
- `updateUserRole({ userId, organizationId, role })` - Update user's role
- `deactivateUser({ id })` - Deactivate user (soft delete)
- `reactivateUser({ id })` - Reactivate deactivated user

**Note**: When creating users, both `workosUserId` and `organizationId` are required fields. The authentication flow automatically handles user creation after successful WorkOS authentication.

### Subscription Queries (Billing)

- `getSubscription(organizationId)` - Get organization's subscription
- `getSubscriptionsByTier(tier)` - Get all subscriptions of a specific tier
- `getSubscriptionsInGracePeriod()` - Get subscriptions in grace period
- `getSubscriptionMetrics()` - Get subscription analytics (MRR, churn, etc.)

### Subscription Mutations (Billing)

- `createSubscription({ organizationId, tier, ... })` - Create new subscription
- `updateSubscription({ organizationId, tier?, seats?, ... })` - Update subscription
- `syncStripeSubscription({ organizationId, stripeData })` - Sync from Stripe webhook
- `startGracePeriod({ organizationId })` - Start 28-day grace period
- `endGracePeriod({ organizationId })` - End grace period (payment succeeded)
- `lockSubscription({ organizationId })` - Lock account after grace period expires

### Billing History Queries

- `getBillingHistory(organizationId)` - Get all billing events for organization
- `getBillingHistoryByDateRange(organizationId, startDate, endDate)` - Get events in date range
- `getInvoiceHistory(organizationId)` - Get paid invoices only

### Billing History Mutations

- `logBillingEvent({ organizationId, eventType, amount, ... })` - Log billing event
- `logStripeWebhook({ organizationId, eventType, stripeData })` - Log webhook event

### Audit Log Queries

- `getAuditLog(organizationId)` - Get all audit events for organization
- `getAuditLogByUser(userId)` - Get events performed by user
- `getAuditLogByType(eventType)` - Get events of specific type (e.g., ownership.transferred)

### Audit Log Mutations

- `logAuditEvent({ organizationId, eventType, performedBy, metadata })` - Log audit event

## Setup Steps

1. **Environment Variables**

   ```bash
   cp .env.example .env
   ```

   Add your Convex deployment URL to `.env` (you'll get this URL in the next step):

   ```
   CONVEX_URL=https://your-deployment.convex.cloud
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   ```

2. **Initialize Convex Development Environment**

   ```bash
   npx convex dev
   ```

   This will:
   - Create a new Convex deployment (if you don't have one)
   - Provide you with the deployment URL to add to your `.env` file
   - Generate TypeScript types in `convex/_generated/`
   - Watch for changes and automatically deploy updates

3. **Run Type Generation** (if needed)
   After schema changes, regenerate types:
   ```bash
   npx convex codegen
   ```

## Usage in Your Application

1. **Wrap Your App with ConvexProvider**

   ```tsx
   import { ConvexClientProvider } from './lib/ConvexProvider';

   function App() {
     return <ConvexClientProvider>{/* Your app components */}</ConvexClientProvider>;
   }
   ```

2. **Use the Database Hooks**

   ```tsx
   import { useGetAllUsers, useCreateUser } from './lib/useConvex';

   function MyComponent() {
     const users = useGetAllUsers();
     const createUser = useCreateUser();

     const handleCreate = () => {
       // Note: workosUserId and organizationId are REQUIRED
       createUser({
         email: 'user@example.com',
         name: 'New User',
         workosUserId: 'user_123', // From WorkOS authentication
         organizationId: 'org_456', // From WorkOS authentication
       });
     };

     return (
       <div>
         {users?.map(user => (
           <div key={user._id}>{user.name}</div>
         ))}
       </div>
     );
   }
   ```

## Files Created

- `convex.json` - Convex configuration
- `convex/schema.ts` - Database schema definition
- `convex/users.ts` - User CRUD operations
- `lib/convex.ts` - Convex client setup
- `lib/ConvexProvider.tsx` - React provider component
- `lib/useConvex.ts` - Custom hooks for database operations
- `components/UsersDemo.tsx` - Demo component for testing

## Type Safety

All database operations are fully type-safe with TypeScript. The Convex CLI automatically generates types based on your schema and functions.

## Generated Files & Version Control

The `convex/_generated/` directory contains TypeScript types auto-generated by Convex:

- **Should you commit it?** It's recommended to add `convex/_generated/` to `.gitignore` and regenerate types after cloning
- **When are types generated?** Automatically when running `npx convex dev` or manually with `npx convex codegen`
- **What if types are missing?** Run `npx convex codegen` to regenerate them

## Important Notes

### User Management

- The authentication flow automatically creates users in Convex after successful WorkOS authentication
- Both `workosUserId` and `organizationId` are required fields - you cannot create users without these
- User creation happens server-side in the auth callback route (`app/routes/auth/callback.tsx`)
- Manual user creation should only be done through the authentication flow, not directly through mutations
- User roles are synced from WorkOS RBAC - manage roles in WorkOS Dashboard (see `WORKOS_RBAC_SETUP.md`)

### Billing System

- The `subscriptions`, `billingHistory`, and `auditLog` tables are part of the billing system
- Subscriptions are synced from Stripe via webhooks - don't manually edit subscription data
- Billing history is append-only for audit compliance - events are never deleted
- Audit logs track all sensitive actions (ownership transfers, role changes, etc.)
- See `BILLING_GUIDE.md` for system architecture and `BILLING_ROADMAP.md` for implementation

### Schema Implementation

To implement the billing schema:

1. Follow the step-by-step guide in `BILLING_ROADMAP.md` (Phase 1)
2. The schema will be created during implementation
3. Schema changes require running `npx convex deploy` to apply
4. Types will auto-regenerate after schema deployment
