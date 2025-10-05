import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('dashboard', 'routes/dashboard.tsx', [
    index('routes/dashboard._index.tsx'),
    route('analytics', 'routes/dashboard.analytics.tsx'),
    route('api', 'routes/dashboard.api.tsx'),
  ]),
  route('pricing', 'routes/pricing.tsx'),
  route('test-workos', 'routes/test-workos.tsx'),
  route('auth/login', 'routes/auth/login.tsx'),
  route('auth/callback', 'routes/auth/callback.tsx'),
  route('auth/create-organization', 'routes/auth/create-organization.tsx'),
  route('auth/logout', 'routes/auth/logout.tsx'),
  route('webhooks/stripe', 'routes/webhooks/stripe.tsx'),
  route('settings', 'routes/settings.tsx', [
    route('team', 'routes/settings.team.tsx', [
      index('routes/settings.team._index.tsx'),
      route('transfer-ownership', 'routes/settings.team.transfer-ownership.tsx'),
    ]),
    route('billing', 'routes/settings/billing.tsx'),
  ]),
] satisfies RouteConfig;
