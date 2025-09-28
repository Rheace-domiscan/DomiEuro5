import { redirect } from 'react-router';
import type { Route } from './+types/callback';
import { authenticateWithCode, createUserSession } from '~/lib/auth.server';
import { createOrUpdateUserInConvex } from '../../../lib/convex.server';

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
    const user = await authenticateWithCode(code);

    // Create or update user in Convex database
    await createOrUpdateUserInConvex({
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      organizationId: (user as any).organizationId || undefined,
    });

    // Create user session and redirect to home
    return createUserSession(user.id, '/');
  } catch (error) {
    console.error('Authentication failed:', error);
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