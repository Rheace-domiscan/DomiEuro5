import { Link, useRouteLoaderData } from 'react-router';
import { hasRole } from '~/lib/permissions';
import type { User } from '~/lib/auth.server';

export default function SettingsOverview() {
  const parentData = useRouteLoaderData('routes/settings') as { user: User } | undefined;
  const user = parentData?.user;
  const role = user?.role ?? 'member';

  const cards = [
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
  ] as const;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Settings overview</h2>
        <p className="text-sm text-gray-600">
          Configure billing, team permissions, and account ownership from a single place.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {cards
          .filter(card => card.visible)
          .map(card => (
            <div
              key={card.to}
              className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{card.description}</p>
              </div>
              <div className="mt-6">
                <Link
                  to={card.to}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  {card.cta}
                </Link>
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
