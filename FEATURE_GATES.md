# Feature Gates Guide

This guide explains how to implement tier-based feature access control using the feature gate system.

---

## Overview

**Feature gates** restrict access to features based on:

- **Subscription tier** (Free, Starter, Professional)
- **User role** (Owner, Admin, Manager, Sales, Team Member)

Users without access see an **upgrade prompt** with a preview of the locked feature.

---

## Quick Start

### 1. Wrap Route Content

```tsx
// app/routes/dashboard/analytics.tsx
import { FeatureGate } from '~/components/feature-gates/FeatureGate';

export default function AnalyticsPage() {
  return (
    <FeatureGate feature="analytics" requiredTier="starter">
      <AnalyticsContent />
    </FeatureGate>
  );
}
```

### 2. Users Without Access See

```
┌─────────────────────────────────────┐
│  📊 Analytics Dashboard             │
│                                      │
│  [Preview Image]                     │
│                                      │
│  Track user engagement, conversion   │
│  rates, and key business metrics.    │
│                                      │
│  Available on Starter plan and above │
│                                      │
│  [Upgrade to Starter - £50/month] │
└─────────────────────────────────────┘
```

### 3. Users With Access See

```
Full analytics dashboard with charts, tables, etc.
```

---

## Architecture

### Components

```
components/feature-gates/
├── FeatureGate.tsx          - Main wrapper component
├── LockedFeature.tsx        - Upgrade prompt UI
└── FeatureBadge.tsx         - "Pro only" badges
```

### Feature Definitions

Features are defined in `app/lib/permissions.ts`:

```typescript
export const TIER_FEATURES = {
  free: ['features:basic', 'dashboard:view', 'profile:edit'],
  starter: [
    'features:basic',
    'dashboard:view',
    'profile:edit',
    'analytics:view', // ← New in Starter
    'api:access', // ← New in Starter
    'api:limited', // ← Limited to 100 calls/day
  ],
  professional: [
    'features:basic',
    'dashboard:view',
    'profile:edit',
    'analytics:view',
    'analytics:export', // ← New in Pro
    'api:access',
    'api:unlimited', // ← Unlimited in Pro
    'support:priority', // ← New in Pro
    'integrations:advanced', // ← New in Pro
  ],
} as const;
```

When loaders or actions need tier checks plus billing or RBAC helpers, import them from `app/services/providers.server.ts` so the Stripe and WorkOS SDKs remain server-only.

---

### Demo Mode Flag

Enable the `demoMode` feature flag (`FEATURE_FLAGS=demoMode` or `FF_DEMOMODE=true`) to surface onboarding helpers:

- `/settings` shows guidance for `npm run seed:demo`
- The navigation dropdown exposes the organization switcher populated by the seed script

Use this flag during workshops or template previews, then disable it before shipping.

---

## Implementation Patterns

### Pattern 1: Route-Level Gate (Recommended)

Protect entire routes by wrapping the page content:

```tsx
// app/routes/dashboard/analytics.tsx
import { FeatureGate } from '~/components/feature-gates/FeatureGate';
import type { Route } from './+types/analytics';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Analytics Dashboard' }];
}

export default function AnalyticsPage() {
  return (
    <FeatureGate
      feature="analytics:view"
      requiredTier="starter"
      featureTitle="Analytics Dashboard"
      featureDescription="Track user engagement, conversion rates, and key business metrics with real-time analytics."
      previewImage="/assets/feature-previews/analytics.png"
    >
      <div>
        <h1>Analytics Dashboard</h1>
        <AnalyticsCharts />
        <AnalyticsTable />
      </div>
    </FeatureGate>
  );
}
```

### Pattern 2: Component-Level Gate

Protect specific UI elements within a page:

