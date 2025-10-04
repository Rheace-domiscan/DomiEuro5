import type { Route } from './+types/dashboard';
import { Link, useLoaderData } from 'react-router';
import { requireUser } from '~/lib/auth.server';
import { hasRole } from '~/lib/permissions';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
  const canAccessBilling = hasRole(user.role || 'member', ['owner', 'admin']);
  const canManageTeam = hasRole(user.role || 'member', ['owner', 'admin']);
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/pricing"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Pricing
                </Link>
                {canAccessBilling && (
                  <Link
                    to="/settings/billing"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Billing
                  </Link>
                )}
                {canManageTeam && (
                  <Link
                    to="/settings/team"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Team
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {displayName} ({user.role || 'member'})
              </span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to your Dashboard, {displayName}!
            </h2>
            <p className="text-gray-600 mb-4">
              This is a protected route that requires authentication. Only logged-in users can see
              this page.
            </p>
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
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Quick Links:</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/pricing" className="text-indigo-600 hover:text-indigo-800">
                    → View Pricing Plans
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
      </main>
    </div>
  );
}
