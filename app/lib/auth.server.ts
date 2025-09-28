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

    // Ensure user exists in Convex database (idempotent operation)
    try {
      await createOrUpdateUserInConvex({
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        organizationId: (user as any).organizationId || undefined,
      });
    } catch (convexError) {
      console.error('Failed to sync user with Convex:', convexError);
      // Continue anyway - don't block authentication for database issues
    }

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

export function getAuthorizationUrl(state?: string) {
  // Use WorkOS User Management with email/password authentication
  // AuthKit is WorkOS's built-in authentication solution
  return workos.userManagement.getAuthorizationUrl({
    clientId: WORKOS_CLIENT_ID,
    redirectUri: WORKOS_REDIRECT_URI,
    provider: 'authkit',
    ...(state && { state }),
  });
}

export async function authenticateWithCode(code: string) {
  try {
    const { user } = await workos.userManagement.authenticateWithCode({
      clientId: WORKOS_CLIENT_ID,
      code,
    });
    
    return user;
  } catch (error) {
    console.error('WorkOS authentication error:', error);
    throw error;
  }
}