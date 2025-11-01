# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with HMR (http://localhost:5173)
- `npm run build` - Create production build
- `npm run start` - Start production server from build
- `npm run typecheck` - Run TypeScript type checking with React Router type generation
- `npm run lint` - Run ESLint on all files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Testing Commands

- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with interactive UI (debugging)
- `npm run test:run` - Run tests once (CI mode)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode (alias)

**Test Files**: Place tests in `test/unit/` for unit tests and `test/integration/` for integration tests. Use `*.test.ts` or `*.test.tsx` extensions.

## Convex Database Commands

- `npx convex dev` - Start Convex development server (provides CONVEX_URL for .env)
- `npx convex deploy` - Deploy Convex functions and schema to the cloud
- `npx convex codegen` - Regenerate TypeScript types from schema

## Architecture Overview

This is a React Router v7 application with WorkOS authentication and Convex database integration.

### Tech Stack

- **Frontend**: React Router v7, React 19, TailwindCSS v4
- **Authentication**: WorkOS (SSO, organization management, AuthKit, RBAC)
- **Billing**: Stripe (subscriptions, customer portal, webhooks) - optional feature
- **Database**: Convex (real-time, serverless database)
- **Testing**: Vitest with React Testing Library, happy-dom
- **Styling**: TailwindCSS with Vite plugin
- **Build Tool**: Vite with React Router plugin
- **Language**: TypeScript (strict mode)

### Key Directories

- `app/` - React Router application code
  - `routes/` - File-based routing with auth routes, dashboard, settings, legal pages
  - `lib/` - Server-side utilities (auth, sessions, WorkOS, email, metrics, logging)
  - `services/` - Service provider abstractions (billingService, rbacService, convexService)
- `convex/` - Convex database schema and functions
- `lib/` - Client-side utilities (Convex hooks, providers)
- `components/` - Reusable React components
- `docs/` - Operational guides and documentation (theming, compliance, etc.)
- `test/` - Test files organized by type
  - `unit/` - Unit tests for business logic and utilities (346 tests)
  - `integration/` - Integration tests for multi-tenancy and workflows (26 tests)
  - `mocks/` - Mock implementations (WorkOS, Convex, Stripe)
  - `examples/` - Example tests for reference

### Authentication Flow

The app uses WorkOS for authentication with organization support:

1. **Login**: Users authenticate via WorkOS AuthKit
2. **Organization Selection**: WorkOS handles organization creation/selection automatically
3. **User Creation**: Authenticated users are automatically created in Convex database
4. **Session Management**: Server-side sessions with secure cookies
5. **Role Sync**: User roles are synced from WorkOS to Convex on every login

**Key Auth Files:**

- `app/lib/auth.server.ts` - Main authentication logic and WorkOS integration
- `app/lib/session.server.ts` - Session management
- `app/lib/workos.server.ts` - WorkOS client configuration
- `app/routes/auth/` - Authentication route handlers

### Database Schema (Convex)

#### Users Table

Required fields:

- `email`, `name`, `workosUserId`, `organizationId` (all required)
- `createdAt`, `updatedAt`, `isActive`
- `role` (optional) - RBAC role from WorkOS ('owner', 'admin', 'manager', 'sales', 'member')

Indexes: email, workosUserId, organizationId, createdAt

#### Subscriptions Table (for billing)

- `organizationId`, `stripeCustomerId`, `stripeSubscriptionId`
- `tier` ('free', 'starter', 'professional')
- `status` ('active', 'canceled', 'past_due', 'trialing', 'paused')
- `seatsIncluded`, `seatsTotal`, `seatsActive`
- `currentPeriodStart`, `currentPeriodEnd`
- Grace period and pending downgrade tracking
- Conversion tracking (upgradedFrom, upgradedAt, upgradeTriggerFeature)

#### Other Tables

- `billingHistory` - Payment events and subscription changes
- `auditLog` - User actions and system events

**Key Database Files:**

- `convex/schema.ts` - Database schema definition
- `convex/users.ts` - User CRUD operations
- `convex/subscriptions.ts` - Subscription management
- `lib/useConvex.ts` - React hooks for database operations
- `lib/ConvexProvider.tsx` - Convex React provider

### Environment Variables

**Core Authentication** (required):

