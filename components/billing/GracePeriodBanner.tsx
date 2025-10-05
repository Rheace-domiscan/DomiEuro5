import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AccessStatus } from '~/types/billing';

interface GracePeriodBannerProps {
  accessStatus: Extract<AccessStatus, 'grace_period' | 'locked'>;
  gracePeriodEndsAt?: number | null;
  manageBillingAction?: ReactNode;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function GracePeriodBanner({
  accessStatus,
  gracePeriodEndsAt,
  manageBillingAction,
}: GracePeriodBannerProps) {
  const isLocked = accessStatus === 'locked';

  const { daysRemaining, formattedEndDate } = useMemo(() => {
    if (!gracePeriodEndsAt) {
      return { daysRemaining: null, formattedEndDate: null };
    }

    const now = Date.now();
    const msRemaining = Math.max(0, gracePeriodEndsAt - now);
    const roundedDays = Math.ceil(msRemaining / DAY_IN_MS);
    const endDate = new Date(gracePeriodEndsAt).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return {
      daysRemaining: roundedDays,
      formattedEndDate: endDate,
    };
  }, [gracePeriodEndsAt]);

  const heading = isLocked
    ? 'Account locked due to failed payments'
    : 'Payment issue: grace period in progress';

  const description = isLocked
    ? 'We were unable to collect payment within the 28 day grace period. Access is limited until the payment method is updated.'
    : 'We could not process your latest payment. Update your payment method to restore full access before the grace period ends.';

  const bannerClasses = isLocked
    ? 'border-rose-200 bg-rose-50'
    : 'border-amber-200 bg-amber-50';

  const badgeClasses = isLocked ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';

  return (
    <section
      className={`rounded-2xl border px-5 py-5 text-sm shadow-sm sm:px-6 sm:py-6 ${bannerClasses}`}
      aria-live="assertive"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}>
            {isLocked ? 'Locked' : 'Grace period active'}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">{heading}</h2>
            <p className="text-sm text-gray-700 sm:text-base">{description}</p>
          </div>

          {!isLocked && daysRemaining !== null ? (
            <p className="text-xs font-medium text-amber-700 sm:text-sm">
              {daysRemaining <= 0
                ? 'Grace period ends today.'
                : `Grace period ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${formattedEndDate}).`}
            </p>
          ) : null}

          {isLocked ? (
            <p className="text-xs font-medium text-rose-700 sm:text-sm">
              {gracePeriodEndsAt
                ? `Account locked on ${formattedEndDate}. Update your billing details to regain access.`
                : 'Account locked after grace period expired. Update your billing details to regain access.'}
            </p>
          ) : null}
        </div>

        {manageBillingAction ? (
          <div className="w-full min-w-[12rem] sm:w-auto">{manageBillingAction}</div>
        ) : null}
      </div>
    </section>
  );
}
