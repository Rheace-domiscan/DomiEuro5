import type { Role } from '~/lib/permissions';

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role?: string;
  isActive: boolean;
  createdAt: number;
  workosUserId: string;
}

interface TeamTableProps {
  members: TeamMemberRow[];
  currentUserWorkosId: string;
  roleOptions: { value: Role; label: string }[];
  onRoleChange: (memberId: string, role: Role) => void;
  onDeactivate: (memberId: string) => void;
  onReactivate: (memberId: string) => void;
  isBusy?: boolean;
}

export function TeamTable({
  members,
  currentUserWorkosId,
  roleOptions,
  onRoleChange,
  onDeactivate,
  onReactivate,
  isBusy = false,
}: TeamTableProps) {
  if (!members.length) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
        <p className="text-sm text-gray-600">
          Invite your first teammate to collaborate on billing and seat management.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Email
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map(member => {
            const isSelf = member.workosUserId === currentUserWorkosId;
            const isOwner = member.role === 'owner';
            const disableRoleChange = isBusy || isSelf || isOwner || !member.isActive;
            const disableStatusChange = isBusy || isSelf || isOwner;

            return (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.name || member.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <label className="sr-only" htmlFor={`role-${member.id}`}>
                    Role for {member.email}
                  </label>
                  <select
                    id={`role-${member.id}`}
                    name="role"
                    className="mt-0 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    defaultValue={member.role || 'member'}
                    disabled={disableRoleChange}
                    onChange={event => onRoleChange(member.id, event.target.value as Role)}
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      member.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {member.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {member.isActive ? (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      disabled={disableStatusChange}
                      onClick={() => onDeactivate(member.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => onReactivate(member.id)}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
