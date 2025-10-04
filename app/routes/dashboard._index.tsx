import { Link, useRouteLoaderData } from 'react-router';
import { hasRole } from '~/lib/permissions';
import type { User } from '~/lib/auth.server';

export default function DashboardIndex() {
  const parentData = useRouteLoaderData('routes/dashboard') as { user: User } | undefined;
  const user = parentData?.user;

  const nameParts = user ? [user.firstName, user.lastName].filter(Boolean) : [];
  const displayName = nameParts.length > 0 ? nameParts.join(' ') : user?.email ?? 'there';

  const canAccessBilling = hasRole(user?.role, ['owner', 'admin']);
  const canManageTeam = hasRole(user?.role, ['owner', 'admin']);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to your Dashboard, {displayName}!</h2>
          <p className="text-gray-600 mb-4">
            This is a protected route that requires authentication. Only logged-in users can see this page.
          </p>
          {user && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Role:</strong> {user.role || 'member'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Organization:</strong> {user.organizationId}
              </p>
            </div>
          )}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Quick Links:</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="text-indigo-600 hover:text-indigo-800">
                  → View Pricing Plans
                </Link>
              </li>
              <li>
                <Link to="/dashboard/analytics" className="text-indigo-600 hover:text-indigo-800">
                  → Explore Analytics (Starter+)
                </Link>
              </li>
              <li>
                <Link to="/dashboard/api" className="text-indigo-600 hover:text-indigo-800">
                  → Review API Access (Starter+)
                </Link>
              </li>
              {canAccessBilling && (
                <li>
                  <Link to="/settings/billing" className="text-indigo-600 hover:text-indigo-800">
                    → Manage Billing & Subscription
                  </Link>
                </li>
              )}
              {canManageTeam && (
                <li>
                  <Link to="/settings/team" className="text-indigo-600 hover:text-indigo-800">
                    → Manage Team & Invitations
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
