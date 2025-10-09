# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds React Router routes, loaders/actions, and shared services. Server-only Stripe/WorkOS/Convex helpers live in `app/services/providers.server.ts`; import them lazily inside loaders.
- `components/` contains reusable UI (e.g., `components/navigation/TopNav.tsx`), while `lib/` keeps browser-side Convex helpers.
- `convex/` stores schema and server functions; regenerate types with `npx convex dev --once` after schema edits.
- Documentation sits in `docs/`; Playwright specs live in `e2e/`; Vitest suites co-locate under `test/`.

## Build, Test, and Development Commands
- `npm run dev` — Launch React Router dev server with HMR.
- `npm run build && npm run start` — Produce and serve the SSR production build.
- `npm run lint` / `npm run typecheck` — ESLint + Prettier and React Router typegen + `tsc`.
- `npm run test:run` / `npm run test:e2e` — Execute Vitest integration/unit suites and Playwright smoke flows.
- `npm run env:copy <profile>` / `npm run env:activate <profile>` / `npm run env:sync <profile>` — Manage `.env.<profile>` snapshots.
- `npm run seed:demo` — Populate Convex with sample Free/Starter/Professional tenants (requires `CONVEX_URL`).

## Coding Style & Naming Conventions
- TypeScript everywhere; enable explicit return types for loaders, actions, and Convex functions.
- Prettier enforces 2-space indentation, semicolons, and trailing commas; run `npm run lint:fix` for formatting.
- PascalCase components/modules, camelCase hooks/utilities, and route files mirror the URL tree (e.g., `settings.team.transfer-ownership.tsx`).
- Use `~/lib/logger` (`logInfo`, `logWarn`, `logError`) for structured output. Switch to Sentry by setting `OBSERVABILITY_TARGET=sentry` and `SENTRY_DSN` in the environment.

## Testing Guidelines
- Prefer Vitest for unit/integration tests; name files `<feature>.test.ts` alongside code or under `test/`.
- Use `convex-test` helpers when mocking Convex; rely on `vi.mock('~/services/providers.server')` to stub Stripe/WorkOS calls.
- Playwright (`e2e/`) covers auth, settings, and billing happy paths; run `npx playwright install` once per machine.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`). Include regenerated `convex/_generated/*` after schema changes.
- PRs list scope, validation commands (`npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:e2e`), linked issues, and screenshots for UI updates.
- Record release notes in `CHANGELOG.md` and drop verification reports into `.claude/verification-reports/` when finishing roadmap phases.

## Security & Configuration Tips
- Secrets belong in `.env.local` or `.env.<profile>`; keep `CONVEX_URL` and `VITE_CONVEX_URL` aligned.
- Stripe webhooks: run `stripe listen --forward-to http://localhost:5173/webhooks/stripe` during billing work.
- Rotate provider keys regularly and audit access via `docs/SECURITY_CHECKLIST.md` before production pushes.
- Email previews default to Markdown files under `tmp/mail-previews/`; clean the folder or switch to `EMAIL_TRANSPORT=console` for CI runs.
