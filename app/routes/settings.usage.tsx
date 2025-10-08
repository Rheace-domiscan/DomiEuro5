import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { rbacService } from '~/services/providers.server';
import { isFeatureEnabled } from '~/lib/featureFlags.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await rbacService.requireRole(request, [
    rbacService.ROLES.OWNER,
    rbacService.ROLES.ADMIN,
  ]);

  if (!isFeatureEnabled('usageAnalytics')) {
    return redirect('/settings');
  }

  return data({ user });
}

export default function UsageAnalyticsPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900">Usage analytics (preview)</h2>
      <p className="text-sm text-secondary">
        Flip the `usageAnalytics` feature flag in your environment to experiment with this
        dashboard. Replace this placeholder with charts powered by Convex queries when you build out
        analytics for your SaaS product.
      </p>
    </div>
  );
}
