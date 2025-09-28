import { redirect } from 'react-router';
import type { Route } from './+types/login';
import { getAuthorizationUrl, getUser } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  // If user is already logged in, redirect to home
  const user = await getUser(request);
  if (user) {
    return redirect('/');
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  // Generate the WorkOS authorization URL
  const authorizationUrl = getAuthorizationUrl();
  return redirect(authorizationUrl);
}

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to our Remix app with WorkOS authentication
          </p>
        </div>
        <form method="post" className="mt-8 space-y-6">
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with WorkOS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}