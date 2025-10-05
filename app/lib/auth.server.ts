import { redirect } from 'react-router';
import { workos, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from './workos.server';
import { getSession, commitSession, destroySession, sessionStorage } from './session.server';
import { hasRole, hasTierAccess, type Role, type Tier } from './permissions';
import { convexServer } from '../../lib/convex.server';
import { api } from '../../convex/_generated/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  role?: string;
}

const LOCKED_ACCESS_ALLOWED_PREFIXES = ['/settings/billing', '/auth/logout', '/auth/login'];

function isLockedAccessAllowedPath(pathname: string) {
  return LOCKED_ACCESS_ALLOWED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function enforceSubscriptionAccess(request: Request, organizationId?: string) {
  if (!organizationId) {
    return;
  }

  const pathname = new URL(request.url).pathname;

  if (isLockedAccessAllowedPath(pathname)) {
    return;
  }

  const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
    organizationId,
  });

  if (subscription?.accessStatus === 'locked') {
    throw redirect('/settings/billing?status=locked');
  }
}

/**
 * Get the currently authenticated user from the session
 *
 * @param request - The incoming request object
 * @returns User object if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const user = await getUser(request);
 *   if (!user) {
 *     // User is not authenticated
 *     return { user: null };
 *   }
 *   return { user };
 * }
 * ```
 */
export async function getUser(request: Request): Promise<User | null> {
  const session = await getSession(request);
  const userId = session.get('userId');
  const organizationId = session.get('organizationId');
  const role = session.get('role');

  if (!userId) {
    return null;
  }

  try {
    const user = await workos.userManagement.getUser(userId);

    // Get role from session if available, otherwise fetch from Convex
    let userRole = role;
    if (!userRole) {
      userRole = await convexServer.query(api.users.getUserRole, {
        workosUserId: userId,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      organizationId: organizationId || undefined,
      role: userRole || undefined,
    };
  } catch (_error) {
    // If user doesn't exist or there's an error, clear the session
    return null;
  }
}

/**
 * Require authentication for a route - redirects to login if not authenticated
 *
 * @param request - The incoming request object
 * @returns User object (guaranteed to be authenticated)
 * @throws Redirect to /auth/login if user is not authenticated
 *
 * @example
 * ```typescript
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const user = await requireUser(request); // Throws redirect if not authenticated
 *   // User is guaranteed to be authenticated here
 *   return { user };
 * }
 * ```
 */
export async function requireUser(request: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  await enforceSubscriptionAccess(request, user.organizationId);
  return user;
}

/**
 * Require specific role(s) for a route - redirects if user doesn't have required role
 *
 * @param request - The incoming request object
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns User object (guaranteed to have one of the allowed roles)
 * @throws Redirect to /dashboard if user doesn't have required role
 *
 * @example
 * ```typescript
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const user = await requireRole(request, ['owner', 'admin']);
 *   // User is guaranteed to be owner or admin
 *   return { user };
 * }
 * ```
 */
export async function requireRole(request: Request, allowedRoles: Role[]): Promise<User> {
  const user = await requireUser(request);

  if (!user.role || !hasRole(user.role, allowedRoles)) {
    throw redirect('/dashboard');
  }

  return user;
}

/**
 * Require minimum tier for a route - redirects if user's organization doesn't have required tier
 *
 * @param request - The incoming request object
 * @param requiredTier - Minimum tier required to access the route
 * @returns User object (guaranteed to have organization with required tier)
 * @throws Redirect to /pricing if user doesn't have required tier
 *
 * @example
 * ```typescript
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const user = await requireTier(request, 'starter');
 *   // User's organization is guaranteed to have Starter tier or higher
 *   return { user };
 * }
 * ```
 */
export async function requireTier(request: Request, requiredTier: Tier): Promise<User> {
  const user = await requireUser(request);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  // Fetch organization's subscription from Convex
  const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
    organizationId: user.organizationId,
  });

  if (!subscription || !hasTierAccess(subscription.tier, requiredTier)) {
    throw redirect('/pricing');
  }

  return user;
}

