# Repository Guidelines

This guide helps new agents contribute to the DomiEuro React Router + Convex workspace efficiently.

## Project Structure & Module Organization
- `app/` holds React Router entrypoints; `app/routes/` defines route modules and their loaders/actions.
- Shared UI lives in `components/`; cross-cutting services sit in `lib/` (WorkOS, Convex clients, helpers).
- Serverless database logic is under `convex/`; regenerate types with `npx convex codegen` whenever the schema changes.
- Static assets go in `public/`; routing config lives in `react-router.config.ts`, and environment setup docs in `WORKOS_SETUP.md` & `CONVEX_SETUP.md`.

## Build, Test, and Development Commands
- `npm install` installs dependencies and React Router dev tooling.
- `npm run dev` starts the Vite-powered dev server with SSR/HMR.
- `npm run build` outputs production bundles to `build/`; follow with `npm run start` to serve them locally.
- `npm run typecheck` runs route typegen followed by `tsc`; block merges on failures.
- `npm run lint` / `npm run lint:fix` enforce ESLint + Prettier rules; `npm run format:check` ensures no drift.
- Use the provided `Dockerfile` for parity builds: `docker build -t domieuro .`.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer explicit component, loader, and action return types.
- Prettier defaults (2 spaces, semicolons on, trailing commas where valid) control formatting—avoid manual reflow.
- React components and Convex mutations live in PascalCase files (e.g., `UsersDemo.tsx`); hooks/utilities stay camelCase.
- Tailwind utility classes live alongside JSX; central styles belong in `app/app.css` when abstractions are needed.

## Testing Guidelines
- Linting and type checks act as baseline gates; run both before opening a PR.
- End-to-end auth can be smoke-tested via `app/routes/test-workos.tsx` at `/test-workos`.
- When adding automated tests, colocate them near features (e.g., `app/routes/__tests__/foo.spec.tsx`) and document any new `npm run test` script.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `refactor:`) as seen in recent history.
- Scope commits tightly; note schema migrations or env variable changes in the body.
- PRs should outline the change, manual verification steps (`npm run dev`, `/test-workos`), and link relevant issues.
- Update `CONVEX_SETUP.md` and `WORKOS_SETUP.md` when integration steps change; attach screenshots or recordings for UI-facing work.

## Security & Configuration Notes
- Store secrets in `.env.local`; never commit keys sourced from WorkOS or Convex dashboards.
- Review `WORKOS_SETUP.md` before touching auth flows, and keep redirect URIs aligned with `WORKOS_REDIRECT_URI`.
