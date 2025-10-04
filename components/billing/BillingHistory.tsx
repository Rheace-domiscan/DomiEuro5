/**
 * BillingHistory Component
 *
 * Renders a table of recent billing events for the organization.
 */

import { formatPrice } from '~/lib/billing-constants';

interface BillingHistoryEvent {
  id: string;
  description: string;
  amount?: number;
  currency: string;
  status: string;
  eventType: string;
  date: string;
}

interface BillingHistoryProps {
  events: BillingHistoryEvent[];
}

function formatStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'succeeded') {
    return {
      label: 'Succeeded',
      className: 'bg-green-100 text-green-700',
    };
  }

  if (normalized === 'failed') {
    return {
      label: 'Failed',
      className: 'bg-red-100 text-red-700',
    };
  }

  return {
    label: status,
    className: 'bg-gray-200 text-gray-700',
  };
}

export function BillingHistory({ events }: BillingHistoryProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Billing History
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">Recent invoices & events</h2>
          </div>
        </div>
      </header>

      <div className="overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Event</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-5 text-center text-sm text-gray-500">
                    No billing events recorded yet.
                  </td>
                </tr>
              ) : (
                events.map(event => {
                  const status = formatStatus(event.status);
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{event.date}</td>
                      <td className="px-6 py-4 text-gray-900">{event.description}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {typeof event.amount === 'number' ? formatPrice(event.amount) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
