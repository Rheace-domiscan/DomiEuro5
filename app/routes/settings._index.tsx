import { Link, useRouteLoaderData } from 'react-router';
import type { User } from '~/lib/auth.server';
import { rbacService } from '~/services/providers.server';

type SettingsCard = {
  title: string;
  description: string;
  to: string;
  cta: string;
  visible: boolean;
  planned?: boolean;
};

type FeatureFlagEntry = { key: string; enabled: boolean };

export default function SettingsOverview() {
  const parentData = useRouteLoaderData('routes/settings') as
    | { user: User; featureFlags: FeatureFlagEntry[] }
    | undefined;
  const user = parentData?.user;
  const featureFlags = parentData?.featureFlags ?? [];
  const role = user?.role ?? 'member';

  const hasRole = rbacService.hasRole;

  const usageAnalyticsEnabled = featureFlags.some(
    flag => flag.key === 'usageAnalytics' && flag.enabled
  );
  const integrationsEnabled = featureFlags.some(
    flag => flag.key === 'integrationsHub' && flag.enabled
  );

  const cards: SettingsCard[] = [
    {
      title: 'Pricing',
      description: 'Review plan tiers and compare monthly versus annual pricing options.',
      to: '/pricing',
      cta: 'View pricing',
      visible: true,
    },
    {
      title: 'Billing',
      description: 'View your plan, adjust seats, and open the Stripe Customer Portal.',
      to: '/settings/billing',
      cta: 'Manage billing',
      visible: hasRole(role, ['owner', 'admin']),
    },
    {
      title: 'Team',
      description: 'Invite teammates, assign roles, and deactivate access.',
      to: '/settings/team',
      cta: 'Manage team',
      visible: hasRole(role, ['owner', 'admin']),
    },
    {
      title: 'Transfer ownership',
      description: 'Pass account management to another admin and sync WorkOS/Stripe roles.',
      to: '/settings/team/transfer-ownership',
      cta: 'Start transfer',
      visible: hasRole(role, ['owner']),
    },
    {
      title: 'Usage analytics',
      description: 'Future dashboard for seat consumption, MRR, churn, and cohort analysis.',
      to: '/settings/usage',
      cta: usageAnalyticsEnabled ? 'Open preview' : 'Planned',
      visible: hasRole(role, ['owner', 'admin']),
      planned: !usageAnalyticsEnabled,
    },
    {
      title: 'Integrations & webhooks',
      description: 'Centralize third-party connectors, API keys, and outbound webhook delivery.',
      to: '/settings/integrations',
      cta: integrationsEnabled ? 'Open preview' : 'Planned',
      visible: hasRole(role, ['owner', 'admin']),
      planned: !integrationsEnabled,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Settings overview</h2>
        <p className="text-sm text-secondary">
          Configure billing, team permissions, and account ownership from a single place.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {cards
          .filter(card => card.visible)
          .map(card => (
            <div
              key={card.to}
              className="flex h-full flex-col justify-between rounded-lg border border-surface-subtle bg-surface-raised p-6 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                {card.planned && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
                    Coming soon
                  </span>
                )}
                <p className="mt-2 text-sm text-secondary">{card.description}</p>
              </div>
              <div className="mt-6">
                {card.planned ? (
                  <span className="inline-flex items-center justify-center rounded-md border border-surface-subtle px-4 py-2 text-sm font-medium text-secondary">
                    {card.cta}
                  </span>
                ) : (
                  <Link
                    to={card.to}
                    className="btn-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm"
                  >
                    {card.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
      </div>

      {cards.every(card => card.visible === false) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your current role does not grant access to organization-level settings. Contact an owner
          for assistance.
        </div>
      )}
    </div>
  );
}
