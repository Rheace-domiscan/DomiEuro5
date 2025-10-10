# Infrastructure Templates

This folder bundles starter IaC snippets to help you provision new environments quickly.

## Terraform (Vercel)
- `terraform/main.tf` provisions a Vercel project and seeds environment variables.
- Provide `vercel_api_token`, `project_name`, `github_repo`, and a map of env vars (Convex/Stripe/WorkOS etc.).
- Run `terraform init` → `terraform apply` after updating variables to spin up the project.

Use these files as references—copy and customise them per deployment rather than committing workspace-specific state.
