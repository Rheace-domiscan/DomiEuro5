import { redirect } from 'react-router';
import { workos, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from './workos.server';
import { getSession, commitSession, destroySession, sessionStorage } from './session.server';
import { createOrUpdateUserInConvex } from '../../lib/convex.server';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function getUser(request: Request): Promise<User | null> {
  const session = await getSession(request);
  const userId = session.get('userId');
  
  if (!userId) {
    return null;
  }

  try {
    const user = await workos.userManagement.getUser(userId);

    // Note: When getting user from session, we don't have organizationId
    // The user should already exist in Convex from the initial authentication
    // We only sync basic user info here, not organization data

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };
  } catch (error) {
    // If user doesn't exist or there's an error, clear the session
    return null;
  }
}

export async function requireUser(request: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  return user;
}

export async function createUserSession(userId: string, redirectTo: string = '/', request?: Request) {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
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
    const organization = await workos.organizations.createOrganization({
      name,
      domains,
    });

    return organization;
  } catch (error) {
    console.error('Failed to create organization:', error);
    throw error;
  }
}

export async function createOrganizationMembership(organizationId: string, userId: string) {
  try {
    const membership = await workos.userManagement.createOrganizationMembership({
      organizationId,
      userId,
    });

    return membership;
  } catch (error) {
    console.error('Failed to create organization membership:', error);
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