```tsx
// app/routes/dashboard/index.tsx
import { FeatureGate } from '~/components/feature-gates/FeatureGate';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Everyone sees this */}
      <BasicMetrics />

      {/* Only Starter+ sees this */}
      <FeatureGate feature="analytics:view" requiredTier="starter">
        <AnalyticsWidget />
      </FeatureGate>

      {/* Only Pro sees this */}
      <FeatureGate feature="support:priority" requiredTier="professional">
        <PrioritySupportWidget />
      </FeatureGate>
    </div>
  );
}
```

### Pattern 3: Server-Side Gate (Most Secure)

Check access in the route loader before rendering:

```tsx
// app/routes/dashboard/analytics.tsx
import { requireFeatureAccess } from '~/lib/feature-access.server';
import type { Route } from './+types/analytics';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const subscription = await getOrgSubscription(user.organizationId);

  // Check if user has access
  const hasAccess = hasFeatureAccess(subscription.tier, 'analytics:view');

  if (!hasAccess) {
    // Return locked state instead of redirecting
    return {
      locked: true,
      requiredTier: 'starter',
    };
  }

  // Load actual data
  const analyticsData = await fetchAnalytics(user.organizationId);

  return {
    locked: false,
    data: analyticsData,
  };
}

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
  if (loaderData.locked) {
    return (
      <LockedFeature
        featureTitle="Analytics Dashboard"
        featureDescription="Track user engagement and key metrics"
        requiredTier={loaderData.requiredTier}
        previewImage="/assets/feature-previews/analytics.png"
      />
    );
  }

  return <AnalyticsContent data={loaderData.data} />;
}
```

### Pattern 4: Role-Based Gate

Combine tier + role requirements:

```tsx
<FeatureGate
  feature="analytics:export"
  requiredTier="professional"
  requiredRole={['owner', 'admin', 'manager']} // Team members can't export
>
  <ExportButton />
</FeatureGate>
```

---

## FeatureGate Component API

### Props

```typescript
interface FeatureGateProps {
  // Required
  feature: string; // Feature slug (e.g., 'analytics:view')
  requiredTier: 'free' | 'starter' | 'professional';
  children: React.ReactNode; // Content to show when access granted

  // Optional
  requiredRole?: string[]; // Roles allowed (default: all)
  featureTitle?: string; // Title for locked state
  featureDescription?: string; // Description for locked state
  previewImage?: string; // Preview image path
  fallback?: React.ReactNode; // Custom locked UI (overrides default)
}
```

### Example Usage

```tsx
<FeatureGate
  feature="api:access"
  requiredTier="starter"
  featureTitle="API Access"
  featureDescription="Integrate with our REST API to automate workflows and build custom integrations."
  previewImage="/assets/feature-previews/api.png"
>
  <ApiDocumentation />
</FeatureGate>
```

---

## LockedFeature Component

Shows the upgrade prompt when users don't have access.

### Props

```typescript
interface LockedFeatureProps {
  featureTitle: string; // e.g., "Analytics Dashboard"
  featureDescription: string; // Benefits of the feature
  requiredTier: 'starter' | 'professional';
  previewImage?: string; // Optional preview
  ctaText?: string; // Custom CTA (default: "Upgrade to {tier}")
}
```

### Custom Locked UI

```tsx
<FeatureGate
  feature="analytics:view"
  requiredTier="starter"
  fallback={
    <div className="custom-locked-state">
      <h2>Need Analytics?</h2>
      <p>Upgrade to see detailed insights</p>
      <CustomUpgradeButton />
    </div>
  }
>
  <AnalyticsContent />
</FeatureGate>
```

---

## Adding New Features

### Step 1: Define Feature in Permissions

```typescript
// app/lib/permissions.ts
export const TIER_FEATURES = {
  // ... existing features ...

  starter: [
    // ... existing starter features ...
    'reports:basic', // ← Add new feature
  ],

  professional: [
    // ... existing pro features ...
    'reports:basic',
    'reports:advanced', // ← Pro gets advanced version
  ],
};
```

### Step 2: Create Route with Gate

