import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { rbacService } from '~/services/providers.server';
import { isFeatureEnabled } from '~/lib/featureFlags.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await rbacService.requireRole(request, [
    rbacService.ROLES.OWNER,
    rbacService.ROLES.ADMIN,
  ]);

  if (!isFeatureEnabled('integrationsHub')) {
    return redirect('/settings');
  }

  return data({ user });
}

export default function IntegrationsPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900">Integrations & webhooks (preview)</h2>
      <p className="text-sm text-secondary">
        Enable the `integrationsHub` feature flag to prototype integration settings. This is a safe
        place to surface API keys, outbound webhooks, and third-party toggles when you extend the
        template for your SaaS product.
      </p>
    </div>
  );
}
