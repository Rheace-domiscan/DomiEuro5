import type { ReactNode } from 'react';

interface ReactivateBannerProps {
  reactivationAction: ReactNode;
  canceledAt?: number | null;
}

function formatCanceledDate(timestamp?: number | null) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ReactivateBanner({ reactivationAction, canceledAt }: ReactivateBannerProps) {
  const canceledDate = formatCanceledDate(canceledAt);

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-6 text-sm shadow-sm sm:px-6"
      aria-live="assertive"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Subscription cancelled
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Your account is in read-only mode
            </h2>
            <p className="text-sm text-gray-700 sm:text-base">
              Update your subscription to restore full access for your team. While in read-only mode
              you can review billing information, but changes are disabled until the plan is
              reactivated.
            </p>
          </div>
          {canceledDate ? (
            <p className="text-xs font-medium text-indigo-700 sm:text-sm">
              Cancellation processed on {canceledDate}.
            </p>
          ) : null}
        </div>

        <div className="w-full min-w-[12rem] sm:w-auto">{reactivationAction}</div>
      </div>
    </section>
  );
}
