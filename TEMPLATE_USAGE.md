# Template Usage Guide

This document explains how to customize, extend, or remove parts of this starter template for your specific needs.

## 🎯 Using This Template for a New Project

### 1. Fork or Clone

```bash
git clone <your-repo-url> my-new-project
cd my-new-project
rm -rf .git  # Remove git history to start fresh
git init
```

### 2. Customize Project Name

Update the following files:

- `package.json` - Change the `name` field
- `README.md` - Update the title and description
- Environment variables - Update `WORKOS_REDIRECT_URI` to match your domain

### 3. Set Up Services

- Create a WorkOS account and project
- Create a Convex deployment
- Copy `.env.example` to `.env` and configure

## 🧠 Understand the Base Template Architecture

- React Router data APIs power loaders/actions; import Stripe/WorkOS helpers via `app/services/providers.server.ts` inside those functions to keep SDKs server-only.
- Feature flag previews live under `/settings/usage` and `/settings/integrations`; toggle them with `FEATURE_FLAGS=usageAnalytics,integrationsHub` or per-flag env vars documented in `docs/ENVIRONMENTS.md`.
- Authenticated navigation is centralized in `components/navigation/TopNav.tsx`; `/settings` renders the same bar so Billing, Team, and Pricing live in the Settings dropdown.

## 🔧 Customizing Authentication

### Keeping WorkOS (Recommended)

This template is designed around WorkOS. If you're building a B2B SaaS application, WorkOS provides:

- Enterprise SSO (Google Workspace, Microsoft, Okta, etc.)
- Organization/tenant management
- Directory sync
- SCIM provisioning

**To customize:**

- Modify `app/routes/auth/` routes to change the auth flow
- Update `app/lib/auth.server.ts` to add custom logic
- Customize UI in auth route components

### Removing WorkOS (Switching to Different Auth)

If you want to use a different authentication provider (Auth0, Clerk, Supabase Auth, etc.):

**1. Remove WorkOS Dependencies**

```bash
npm uninstall @workos-inc/node
```

**2. Remove WorkOS Files**

```bash
rm app/lib/workos.server.ts
rm app/routes/auth/callback.tsx
rm app/routes/auth/create-organization.tsx
rm app/routes/auth/organization-selection.tsx
rm app/routes/test-workos.tsx
rm WORKOS_SETUP.md
```

Update `app/services/providers.server.ts` so loaders/actions import your new auth helpers instead of `rbacService` from WorkOS.

**3. Update Environment Variables**
Remove WorkOS variables from `.env.example` and add your auth provider's variables.

**4. Update Auth Logic**

- Replace `app/lib/auth.server.ts` with your auth provider's implementation
- Update session management in `app/lib/session.server.ts` if needed
- Create new auth routes for your provider
- Adjust any WorkOS-specific logic inside settings loaders (e.g., `/settings`, `/settings/team`) to import your updated service exports via `~/services/providers.server`.

**5. Update Convex User Schema**
If you're removing organizations, update `convex/schema.ts`:

```typescript
users: defineTable({
  email: v.string(),
  name: v.string(),
  authProviderId: v.string(), // Your auth provider's user ID
  // Remove: workosUserId, organizationId
});
```

## 💾 Customizing Database

### Keeping Convex (Recommended)

Convex provides:

- Real-time reactive queries
- Type-safe operations
- Serverless architecture
- Automatic scaling

**To customize:**

- Add new tables in `convex/schema.ts`
- Create new functions in `convex/` directory
- Add custom hooks in `lib/useConvex.ts`

### Removing Convex (Switching to Different Database)

If you want to use Prisma, Drizzle, or direct database access:

**1. Remove Convex Dependencies**

```bash
npm uninstall convex
```

**2. Remove Convex Files**

```bash
rm -rf convex/
rm lib/convex.server.ts
rm lib/ConvexProvider.tsx
rm lib/useConvex.ts
rm convex.json
rm CONVEX_SETUP.md
```

Update `app/services/providers.server.ts` to remove the Convex exports (or swap in your new data layer) so loaders/actions continue to import from a single place.

**3. Remove Convex Provider**
Remove `ConvexClientProvider` from your app root (check `app/root.tsx` or layout files).

**4. Update Environment Variables**
Remove `CONVEX_URL` and `VITE_CONVEX_URL` from `.env.example`.

**5. Install Your Preferred ORM/Database**

```bash
# Example: Prisma
npm install prisma @prisma/client

# Example: Drizzle
npm install drizzle-orm postgres
```

**6. Update User Creation Logic**
Replace Convex calls in `app/routes/auth/callback.tsx` and `app/routes/auth/create-organization.tsx` with your database calls.

