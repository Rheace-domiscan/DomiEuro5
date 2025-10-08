import { NavLink, Outlet, useLoaderData } from 'react-router';
import { data } from 'react-router';
import type { Route } from './+types/settings';
import { requireUser } from '~/lib/auth.server';
import { hasRole } from '~/lib/permissions';
import { TopNav } from '../../components/navigation/TopNav';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return data({ user });
}

export default function SettingsLayout() {
  const { user } = useLoaderData<typeof loader>();
  const userRole = user.role ?? 'member';

  const navigation = [
    {
      to: '/settings',
      label: 'Overview',
      visible: true,
    },
    {
      to: '/settings/billing',
      label: 'Billing',
      visible: hasRole(userRole, ['owner', 'admin']),
    },
    {
      to: '/settings/team',
      label: 'Team',
      visible: hasRole(userRole, ['owner', 'admin']),
    },
    {
      to: '/settings/team/transfer-ownership',
      label: 'Transfer ownership',
      visible: hasRole(userRole, ['owner']),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user} />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:flex-row">
        <aside className="lg:w-64">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Settings
              </p>
              <h1 className="mt-2 text-xl font-semibold text-gray-900">Account controls</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage billing, team access, and ownership for{' '}
                {user.organizationId ?? 'your organization'}.
              </p>
            </div>

            <nav aria-label="Settings navigation" className="space-y-1">
              {navigation
                .filter(item => item.visible)
                .map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      [
                        'block rounded-md px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>
        </aside>

        <section className="flex-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}
