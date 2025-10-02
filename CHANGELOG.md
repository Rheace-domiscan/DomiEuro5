# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-10-02

### 🎉 Major Feature - Phase 4.9: Testing Framework Setup

This release introduces comprehensive testing infrastructure with Vitest before proceeding to Phase 5 (Stripe billing implementation). This ensures all authentication, permissions, and multi-tenancy code is thoroughly tested before handling financial transactions.

### Added
- **Testing Framework**
  - Vitest test runner with React Router v7 support
  - @vitest/ui for interactive test debugging
  - @testing-library/react for component testing
  - happy-dom environment for fast DOM testing
  - @vitest/coverage-v8 for code coverage reporting
  - @testing-library/jest-dom for DOM assertions

- **Test Configuration** (`vitest.config.ts`)
  - React Router v7 plugin integration
  - TypeScript path alias support (~/* → app/*)
  - Global test environment setup
  - Coverage thresholds (80% for standard code, 85%+ for security-critical)
  - Automatic test file discovery (*.test.{ts,tsx})

- **Mock Utilities**
  - `test/mocks/workos.ts` - Complete WorkOS SDK mock
    - Mock authentication methods (getUser, authenticateWithCode)
    - Mock organization management (createOrganization, listOrganizations)
    - Mock organization memberships with role support
    - Reset utilities for clean test state
  - `test/mocks/convex.ts` - Convex client mock
    - Mock query/mutation/action methods
    - Mock database with in-memory storage
    - Helper functions for query/mutation setup
    - Support for multi-tenancy testing

- **Test Infrastructure**
  - `test/setup.ts` - Global test configuration
    - Automatic cleanup after each test
    - Mock environment variables
    - Extended Vitest matchers

- **Phase 4.9 Documentation** (BILLING_ROADMAP.md)
  - 30-task specification for retroactive testing
  - Part A: Testing framework setup (15 tasks)
  - Part B: Retroactive tests for Phases 1-4 (11 tasks)
  - Part C: Documentation and CI integration (4 tasks)
  - Expected: 80-100 tests, >85% coverage on security code

### Changed
- **BILLING_ROADMAP.md Structure**
  - Inserted Phase 4.9 between Phase 4 and Phase 5
  - Added comprehensive testing requirements before Stripe integration
  - Documented why retroactive testing is critical (financial transactions in Phase 5)
  - Updated Phase 5 dependencies to require Phase 4.9 completion

- **Package Dependencies**
  - Added comprehensive testing stack to devDependencies
  - Added @vitejs/plugin-react for test environment
  - Total: 70 new packages for testing infrastructure

### Technical Details
- **Phase 4.9 Status**: 🟡 IN PROGRESS (Part A: 6/15 tasks complete)
- **Next Steps**:
  - Complete mock utilities (Stripe mock pending)
  - Create test helpers and fixtures
  - Write retroactive tests for permissions, auth, and multi-tenancy
  - Achieve >85% coverage on security-critical code
- **TypeScript**: 0 errors, all type checks passing
- **Why This Phase**: Phase 5 involves Stripe webhooks and financial transactions - cannot proceed without verifying auth/permissions work correctly

### Files Created
- `vitest.config.ts` - Vitest configuration
- `test/setup.ts` - Global test setup
- `test/mocks/workos.ts` - WorkOS SDK mock (200+ lines)
- `test/mocks/convex.ts` - Convex client mock (190+ lines)

### Files Modified
- `BILLING_ROADMAP.md` - Added Phase 4.9 (280+ lines)
- `package.json` - Added 8 testing dependencies
- `package-lock.json` - Locked testing package versions

### Verification Results
```
✅ Vitest: Installed and configured
✅ Test environment: happy-dom configured
✅ Mocks: WorkOS and Convex mocks created
✅ Coverage: Thresholds configured (80% standard, 85% security)
⏳ Tests: Pending (Part B of Phase 4.9)
```

### Why Phase 4.9 Exists
**Critical Security Decision**: Phases 1-4 were implemented without tests. Before proceeding to Phase 5 (Stripe webhooks handling real money), we must:
1. Verify authentication actually works
2. Prove permissions cannot be bypassed
3. Confirm multi-tenancy prevents data leaks
4. Establish testing patterns for future phases

Retroactive testing takes longer than test-first development, but is essential for financial transaction safety.

### Next Phase
Ready for **Phase 4.9 Part B**: Write 80-100 retroactive tests for existing code (permissions, auth, multi-tenancy)

## [1.2.0] - 2025-10-01

### 🎉 Major Feature - Phase 4: Authentication & Permissions Middleware

This release completes Phase 4 of the billing roadmap, implementing role-based access control (RBAC) middleware and tier-based feature gating for the billing system.

### Added
- **Permission System** (`app/lib/permissions.ts`)
  - Complete RBAC configuration with 5 user roles (owner, admin, manager, sales, member)
  - 3-tier subscription system (free, starter, professional)
  - Granular permission mapping for billing, user management, and feature access
  - Helper functions: `hasPermission()`, `hasRole()`, `hasTierAccess()`
  - Human-readable role and tier name getters

- **Authentication Middleware** (enhanced `app/lib/auth.server.ts`)
  - `requireRole()` - Protect routes by user role (e.g., owner/admin only)
  - `requireTier()` - Gate features by subscription tier (e.g., Starter+ only)
  - `syncUserRoleFromWorkOS()` - Automatic role sync from WorkOS to Convex
  - Enhanced session management with organizationId and role storage

- **Convex Role Management** (enhanced `convex/users.ts`)
  - `getUserRole()` query - Fetch user role with default fallback
  - `updateUserRole()` mutation - Update user roles in database
  - Role field added to users table schema

### Changed
- **Role Synchronization**
  - Auth callback now syncs user roles from WorkOS on every login
  - Organization creation automatically assigns 'owner' role to creator
  - Session stores both organizationId and role for quick access
  - Default role set to 'member' (matching WorkOS default)

- **WorkOS Integration**
  - `createOrganizationMembership()` now requires roleSlug parameter (fixed RBAC bug)
  - Role slug standardized to 'member' instead of 'team_member' (WorkOS compliance)
  - Enhanced error logging for organization creation failures

### Fixed
- **Critical Bugs**
  - Fixed missing `roleSlug` parameter in organization membership creation (causing silent failures)
  - Fixed role slug mismatch between code ('team_member') and WorkOS ('member')
  - Fixed CONVEX_URL configuration error (was using dashboard URL instead of deployment URL)
  - Fixed TypeScript errors in organization creation error handling

### Technical Details
- **Phase 4 Status**: ✅ COMPLETE - All 8 tasks verified
- **Dependencies**: Phase 3 (WorkOS RBAC Setup) prerequisite confirmed
- **TypeScript**: 0 errors, all type checks passing
- **ESLint**: 0 errors, 5 acceptable development warnings
- **Convex Schema**: Role field added to users table
- **Manual Testing**: ✅ Login flow tested, role syncing confirmed

### Verification Results
```
✅ Files: 1 created, 3 modified
✅ TypeScript: 0 errors
✅ Linting: 0 errors
✅ Convex: Schema deployed, functions working
✅ Manual Test: Role syncs from WorkOS to Convex
✅ No regressions detected
```

### Files Modified
- `app/lib/permissions.ts` - Created permission system
- `app/lib/auth.server.ts` - Added middleware and role sync
- `convex/users.ts` - Added role queries/mutations
- `convex/schema.ts` - Added role field to users table

### Next Phase
Ready for **Phase 5: Stripe Integration - Backend** (webhook handling, checkout sessions, subscription management)

## [1.1.1] - 2025-10-01

### Added
- **Dependencies**
  - Added `stripe@^19.0.0` - Stripe SDK for server-side billing integration
  - Added `@stripe/stripe-js@^8.0.0` - Stripe.js library for client-side payment flows

### Changed
- Completed Phase 2 verification of billing roadmap (Stripe Products Setup)
- All Stripe products and prices configured in Stripe Dashboard
- Environment variables validated and configured for Stripe integration

### Technical Details
- **Phase 2 Status**: ✅ VERIFIED - All 8 tasks complete
- **Dependencies**: Ready for Phase 5+ implementation (Stripe backend integration)
- **TypeScript**: 0 errors, all type checks passing
- **ESLint**: 0 errors, 5 acceptable development warnings

## [1.1.0] - 2025-10-01

### 🎉 Major Feature - Complete Stripe Billing System

This release adds comprehensive Stripe billing documentation for implementing a multi-tier subscription system with seat-based pricing, role-based access control, and flexible subscription management.

### Added
- **Billing System Documentation**
  - Created `BILLING_ROADMAP.md` - Step-by-step implementation guide with 17 phases and ~100 tasks
  - Created `STRIPE_SETUP.md` - Complete Stripe Dashboard configuration guide
  - Created `WORKOS_RBAC_SETUP.md` - Role-based access control setup with 5 custom roles
  - Created `BILLING_GUIDE.md` - System architecture and detailed workflows
  - Created `FEATURE_GATES.md` - Tier-based feature access control implementation guide

- **Subscription Tiers**
  - Free tier: 1 seat included
  - Starter tier: £50/month (5-19 seats)
  - Professional tier: £250/month (20-40 seats)
  - Additional seats: £10/seat/month
  - Annual billing: 10x monthly price (2 months free)

- **Role-Based Access Control**
  - 5 user roles: Owner, Admin, Manager, Sales, Team Member
  - WorkOS RBAC integration for role management
  - Granular permission system for billing, user management, and features

- **Key Features**
  - Stripe Customer Portal integration for self-service
  - 28-day grace period for failed payments
  - Flexible seat management (warnings, not blocking)
  - Scheduled downgrades at billing period end
  - Conversion tracking for upgrade analytics
  - Audit logging for sensitive actions
  - Billing history tracking

### Changed
- Updated `README.md` with billing features overview and documentation links
- Updated `TEMPLATE_USAGE.md` with billing customization and removal guides
- Updated `CONVEX_SETUP.md` with billing schema documentation
- Updated `WORKOS_SETUP.md` with RBAC integration notes

### Technical Details
- **Convex Schema Extensions**: Added 3 new tables (subscriptions, billingHistory, auditLog)
- **Stripe Integration**: Webhooks, Customer Portal, subscription management
- **Philosophy**: Never block operations - warnings and flexibility over enforcement
- **Separation of Concerns**: Stripe handles billing, Convex handles users
- **AI-Optimized Documentation**: Structured for solo AI-assisted development

### Documentation Structure
```
📚 Billing Documentation Suite:
├── BILLING_ROADMAP.md - Implementation guide (~100 tasks)
├── STRIPE_SETUP.md - Stripe configuration
├── WORKOS_RBAC_SETUP.md - Role configuration
├── BILLING_GUIDE.md - System architecture
└── FEATURE_GATES.md - Feature access control
```

## [1.0.0] - 2025-10-01

### 🎉 Major Release - Production-Ready Template

This release marks the template as production-ready with comprehensive documentation, hardened security, and complete feature set for B2B SaaS applications.

### Added
- **Documentation**
  - Created comprehensive `TEMPLATE_USAGE.md` for customization and portability
  - Created `LICENSE` file (MIT License)
  - Completely rewrote `README.md` with quick-start guide, features, and troubleshooting
  - Added detailed JSDoc comments to authentication utility functions
  - Enhanced inline documentation across auth flow and demo components

- **Configuration**
  - Created missing `convex.json` configuration file
  - Added comprehensive comments to `.env.example` explaining each variable
  - Added `convex/_generated/` to `.gitignore`

- **Security**
  - Gated `/test-workos` diagnostic route behind `NODE_ENV` check (production-safe)
  - Added development-only warning banner to diagnostic page
  - Improved error messages with helpful setup guidance

### Changed
- **Documentation Accuracy**
- Improved onboarding guidance for missing `VITE_CONVEX_URL` and `SESSION_SECRET` environment variables
- Added reminder to disable the `/test-workos` diagnostic route before sharing the template
  - **CRITICAL FIX**: Corrected `CONVEX_SETUP.md` schema documentation (marked `workosUserId` and `organizationId` as REQUIRED)
  - Updated mutation documentation to reflect required fields
  - Clarified `.env` vs `.env.local` handling
  - Updated environment variable setup instructions in `WORKOS_SETUP.md`

- **Error Handling**
  - Enhanced error messages in `create-organization.tsx` with specific guidance for permissions, rate limits, and configuration
  - Improved `workos.server.ts` and `convex.server.ts` error messages to reference setup documentation
  - Added WorkOS dashboard configuration guide and troubleshooting section

- **Code Quality**
  - Wrapped all console statements in `NODE_ENV === 'development'` checks
  - Added comprehensive flow documentation to `callback.tsx` explaining the auth journey
  - Enhanced `UsersDemo.tsx` with detailed comments on Convex reactive patterns
  - Added JSDoc examples for `getUser`, `requireUser`, and `createUserSession`

- **Package Metadata**
  - Updated `package.json` to version 1.0.0
  - Added description, keywords, and license metadata
  - Improved project discoverability

### Fixed
- Missing `convex.json` configuration file (referenced in docs but didn't exist)
- Incorrect schema documentation in `CONVEX_SETUP.md` (fields marked optional when required)
- Inconsistent environment variable naming in documentation
- Missing `.env` creation steps in setup guides

### Documentation Structure
```
📚 Complete Documentation Suite:
├── README.md - Quick-start, features, troubleshooting
├── WORKOS_SETUP.md - Authentication configuration
├── CONVEX_SETUP.md - Database setup and usage
├── TEMPLATE_USAGE.md - Customization and portability guide
├── CLAUDE.md - AI-assisted development
└── LICENSE - MIT License
```

### Technical Improvements
- All TypeScript checks passing ✅
- ESLint warnings reduced to 5 (development-only console logs)
- Comprehensive inline documentation
- Production-ready error handling
- Security-hardened debug routes

### Template Features
- 🔐 Enterprise authentication with WorkOS
- 📊 Real-time database with Convex
- 🏢 Multi-tenant organization support
- ⚡️ React Router v7 with SSR
- 🎨 TailwindCSS v4
- 🔒 TypeScript strict mode
- ✨ Production-ready patterns

## [0.2.2] - 2025-10-01

### Removed
- Removed Playwright tooling (`@playwright/test`, `@playwright/mcp`) to simplify project dependencies

### Changed
- Updated project documentation with agent setup guidance

## [0.2.1] - 2025-09-30

### Added
- Documented in-repo onboarding for multi-agent workflows via `AGENTS.md`
- Added Claude-specific quickstart guidance in `CLAUDE.md`

### Changed
- Brought in Playwright tooling (`@playwright/test`, `@playwright/mcp`) to prep end-to-end coverage

### Known Issues
- ESLint `no-console` warnings remain in auth flows and `components/UsersDemo.tsx`
- Generated Playwright reports (`playwright-report/`) are not yet ignored

## [0.2.0] - 2025-09-29

### Fixed
- ✅ **Code Quality & Type Safety**
  - Fixed all TypeScript `any` types with proper type definitions
  - Replaced all non-null assertions (`!`) with runtime validation
  - Added proper error types for WorkOS authentication and organization creation
  - Imported official `Organization` type from WorkOS SDK
  - Implemented `Session` type from React Router for session management

- ✅ **Security Improvements**
  - Made sensitive error logging development-only
  - Added environment variable validation with clear error messages
  - Removed console logging of user data in production
  - Implemented silent failure for URL parameter validation

- ✅ **ESLint & Prettier Setup**
  - Configured ESLint with TypeScript, React, and accessibility rules
  - Set up Prettier for consistent code formatting
  - Added linting scripts to package.json
  - Configured ignore patterns for unused parameters

### Technical Details
- **Error Handling**: Created `WorkOSError` and `OrganizationCreationError` types
- **Runtime Validation**: Added checks for `CONVEX_URL` and `VITE_CONVEX_URL`
- **Type Narrowing**: Leveraged TypeScript control flow analysis
- **Development Experience**: Conditional logging for development vs production

### Improvements
- Reduced linting issues from 1,747 to 0 errors and 9 warnings
- All remaining warnings are intentional (flow tracking and demo code)
- Enhanced code maintainability with proper typing
- Improved error messages for debugging

## [0.1.0] - 2025-09-28

### Added
- ✅ **Initial Remix App Setup**
  - Created new React Router app (modern Remix evolution)
  - Configured TypeScript and Tailwind CSS
  - Set up development and build scripts

- ✅ **WorkOS Authentication Integration**
  - Installed and configured WorkOS Node.js SDK
  - Implemented complete authentication flow (login, logout, callback)
  - Created secure session management with encrypted cookies
  - Added protected routes with automatic redirects

- ✅ **User Interface**
  - Custom home page with authentication state display
  - Clean login page with WorkOS integration
  - Protected dashboard route example
  - Responsive design with Tailwind CSS

- ✅ **Security Features**
  - Environment variable configuration
  - Secure session storage with HTTP-only cookies
  - CSRF protection through session tokens
  - Server-side user validation

### Technical Implementation
- **Authentication Flow**: OAuth with WorkOS AuthKit
- **Session Management**: React Router cookie sessions
- **Protected Routes**: Server-side authentication checks
- **Environment Setup**: `.env` configuration with examples
- **Documentation**: Complete setup guide for WorkOS integration

### Development Environment
- **Dev Server**: Runs on configurable ports (default 5174)
- **Type Safety**: Full TypeScript integration
- **Build Process**: Production-ready Vite builds
- **Hot Reload**: Development server with automatic updates

### Files Created
- `app/lib/workos.server.ts` - WorkOS configuration
- `app/lib/session.server.ts` - Session management
- `app/lib/auth.server.ts` - Authentication utilities
- `app/routes/auth/login.tsx` - Login page
- `app/routes/auth/callback.tsx` - OAuth callback handler
- `app/routes/auth/logout.tsx` - Logout endpoint
- `app/routes/dashboard.tsx` - Protected route example
- `.env` & `.env.example` - Environment configuration
- `WORKOS_SETUP.md` - Complete setup guide

### Next Steps
- Configure WorkOS application with identity providers
- Add additional authentication providers (Google, Microsoft, etc.)
- Implement user profile management
- Add role-based access control
- Set up production deployment configuration
