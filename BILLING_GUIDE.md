# Billing System Guide

This guide explains how the billing system works, its architecture, and key concepts for developers maintaining or customizing the template.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Tier System](#tier-system)
4. [Seat Management](#seat-management)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Subscription Lifecycle](#subscription-lifecycle)
7. [Downgrade Flow](#downgrade-flow)
8. [Grace Period & Failed Payments](#grace-period--failed-payments)
9. [Webhooks & Event Handling](#webhooks--event-handling)
10. [Data Flow](#data-flow)
11. [Edge Cases](#edge-cases)

---

## System Overview

The billing system provides a **complete multi-tier SaaS subscription model** with:

- **3 pricing tiers:** Free, Starter, Professional
- **Flexible seat-based pricing:** Base seats included + per-seat add-ons
- **Annual billing discount:** 2 months free (10x monthly)
- **5 user roles:** Owner, Admin, Manager, Sales, Team Member
- **Self-service billing:** Stripe Customer Portal
- **Graceful downgrades:** No blocking, warnings instead
- **Failed payment handling:** 28-day grace period
- **Central settings hub:** `/settings` surfaces billing, team, pricing, and ownership tools via the shared header dropdown

### Core Philosophy

**Stripe handles billing, your app handles users.**

- Subscriptions and payments live in Stripe (source of truth for billing)
- Users and permissions live in Convex (source of truth for access)
- Webhooks keep both systems in sync
- **Never block operations** - show warnings and let owners manage timing

---

## Architecture

### Tech Stack

```
┌─────────────────┐
│   React Router  │  Frontend + SSR
│    + React 19   │
└────────┬────────┘
         │
    ┌────▼────────┐
    │   Convex    │  Real-time database
    │  (Users,    │  (Subscriptions, billing history)
    │   Audit)    │
    └────────────┬┘
                 │
    ┌────────────▼┐
    │   WorkOS    │  Authentication + RBAC
    │   (Roles)   │  (5 custom roles)
    └─────────────┘
         │
    ┌────▼────────┐
    │   Stripe    │  Billing + payments
    │ (Customer   │  (Subscriptions, invoices)
    │  Portal)    │
    └─────────────┘
```

### Data Flow

```
User Action (e.g., Upgrade to Starter)
  ↓
React Router route handler
  ↓
Create Stripe Checkout Session
  ↓
Redirect to Stripe Checkout
  ↓
User completes payment
  ↓
Stripe fires webhook: checkout.session.completed
  ↓
Webhook handler verifies signature
  ↓
Creates/updates subscription in Convex
  ↓
Logs event in billingHistory
  ↓
User redirected back to app
  ↓
UI updates based on new tier (reactive Convex queries)
```

---

## Tier System

### Free Tier

- **Price:** £0/month
- **Seats:** 1 (cannot add more)
- **Features:** Basic product access only
- **Use case:** Trial, individual users, demos

**Limitations:**

- Cannot add seats (must upgrade to Starter)
- Limited feature access
- No billing dashboard access

### Starter Tier

- **Price:** £50/month or £500/year
- **Included seats:** 5
- **Additional seats:** £10/seat/month (up to 19 total)
- **Max seats:** 19
- **Features:** Analytics, limited API access, basic features

**Upgrade path:**

- Need more than 19 seats? → Upgrade to Professional

### Professional Tier

- **Price:** £250/month or £2,500/year
- **Included seats:** 20
- **Additional seats:** £10/seat/month (up to 40 total)
- **Max seats:** 40
- **Features:** All features, unlimited API, priority support

**Upgrade path:**

- Need more than 40 seats? → Contact sales for Enterprise

### Configuration

All tier settings defined in `app/lib/billing-constants.ts`:

```typescript
export const TIER_CONFIG = {
  free: {
    name: 'Free',
    seats: { included: 1, min: 1, max: 1 },
    price: { monthly: 0, annual: 0 },
    features: ['features:basic'],
  },
  starter: {
    name: 'Starter',
    seats: { included: 5, min: 5, max: 19 },
    price: { monthly: 5000, annual: 50000 }, // in pence
    features: ['features:basic', 'features:analytics', 'features:api_limited'],
  },
  professional: {
    name: 'Professional',
    seats: { included: 20, min: 20, max: 40 },
    price: { monthly: 25000, annual: 250000 },
    features: ['features:all'],
  },
};
```

**Why pence?** Stripe uses smallest currency unit (pence for GBP) to avoid floating-point errors.

---

## Seat Management

### How Seats Work

A **seat** represents capacity for one active user in an organization.

**Example:** Starter plan with 10 seats

- **Included:** 5 seats (part of £50/month base)
- **Additional:** 5 extra seats (5 × £10 = £50/month)
- **Total cost:** £100/month

### Seat States

| State            | Description                | Example                              |
| ---------------- | -------------------------- | ------------------------------------ |
| **Within limit** | Active users ≤ total seats | 10 users, 10 seats ✅                |
| **Over limit**   | Active users > total seats | 15 users, 10 seats ⚠️                |
| **At max**       | Total seats = tier max     | 19 seats on Starter (can't add more) |

### Over-Limit Behavior

**The system NEVER blocks operations when over limit.**

Instead:

1. ⚠️ Banner shows to owner/admin: "You have 15 users but 10 seats"
2. 💡 Options presented:
   - Add 5 more seats (£50/month)
   - Deactivate 5 users
3. 📧 Gentle reminder emails every 7 days
4. ⏰ Owner decides timing (no deadline, no enforcement)

**Why this approach?**

- Real-world flexibility (employees leaving soon, seasonal staff, etc.)
- No surprise lockouts
- Owner maintains control

### Adding Seats

**Flow:**

1. Owner/admin clicks "Add Seats" button
2. Modal shows: "Add 5 seats for £X.XX (prorated)"
3. Uses Stripe invoice preview API for exact amount
4. Confirms → Stripe charges immediately (prorated)
5. Webhook updates subscription in Convex
6. UI updates to show new seat count

**Proration example:**

- Current: 10 seats on Starter (£100/month)
- Add: 3 seats mid-month (15 days remaining)
- Charge: £15 immediately (£30/month × 0.5 months)
- Next invoice: £130/month (base £50 + 8 seats × £10)

### Removing Seats

Seats **do not auto-reduce** when users leave.

**Manual reduction:**

1. Owner deactivates user in `/settings/team`
2. Seat count unchanged (still paying for unused seats)
3. Owner manually reduces seats in billing dashboard if desired
4. Stripe credits next invoice (prorated)

**Why manual?** Owner might plan to add another user soon.

---

## User Roles & Permissions

### 5 Roles Defined in WorkOS

| Role            | Billing | Seats | Users             | Features   |
| --------------- | ------- | ----- | ----------------- | ---------- |
| **Owner**       | Full    | Add   | Invite (any role) | All        |
| **Admin**       | View    | Add   | Invite (any role) | All        |
| **Manager**     | None    | None  | None              | All        |
| **Sales**       | None    | None  | None              | Sales only |
| **Team Member** | None    | None  | None              | Basic only |

### Permission Checks

Permissions defined in `app/lib/permissions.ts`:

```typescript
export const PERMISSIONS = {
  'billing:view': ['owner', 'admin'],
  'billing:manage': ['owner'],
  'seats:add': ['owner', 'admin'],
  'users:invite': ['owner', 'admin'],
  'users:manage': ['owner', 'admin'],
  'org:transfer_ownership': ['owner'],
};

// Check in route loader
if (!hasPermission(user.role, 'billing:manage')) {
  throw redirect('/dashboard');
}
```

### Role Assignment

**Auto-assigned:**

- First user creating org → `owner`
- Invited users → Role chosen by inviter

**Change role:**

- Owner/admin can promote/demote via `/settings/team`
- Updates WorkOS membership + syncs to Convex

**Transfer ownership:**

- Owner can transfer to admin via `/settings/team/transfer-ownership`
- Old owner becomes admin, new user becomes owner
- Logged in audit log

---

## Subscription Lifecycle

### State Diagram

```
┌─────────┐
│  Free   │ (Default state)
└────┬────┘
     │ Upgrade
     ▼
┌─────────┐
│ Active  │ (Paying customer)
└────┬────┘
     │ Payment fails
     ▼
┌─────────────┐
│ Grace Period│ (28 days, full access)
└────┬────────┘
     │ Still unpaid after 28 days
     ▼
┌─────────┐
│ Locked  │ (Owner read-only, others blocked)
└────┬────┘
     │ Update payment
     ▼
┌─────────┐
│ Active  │ (Restored)
└────┬────┘
     │ Cancel
     ▼
┌───────────┐
│ Read-Only │ (Owner only, indefinite)
└───────────┘
```

### Subscription Fields (Convex)

```typescript
{
  organizationId: string,
  tier: 'free' | 'starter' | 'professional',

  // Stripe's status
  stripeStatus: 'active' | 'past_due' | 'unpaid' | 'canceled' | null,

  // Our access control
  accessStatus: 'active' | 'grace_period' | 'locked' | 'read_only',

  seats: {
    included: 5,    // Base seats for tier
    additional: 3,  // Extra purchased seats
    total: 8,       // included + additional
    max: 19,        // Tier limit
  },

  currentPeriodStart: 1704067200000,  // Unix timestamp
  currentPeriodEnd: 1706745600000,    // Next billing date

  cancelAtPeriodEnd: false,  // Scheduled cancellation?

  pendingDowngrade: {
    targetTier: 'starter',
    effectiveDate: 1706745600000,
    selectedUserIds: ['user_1', 'user_2'],
  },

  gracePeriod: {
    startDate: 1704067200000,
    endDate: 1706486400000,  // +28 days
    emailsSent: 3,
    lastEmailDate: 1705276800000,
  },
}
```

---

## Downgrade Flow

### Scheduled Downgrade (End of Period)

**The key principle:** Downgrades are ALWAYS allowed, with flexible user management.

**Example: Pro (25 users) → Starter (5 included seats)**

**Timeline:**

```
Jan 1: Owner initiates downgrade in Stripe portal
  ↓
Stripe creates subscription schedule (effective Feb 1)
  ↓
Webhook: subscription_schedule.created
  ↓
App stores: pendingDowngrade { targetTier: 'starter', effectiveDate: Feb 1 }
  ↓
No validation, no blocking, no errors
  ↓
Jan 1-31: All 25 users still active (full access)
  ↓
Banner shows: "Downgrade to Starter scheduled for Feb 1"
  ↓
Owner can deactivate users anytime (or not at all)
  ↓
Feb 1: Downgrade executes
  ↓
Stripe updates subscription (£400/mo → £50/mo)
  ↓
Webhook: customer.subscription.updated
  ↓
App updates: tier = 'starter', seats = { included: 5, additional: 0 }
  ↓
Still 25 active users (no auto-deactivation)
  ↓
Banner shows: "⚠️ You have 25 users but 5 seats. Add seats or deactivate users."
  ↓
Options:
  - Add 20 seats (£200/mo) → Total £250/mo (same as Pro, but more flexible)
  - Deactivate 20 users → Only pay £50/mo
  - Mix: Add 10 seats, deactivate 10 → £150/mo
  ↓
Owner decides timing (no deadline)
```

### Why No Blocking?

Real-world scenarios:

- 5 employees leaving end of month (wait to deactivate)
- Seasonal workers (reduce in off-season)
- M&A activity (users transferring to different org)
- Budget constraints (need time to notify users)

**Owner knows their business best** - system provides flexibility.

---

## Grace Period & Failed Payments

### Payment Failure Handling

When a payment fails (card declined, insufficient funds, etc.):

**Automatic Stripe retries:**

- Retry 1: 3 days after failure
- Retry 2: 5 days after retry 1
- Retry 3: 7 days after retry 2
- Final: 7 days after retry 3

**Our grace period (parallel):**

- Duration: 28 days from first failure
- Access: Full (no restrictions)
- Emails: Every 3 days to billing email
- Banners: Show only to owner/admin (not all users)

**Timeline:**

```
Day 0: Payment fails
  ↓
Webhook: invoice.payment_failed
  ↓
App sets: accessStatus = 'grace_period'
  ↓
Start 28-day countdown
  ↓
Day 1, 4, 7, 10, 13, 16, 19, 22, 25: Reminder email sent
  ↓
Stripe auto-retries during this period
  ↓
If payment succeeds during grace:
  ↓
  Webhook: invoice.payment_succeeded
  ↓
  Grace period ends, accessStatus = 'active'
  ↓
If still unpaid after 28 days:
  ↓
  Convex cron job detects expiration
  ↓
  Sets: accessStatus = 'locked'
  ↓
  Email: "Account locked, please update payment"
  ↓
  Owner: Read-only access
  ↓
  All others: Completely blocked
```

### Recovery from Locked State

```
Owner updates payment method in Stripe portal
  ↓
Stripe retries payment immediately
  ↓
Webhook: invoice.payment_succeeded
  ↓
App sets: accessStatus = 'active'
  ↓
Email: "Account reactivated"
  ↓
All users: Full access restored
```

---

## Webhooks & Event Handling

### 8 Critical Webhooks

| Event                           | Trigger                     | Action                                      |
| ------------------------------- | --------------------------- | ------------------------------------------- |
| `checkout.session.completed`    | User completes checkout     | Create subscription in Convex               |
| `customer.subscription.created` | Stripe creates subscription | Sync details to Convex                      |
| `customer.subscription.updated` | Tier/seats change           | Update subscription in Convex               |
| `subscription_schedule.created` | Downgrade scheduled         | Store pending downgrade                     |
| `invoice.payment_succeeded`     | Payment succeeds            | Record in billing history, end grace period |
| `invoice.payment_failed`        | Payment fails               | Start grace period, send email              |
| `customer.subscription.deleted` | Subscription cancelled      | Set read-only mode                          |
| `customer.updated`              | Billing email changed       | Update in Convex                            |

### Webhook Handler Pattern

```typescript
// app/routes/webhooks/stripe.tsx
export async function action({ request }: Route.ActionArgs) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  // 1. Verify signature (security)
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  // 2. Handle event type
  switch (event.type) {
    case 'customer.subscription.updated':
      const subscription = event.data.object;

      // 3. Sync to Convex
      await convex.mutation(api.subscriptions.sync, {
        organizationId: subscription.metadata.organizationId,
        stripeSubscription: subscription,
      });

      // 4. Log event
      await convex.mutation(api.billingHistory.log, {
        organizationId: subscription.metadata.organizationId,
        eventType: 'subscription.updated',
        amount: subscription.items.data[0].price.unit_amount,
        stripeEventId: event.id,
      });

      break;
  }

  // 5. Always respond 200 (Stripe retries on error)
  return json({ received: true });
}
```

### Webhook Security

**Always verify signatures:**

```typescript
try {
  const event = stripe.webhooks.constructEvent(body, sig, secret);
} catch (err) {
  return json({ error: 'Invalid signature' }, { status: 400 });
}
```

**Why?** Prevents attackers from sending fake webhook events.

---

## Data Flow

### User Upgrades (Checkout Flow)

```
User clicks "Upgrade to Starter" on /pricing
  ↓
POST /api/checkout/create-session
  ↓
Server creates Stripe Checkout Session:
  - Line items: Starter base price
  - Metadata: { organizationId, userId }
  - Success URL: /checkout/success
  - Cancel URL: /pricing
  ↓
Redirect to Stripe Checkout (hosted page)
  ↓
User enters payment details
  ↓
Stripe validates card
  ↓
Payment succeeds
  ↓
Stripe fires: checkout.session.completed
  ↓
Webhook handler:
  1. Get metadata (organizationId)
  2. Create Stripe Customer (if new)
  3. Create subscription in Convex:
     - tier: 'starter'
     - seats: { included: 5, additional: 0, total: 5 }
     - stripeStatus: 'active'
     - accessStatus: 'active'
  4. Log in billingHistory
  ↓
Stripe redirects to: /checkout/success
  ↓
Success page shows: "Subscription activated!"
  ↓
User navigates to /dashboard
  ↓
Billing banner appears: "You're on Starter (5 seats)"
  ↓
Feature gates unlock (analytics, API access, etc.)
```

### Adding Seats (Mid-Cycle)

```
Owner opens `/settings` (via the Settings dropdown), selects **Billing**, and clicks "Add Seats"
  ↓
Modal opens: "Add how many seats?"
  ↓
Owner enters: 3
  ↓
App calls Stripe: invoices.retrieveUpcoming()
  - customer: customer_id
  - subscription_items: [{ id: sub_item_id, quantity: current + 3 }]
  ↓
Stripe returns prorated amount: £15.23
  ↓
Modal shows: "Add 3 seats for £15.23 (prorated). Next bill: £80/month"
  ↓
Owner confirms
  ↓
App calls: subscriptions.update()
  - subscription_id
  - items: [{ id, quantity: current + 3 }]
  - proration_behavior: 'create_prorations'
  ↓
Stripe charges card immediately: £15.23
  ↓
Stripe fires: customer.subscription.updated
  ↓
Webhook updates Convex:
  - seats.additional += 3
  - seats.total += 3
  ↓
Webhook fires: invoice.payment_succeeded (for £15.23)
  ↓
Log in billingHistory: "Added 3 seats"
  ↓
Modal closes, dashboard refreshes
  ↓
Seat count updated: "8 / 8 seats"
```

---

## Edge Cases

### 1. User Upgrades During Grace Period

**Scenario:** Payment failed, grace period active, user upgrades to higher tier

**Handling:**

- Upgrade proceeds normally
- New subscription replaces old (Stripe handles)
- Grace period cleared (no longer needed)
- Billing history shows: "Upgraded during grace period"

### 2. Downgrade While Over Seat Limit

**Scenario:** Pro with 30 users, downgrades to Starter (5 included, 19 max)

**Handling:**

- Downgrade allowed (always)
- After effective date: Banner shows "25 users over limit"
- Owner can:
  - Add 14 seats (30 - 5 - 11 = 14) → Within limit
  - Deactivate 11 users → Within max (19 total)
  - Mix: Add 9 seats, deactivate 2 → 19 seats, 28 users (still 9 over)
- No blocking, no auto-deactivation

### 3. Multiple Failed Payments

**Scenario:** Payment fails, retries also fail, grace period active, another billing cycle starts

**Handling:**

- Grace period countdown continues (doesn't reset)
- Multiple unpaid invoices accumulate in Stripe
- After 28 days: Lock account
- When payment updated: Stripe charges all outstanding invoices
- If any invoice still fails: Account stays locked

### 4. Owner Leaves Organization

**Scenario:** Owner transfers ownership but then leaves company

**Handling:**

- Ownership transfer happens first (old owner → admin, new user → owner)
- Then owner can deactivate their own account
- New owner receives confirmation email
- Audit log records both events
- Billing email updates to new owner (if was old owner's email)

### 5. Subscription Cancelled, Then Reactivated

**Scenario:** Owner cancels subscription, later decides to reactivate

**Handling:**

- Cancellation scheduled at period end
- User has until end of period to "undo" (Stripe supports this)
- If period ends: accessStatus = 'read_only'
- Owner sees "Reactivate" button
- Clicks → Creates new Checkout Session
- After payment: Full access restored
- All data preserved (was never deleted)

### 6. Annual Subscription Mid-Year Upgrade

**Scenario:** Starter annual (£500), 6 months in, upgrades to Pro annual (£2,500)

**Handling:**

- Stripe calculates:
  - Unused credit: £250 (6 months of £500)
  - New pro-rated charge: £1,250 (6 months of £2,500)
  - Immediate charge: £1,250 - £250 = £1,000
- Next renewal: Full £2,500 for 12 months
- Invoice clearly shows calculation

### 7. Two Admins Add Seats Simultaneously

**Scenario:** Admin A adds 5 seats, Admin B adds 3 seats at same time

**Handling:**

- Both API calls succeed (Stripe handles concurrency)
- Two separate invoice line items
- Two webhooks fire (processed sequentially)
- Final result: +8 seats total
- Billing history shows two separate "Added seats" events

---

## Summary

**Key Principles:**

1. **Stripe is source of truth for billing** - App syncs from Stripe, not vice versa
2. **Convex is source of truth for users** - User management independent of billing
3. **Never block operations** - Warnings and flexibility over enforcement
4. **Owner has control** - System provides tools, owner decides timing
5. **Webhooks keep systems in sync** - Always verify signatures
6. **Grace periods, not hard stops** - Failed payments get 28 days to resolve
7. **Audit everything** - Full history for compliance and debugging

---

**Next:** See `FEATURE_GATES.md` for implementing tier-based feature access, or `BILLING_ROADMAP.md` to begin implementation.
