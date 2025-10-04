/**
 * BillingOverview Component
 *
 * Presents the current subscription details including:
 * - Active tier and billing cadence
 * - Subscription status / access state
 * - Upcoming renewal date
 * - Pending downgrade or cancellation information
 */

import type { AccessStatus, SubscriptionTier } from '~/types/billing';
import { TIER_CONFIG, formatPrice } from '~/lib/billing-constants';

interface BillingOverviewProps {
  tier: SubscriptionTier;
  status: string;
  billingInterval: 'monthly' | 'annual';
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd: boolean;
  accessStatus: AccessStatus;
  pendingDowngrade?: {
    tier: SubscriptionTier;
    effectiveDate: number;
  };
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) return '—';

  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusLabel(status: string, accessStatus: AccessStatus) {
  if (accessStatus === 'locked') {
    return { label: 'Locked', className: 'bg-red-100 text-red-700' };
  }

  if (accessStatus === 'grace_period') {
    return { label: 'Grace period', className: 'bg-amber-100 text-amber-700' };
  }

  if (status === 'canceled') {
    return { label: 'Canceled', className: 'bg-gray-200 text-gray-700' };
  }

  return { label: status.replace(/_/g, ' '), className: 'bg-green-100 text-green-700' };
}

export function BillingOverview({
  tier,
  status,
  billingInterval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  accessStatus,
  pendingDowngrade,
}: BillingOverviewProps) {
  const tierConfig = TIER_CONFIG[tier];
  const statusBadge = getStatusLabel(status, accessStatus);
  const price = formatPrice(tierConfig.price[billingInterval]);
  const renewalLabel = billingInterval === 'monthly' ? 'Next renewal' : 'Renews annually on';

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Current Plan
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{tierConfig.name}</h2>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-600">Billing cadence</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{billingInterval}</p>
          <p className="mt-2 text-sm text-gray-500">
            {price} / {billingInterval === 'monthly' ? 'month' : 'year'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600">{renewalLabel}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(currentPeriodEnd)}</p>
          {cancelAtPeriodEnd && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Cancellation scheduled at period end. Access continues until renewal date.
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <p className="text-sm font-medium text-gray-600">What&apos;s included</p>
          <ul className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            <li>Seats included: {tierConfig.seats.included}</li>
            <li>Max seats: {tierConfig.seats.max}</li>
            <li>Additional seat price: £10 / seat / month</li>
            <li>
              Access status:{' '}
              <span className="font-medium capitalize">{accessStatus.replace(/_/g, ' ')}</span>
            </li>
          </ul>

          {pendingDowngrade ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Downgrade to <strong>{TIER_CONFIG[pendingDowngrade.tier].name}</strong> scheduled for{' '}
              <strong>{formatDate(pendingDowngrade.effectiveDate)}</strong>.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
