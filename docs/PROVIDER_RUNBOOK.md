# Provider Runbook (Stripe • WorkOS • Convex)

Centralize common operational tasks for the three core providers bundled with the template.

## Stripe

### Rotate API Keys
1. Generate new secret key in Dashboard → Developers → API keys.
2. Update `.env.<profile>` using `npm run env:activate <profile>` and `npm run env:sync <profile>`.
3. Redeploy services or restart local dev.
4. Remove the old key after confirming webhook delivery.

### Update Products & Prices
- Modify tier metadata in `app/lib/billing-constants.ts`.
- Create/adjust products in Stripe Dashboard and record price IDs in the matching `.env` profile.
- Run `npm run typecheck` + `npm run test:e2e` to confirm pricing and checkout continue to work.
- Document changes in `STRIPE_SETUP.md` for future projects.

### Webhook Hygiene
- Keep `STRIPE_WEBHOOK_SECRET` in sync per environment.
- Use `stripe listen --forward-to http://localhost:5173/webhooks/stripe` during development.
- Review `docs/SECURITY_CHECKLIST.md` before go-live and ensure signatures verify in logs.

## WorkOS

### Role & Membership Changes
- Add new roles in the WorkOS Dashboard.
- Update `WORKOS_RBAC_SETUP.md` and `app/lib/permissions.ts` accordingly.
- If you change roles programmatically, update `app/services/providers.server.ts` so helper functions stay central.

### Organization Provisioning
- WorkOS sandbox orgs can be scripted using WorkOS CLI, but record manual steps in `docs/MIGRATIONS.md` when onboarding new tenants.
- For multi-tenant QA/staging, create distinct organizations and store their IDs in `.env.<profile>` for testing flows.

### Offboarding / Access Revocation
- Deactivate memberships via `/settings/team` (automatically syncs with Convex).
- Rotate WorkOS client secrets via Developer Settings; update `.env` profiles immediately.

## Convex

### Schema Changes
- Update `convex/schema.ts` and run `npx convex dev --once` to regenerate types (`docs/MIGRATIONS.md`).
- Commit regenerated files in `convex/_generated/` when schema changes ship.
- Application code now imports Convex helpers through `app/services/providers.server.ts`; use the same module when wiring new mutations or queries so everything stays centralized and easy to mock in tests.

### Deployments
- Use `npx convex deploy --dry-run -y` to verify pending changes before production pushes.
- Align `CONVEX_URL`/`VITE_CONVEX_URL` in each `.env.<profile>`.

### Backups & Data Safety
- Enable backups in the Convex console and document retention in your ops handbook.
- Log audit events (`convex/auditLog.ts`) for all critical mutations.

## Checklist Before Releasing a New Clone
- [ ] Rotate provider secrets or provision fresh credentials for the new project.
- [ ] Update `.env` profiles and run through `docs/ENVIRONMENTS.md` steps.
- [ ] Validate WorkOS roles + Stripe products exist for the new tenant.
- [ ] Run `npm run test:run` and `npm run test:e2e`.
- [ ] Update `CHANGELOG.md` with provider-specific notes.
- [ ] Keep feature flags scoped per environment and document any preview toggles that should ship disabled by default.

## Observability & Notifications
- Local development defaults to `OBSERVABILITY_TARGET=console`; flip to `sentry` with `SENTRY_DSN` when you want hosted error tracking. Call `flushLogger()` before script exit to push pending events.
- The email helpers in `app/lib/email.server.ts` write Markdown previews to `tmp/mail-previews/` when `EMAIL_TRANSPORT=file`. Point `EMAIL_PREVIEW_DIR` at a writable path on your host or swap to `EMAIL_TRANSPORT=console` for ephemeral environments.
