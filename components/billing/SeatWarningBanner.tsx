/**
 * SeatWarningBanner Component
 *
 * Surfaces warnings when the organization exceeds seat limits or has pending plan changes.
 */

import type { SubscriptionTier } from '~/types/billing';
import { TIER_CONFIG } from '~/lib/billing-constants';

interface SeatWarningBannerProps {
  seatsActive: number;
  seatsTotal: number;
  tier: SubscriptionTier;
  pendingDowngrade?: {
    tier: SubscriptionTier;
    effectiveDate: number;
  };
  cancelAtPeriodEnd: boolean;
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SeatWarningBanner({
  seatsActive,
  seatsTotal,
  tier,
  pendingDowngrade,
  cancelAtPeriodEnd,
}: SeatWarningBannerProps) {
  const seatsOver = Math.max(0, seatsActive - seatsTotal);
  const tierConfig = TIER_CONFIG[tier];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Seat limit exceeded</p>
        <p>
          You have <strong>{seatsActive}</strong> active users but only <strong>{seatsTotal}</strong> seats on the
          {` ${tierConfig.name} `}
          plan. Add {seatsOver} seat{seatsOver === 1 ? '' : 's'} or deactivate users to get back within your limit.
        </p>

        <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
          <li>Add seats instantly — charges are prorated for the current cycle.</li>
          <li>Deactivate users from the Team settings page to reduce seat consumption.</li>
        </ul>

        {pendingDowngrade ? (
          <p className="text-xs">
            Downgrade to <strong>{TIER_CONFIG[pendingDowngrade.tier].name}</strong> scheduled for{' '}
            <strong>{formatDate(pendingDowngrade.effectiveDate)}</strong>. Ensure seat count fits the new plan before the
            downgrade takes effect.
          </p>
        ) : null}

        {cancelAtPeriodEnd ? (
          <p className="text-xs">
            Cancellation is scheduled at the end of the current billing period. Access remains active until your
            renewal date, after which the account will move to read-only unless reactivated.
          </p>
        ) : null}
      </div>
    </div>
  );
}
