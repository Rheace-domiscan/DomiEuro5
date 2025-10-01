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

### Authentication Flow
The app uses WorkOS for authentication with organization support:

1. **Login**: Users authenticate via WorkOS AuthKit
2. **Organization Selection**: WorkOS handles organization creation/selection automatically
3. **User Creation**: Authenticated users are automatically created in Convex database
4. **Session Management**: Server-side sessions with secure cookies

**Key Auth Files:**
- `app/lib/auth.server.ts` - Main authentication logic and WorkOS integration
- `app/lib/session.server.ts` - Session management
- `app/lib/workos.server.ts` - WorkOS client configuration
- `app/routes/auth/` - Authentication route handlers

### Database Schema (Convex)
The Convex database has a `users` table with the following required fields:
- `email`, `name`, `workosUserId`, `organizationId` (all required)
- `createdAt`, `updatedAt`, `isActive`
- Indexes on email, workosUserId, organizationId, and createdAt

**Key Database Files:**
- `convex/schema.ts` - Database schema definition
- `convex/users.ts` - User CRUD operations
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

### Code Quality
- ESLint with TypeScript, React, and accessibility rules
- Prettier for code formatting
- Unused variables prefixed with `_` are ignored by linting

## Key Features & Implementation Notes

### Multi-Tenant Architecture
- Each user must belong to an organization (organizationId is required)
- WorkOS handles organization creation and member management
- Organizations are isolated in the Convex database via organizationId field
- Use `getUsersByOrganization` query to fetch organization-specific data

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

### Billing System (Optional Feature)
This template includes comprehensive Stripe billing documentation:
- See `BILLING_ROADMAP.md` for ~100 implementation tasks
- See `BILLING_GUIDE.md` for architecture overview
- See `STRIPE_SETUP.md` and `WORKOS_RBAC_SETUP.md` for configuration
- The billing system is NOT implemented by default - documentation only

## Documentation Structure
- `README.md` - Getting started and overview
- `CLAUDE.md` - This file (AI development guidance)
- `WORKOS_SETUP.md` - WorkOS authentication configuration
- `CONVEX_SETUP.md` - Database setup and usage
- `TEMPLATE_USAGE.md` - Customization and feature removal
- `BILLING_ROADMAP.md` - Stripe billing implementation guide
- `AGENTS.md` - AI agent documentation for complex implementations