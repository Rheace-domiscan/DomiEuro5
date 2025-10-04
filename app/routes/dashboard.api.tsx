import { data, useLoaderData } from 'react-router';
import type { Route } from './+types/dashboard.api';
import { requireUser } from '~/lib/auth.server';
import type { User } from '~/lib/auth.server';
import { convexServer } from '../../lib/convex.server';
import { api as convexApi } from '../../convex/_generated/api';
import type { SubscriptionTier } from '~/types/billing';
import { FeatureGate } from '../../components/feature-gates/FeatureGate';
import { TIERS } from '~/lib/permissions';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  let subscriptionTier: SubscriptionTier = TIERS.FREE;

  if (user.organizationId) {
    try {
      const subscription = await convexServer.query(convexApi.subscriptions.getByOrganization, {
        organizationId: user.organizationId,
      });

      if (subscription?.tier) {
        subscriptionTier = subscription.tier as SubscriptionTier;
      }
    } catch (_error) {
      subscriptionTier = TIERS.FREE;
    }
  }

  return data({
    user,
    subscriptionTier,
  });
}

function ApiExplorer() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">API Access</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate personal access tokens and explore usage metrics for your integrations.
        </p>
      </section>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">API Credentials</h2>
        <p className="mt-2 text-sm text-gray-500">
          Starter plan includes rate-limited API access. Professional removes limits and
          unlocks priority support.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Client ID</p>
            <code className="mt-2 block truncate rounded bg-white px-3 py-2 text-sm text-gray-800 shadow-inner">
              org_live_****************
            </code>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Last regenerated</p>
            <p className="mt-2 text-sm font-medium text-gray-800">12 minutes ago</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Usage Metrics</h2>
        <p className="mt-2 text-sm text-gray-500">
          Monitor request volumes, error rates, and integration health in real-time.
        </p>
        <div className="mt-6 h-56 rounded-lg bg-gradient-to-r from-amber-100 via-orange-100 to-amber-200" />
      </div>
    </div>
  );
}

export default function ApiFeature() {
  const { user, subscriptionTier } = useLoaderData<{
    user: User;
    subscriptionTier: SubscriptionTier;
  }>();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <FeatureGate
        feature="api"
        requiredTier={TIERS.STARTER}
        currentTier={subscriptionTier}
        currentRole={user.role}
        previewImageSrc="/assets/feature-previews/api.png"
        upgradeTriggerFeature="dashboard-api"
        title="Upgrade to unlock powerful API access"
        description="Integrate your product workflows with secure token management and usage analytics."
      >
        <ApiExplorer />
      </FeatureGate>
    </div>
  );
}
