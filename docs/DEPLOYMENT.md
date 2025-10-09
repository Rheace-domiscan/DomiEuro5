# Vercel Deployment Guide

This template ships with a Vite-powered React Router server that runs cleanly on Vercel’s Node runtime. Follow these steps to deploy a new project.

## 1. Create Project

1. Push the repository to GitHub.
2. In Vercel, click **Add New → Project** and import the repo.
3. Select **Framework Preset: Other** (React Router is supported via the Node adapter).

## 2. Configure Build & Start

| Setting        | Value                    |
| -------------- | ------------------------ |
| Build Command  | `npm run build`          |
| Output Folder  | `build`                  |
| Install Command| `npm install` (default)  |
| Development Command | `npm run dev -- --host 0.0.0.0 --port 5173` |

After build, Vercel will serve `build/server/index.js` automatically.

## 3. Environment Variables

Populate the following under **Settings → Environment Variables** for each environment:

- `CONVEX_URL` / `VITE_CONVEX_URL`
- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`
- `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SESSION_SECRET`
- Optional observability & email knobs: `OBSERVABILITY_TARGET`, `SENTRY_DSN`, `EMAIL_TRANSPORT`, `EMAIL_PREVIEW_DIR`

Use `docs/ENVIRONMENTS.md` + `npm run env:sync <profile>` to keep `.env.production` aligned.

## 4. Convex & Stripe Webhooks

1. Deploy Convex schema: `npx convex deploy`.
2. Update `CONVEX_URL` in Vercel to match the production deployment.
3. In Stripe, create a production webhook targeting `https://your-vercel-domain/webhooks/stripe` and copy the signing secret to Vercel.

## 5. Playwright Smoke Checks

Before promoting, run locally:

```bash
npm run build && npm run start
npm run test:e2e -- --project=chromium
```

Capture any additional manual Stripe tests using `stripe listen --forward-to https://localhost:5173/webhooks/stripe`.

## 6. Post-Deploy Verification

- Confirm `/settings` loads and organization switcher works.
- Test Stripe checkout/portal flows with live API keys.
- Verify WorkOS SSO and role syncing using production tenants.
- Check Sentry (if enabled) for a test error, then disable demo feature flags.
