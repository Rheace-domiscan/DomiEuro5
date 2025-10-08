# Migration Playbook

Guidelines for evolving the template safely as you ship new SaaS products.

## Convex Schema Changes

1. Update `convex/schema.ts` and related modules.
2. Run `npx convex dev --once` or `npx convex codegen` to refresh generated types.
3. Execute `npm run typecheck` to catch breaking API changes.
4. Document the change in `CHANGELOG.md` and capture a verification report under `.claude/verification-reports/`.
5. If data backfills are required, create a temporary script in `convex/scripts/` (not committed) and document the process in this file.

## Stripe Product & Price Updates

- For tier price adjustments, update `app/lib/billing-constants.ts`, refresh `.env.<profile>` with new price IDs, and record the change in `STRIPE_SETUP.md`.
- When introducing new tiers, add Feature Gate definitions (`app/lib/permissions.ts`) and extend the pricing page components.
- Use the Playwright smoke tests plus manual Stripe CLI triggers to validate new flows.

## WorkOS Role / Permission Changes

- Add new roles to `WORKOS_RBAC_SETUP.md` and sync slug constants in `app/lib/permissions.ts`.
- Update settings navigation visibility rules where appropriate.
- Re-run RBAC regression tests (`test/integration/team-management.test.ts`).
- When wiring new WorkOS endpoints, import provider services (e.g. `rbacService`) inside loaders/actions to avoid bundling server-only modules in client shells.

## Environment Promotion

- Use `node scripts/manage-env.mjs sync <profile>` to push environment changes after local testing.
- Store migrations/runbook notes inside `docs/` so future teams understand staging → production steps.

## Feature Flags & Gradual Rollouts

- Define defaults in `app/lib/featureFlags.server.ts` and enable overrides via `FEATURE_FLAGS` or `FF_<FLAG>` environment variables.
- Wrap gated UI with feature checks in addition to tier checks (see settings placeholders for `usageAnalytics` & `integrationsHub`).
- Provide rollback instructions in this playbook whenever a new flag is added.

## Releasing New Template Versions

1. Update `CHANGELOG.md` with the version tag.
2. Run the verification suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run test:e2e`
3. Generate/refresh documentation screenshots or code samples if UX changes.
4. Publish a verification report capturing the release (e.g., `.claude/verification-reports/version-YYYY-MM-DD.md`).

Keep this playbook close to the code. Treat it as living documentation—update it whenever you add a new migration pattern so downstream teams can trust the template for their next SaaS product.