```tsx
// app/routes/dashboard/reports.tsx
import { FeatureGate } from '~/components/feature-gates/FeatureGate';

export default function ReportsPage() {
  return (
    <FeatureGate
      feature="reports:basic"
      requiredTier="starter"
      featureTitle="Reports"
      featureDescription="Generate custom reports with your data"
      previewImage="/assets/feature-previews/reports.png"
    >
      <ReportsContent />
    </FeatureGate>
  );
}
```

### Step 3: Add Preview Image

```bash
# Create placeholder preview image
public/assets/feature-previews/reports.png
```

### Step 4: Update Navigation

```tsx
// app/components/Navigation.tsx
import { FeatureBadge } from '~/components/feature-gates/FeatureBadge';

<NavLink to="/dashboard/reports">
  Reports
  <FeatureBadge feature="reports:basic" />
</NavLink>;
```

**Result:** Free users see "Starter" badge next to Reports link.

---

## Helper Functions

### Check Feature Access

```typescript
// app/lib/feature-access.server.ts
import { TIER_FEATURES } from './permissions';

export function hasFeatureAccess(
  tier: 'free' | 'starter' | 'professional',
  feature: string
): boolean {
  return TIER_FEATURES[tier]?.includes(feature) ?? false;
}

// Usage in loader
const hasAccess = hasFeatureAccess(subscription.tier, 'analytics:view');
```

### Require Feature Access

```typescript
// app/lib/feature-access.server.ts
export async function requireFeatureAccess(request: Request, feature: string) {
  const user = await requireUser(request);
  const subscription = await getOrgSubscription(user.organizationId);

  if (!hasFeatureAccess(subscription.tier, feature)) {
    throw redirect('/pricing?feature=' + feature);
  }

  return { user, subscription };
}

// Usage in loader
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireFeatureAccess(request, 'analytics:view');
  // User definitely has access here
}
```

---

## Conversion Tracking

Track which features drive upgrades:

```typescript
// When user clicks "Upgrade" from locked feature
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const feature = formData.get('feature'); // e.g., 'analytics:view'
  const tier = formData.get('tier'); // e.g., 'starter'

  const { rbacService, billingService } = await import('~/services/providers.server');
  const user = await rbacService.requireUser(request);

  // Store in session for checkout
  const session = await getSession(request);
  session.set('upgrade_trigger_feature', feature);

  // Redirect to checkout
  const checkoutUrl = await billingService.createCheckoutSession({
    tier,
    organizationId: user.organizationId,
    successUrl: `/checkout/success?feature=${feature}`,
  });

  return redirect(checkoutUrl, {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}

// After checkout completes
export async function loader({ request }: Route.LoaderArgs) {
  const { rbacService, convexService } = await import('~/services/providers.server');
  const session = await getSession(request);
  const triggerFeature = session.get('upgrade_trigger_feature');
  const user = await rbacService.requireUser(request);

  // Store in subscription for analytics
  await convexService.client.mutation(api.subscriptions.trackConversion, {
    organizationId: user.organizationId,
    triggerFeature,
    upgradedAt: Date.now(),
  });

  session.unset('upgrade_trigger_feature');

  return { success: true };
}
```

### Analyze Conversions

```typescript
// convex/analytics.ts
export const getConversionMetrics = query({
  handler: async ctx => {
    const subscriptions = await ctx.db
      .query('subscriptions')
      .filter(q => q.neq(q.field('conversionTracking'), undefined))
      .collect();

    const featureCounts = {};
    subscriptions.forEach(sub => {
      const feature = sub.conversionTracking.triggerFeature;
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });

    return {
      totalConversions: subscriptions.length,
      byFeature: featureCounts,
      avgDaysToConvert: calculateAverage(
        subscriptions.map(s => s.conversionTracking.daysOnFreeTier)
      ),
    };
  },
});
```

---

## Testing Feature Gates

### Test Scenarios

1. **Free user accesses Starter feature** → Sees upgrade prompt
2. **Starter user accesses Starter feature** → Sees content
3. **Starter user accesses Pro feature** → Sees upgrade prompt
4. **Pro user accesses any feature** → Always sees content
5. **Manager role restricted feature** → Sees role-based denial

