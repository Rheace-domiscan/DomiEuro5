import { NavLink, Outlet } from 'react-router';
import type { Route } from '../+types/legal';

const legalNavigation = [
  { to: '/legal/terms', label: 'Terms of Service' },
  { to: '/legal/privacy', label: 'Privacy Policy' },
  { to: '/legal/refund-policy', label: 'Refund Policy' },
  { to: '/legal/cookie-policy', label: 'Cookie Policy' },
  { to: '/legal/acceptable-use', label: 'Acceptable Use' },
  { to: '/legal/sla', label: 'Service Level Agreement' },
] as const;

export async function loader({ request: _request }: Route.LoaderArgs) {
  return null;
}

export default function LegalLayout() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Legal Center</h1>
          <p className="text-sm text-gray-600">Template only - consult lawyer before use</p>
        </header>

        <nav className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <ul className="flex flex-wrap divide-y divide-gray-200 sm:flex-nowrap sm:divide-y-0 sm:divide-x">
            {legalNavigation.map(item => (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'block h-full px-4 py-3 text-center text-sm font-medium transition',
                      isActive
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="rounded-lg bg-white p-6 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
