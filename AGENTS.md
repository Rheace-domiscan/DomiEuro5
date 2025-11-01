# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts React Router routes plus loaders/actions; lazily import server-only helpers from `app/services/providers.server.ts`.
- UI components live in `components/`; browser Convex helpers stay in `lib/`.
- Convex schema and server functions reside under `convex/`; rerun `npx convex dev --once` after schema edits to refresh types.
- Documentation is in `docs/`; Vitest suites sit beside code or in `test/`; Playwright flows are in `e2e/`.

## Build, Test, and Development Commands
- `npm run dev` — start the React Router dev server with HMR.
- `npm run build && npm run start` — produce and serve the SSR production build.
- `npm run lint` / `npm run typecheck` — run ESLint + Prettier formatting and React Router typegen + `tsc`.
- `npm run test:run` / `npm run test:e2e` — execute Vitest integration/unit suites and Playwright smoke tests.
- `npm run env:copy <profile>`, `npm run env:activate <profile>`, `npm run env:sync <profile>` — manage environment snapshots.

## Coding Style & Naming Conventions
- TypeScript everywhere; keep explicit return types on loaders, actions, and Convex functions.
- Prettier enforces 2-space indentation, semicolons, and trailing commas; run `npm run lint:fix` to auto-format.
- Use PascalCase for components/modules, camelCase for hooks/utilities, and mirror URL segments in route filenames (e.g., `app/routes/settings.team.transfer-ownership.tsx`).
- Prefer `~/lib/logger` (`logInfo`, `logWarn`, `logError`) for structured logging.

## Testing Guidelines
- Favor Vitest for units/integration; name files `<feature>.test.ts`.
- Use `convex-test` helpers and `vi.mock('~/services/providers.server')` to stub backend providers.
- Playwright specs in `e2e/` cover auth, settings, and billing; run `npx playwright install` once per machine.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: add billing upgrade flow`).
- PRs should list scope, validation commands (`npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:e2e`), linked issues, and UI screenshots when relevant.
- Include regenerated `convex/_generated/*` whenever Convex schema changes.

## Security & Configuration Tips
- Keep secrets in `.env.local` or `.env.<profile>`; align `CONVEX_URL` and `VITE_CONVEX_URL`.
- During billing work, mirror Stripe webhooks with `stripe listen --forward-to http://localhost:5173/webhooks/stripe`.
- Before production pushes, review `docs/SECURITY_CHECKLIST.md` and rotate provider keys regularly.
