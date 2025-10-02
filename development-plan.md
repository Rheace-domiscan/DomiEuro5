# Starter Hardening Plan

## 1. Environment Variable Bootstrap

- Goal: Any future clone can run `npm run dev` immediately.
- Actions:
  - `.env.example` already exists - document actual `.env` creation in README with `cp .env.example .env`
  - Update `README.md` and `WORKOS_SETUP.md` to reference the template and clarify which values are optional until an integration is enabled
  - Replace the current hard `throw` statements with friendly errors that link back to the setup docs so derived projects fail fast with guidance instead of crashing
  - Add comments in `.env.example` explaining each variable's purpose and which need replacement vs safe defaults

## 2. Convex Schema and Docs Alignment (CRITICAL - Documentation Bug)

- Goal: Documentation accurately reflects expectations of generated projects.
- Actions:
  - **CRITICAL**: Fix CONVEX_SETUP.md lines 14-15 which say `workosUserId` and `organizationId` are optional, but actual schema requires them
  - Decide whether `workosUserId` and `organizationId` should stay required in `convex/schema.ts`; update schema or docs to match
  - Call out the validation requirements in the setup guide and provide an example mutation payload so consumers know what data to seed
  - Note the need to run `npx convex codegen` whenever the schema changes so template derivatives stay typed
  - Update `.gitignore` handling for `convex/_generated` and document commit strategy

## 3. WorkOS Onboarding Flow Guardrails

- Goal: Make the auth journey resilient when reused in new projects.
- Actions:
  - Improve messaging in `app/routes/auth/create-organization.tsx` to surface permission issues or disabled org creation, suggesting next steps
  - Document required WorkOS dashboard toggles (AuthKit enabled, org creation allowed) so new projects can self-serve configuration
  - Provide guidance in the docs on how to swap to organization selection only, or how to stitch in custom onboarding for teams that pre-provision orgs
  - Add WorkOS development mode setup documentation and instructions for creating test organizations

## 4. Convex Development Workflow

- Goal: Ensure future teams know how to point the app at a Convex instance.
- Actions:
  - **Create missing `convex.json` configuration file** (referenced in docs but doesn't exist)
  - Document the local path (`npx convex dev`) and remote deployment option, including where to place the resulting URLs (`CONVEX_URL` and `VITE_CONVEX_URL`)
  - Document first-time setup flow: `npx convex dev` → generates types → what to commit
  - Add a lightweight seed example (CLI snippet or mutation script) to populate a demo user/org, making dashboard routes usable out of the box
  - Clarify `.env` vs `.env.local` handling (CONVEX_SETUP.md references `.env.local` but setup uses `.env`)

## 5. Diagnostic Route Hygiene

- Goal: Keep `/test-workos` useful during setup but safe to ship as a starter.
- Actions:
  - Gate the route behind an environment check (e.g., render only when `NODE_ENV !== 'production'` or a flag is set) so future projects can leave it in place without leaking data
  - Add a reminder in `WORKOS_SETUP.md` about disabling the route before pushing to shared environments
  - Optionally swap the full auth URL display for a copy-to-clipboard button or console log to reduce accidental exposure while still aiding setup

## 6. Code Quality Cleanup for Template Distribution

- Goal: Code is production-quality and sets good example patterns for derivative projects.
- Actions:
  - Remove all 9 console.log/console.error statements from auth routes (callback.tsx, create-organization.tsx, organization-selection.tsx, UsersDemo.tsx)
  - Replace with proper logging infrastructure or structured comments explaining the flow
  - Run `npm run lint:fix` and ensure clean linting across the project
  - Add inline code comments explaining complex auth flows (temp session → org creation → final session pattern)
  - Consider adding JSDoc comments on key utility functions (auth helpers, Convex server operations)

## 7. Documentation Accuracy & Completeness

- Goal: All documentation matches current implementation and provides clear quick-start.
- Actions:
  - **Update README.md** - currently shows generic React Router template text, needs actual starter features
  - Add quick-start section to README: clone → `cp .env.example .env` → configure → `npx convex dev` → `npm run dev`
  - Create **TEMPLATE_USAGE.md** explaining how to use this as a base for new projects
  - Document how to rename/customize the template (package.json name, etc.)
  - Add architecture diagram showing auth flow (WorkOS → callback → org creation → Convex user creation)
  - Ensure all files referenced in documentation actually exist

## 8. Template Portability & Customization

- Goal: Easy to fork and customize for different use cases.
- Actions:
  - Add instructions for removing WorkOS (if someone wants different auth provider)
  - Add instructions for removing Convex (if someone wants different database)
  - Document the session management pattern and why temp session is used during org creation
  - Consider adding a setup script that prompts for project name and replaces placeholders
  - Document dependency choices and rationale (why these specific packages)

## 9. Example Code & Patterns

- Goal: Show best practices for common scenarios in derivative projects.
- Actions:
  - Enhance UsersDemo.tsx with more inline comments explaining the data fetching pattern
  - Add example of protected route with organization-based filtering
  - Add example of proper loading/error state handling in auth flows
  - Document the server-side vs client-side Convex usage patterns
  - Add example of handling WorkOS webhook events (if applicable)

## 10. Template Metadata & Licensing

- Goal: Clear licensing and attribution for template usage.
- Actions:
  - Add LICENSE file with appropriate license for template usage
  - Add CONTRIBUTORS.md or template credits section
  - Add template version number in package.json
  - Document any peer dependency requirements
  - Decide on lockfile strategy (npm/pnpm/yarn) for template consumers
