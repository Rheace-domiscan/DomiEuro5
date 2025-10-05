/**
 * SeatManagement Component
 *
 * Displays seat usage, provides a button to open the Stripe Customer Portal,
 * and surfaces the entry point to add seats via modal.
 */

import type { ReactNode } from 'react';

type SeatAdjustmentMode = 'add' | 'remove';

interface SeatManagementProps {
  seatsIncluded: number;
  seatsTotal: number;
  seatsActive: number;
  seatsAvailable: number;
  maxSeats: number;
  tierName: string;
  isAtSeatCap: boolean;
  manageBillingAction: ReactNode;
  onAdjustSeats: (mode: SeatAdjustmentMode) => void;
  seatChangesDisabled?: boolean;
  seatChangesDisabledReason?: string;
}

export function SeatManagement({
  seatsIncluded,
  seatsTotal,
  seatsActive,
  seatsAvailable,
  maxSeats,
  tierName,
  isAtSeatCap,
  manageBillingAction,
  onAdjustSeats,
  seatChangesDisabled = false,
  seatChangesDisabledReason,
}: SeatManagementProps) {
  const utilization = Math.min((seatsActive / Math.max(seatsTotal, 1)) * 100, 100);
  const seatsOver = Math.max(0, seatsActive - seatsTotal);
  const minimumSeatTotal = Math.max(seatsIncluded, seatsActive);
  const canRemoveSeats = seatsTotal > minimumSeatTotal;
  const removalDisabledReason = seatChangesDisabled
    ? null
    : canRemoveSeats
      ? null
      : seatsTotal <= seatsIncluded
        ? 'All seats are included in your plan'
        : 'Remove team members before reducing seats';

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Seat Management
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">{tierName}</h2>
        <p className="mt-2 text-sm text-gray-600">
          Included seats: {seatsIncluded}. Additional seats up to {maxSeats} total.
        </p>
      </div>

      <div className="space-y-5 px-6 py-6">
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Seat usage</span>
            <span>
              {seatsActive} active / {seatsTotal} seats
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${seatsOver > 0 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${utilization}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {seatsOver > 0
              ? `${seatsOver} user${seatsOver === 1 ? '' : 's'} over your seat limit`
              : `${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} available`}
          </p>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Included seats</span>
            <span className="font-medium">{seatsIncluded}</span>
          </div>
          <div className="flex justify-between">
            <span>Additional seats</span>
            <span className="font-medium">{Math.max(0, seatsTotal - seatsIncluded)}</span>
          </div>
          <div className="flex justify-between">
            <span>Maximum seats</span>
            <span className="font-medium">{maxSeats}</span>
          </div>
        </div>

        <div className="space-y-3">
          {manageBillingAction}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onAdjustSeats('add')}
              className="w-full rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              disabled={isAtSeatCap || seatChangesDisabled}
            >
              {isAtSeatCap ? 'Seat limit reached' : 'Add Seats'}
            </button>

            <button
              type="button"
              onClick={() => onAdjustSeats('remove')}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              disabled={!canRemoveSeats || seatChangesDisabled}
            >
              Remove Seats
            </button>
          </div>

          {isAtSeatCap ? (
            <p className="text-xs text-amber-600">
              You&apos;re at the maximum seat capacity for this plan. Upgrade to a higher tier to
              unlock more seats.
            </p>
          ) : null}

          {seatChangesDisabled && !isAtSeatCap ? (
            <p className="text-xs text-rose-600">
              {seatChangesDisabledReason ?? 'Update your payment method to manage seats.'}
            </p>
          ) : null}

          {removalDisabledReason ? (
            <p className="text-xs text-gray-500">{removalDisabledReason}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
