import { redirect } from 'react-router';
import type { Route } from './+types/callback';
import {
  authenticateWithCode,
  createUserSession,
  getWorkOSSessionIdFromAccessToken,
} from '~/lib/auth.server';
import { createOrUpdateUserInConvex } from '../../../lib/convex.server';
import { sessionStorage, commitSession } from '~/lib/session.server';

// WorkOS error type that covers all possible error scenarios
type WorkOSError = {
  message?: string;
  // Organization creation error properties
  status?: number;
  code?: string;
  requestID?: string;
  data?: unknown;
  response?: { data?: unknown };
  // Authentication error properties
  pendingAuthenticationToken?: string;
  organizations?: unknown[];
};

/**
 * Authentication callback handler
 *
 * This is the OAuth callback route that WorkOS redirects to after authentication.
 * Flow:
 * 1. Receive authorization code from WorkOS
 * 2. Exchange code for user data and organization info
 * 3. If user has no organization: redirect to org creation (store temp session)
 * 4. If user has organization: create/update user in Convex → create session → redirect home
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Handle error case
  if (error) {
    return redirect('/auth/login?error=' + encodeURIComponent(error));
  }

  // Handle missing code
  if (!code) {
    return redirect('/auth/login?error=' + encodeURIComponent('Missing authorization code'));
  }

  try {
    // Step 1: Exchange authorization code for user data
    const authResponse = await authenticateWithCode(code);

    // Step 2: Check if user needs to create an organization
    // WorkOS can return a user without an organization if org creation is required
    if (!authResponse.organizationId) {
      // Store authentication data in temporary session
      // This allows the org creation flow to complete without re-authenticating
      const tempSession = await sessionStorage.getSession();
      tempSession.set('tempUserId', authResponse.user.id);
      tempSession.set('tempUserEmail', authResponse.user.email);
      tempSession.set('tempUserFirstName', authResponse.user.firstName || '');
      tempSession.set('tempUserLastName', authResponse.user.lastName || '');
      tempSession.set('tempAccessToken', authResponse.accessToken);
      tempSession.set('tempRefreshToken', authResponse.refreshToken);

      return redirect('/auth/create-organization', {
        headers: {
          'Set-Cookie': await commitSession(tempSession),
        },
      });
    }

    // Step 3: User has organization - sync to Convex database
    // This creates or updates the user record with WorkOS data
    await createOrUpdateUserInConvex({
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName || undefined,
      lastName: authResponse.user.lastName || undefined,
      organizationId: authResponse.organizationId,
    });

    // Step 3.5: Sync user role from WorkOS to Convex
    const { syncUserRoleFromWorkOS } = await import('~/lib/auth.server');
    const userRole = await syncUserRoleFromWorkOS(
      authResponse.user.id,
      authResponse.organizationId
    );

    // Step 4: Create permanent session with organizationId and role, then redirect to application
    const workosSessionId = getWorkOSSessionIdFromAccessToken(authResponse.accessToken);
    return createUserSession(
      authResponse.user.id,
      '/',
      authResponse.organizationId,
      userRole,
      workosSessionId
    );
  } catch (error: unknown) {
    const workosError = error as WorkOSError;

    // Check if this is an organization selection error
    if (
      workosError.code === 'organization_selection_required' &&
      workosError.pendingAuthenticationToken
    ) {
      // Redirect to organization selection page with pending token
      return redirect(
        `/auth/organization-selection?token=${encodeURIComponent(workosError.pendingAuthenticationToken)}&organizations=${encodeURIComponent(JSON.stringify(workosError.organizations || []))}`
      );
    }

    return redirect('/auth/login?error=' + encodeURIComponent('Authentication failed'));
  }
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Authenticating...</h2>
        <p className="mt-2 text-gray-600">Please wait while we sign you in.</p>
      </div>
    </div>
  );
}