**7. Create Database Schema**
Set up your schema using your chosen tool (Prisma schema, Drizzle schema, SQL migrations, etc.)

## 🎨 Customizing Styling

### Keeping TailwindCSS

The template uses TailwindCSS v4. To customize:

- Modify Tailwind configuration (if needed)
- Update color schemes and design tokens
- Add custom components in `components/`

### Switching to Different Styling

```bash
# Remove Tailwind
npm uninstall tailwindcss @tailwindcss/vite

# Install your preferred solution (examples)
npm install styled-components
npm install @mui/material @emotion/react @emotion/styled
npm install vanilla-extract
```

Update `vite.config.ts` to remove the Tailwind Vite plugin.

## 💳 Customizing Billing (Stripe Integration)

### Keeping Stripe (Recommended for SaaS)

The template includes a complete billing system with:

- 3 pricing tiers (Free, Starter, Professional)
- Seat-based pricing with per-seat add-ons
- Annual billing with discount
- Stripe Customer Portal for self-service
- 28-day grace period for failed payments

#### Customize Pricing Tiers

1. Update `app/lib/billing-constants.ts` with new pricing, seat counts, or features:

   ```typescript
   export const TIER_CONFIG = {
     starter: {
       name: 'Starter',
       seats: { included: 5, min: 5, max: 19 },
       price: { monthly: 5000, annual: 50000 }, // Prices are stored in pence
       // ...
     },
   };
   ```

2. Adjust Stripe products to match the new configuration (Stripe Dashboard → Products) and copy the updated price IDs into `.env`.
3. Update the pricing UI (`app/routes/pricing.tsx`) and any feature gate rules to reflect new tiers or benefits.
4. If you add a tier, ensure Stripe webhooks map the new price IDs to tier slugs in `app/lib/stripe.server.ts`.

#### Customize Roles

- Roles are defined in WorkOS Dashboard (see `WORKOS_RBAC_SETUP.md`)
- Update permissions in `app/lib/permissions.ts`
- Modify role checks in route loaders

### Remove Stripe Billing

If you want to remove the billing system entirely:

1. Remove Stripe dependencies:

   ```bash
   npm uninstall stripe @stripe/stripe-js
   ```

2. Delete billing-related files to clean up routes, components, and Convex functions:

   ```bash
   rm -rf app/routes/webhooks/stripe.tsx
   rm -rf app/routes/settings/billing.tsx
   rm -rf app/routes/pricing.tsx
   rm -rf components/billing/
   rm -rf components/pricing/
   rm -rf components/feature-gates/
   rm app/lib/stripe.server.ts
   rm app/lib/billing-constants.ts
   rm app/lib/permissions.ts
   rm convex/subscriptions.ts
   rm convex/billingHistory.ts
   rm convex/auditLog.ts
   ```

3. Update the settings navigation so it no longer references billing:

   ```bash
   # Remove the Billing dropdown entry and settings card
   edit components/navigation/TopNav.tsx
   edit app/routes/settings.tsx
   edit app/routes/settings._index.tsx
   ```

4. Remove billing documentation assets to avoid stale references:

   ```bash
   rm BILLING_ROADMAP.md
   rm STRIPE_SETUP.md
   rm WORKOS_RBAC_SETUP.md
   rm BILLING_GUIDE.md
   rm FEATURE_GATES.md
   ```

5. Update the Convex schema by removing billing tables and the `role` column from `users`:

   ```typescript
   // Remove these tables:
   // - subscriptions
   // - billingHistory
   // - auditLog

   users: defineTable({
     // ... keep other fields
     // Remove: role field
   });
   ```

5. Strip Stripe environment variables from `.env.example` and your deployment configuration:

   ```bash
   # Remove:
   # STRIPE_SECRET_KEY
   # VITE_STRIPE_PUBLISHABLE_KEY
   # STRIPE_WEBHOOK_SECRET
   # STRIPE_PRICE_*
   ```

6. Simplify authentication by removing role requirements inside `app/lib/auth.server.ts` and related loaders.
7. If you no longer need WorkOS RBAC, delete the roles from the WorkOS Dashboard and remove `roleSlug` arguments when creating memberships.

### Customizing Feature Gates

If keeping billing but want different feature access:

**1. Define features per tier** in `app/lib/permissions.ts`:

```typescript
export const TIER_FEATURES = {
  free: ['dashboard:view', 'profile:edit'],
  starter: ['dashboard:view', 'profile:edit', 'analytics:view'],
  professional: ['dashboard:view', 'profile:edit', 'analytics:view', 'api:access'],
};
```

**2. Use `<FeatureGate>` component:**

```tsx
<FeatureGate feature="analytics:view" requiredTier="starter">
  <AnalyticsContent />
</FeatureGate>
```

