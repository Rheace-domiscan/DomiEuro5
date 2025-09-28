import { redirect } from 'react-router';
import type { Route } from './+types/callback';
import { authenticateWithCode, createUserSession } from '~/lib/auth.server';
import { createOrUpdateUserInConvex } from '../../../lib/convex.server';
import { sessionStorage, commitSession } from '~/lib/session.server';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Handle error case
  if (error) {
    console.error('WorkOS authentication error:', error);
    return redirect('/auth/login?error=' + encodeURIComponent(error));
  }

  // Handle missing code
  if (!code) {
    return redirect('/auth/login?error=' + encodeURIComponent('Missing authorization code'));
  }

  try {
    // Authenticate with WorkOS
    const authResponse = await authenticateWithCode(code);

    // If no organization, store auth data in session and redirect to organization creation
    if (!authResponse.organizationId) {
      console.log('User authenticated but no organization - storing session and redirecting to org creation');

      // Store temporary authentication data in session
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

    // Create or update user in Convex database
    await createOrUpdateUserInConvex({
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName || undefined,
      lastName: authResponse.user.lastName || undefined,
      organizationId: authResponse.organizationId,
    });

    // Create user session and redirect to home
    return createUserSession(authResponse.user.id, '/');
  } catch (error: any) {
    console.error('Authentication failed:', error);

    // Check if this is an organization selection error
    if (error.code === 'organization_selection_required' && error.pendingAuthenticationToken) {
      // Redirect to organization selection page with pending token
      return redirect(`/auth/organization-selection?token=${encodeURIComponent(error.pendingAuthenticationToken)}&organizations=${encodeURIComponent(JSON.stringify(error.organizations || []))}`);
    }

    return redirect('/auth/login?error=' + encodeURIComponent('Authentication failed'));
  }
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          Authenticating...
        </h2>
        <p className="mt-2 text-gray-600">
          Please wait while we sign you in.
        </p>
      </div>
    </div>
  );
}