- `WORKOS_API_KEY` - WorkOS API key
- `WORKOS_CLIENT_ID` - WorkOS client ID
- `WORKOS_REDIRECT_URI` - OAuth redirect URI (e.g., `http://localhost:5173/auth/callback`)
- `SESSION_SECRET` - Session encryption secret (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

**Database** (required):

- `CONVEX_URL` - Convex deployment URL for server-side
- `VITE_CONVEX_URL` - Same URL for client-side (must start with `VITE_`)

**Billing** (optional, for Stripe):

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

**Observability** (optional):

- `OBSERVABILITY_TARGET` - `console` or `sentry` (default: `console`)
- `SENTRY_DSN` - Sentry error tracking endpoint
- `SENTRY_ENVIRONMENT` - Sentry environment (falls back to NODE_ENV)
- `SENTRY_TRACES_SAMPLE_RATE` - Transaction sample rate (default: 0.1)

**Metrics** (optional):

- `METRICS_TARGET` - `console` or `statsd` (default: `console`)
- `METRICS_STATSD_HOST` - StatsD host (default: 127.0.0.1)
- `METRICS_STATSD_PORT` - StatsD port (default: 8125)

**Email** (optional):

- `EMAIL_TRANSPORT` - `console` or `file` (default: `file`)
- `EMAIL_PREVIEW_DIR` - Preview directory path (default: `tmp/mail-previews`)
- `APP_NAME` - Product name in emails (default: `DomiEuro`)

**Feature Flags** (optional):

- `FEATURE_FLAGS` - Comma-separated flags (e.g., `onboardingWizard,apiKeys`)
- `FF_ONBOARDING_WIZARD` - Individual flag override
- `FF_API_KEYS` - Individual flag override
- (See Feature Flags System section for all available flags)

**Setup Order:**

1. Run `npx convex dev` to get CONVEX_URL and VITE_CONVEX_URL
2. Sign up for WorkOS and configure API keys (see WORKOS_SETUP.md)
3. Generate SESSION_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. (Optional) Configure Stripe keys for billing (see STRIPE_SETUP.md)
5. (Optional) Configure Sentry DSN for error tracking
6. Enable feature flags as needed with FEATURE_FLAGS environment variable

### TypeScript Configuration

- Uses strict TypeScript with React Router type generation
- Path alias: `~/*` maps to `./app/*`
- Includes Convex types and Vite client types
- No `any` types allowed (use proper typing or `unknown`)
- No non-null assertions (`!`) - use runtime validation instead

### Code Quality

- ESLint with TypeScript, React, and accessibility rules
- Prettier for code formatting
- Unused variables prefixed with `_` are ignored by linting
- All production code must have tests (80% coverage minimum)

## Advanced Features & Configuration

### Feature Flags System

Control access to beta and preview features via environment variables. Features can be toggled without redeploying.

**Available Flags**:

```
- onboardingWizard - Launch checklist at /settings/onboarding (owner/admin only)
- apiKeys - API key management at /settings/api-keys
- usageAnalytics - Usage metrics dashboard
- integrationsHub - Third-party integrations hub
- experimentalThemes - Theme customization interface
- demoMode - Show onboarding copy and seed demo data (dev mode)
```

**Usage**:

```bash
# Multiple flags (comma-separated)
FEATURE_FLAGS=onboardingWizard,apiKeys npm run dev

# Individual environment variables (FF_* format)
FF_ONBOARDING_WIZARD=true FF_API_KEYS=true npm run dev
```

**In Code**:

```typescript
// Server-side
import { isFeatureEnabled, listFeatureFlags } from '~/lib/featureFlags.server';

const enabled = isFeatureEnabled('apiKeys');
const flags = listFeatureFlags(); // Returns [{ key: 'apiKeys', enabled: true }, ...]

// Routes redirect if feature disabled
if (!onboardingEnabled) {
  return redirect('/settings');
}
```

**Pattern**: Routes check feature flags in loaders and redirect to fallback page if disabled. This allows safe feature development without requiring deployment.

### Observability & Logging

Production-grade error tracking and structured logging with optional Sentry integration.

**Logger System** (`app/lib/logger.ts`):

```typescript
import { logInfo, logWarn, logError, flushLogger } from '~/lib/logger';

logInfo('User logged in', { email: user.email, organizationId });
logWarn('High memory usage detected', { threshold: 512 });
logError('Database connection failed', error, { retryCount: 3 });

// Flush pending events (call on server shutdown)
await flushLogger(5000);
```

**Configuration**:

```bash
# Error tracking backend
OBSERVABILITY_TARGET=console|sentry

# Sentry configuration (optional)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production  # Falls back to NODE_ENV
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions sampled
```

**Behavior**:
- Console: Logs to stdout/stderr
- Sentry: Sends errors to Sentry dashboard with environment and session context

### Metrics & Analytics

Record user actions and business metrics with StatsD or console output.

**Recording Metrics** (`app/lib/metrics.server.ts`):

```typescript
import { recordMetric } from '~/lib/metrics.server';

// Increment counter
recordMetric('domieuro.apiKeys.created', {
  tags: { organizationId: user.organizationId }
});

// With value
recordMetric('domieuro.response.time', {
  value: durationMs,
  tags: { endpoint: '/api/data' }
});
```

**Configuration**:

```bash
# Output target
METRICS_TARGET=console|statsd

# StatsD configuration (if using statsd)
METRICS_STATSD_HOST=127.0.0.1
METRICS_STATSD_PORT=8125

# For local testing: nc -ul 8125 (listen on UDP)
```

**Format**:
- Console: `[metric] domieuro.feature.action { tags: { organizationId: "..." } }`
- StatsD: `domieuro.feature.action:1|c` (counter format)

**Usage Pattern**: Metrics are recorded at key points (API key creation, data export, org switches, billing events) to track user behavior and product engagement.

### Email Notification System

Pre-built email templates for user communications. System is pluggable—templates are rendered to Markdown but transport layer awaits ESP integration.

**Available Templates** (`app/lib/email.server.ts`):

```typescript
// New team member invitation
sendWelcomeEmail(recipient, organizationName, inviterName)

// Seat addition/removal notifications
sendSeatChangeEmail(recipient, changes: { added?, removed? })

// Access revocation
sendUserRemovedEmail(recipient, organizationName, removedBy)

// Ownership transfer (dual email)
sendOwnershipTransferEmails(newOwner, oldOwner, organizationName)
```

**Configuration**:

```bash
# Email output transport
EMAIL_TRANSPORT=console|file

# Preview directory (for QA review)
EMAIL_PREVIEW_DIR=tmp/mail-previews

# Product name in emails
APP_NAME=DomiEuro
```

**Current Implementation**:
- Email templates are rendered to Markdown and written to disk (`tmp/mail-previews/`)
- Used in team management workflows (invite, remove, transfer)
- Ready for ESP integration (SendGrid, Resend, etc.)

**Next Steps for Integration**:
1. Add ESP client (SendGrid, Resend, Mailgun, etc.)
2. Update `EMAIL_TRANSPORT` implementation to call ESP API
3. Store email send status in Convex for audit trail

### Provider Services Pattern

Centralized service interfaces organized by domain to avoid circular dependencies and enable hot-reloading.

**Service Modules** (`app/services/providers.server.ts`):

```typescript
// Billing operations (Stripe integration)
export const billingService = {
  createCheckoutSession(),
  createBillingPortalSession(),
  getStripeCustomer(),
  handleWebhook(),
  // ... etc
};

// Auth & permissions (WorkOS + Convex)
export const rbacService = {
  requireUser(request),
  requireRole(request, allowedRoles),
  requireTier(request, tier),
  createOrganization(),
  // ... etc
};

// Database operations
export const convexService = {
  client, // Convex client instance
  createOrUpdateUser(),
  // ... etc
};
```

**Usage Pattern**:

```typescript
// In route loaders/actions (dynamic import to avoid circular deps)
export async function loader({ request }: LoaderFunctionArgs) {
  const providersModule = await import('~/services/providers.server');
  const user = await providersModule.rbacService.requireRole(request, ['owner']);

  const subscription = await providersModule.convexService.client.query(
    api.subscriptions.getByOrganization,
    { organizationId: user.organizationId }
  );

  return data({ user, subscription });
}
```

**Why This Pattern**:
- Avoids circular dependency issues when services reference each other
- Enables hot-reloading in development
- Clear separation of concerns
- Makes mocking easier in tests

### Theming System

Customize application appearance via CSS custom properties. Supports light/dark themes and flexible color overrides.

**CSS Tokens** (`app/app.css`):

```css
/* Surface colors */
--surface-base
--surface-raised
--surface-muted
--surface-subtle
--surface-inverted

/* Borders */
--border-subtle
--border-strong

/* Text */
--text-primary
--text-secondary

/* Brand colors */
--brand-primary
--brand-primary-hover
--brand-text

/* Semantic colors */
--accent-success
--accent-warning
--accent-danger
```

**Available Themes**:

```html
<!-- Light (default) -->
<html data-theme="light">

<!-- Dark -->
<html data-theme="midnight">
```

**Customization** (see `docs/THEMING.md`):
- Override CSS custom properties in component styles
- Add new themes by defining new color sets
- Component classes: `.btn-primary`, `.bg-surface-raised`, `.text-secondary`, etc.

### Analytics & Conversion Tracking

Track free-to-paid conversions with context about which feature triggered the upgrade.

**Conversion Metrics** (`convex/analytics.ts`):

```typescript
// Query: api.analytics.getConversionMetrics()
{
  totalConversions: 42,

  // Breakdown by feature that triggered upgrade
  byFeature: {
    'analytics': 15,
    'api': 12,
    'storage': 10,
    'premium-support': 5
  },

  // Average time before conversion
  averageDaysOnFreeTier: 28,

  // Detailed conversion records
  conversions: [
    {
      organizationId: 'org_123',
      upgradedAt: '2024-10-25T20:00:00Z',
      triggerFeature: 'analytics',  // Which feature gate prompted upgrade?
      daysOnFreeTier: 35
    }
  ]
}
```

**Data Flow**:

1. **Trigger Point**: User hits feature gate on free tier
2. **Pricing Page**: Checkout metadata includes `triggerFeature`
3. **Stripe Webhook**: Persists to Convex subscriptions table
4. **Analytics Route**: Dashboard displays conversion funnel by feature

**Fields in Subscriptions Table**:
- `upgradedFrom` - Previous tier ('free', 'starter')
- `upgradedAt` - Timestamp of upgrade
- `upgradeTriggerFeature` - Which feature prompted the upgrade
- `daysOnFreeTier` - Duration on free tier before upgrade

### Demo Mode & Data Seeding

Populate Convex with test organizations and data for development and walkthrough scenarios.

**Seeding Command**:

```bash
npm run seed:demo
```

**Populates**:
- Free tier organization (1 seat)
- Starter tier organization (5+ seats)
- Professional tier organization (20+ seats)
- Sample team members with different roles
- Billing history and invoice data
- Audit logs of various actions

**Enable in UI**:

```bash
FEATURE_FLAGS=demoMode npm run dev
```

**Demo Mode Features**:
- Shows onboarding copy and instructions
- Displays launch checklist at `/settings/onboarding`
- Highlights feature gates that would unlock on upgrades
- Provides sample data for testing workflows

## Key Features & Implementation Notes

### Multi-Tenant Architecture

- Each user must belong to an organization (organizationId is required)
- WorkOS handles organization creation and member management
- Organizations are isolated in the Convex database via organizationId field
- Use `getUsersByOrganization` query to fetch organization-specific data
- **CRITICAL**: All queries must filter by organizationId to prevent data leaks

### Role-Based Access Control (RBAC)

The app implements 5 user roles with hierarchical permissions:

1. **Owner** - Full access including billing and ownership transfer
2. **Admin** - User management and billing view
3. **Manager** - Product access only
4. **Sales** - Sales-specific features
5. **Team Member** (slug: 'member') - Basic product access

**Permission System** (`app/lib/permissions.ts`):

- `hasPermission(role, permission)` - Check specific permission
- `hasRole(role, allowedRoles)` - Check if role is in allowed list
- `hasTierAccess(currentTier, requiredTier)` - Check subscription tier access

**Authentication Middleware** (`app/lib/auth.server.ts`):

- `requireUser(request)` - Require authenticated user
- `requireRole(request, allowedRoles)` - Require specific role(s)
- `requireTier(request, requiredTier)` - Require subscription tier
- `syncUserRoleFromWorkOS(workosUserId)` - Sync role from WorkOS to Convex

**Role Management**:

- Roles are configured in WorkOS Dashboard
- Roles are synced to Convex on every login
- Default role is 'member' for new users
- Organization creator is automatically assigned 'owner' role

### Convex Database Access Patterns

- **Server-side**: Use `convexServer` from `lib/convex.server.ts` in loaders/actions
- **Client-side**: Use hooks from `lib/useConvex.ts` in React components
- **Type Safety**: Auto-generated types in `convex/_generated/` provide full type safety
- **Real-time**: Client-side queries automatically update when data changes

### Authentication Implementation

The authentication flow is split across multiple routes:

1. `/auth/login` - Initiates WorkOS AuthKit flow
2. `/auth/callback` - Handles OAuth callback, creates/updates user in Convex
3. `/auth/organization-selection` - Allows users to select/create organizations
4. `/auth/create-organization` - Organization creation form

**Protected Routes**: Use `requireUser(request)` in loaders to enforce authentication

### Testing Strategy

The codebase has comprehensive test coverage (464 tests passing):

**Unit Tests** (`test/unit/`):

- `permissions.test.ts` - 114 tests for RBAC system (100% coverage)
- `auth.server.test.ts` - 70 tests for authentication (100% coverage)
- `billing-*.test.ts` - Tests for Stripe integration and billing logic
- `convex-*.test.ts` - Tests for Convex operations (users, subscriptions, analytics)
- `stripe.server.test.ts` - 32 tests for Stripe API operations

**Integration Tests** (`test/integration/`):

- `multi-tenancy.test.ts` - 12 CRITICAL tests verifying organization isolation
- `team-management.test.ts` - Team operations with email notifications
- `billing-dashboard.test.ts` - Billing and seat management workflows
- `ownership-transfer.test.ts` - Organization ownership transfer flow
- `stripe-webhooks.test.ts` - Stripe webhook handling

**Mocks** (`test/mocks/`):

- `workos.ts` - Complete WorkOS SDK mock with auth and org management
- `convex.ts` - Convex client mock with in-memory database
- `stripe.ts` - Stripe SDK mock for billing tests

**Test Patterns**:

- AAA pattern: Arrange, Act, Assert
- Use `describe()` to group related tests
- Use `it.each()` for testing multiple scenarios
- Mock external dependencies (WorkOS, Convex, Stripe)
- Test happy paths, error cases, and edge cases
- See `test/examples/` for reference implementations

**Coverage Requirements**:

- Security-critical code (auth, permissions): 100% coverage
- Standard business logic: 80% coverage minimum
- Routes are tested via integration tests (not unit tests)

**Running Tests**:

- `npm run test:run` - Run all tests once (CI mode)
- `npm test` - Run tests in watch mode during development
- `npm run test:ui` - Interactive test debugging UI
- `npm run test:coverage` - Generate coverage report

### Billing System (Optional Feature)

This template includes comprehensive Stripe billing documentation:

- See `BILLING_ROADMAP.md` for ~100 implementation tasks
- See `BILLING_GUIDE.md` for architecture overview
- See `STRIPE_SETUP.md` and `WORKOS_RBAC_SETUP.md` for configuration
- The billing system is NOT implemented by default - documentation only

**Billing Features** (when implemented):

- 3 pricing tiers: Free (1 seat), Starter (£50/mo, 5-19 seats), Professional (£250/mo, 20-40 seats)
- Seat-based pricing: £10/seat/month for additional seats
- Annual billing: 10x monthly price (2 months free)
- 28-day grace period for failed payments
- Scheduled downgrades (warnings, not blocking)
- Stripe Customer Portal integration

## Architectural Patterns & Development Gotchas

### Dynamic Imports in Route Loaders/Actions

Routes use `await import()` to load service modules dynamically. This avoids circular dependencies and enables hot-reloading.

```typescript
// Routes do NOT import services at module level
// Instead, dynamically import in loaders/actions:

export async function loader({ request }: LoaderFunctionArgs) {
  const providersModule = await import('~/services/providers.server');
  const user = await providersModule.rbacService.requireRole(request, ['owner']);
  // ...
}
```

**Why**: Services reference each other (RBAC → Convex, Billing → RBAC), which creates circular dependencies if imported at module level. Dynamic imports resolve at function call time.

### Server-Side Module Isolation

Never import server-only modules at the top level of routes or components. Always import them inside loaders/actions:

```typescript
// ❌ WRONG - creates bundle bloat and SSR issues
import { billingService } from '~/services/providers.server';

export function MyComponent() {
  // ...
}

// ✅ CORRECT - import only where needed
export async function action() {
  const providersModule = await import('~/services/providers.server');
  const result = await providersModule.billingService.createCheckoutSession(...);
}
```

### Convex Type Generation

After modifying `convex/schema.ts` or function signatures, regenerate types:

```bash
npx convex codegen
```

This updates `convex/_generated/api.ts` which is used everywhere for type-safe queries/mutations. If types are out of sync, TypeScript won't catch errors.

### Multi-Tenancy Data Isolation

**CRITICAL**: All Convex queries must filter by `organizationId` to prevent data leaks between organizations.

```typescript
// ✅ CORRECT - filters by org
const users = await convex.query(api.users.getByOrganization, {
  organizationId: user.organizationId
});

// ❌ WRONG - exposes all users across orgs
const users = await convex.query(api.users.list);
```

Every integration test verifies this with `test/integration/multi-tenancy.test.ts` (12 critical tests).

### Role Sync Timing

User roles are synced from WorkOS to Convex **on every login**, not just on creation:

```typescript
// In auth.server.ts callback
await syncUserRoleFromWorkOS(workosUserId);
```

This means role changes in WorkOS immediately propagate after next login. Cached roles in UI update on page reload.

### Email Template Rendering

Email templates render to Markdown files for QA review before ESP integration:

```typescript
// Email sent → tmp/mail-previews/2024-10-25T20-00-00-000Z-welcome.md
sendWelcomeEmail(recipient, orgName, inviter);
```

Preview files are in Markdown format for easy review. When integrating an ESP:
1. Keep the template rendering
2. Add ESP send step after rendering
3. Store send status in Convex audit log

### Feature Flag Feature Gates

Routes that are feature-gated must redirect if disabled:

```typescript
export async function loader() {
  const featureFlags = listFeatureFlags();
  const enabled = featureFlags.some(f => f.key === 'apiKeys' && f.enabled);

  if (!enabled) {
    return redirect('/settings'); // Fallback to working page
  }
  // ...
}
```

**Important**: Feature flags are read at **server startup** from environment variables. Changes require server restart. This is intentional for safety—feature flag bugs don't break things mid-request.

### Metrics Are Fire-and-Forget

Metrics are recorded asynchronously without blocking requests:

```typescript
recordMetric('domieuro.apiKeys.created', { tags: { organizationId } });
// Returns immediately; sent to StatsD/console in background
```

Don't wait for metrics in critical paths. If StatsD is down, requests continue normally.

## Development Philosophy

### Security First

- Never use `any` types - use proper typing
- Never use non-null assertions - use runtime validation
- All authentication must check organizationId (multi-tenancy)
- All sensitive operations require role checks
- Environment variables must be validated at runtime

### Type Safety

- Leverage TypeScript's type inference
- Use auto-generated Convex types from `convex/_generated/`
- Import types from official SDKs (WorkOS, Stripe)
- Use React Router's `Session` type for session management

### Testing Requirements

- Write tests for all new business logic
- Achieve 80%+ coverage for standard code, 100% for security-critical code
- Mock external dependencies (WorkOS, Convex, Stripe)
- Test multi-tenancy isolation for any organization-scoped queries
- Use `test/examples/` as reference for writing tests

### Error Handling

- Provide helpful error messages for development
- Mask sensitive errors in production
- Log errors with context (but not sensitive data)
- Validate environment variables at startup

## Documentation Structure

- `README.md` - Getting started and overview
- `CLAUDE.md` - This file (AI development guidance)
- `WORKOS_SETUP.md` - WorkOS authentication configuration
- `CONVEX_SETUP.md` - Database setup and usage
- `TEMPLATE_USAGE.md` - Customization and feature removal
- `BILLING_ROADMAP.md` - Stripe billing implementation guide (100+ tasks)
- `BILLING_GUIDE.md` - Billing system architecture
- `STRIPE_SETUP.md` - Stripe configuration
- `WORKOS_RBAC_SETUP.md` - Role configuration
- `FEATURE_GATES.md` - Tier-based feature access
- `AGENTS.md` - AI agent documentation for complex implementations
- `test/README.md` - Comprehensive testing guide
- `CHANGELOG.md` - Version history and changes
