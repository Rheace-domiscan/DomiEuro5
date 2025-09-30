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

- `npx convex deploy` - Deploy Convex functions and schema to the cloud
- `npx convex dev` - Start local Convex development server

## Architecture Overview

This is a React Router v7 application with WorkOS authentication and Convex database integration.

### Tech Stack
- **Frontend**: React Router v7, React 19, TailwindCSS v4
- **Authentication**: WorkOS (with organization support)
- **Database**: Convex (real-time database)
- **Styling**: TailwindCSS with Vite plugin
- **Build Tool**: Vite with React Router plugin

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
- `WORKOS_API_KEY` - WorkOS API key
- `WORKOS_CLIENT_ID` - WorkOS client ID
- `WORKOS_REDIRECT_URI` - OAuth redirect URI
- `SESSION_SECRET` - Session encryption secret
- `CONVEX_URL` - Convex deployment URL

### TypeScript Configuration
- Uses strict TypeScript with React Router type generation
- Path alias: `~/*` maps to `./app/*`
- Includes Convex types and Vite client types

### Code Quality
- ESLint with TypeScript, React, and accessibility rules
- Prettier for code formatting
- Unused variables prefixed with `_` are ignored by linting