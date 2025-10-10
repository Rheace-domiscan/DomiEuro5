# Support & Ops Runbook

## Contacts
- Primary engineer: _fill_in_
- Secondary on-call: _fill_in_
- Customer escalation channel: support@yourdomain.com / #support Slack

## Common Requests
- **Data export**: Initiate from `/settings/support/data-export` and deliver the generated archive within 5 business days.
- **Account deletion**: Revoke WorkOS memberships, run the Convex cleanup mutation, and confirm via email.
- **Billing questions**: Use Stripe Dashboard → Customer → Timeline; note responses in CRM.

## Incident Workflow
1. Acknowledge alert in Sentry/StatsD dashboard.
2. Update incident doc (timestamp, impact, status).
3. Coordinate fix, record changes, and run regression tests.
4. Close incident with follow-up tasks logged in project tracker.

## Playbooks
- **Stripe outage**: Switch `METRICS_TARGET` to console for local diagnostics, notify customers via status page, and suspend webhooks.
- **WorkOS issues**: Enable demo mode flag + use seeded orgs to reproduce auth flows offline.
- **Convex latency**: Enable profiling, capture query plans, and coordinate with Convex support.

Keep this runbook in sync with the template so every new SaaS clone starts with the same operational expectations.
