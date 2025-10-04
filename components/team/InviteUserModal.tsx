import type { FetcherWithComponents } from 'react-router';
import type { Role } from '~/lib/permissions';

type InviteResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  refresh?: boolean;
};

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetcher: FetcherWithComponents<InviteResponse | undefined>;
  roleOptions: { value: Role; label: string }[];
  defaultRole?: Role;
}

export function InviteUserModal({
  isOpen,
  onClose,
  fetcher,
  roleOptions,
  defaultRole = 'member',
}: InviteUserModalProps) {
  if (!isOpen) {
    return null;
  }

  const isSubmitting = fetcher.state !== 'idle';
  const response = fetcher.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invite a teammate</h2>
            <p className="mt-1 text-sm text-gray-600">
              Send an invitation email and assign the appropriate role.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close invite modal"
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {response?.error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {response.error}
          </div>
        )}

        {response?.ok && response.message && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {response.message}
          </div>
        )}

        <fetcher.Form method="post" action="/settings/team" className="mt-6 space-y-4">
          <input type="hidden" name="intent" value="invite" />

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="jane@company.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue={defaultRole}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
