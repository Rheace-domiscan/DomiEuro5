import { redirect } from 'react-router';
import { Form, useLoaderData, useActionData } from 'react-router';
import type { Route } from './+types/create-organization';
import { getSession } from '~/lib/session.server';
import {
  createOrganization,
  createOrganizationMembership,
  syncUserRoleFromWorkOS,
  createUserSession,
} from '~/lib/auth.server';
import { createOrUpdateUserInConvex } from '../../../lib/convex.server';

// Error type for organization creation flow (handles WorkOS + Convex errors)
type OrganizationCreationError = {
  message?: string;
};

interface LoaderData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface ActionData {
  error?: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData | Response> {
  const session = await getSession(request);

  // Verify user has temporary auth data in session
  const tempUserId = session.get('tempUserId');
  const tempUserEmail = session.get('tempUserEmail');
  const tempAccessToken = session.get('tempAccessToken');
  const tempRefreshToken = session.get('tempRefreshToken');

  if (!tempUserId || !tempUserEmail || !tempAccessToken || !tempRefreshToken) {
    // No valid temporary session, redirect back to login
    return redirect(
      '/auth/login?error=' + encodeURIComponent('Session expired. Please sign in again.')
    );
  }

  return {
    user: {
      id: tempUserId,
      email: tempUserEmail,
      firstName: session.get('tempUserFirstName') || '',
      lastName: session.get('tempUserLastName') || '',
    },
  };
}

export async function action({ request }: Route.ActionArgs): Promise<Response | ActionData> {
  const session = await getSession(request);
  const formData = await request.formData();
  const organizationName = formData.get('organizationName') as string;

  // Verify session data
  const tempUserId = session.get('tempUserId');
  const tempUserEmail = session.get('tempUserEmail');
  const tempAccessToken = session.get('tempAccessToken');
  const tempRefreshToken = session.get('tempRefreshToken');

  if (!tempUserId || !tempUserEmail || !tempAccessToken || !tempRefreshToken) {
    return redirect(
      '/auth/login?error=' + encodeURIComponent('Session expired. Please sign in again.')
    );
  }

  if (!organizationName || organizationName.trim().length < 2) {
    return { error: 'Organization name must be at least 2 characters long.' };
  }

  try {
    // Step 1: Create organization in WorkOS
    // This creates a new organization that the user will be part of
    const organization = await createOrganization(organizationName.trim());

    // Step 2: Create organization membership in WorkOS
    // This links the authenticated user to their new organization
    await createOrganizationMembership(organization.id, tempUserId);

    // Step 3: Sync user to Convex database with organization
    // Now we have all required fields (workosUserId + organizationId) to create the user
    await createOrUpdateUserInConvex({
      id: tempUserId,
      email: tempUserEmail,
      firstName: session.get('tempUserFirstName') || undefined,
      lastName: session.get('tempUserLastName') || undefined,
      organizationId: organization.id,
    });

    // Step 3.5: Sync user role from WorkOS to Convex
    // When creating an organization, the user becomes the owner by default
    const userRole = await syncUserRoleFromWorkOS(tempUserId, organization.id);

    // Step 4: Create permanent session with organizationId and role, then redirect
    return createUserSession(tempUserId, '/', organization.id, userRole);
  } catch (error: unknown) {
    const creationError = error as OrganizationCreationError;

    // Only log detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Organization creation failed:', creationError);
    }

    // Handle specific WorkOS errors with helpful guidance
    if (creationError.message?.includes('organization already exists')) {
      return {
        error: 'An organization with this name already exists. Please choose a different name.',
      };
    }

    if (
      creationError.message?.includes('permission') ||
      creationError.message?.includes('forbidden')
    ) {
      return {
        error:
          'Organization creation is not enabled. Please contact your WorkOS administrator or check your WorkOS dashboard settings (Organizations → Settings → Allow organization creation).',
      };
    }

    if (creationError.message?.includes('rate limit')) {
      return {
        error: 'Too many requests. Please wait a moment and try again.',
      };
    }

    // Generic error with helpful next steps
    return {
      error:
        'Failed to create organization. Please try again or contact support if the problem persists. (Check WORKOS_SETUP.md for configuration help)',
    };
  }
}

export default function CreateOrganization() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Create Your Organization
          </h1>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Welcome, {user.firstName || user.email}!</span>
              <br />
              To get started, please create an organization for your account.
            </p>
          </div>

          {actionData?.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{actionData.error}</p>
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Organization Name
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                required
                minLength={2}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your organization name"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be the name of your workspace. You can change it later.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Create Organization
            </button>
          </Form>

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