/**
 * Create a new user session and redirect
 *
 * @param userId - WorkOS user ID to store in session
 * @param redirectTo - Path to redirect to after session creation (default: '/')
 * @param organizationId - Organization ID to store in session (optional)
 * @param role - User role to store in session (optional)
 * @returns Response with session cookie set
 *
 * @example
 * ```typescript
 * // After successful authentication
 * return createUserSession(authResponse.user.id, '/dashboard', orgId, 'owner');
 * ```
 */
export async function createUserSession(
  userId: string,
  redirectTo: string = '/',
  organizationId?: string,
  role?: string
) {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);

  if (organizationId) {
    session.set('organizationId', organizationId);
  }

  if (role) {
    session.set('role', role);
  }

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

/**
 * Get user's role from WorkOS and sync to Convex
 *
 * @param userId - WorkOS user ID
 * @param organizationId - Organization ID
 * @returns User's role (defaults to 'team_member' if not set in WorkOS)
 */
export async function syncUserRoleFromWorkOS(
  userId: string,
  organizationId: string
): Promise<string> {
  try {
    // Get user's organization membership from WorkOS
    const { data: memberships } = await workos.userManagement.listOrganizationMemberships({
      userId,
      organizationId,
    });

    // Get the role from the first membership (user should only have one membership per org)
    const membership = memberships[0];
    const role = membership?.role?.slug || 'member';

    // Sync role to Convex
    await convexServer.mutation(api.users.updateUserRole, {
      workosUserId: userId,
      role,
    });

    return role;
  } catch (error) {
    console.error('Failed to sync user role from WorkOS:', error);
    // Return default role if sync fails
    return 'member';
  }
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect('/auth/login', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
}

export function getAuthorizationUrl(state?: string, organizationId?: string) {
  // Use WorkOS User Management with organization selection support
  // AuthKit handles organization creation and selection automatically
  return workos.userManagement.getAuthorizationUrl({
    clientId: WORKOS_CLIENT_ID,
    redirectUri: WORKOS_REDIRECT_URI,
    provider: 'authkit',
    // Enable organization selection/creation
    // If no organizationId provided, WorkOS will handle org selection/creation
    ...(organizationId && { organizationId }),
    ...(state && { state }),
  });
}

export async function authenticateWithCode(code: string) {
  try {
    const authResponse = await workos.userManagement.authenticateWithCode({
      clientId: WORKOS_CLIENT_ID,
      code,
    });

    return authResponse;
  } catch (error) {
    console.error('WorkOS authentication error:', error);
    throw error;
  }
}

export async function authenticateWithOrganizationSelection(
  pendingAuthenticationToken: string,
  organizationId: string
) {
  try {
    const authResponse = await workos.userManagement.authenticateWithOrganizationSelection({
      clientId: WORKOS_CLIENT_ID,
      pendingAuthenticationToken,
      organizationId,
    });

    return authResponse;
  } catch (error) {
    console.error('WorkOS organization selection error:', error);
    throw error;
  }
}

// Organization management functions
export async function createOrganization(name: string, domains: string[] = []) {
  try {
    console.log('Attempting to create organization with:', { name, domains });

    // Try with minimal parameters first
    const organization = await workos.organizations.createOrganization({
      name: name.trim(),
      // Remove domains parameter as it might be causing issues
      // domains,
    });

    console.log('Organization created successfully:', organization);
    return organization;
  } catch (error: unknown) {
    const workosError = error as {
      message?: string;
      status?: number;
      code?: string;
      requestID?: string;
      data?: unknown;
      response?: { data?: unknown };
    };
    console.error('Failed to create organization:', {
      message: workosError.message,
      status: workosError.status,
      code: workosError.code,
      requestID: workosError.requestID,
      details: workosError.data || workosError.response?.data || 'No additional details',
      fullError: workosError,
    });
    throw error;
  }
}

export async function createOrganizationMembership(
  organizationId: string,
  userId: string,
  roleSlug: string = 'owner'
) {
  try {
    const membership = await workos.userManagement.createOrganizationMembership({
      organizationId,
      userId,
      roleSlug, // Required when WorkOS RBAC is enabled
    });

    return membership;
  } catch (error) {
    console.error('Failed to create organization membership:', error);
    throw error;
  }
}

export async function inviteUserToOrganization(options: {
  email: string;
  organizationId: string;
  roleSlug: string;
  inviterUserId?: string;
}) {
  try {
    return await workos.userManagement.sendInvitation({
      email: options.email,
      organizationId: options.organizationId,
      roleSlug: options.roleSlug,
      inviterUserId: options.inviterUserId,
    });
  } catch (error) {
    console.error('Failed to send WorkOS invitation:', error);
    throw error;
  }
}

export async function getOrganizationMembershipForUser(organizationId: string, userId: string) {
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId,
      userId,
    });

    return memberships.data[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch organization membership:', error);
    throw error;
  }
}

