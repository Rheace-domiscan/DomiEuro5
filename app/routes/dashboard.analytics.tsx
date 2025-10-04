import { data, useLoaderData } from 'react-router';
import type { Route } from './+types/dashboard.analytics';
import { requireUser } from '~/lib/auth.server';
import type { User } from '~/lib/auth.server';
import { convexServer } from '../../lib/convex.server';
import { api } from '../../convex/_generated/api';
import type { SubscriptionTier } from '~/types/billing';
import { FeatureGate } from '../../components/feature-gates/FeatureGate';
import { TIERS } from '~/lib/permissions';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  let subscriptionTier: SubscriptionTier = TIERS.FREE;

  if (user.organizationId) {
    try {
      const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
        organizationId: user.organizationId,
      });

      if (subscription?.tier) {
        subscriptionTier = subscription.tier as SubscriptionTier;
      }
    } catch (_error) {
      // If Convex is unreachable or returns an error, fall back to Free tier.
      subscriptionTier = TIERS.FREE;
    }
  }

  return data({
    user,
    subscriptionTier,
  });
}

function AnalyticsDashboard() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your organization&apos;s recurring revenue, upgrades, and churn over time.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Recurring Revenue</h2>
          <p className="mt-2 text-sm text-gray-500">Starter tier unlocks interactive charts.</p>
          <div className="mt-6 h-48 rounded-lg bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-200" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Customer Growth</h2>
          <p className="mt-2 text-sm text-gray-500">
            Understand how new signups and churn affect your seat allocation.
          </p>
          <div className="mt-6 h-48 rounded-lg bg-gradient-to-r from-blue-100 via-cyan-100 to-blue-200" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Upgrade Insights</h2>
        <p className="mt-2 text-sm text-gray-500">
          Identify which features drive conversions and where to focus product investments.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-gray-700">
          <li>• Analytics funnel per organization</li>
          <li>• Seat usage vs. allocation trends</li>
          <li>• Upgrade triggers per team</li>
        </ul>
      </div>
    </div>
  );
}

export default function AnalyticsFeature() {
  const { user, subscriptionTier } = useLoaderData<{
    user: User;
    subscriptionTier: SubscriptionTier;
  }>();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <FeatureGate
        feature="analytics"
        requiredTier={TIERS.STARTER}
        currentTier={subscriptionTier}
        currentRole={user.role}
        previewImageSrc="/assets/feature-previews/analytics.png"
        upgradeTriggerFeature="dashboard-analytics"
        title="Upgrade to unlock powerful analytics"
        description="Upgrade to unlock revenue charts, customer growth trends, and conversion insights."
      >
        <AnalyticsDashboard />
      </FeatureGate>
    </div>
  );
}
