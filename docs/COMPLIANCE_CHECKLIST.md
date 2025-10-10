# Compliance Checklist

Use this list to prep the template for SOC2/GDPR-style expectations as you clone new products.

## Data Protection
- [ ] Document data retention policies per environment and store them in `docs/` for auditors.
- [ ] Ensure `/settings/support/data-export` (or equivalent) honours right-to-access requests.
- [ ] Capture deletion requests via support runbook and implement a Convex mutation to redact personal data.

## Access Controls
- [ ] Audit WorkOS roles quarterly; record sign-off in `docs/audits/`.
- [ ] Rotate Convex, Stripe, and WorkOS secrets every 90 days; log evidence in CHANGELOG or runbooks.
- [ ] Enable Sentry/StatsD in production and wire alerts to your incident channel.

## Change Management
- [ ] Require CI checks (`npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:e2e`) on every PR.
- [ ] Use the onboarding checklist to ensure domains, billing, and theming match your deployment notes.

## Incident Response
- [ ] Store escalation contacts in `docs/SUPPORT_RUNBOOK.md`.
- [ ] Capture post-mortems in `docs/incidents/` with timestamp, impact, fix, and follow-up tasks.

Keep this file version-controlled so each downstream project inherits the same baseline. Update it whenever compliance requirements change.