export async function deactivateOrganizationMembership(membershipId: string) {
  try {
    return await workos.userManagement.deactivateOrganizationMembership(membershipId);
  } catch (error) {
    console.error('Failed to deactivate organization membership:', error);
    throw error;
  }
}

export async function reactivateOrganizationMembership(membershipId: string) {
  try {
    return await workos.userManagement.reactivateOrganizationMembership(membershipId);
  } catch (error) {
    console.error('Failed to reactivate organization membership:', error);
    throw error;
  }
}

export async function updateOrganizationMembershipRole(membershipId: string, roleSlug: string) {
  try {
    return await workos.userManagement.updateOrganizationMembership(membershipId, {
      roleSlug,
    });
  } catch (error) {
    console.error('Failed to update organization membership role:', error);
    throw error;
  }
}

export async function inviteOrAddUserToOrganization(options: {
  email: string;
  organizationId: string;
  roleSlug: string;
  inviterUserId?: string;
}) {
  const normalizedEmail = options.email.trim().toLowerCase();

  try {
    const existingUsers = await workos.userManagement.listUsers({ email: normalizedEmail });
    const existingUser = existingUsers.data[0];

    if (existingUser) {
      const membership = await getOrganizationMembershipForUser(
        options.organizationId,
        existingUser.id
      );

      if (membership) {
        if (membership.status === 'inactive') {
          await reactivateOrganizationMembership(membership.id);
        }

        if (membership.role?.slug !== options.roleSlug) {
          await updateOrganizationMembershipRole(membership.id, options.roleSlug);
        }

        return {
          type: 'existing_member' as const,
          workosUserId: existingUser.id,
          membershipId: membership.id,
          user: existingUser,
        };
      }

      const createdMembership = await createOrganizationMembership(
        options.organizationId,
        existingUser.id,
        options.roleSlug
      );

      return {
        type: 'membership_created' as const,
        workosUserId: existingUser.id,
        membershipId: createdMembership.id,
        user: existingUser,
      };
    }

    const invitation = await inviteUserToOrganization({
      email: normalizedEmail,
      organizationId: options.organizationId,
      roleSlug: options.roleSlug,
      inviterUserId: options.inviterUserId,
    });

    return {
      type: 'invited' as const,
      invitation,
      user: null,
    };
  } catch (error) {
    console.error('Failed to invite or add user to organization:', error);
    throw error;
  }
}

export async function listOrganizations() {
  try {
    const { data: organizations } = await workos.organizations.listOrganizations();
    return organizations;
  } catch (error) {
    console.error('Failed to list organizations:', error);
    throw error;
  }
}

export async function refreshTokenWithOrganization(refreshToken: string, organizationId: string) {
  try {
    const authResponse = await workos.userManagement.authenticateWithRefreshToken({
      clientId: WORKOS_CLIENT_ID,
      refreshToken,
      organizationId,
    });

    return authResponse;
  } catch (error) {
    console.error('Failed to refresh token with organization:', error);
    throw error;
  }
}