### Testing Locally

```tsx
// Test by temporarily modifying tier in Convex
// Via Convex dashboard or CLI:

// Make org free
await ctx.db.patch(subscriptionId, { tier: 'free' });

// Make org starter
await ctx.db.patch(subscriptionId, { tier: 'starter' });

// Make org pro
await ctx.db.patch(subscriptionId, { tier: 'professional' });
```

### E2E Test Example

```typescript
test('free user sees upgrade prompt on analytics page', async ({ page }) => {
  await loginAsFreeUser(page);
  await page.goto('/dashboard/analytics');

  // Should see locked feature UI
  await expect(page.locator('text=Upgrade to Starter')).toBeVisible();
  await expect(page.locator('text=Analytics Dashboard')).toBeVisible();

  // Should NOT see actual analytics content
  await expect(page.locator('text=Total Revenue')).not.toBeVisible();
});

test('starter user sees analytics content', async ({ page }) => {
  await loginAsStarterUser(page);
  await page.goto('/dashboard/analytics');

  // Should see actual content
  await expect(page.locator('text=Total Revenue')).toBeVisible();
  await expect(page.locator('text=Active Users')).toBeVisible();

  // Should NOT see upgrade prompt
  await expect(page.locator('text=Upgrade to')).not.toBeVisible();
});
```

---

## Best Practices

### ✅ Do's

- ✅ Always check access server-side (never trust client)
- ✅ Show clear value proposition in locked state
- ✅ Use preview images to showcase features
- ✅ Track which features drive conversions
- ✅ Test all feature gates with different tiers
- ✅ Show feature badges in navigation
- ✅ Make locked features visible (don't hide completely)

### ❌ Don'ts

- ❌ Don't hide locked features from navigation (show with badges)
- ❌ Don't check tier only on client (always verify server-side)
- ❌ Don't hardcode tier names in components (use constants)
- ❌ Don't forget to add preview images
- ❌ Don't make upgrade CTAs aggressive (gentle nudges only)
- ❌ Don't gate basic functionality (keep free tier useful)

---

## Feature Categories

### Basic Features (Free)

- Dashboard view
- Profile editing
- Basic search
- Single user

### Starter Features

- Analytics dashboard
- Limited API access (100 calls/day)
- Team collaboration (up to 19 users)
- Email support

### Professional Features

- Advanced analytics with export
- Unlimited API access
- Large teams (up to 40 users)
- Priority support
- Advanced integrations
- Custom branding

---

## Troubleshooting

### Feature gate not working

**Problem:** User has paid tier but still sees locked feature

**Solutions:**

1. Check subscription synced to Convex: Query `subscriptions` table
2. Verify tier matches: `subscription.tier === 'starter'`
3. Check feature definition includes tier: `TIER_FEATURES.starter`
4. Clear cache/re-authenticate user

### Preview image not showing

**Problem:** Locked feature shows broken image

**Solutions:**

1. Verify image path correct: `/assets/feature-previews/analytics.png`
2. Check image exists in `public/assets/feature-previews/`
3. Verify file extension matches (`.png`, `.jpg`, etc.)
4. Check image permissions (should be readable)

### Conversion tracking not recording

**Problem:** Upgrades not tracked to features

**Solutions:**

1. Verify session stores `upgrade_trigger_feature`
2. Check checkout success URL includes `?feature=` param
3. Ensure webhook syncs `conversionTracking` to subscription
4. Check Convex mutation called in success handler

---

## Next Steps

1. ✅ Define your features in `app/lib/permissions.ts`
2. ✅ Create feature-gated routes
3. ✅ Add preview images to `public/assets/feature-previews/`
4. ✅ Update navigation with feature badges
5. ✅ Test with different tiers
6. ✅ Monitor conversion analytics

---

**Questions?** Reference the `BILLING_GUIDE.md` for system architecture or `BILLING_ROADMAP.md` for implementation steps.
