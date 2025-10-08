# Security Checklist

This checklist helps keep the template secure as you customize it for new SaaS products. Use it before every release and whenever you add new infrastructure.

## Identity & Access

- [ ] Enforce 2FA on Stripe, WorkOS, Convex, and hosting providers.
- [ ] Restrict production environment access to least privilege (RBAC in WorkOS dashboard).
- [ ] Rotate API keys quarterly and immediately after staff changes.
- [ ] Store secrets in a vault (1Password, Vault, Doppler) rather than sharing `.env` files directly.

## Application Hardening

- [ ] Audit routes using `requireUser`, `requireRole`, and `requireTier` (no public leakage of protected data).
- [ ] Review Convex functions for authorization checks and rate limiting (add `internal` functions where appropriate).
- [ ] Confirm Stripe webhook signing secret is set and verified in `app/routes/webhooks/stripe.tsx`.
- [ ] Sanitize user-supplied strings before logging or rendering (especially WorkOS metadata).

## Data Protection

- [ ] Ensure session cookies are `Secure`, `HttpOnly`, `SameSite=lax` in production.
- [ ] Configure Stripe Customer Portal to mask card data and disable unnecessary features.
- [ ] Enable Convex backups and review retention policy.
- [ ] Document data deletion process (customer offboarding, GDPR requests) in your ops runbook.

## Monitoring & Alerting

- [ ] Enable Stripe webhooks alerting (Slack/email) for failed payments and disputed charges.
- [ ] Configure WorkOS event webhooks for login anomalies if using advanced security features.
- [ ] Add availability monitoring for the public site (UptimeRobot, BetterStack, PagerDuty, etc.).
- [ ] Track error rates via your logger/Sentry (instrument `lib/logger` integration).

## Release Readiness

- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run test:e2e` before deploys.
- [ ] Review CHANGELOG entries for the release and update `VITE_CONVEX_URL`/`CONVEX_URL` as needed.
- [ ] Verify `/settings` dropdown items behave correctly for each role (owner, admin, manager, member).
- [ ] Capture audit trail: commit `docs/verification-reports/*` when relevant phases are verified.

Keep this file updated as you add new services (email providers, analytics, feature flags) so future projects inherit the security posture automatically.
