import { useState } from 'react';
import { Form, Link } from 'react-router';
import type { User } from '~/lib/auth.server';
import { hasRole } from '~/lib/permissions';

interface TopNavProps {
  user: User;
}

export function TopNav({ user }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const role = user.role ?? 'member';

  const canAccessBilling = hasRole(role, ['owner', 'admin']);
  const canManageTeam = hasRole(role, ['owner', 'admin']);

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'User';

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link to="/dashboard" className="text-xl font-semibold text-gray-900">
            Dashboard
          </Link>
          <div className="hidden items-center space-x-4 md:flex">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Home
            </Link>
            <Link
              to="/dashboard/analytics"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Analytics
            </Link>
            <Link
              to="/dashboard/api"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              API
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setIsMenuOpen(true)}
              onMouseLeave={() => setIsMenuOpen(false)}
            >
              <Link
                to="/settings"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                onFocus={() => setIsMenuOpen(true)}
              >
                Settings
              </Link>
              <div
                className={`absolute left-0 top-full z-20 mt-2 w-48 rounded-md border border-gray-200 bg-white py-2 shadow-lg transition-opacity duration-150 ${
                  isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onMouseEnter={() => setIsMenuOpen(true)}
                onMouseLeave={() => setIsMenuOpen(false)}
                onFocus={() => setIsMenuOpen(true)}
                onBlur={event => {
                  const activeElement =
                    typeof globalThis !== 'undefined' && 'document' in globalThis
                      ? globalThis.document?.activeElement
                      : null;
                  if (!activeElement || !event.currentTarget.contains(activeElement)) {
                    setIsMenuOpen(false);
                  }
                }}
              >
                {canAccessBilling && (
                  <Link
                    to="/settings/billing"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Billing
                  </Link>
                )}
                {canManageTeam && (
                  <Link
                    to="/settings/team"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Team
                  </Link>
                )}
                <Link
                  to="/pricing"
                  onClick={closeMenu}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden text-sm text-gray-600 sm:inline">
            {displayName} ({role})
          </span>
          <Form action="/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </Form>
        </div>
      </div>
    </nav>
  );
}
