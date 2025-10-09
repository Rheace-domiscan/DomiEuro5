import { useState } from 'react';
import { Form, Link, useLocation } from 'react-router';
import type { User, UserOrganizationSummary } from '~/lib/auth.server';
import { hasRole } from '~/lib/permissions';

interface TopNavProps {
  user: User;
  organizations?: UserOrganizationSummary[];
}

export function TopNav({ user, organizations = [] }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const redirectTo = `${location.pathname}${location.search}`;
  const role = user.role ?? 'member';

  const canAccessBilling = hasRole(role, ['owner', 'admin']);
  const canManageTeam = hasRole(role, ['owner', 'admin']);

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'User';

  const closeMenu = () => setIsMenuOpen(false);
  const currentOrganizationId = user.organizationId;
  const sortedOrganizations = [...organizations].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <nav className="bg-surface-raised border-b border-surface-subtle shadow-sm">
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
                className={`absolute left-0 top-full z-20 mt-2 w-48 rounded-md border border-surface-subtle bg-surface-raised py-2 shadow-lg transition-opacity duration-150 ${
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
                    className="block px-4 py-2 text-sm text-gray-700 hover-surface-muted"
                  >
                    Billing
                  </Link>
                )}
                {canManageTeam && (
                  <Link
                    to="/settings/team"
                    onClick={closeMenu}
                    className="block px-4 py-2 text-sm text-gray-700 hover-surface-muted"
                  >
                    Team
                  </Link>
                )}
                <Link
                  to="/pricing"
                  onClick={closeMenu}
                  className="block px-4 py-2 text-sm text-gray-700 hover-surface-muted"
                >
                  Pricing
                </Link>
                {sortedOrganizations.length > 0 && (
                  <div className="mt-2 border-t border-surface-subtle pt-2">
                    <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                      Switch organization
                    </p>
                    <div className="max-h-48 overflow-y-auto">
                      {sortedOrganizations.map(org => {
                        const isCurrent = org.organizationId === currentOrganizationId;

                        return (
                          <Form
                            key={org.organizationId}
                            method="post"
                            action="/settings/switch-organization"
                            className="px-2"
                            onSubmit={closeMenu}
                          >
                            <input type="hidden" name="organizationId" value={org.organizationId} />
                            <input type="hidden" name="redirectTo" value={redirectTo} />
                            <button
                              type="submit"
                              disabled={isCurrent}
                              className={`w-full rounded-md px-2 py-2 text-left text-sm transition hover-surface-muted ${
                                isCurrent ? 'bg-surface-muted text-indigo-600' : 'text-gray-700'
                              } ${isCurrent ? 'cursor-default' : ''}`}
                            >
                              <span className="block font-medium">{org.name}</span>
                              <span className="block text-xs text-secondary">
                                {isCurrent ? 'Current • ' : ''}
                                {org.role}
                                {org.tier ? ` • ${org.tier}` : ''}
                              </span>
                            </button>
                          </Form>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden text-sm text-secondary sm:inline">
            {displayName} ({role})
          </span>
          <Form action="/auth/logout" method="post">
            <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm font-medium">
              Logout
            </button>
          </Form>
        </div>
      </div>
    </nav>
  );
}
