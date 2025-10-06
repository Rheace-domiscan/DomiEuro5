# Repository Guidelines

## Project Structure & Module Organization
- Route logic lives in `app/`; `app/routes/` mirrors the URL tree, while shared UI sits in `components/` and cross-cutting services in `lib/` (WorkOS, Stripe, Convex clients).
- Convex schema and server functions are under `convex/`; regenerate generated code after schema edits with `npx convex dev --once`.
- Tests co-locate with features and aggregate in `test/`; static assets land in `public/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite-backed SSR dev server for local work.
- `npm run build && npm run start` produces production bundles in `build/` and serves them for smoke testing.
- `npm run typecheck` regenerates Remix route types, then runs `tsc`; fix blockers before committing.
- `npm run lint` (or `npm run lint:fix`) applies ESLint + Prettier rules.
- `npm run test:run` executes the Vitest suite, including Convex integrations via `convex-test`.

## Coding Style & Naming Conventions
- TypeScript is mandatory; prefer explicit return types for loaders, actions, Convex functions, and shared utilities.
- Formatting is enforced by Prettier (2-space indentation, semicolons, trailing commas). Avoid manual wrapping.
- File naming: components and Convex modules in PascalCase, hooks and utilities in camelCase, tests mirror their targets.
- Use Tailwind utilities inline with JSX; fall back to `app/app.css` only for shared styles.

## Testing Guidelines
- Write Vitest specs alongside features or in `test/`; follow patterns in `test/unit/convex-*.test.ts`.
- Use `convex-test` helpers for Convex logic and ensure key flows hit the test runner before PR review.
- Capture manual Stripe smoke checks with `stripe listen --forward-to http://localhost:5173/webhooks/stripe` when touching billing.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat:`, `fix:`); mention schema or webhook updates in the body and commit regenerated `convex/_generated/*` artifacts.
- PRs should summarize scope, list validation commands (`npm run lint`, `npm run typecheck`, `npm run test:run`), link roadmap issues, and attach UI screenshots when relevant.

## Security & Configuration Tips
- Secrets reside in `.env.local`; never commit WorkOS, Stripe, or Convex keys. Keep `CONVEX_URL` and `VITE_CONVEX_URL` aligned with the active dev deployment.
- Re-run `npx convex dev --once` after schema changes, and review `WORKOS_SETUP.md`, `STRIPE_SETUP.md`, `CONVEX_SETUP.md` before tweaking auth or billing.
