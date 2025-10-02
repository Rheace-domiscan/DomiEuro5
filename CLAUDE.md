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
  - `routes/` - File-based routing with auth routes, dashboard, etc.
  - `lib/` - Server-side utilities (auth, sessions, WorkOS integration)
- `convex/` - Convex database schema and functions
- `lib/` - Client-side utilities (Convex hooks, providers)
- `components/` - Reusable React components
- `test/` - Test files organized by type
  - `unit/` - Unit tests for business logic and utilities
  - `integration/` - Integration tests for multi-tenancy and workflows
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
Required environment variables (see `.env.example`):
- `WORKOS_API_KEY` - WorkOS API key (required for auth)
- `WORKOS_CLIENT_ID` - WorkOS client ID (required for auth)
- `WORKOS_REDIRECT_URI` - OAuth redirect URI (e.g., http://localhost:5173/auth/callback)
- `SESSION_SECRET` - Session encryption secret (required)
- `CONVEX_URL` - Convex deployment URL for server-side operations
- `VITE_CONVEX_URL` - Same Convex URL for client-side operations (must start with VITE_)

**Setup Order:**
1. Run `npx convex dev` to get CONVEX_URL and VITE_CONVEX_URL
2. Sign up for WorkOS and configure API keys (see WORKOS_SETUP.md)
3. Generate SESSION_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

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
The codebase has comprehensive test coverage (205 tests passing):

**Unit Tests** (`test/unit/`):
- `permissions.test.ts` - 114 tests for RBAC system (100% coverage)
- `auth.server.test.ts` - 48 tests for authentication (100% coverage)

**Integration Tests** (`test/integration/`):
- `multi-tenancy.test.ts` - 12 CRITICAL tests verifying organization isolation

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
