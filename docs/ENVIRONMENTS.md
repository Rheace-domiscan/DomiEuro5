# Environment Profiles

This template supports separate environment profiles (e.g. `development`, `staging`, `production`) so you can manage secrets without overwriting your primary `.env` file.

## Quick Start

```bash
# 1. Create a new profile from .env.example
node scripts/manage-env.mjs copy staging

# 2. Fill in the variables inside .env.staging
$EDITOR .env.staging

# 3. Activate the profile when you need it locally
node scripts/manage-env.mjs activate staging

# 4. After editing .env, push updates back into the profile
node scripts/manage-env.mjs sync staging
```

## Recommended Profiles

| Profile       | File               | Usage                                                  |
| ------------- | ------------------ | ------------------------------------------------------ |
| Development   | `.env`             | Default local development (managed manually)           |
| Staging       | `.env.staging`     | Hosted preview or shared QA environment                |
| Production    | `.env.production`  | Final production secrets (never commit)                |

Store deployment credentials in your hosting provider’s secret manager (e.g. Vercel, Fly.io) using the same variable names defined in `.env.example`.

## CI Integration

- Add a job step that runs `node scripts/manage-env.mjs activate staging` before kicking off builds/tests.
- Keep encrypted `.env.<profile>` files out of version control (`.gitignore` already ignores `.env*`).
- For local teammates, share encrypted copies of specific profiles via your secret vault (1Password, Vault, Doppler, etc.).

## Tips

- Regenerate Convex types (`npx convex codegen`) whenever you switch environments to avoid mismatched URLs.
- Stripe webhooks: the signing secret differs per environment. Document them inside the `docs/` folder rather than committing raw values.
- When cloning this template for a new SaaS product, create a fresh production profile immediately and limit access to founders/lead engineers.
- Feature flags: toggle staged features with `FEATURE_FLAGS=usageAnalytics,integrationsHub` or per-flag overrides like `FF_USAGEANALYTICS=true` inside each `.env.<profile>`.
