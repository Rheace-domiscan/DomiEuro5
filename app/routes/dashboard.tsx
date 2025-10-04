import type { Route } from './+types/dashboard';
import { Link, Outlet, useLoaderData } from 'react-router';
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
                  to="/dashboard/analytics"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Analytics
                </Link>
                <Link
                  to="/dashboard/api"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  API
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

      <main className="py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