See `FEATURE_GATES.md` for detailed guide.

## 🔄 Session Management

The template uses encrypted cookie sessions via `app/lib/session.server.ts`.

**To customize:**

- Change session storage backend (Redis, database, etc.)
- Modify session duration and security settings
- Add custom session data fields

## 🌐 Adding Features

### Adding New Routes

1. Create file in `app/routes/` (e.g., `app/routes/settings.tsx`)
2. Export a default component and optional loader/action functions
3. React Router automatically picks up the route

### Adding Protected Routes

Use `requireUser` from `app/lib/auth.server.ts`:

```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  // User is guaranteed to be authenticated here
  return { user };
}
```

### Adding Database Tables

1. Add table definition to `convex/schema.ts`
2. Create CRUD functions in `convex/[tableName].ts`
3. Add React hooks in `lib/useConvex.ts`
4. Run `npx convex codegen` to regenerate types

## 🚀 Deployment Customization

### Environment-Specific Configuration

Create separate `.env` files for different environments:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Adding Health Checks

Create `app/routes/health.tsx`:

```typescript
export async function loader() {
  return { status: 'ok', timestamp: Date.now() };
}
```

### Custom Build Steps

Modify `package.json` scripts to add pre/post build hooks.

## 📦 Removing Demo Components

The template includes demo components for testing:

**Remove UsersDemo Component**

```bash
rm components/UsersDemo.tsx
```

Then remove any imports of `UsersDemo` in your routes.

**Remove Test Route**

```bash
rm app/routes/test-workos.tsx
```

## 🔐 Security Considerations

When customizing:

- Always validate environment variables at startup
- Use strong `SESSION_SECRET` in production
- Enable HTTPS in production
- Configure CORS appropriately
- Sanitize user inputs
- Use parameterized queries/prepared statements
- Keep dependencies updated

## 📚 Additional Resources

- [React Router Documentation](https://reactrouter.com/)
- [WorkOS Documentation](https://workos.com/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [Vite Documentation](https://vitejs.dev/)

## 🤔 Need Help?

Common customization questions:

## 🧭 Updating Navigation & Settings

- Update the Settings dropdown inside `components/navigation/TopNav.tsx` when you add or rename Billing/Team/Pricing pages.
- `/settings` renders the shared `TopNav`, keeping the dropdown available even while configuring billing.
- Add new settings sections to both the sidebar navigation and dropdown inside `app/routes/settings.tsx` so links stay discoverable.

## 🧩 Feature Flags & Previews

- Register new flags in `app/lib/featureFlags.server.ts` and surface copy/previews in the matching `/settings/<flag>` routes.
- Toggle them via `FEATURE_FLAGS=flagOne,flagTwo` or per-flag overrides (`FF_FLAGONE=true`) inside each environment profile (`docs/ENVIRONMENTS.md`).
- Document customer-facing gates (what unlocks and who owns them) in `FEATURE_GATES.md`.

## ✅ Verification Suite

- Before publishing a new template clone, run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run test:e2e`.
- Use the Stripe CLI flows in `test/stripe-test-scenarios.md` to validate manual billing behavior alongside automated tests.
- Update `CHANGELOG.md` and supporting docs (`docs/PROVIDER_RUNBOOK.md`, `docs/MIGRATIONS.md`, etc.) once the checks pass.

- **Q: Can I use this template with Next.js instead of React Router?**
  - A: This template is specifically built for React Router v7. For Next.js, you'd need significant refactoring as the routing and SSR systems are different.

- **Q: Can I add multiple authentication providers?**
  - A: Yes! WorkOS supports multiple identity providers. Configure them in your WorkOS dashboard.

- **Q: How do I add role-based access control (RBAC)?**
  - A: The template includes 5 roles out of the box (Owner, Admin, Manager, Sales, Team Member). See `WORKOS_RBAC_SETUP.md` for configuration.

- **Q: Can I use this template for a mobile app?**
  - A: The backend (WorkOS + Convex + Stripe) can serve a mobile app, but the React Router frontend is for web. You'd need React Native or similar for mobile.

- **Q: How do I change the pricing tiers or add more tiers?**
  - A: Update `app/lib/billing-constants.ts`, create new Stripe products, and update the pricing page component. See the "Customizing Billing" section above.

- **Q: Can I use a different payment provider instead of Stripe?**
  - A: Yes, but you'll need to replace the entire billing system. Follow the "Removing Stripe Billing" section, then integrate your preferred provider (Paddle, LemonSqueezy, etc.).

- **Q: How do I implement the billing system if it's not set up yet?**
  - A: Follow the step-by-step guide in `BILLING_ROADMAP.md`. It includes ~100 tasks covering Stripe setup, schema creation, webhooks, UI components, and testing.
