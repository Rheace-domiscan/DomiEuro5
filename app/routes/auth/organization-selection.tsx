import { redirect } from 'react-router';
import { Form, useLoaderData } from 'react-router';
import type { Organization } from '@workos-inc/node';
import {
  authenticateWithOrganizationSelection,
  createUserSession,
  syncUserRoleFromWorkOS,
} from '~/lib/auth.server';
import { createOrUpdateUserInConvex } from '../../../lib/convex.server';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const organizationsParam = url.searchParams.get('organizations');

  if (!token) {
    return redirect('/auth/login?error=' + encodeURIComponent('Missing authentication token'));
  }

  let organizations = [];
  if (organizationsParam) {
    try {
      organizations = JSON.parse(decodeURIComponent(organizationsParam));
    } catch {
      // Silently fail - organizations will remain empty array
      // This handles URL tampering or encoding issues gracefully
    }
  }

  return { token, organizations };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const token = formData.get('token') as string;
  const organizationId = formData.get('organizationId') as string;

  if (!token || !organizationId) {
    return redirect('/auth/login?error=' + encodeURIComponent('Missing required parameters'));
  }

  try {
    // Complete authentication with selected organization
    const authResponse = await authenticateWithOrganizationSelection(token, organizationId);

    // Validate that WorkOS returned an organization ID
    if (!authResponse.organizationId) {
      throw new Error('WorkOS authentication succeeded but returned no organization ID');
    }

    // Create or update user in Convex database
    await createOrUpdateUserInConvex({
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName || undefined,
      lastName: authResponse.user.lastName || undefined,
      organizationId: authResponse.organizationId,
    });

    // Sync user role from WorkOS so downstream loaders have the correct value
    const userRole = await syncUserRoleFromWorkOS(
      authResponse.user.id,
      authResponse.organizationId
    );

    // Create user session and redirect to home
    return createUserSession(authResponse.user.id, '/', authResponse.organizationId, userRole);
  } catch (_error) {
    return redirect('/auth/login?error=' + encodeURIComponent('Organization selection failed'));
  }
}

export default function OrganizationSelection() {
  const { token, organizations } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Select Organization</h1>
          <p className="text-gray-600 text-center mb-6">
            Please select the organization you&apos;d like to join:
          </p>

          <Form method="post" className="space-y-4">
            <input type="hidden" name="token" value={token} />

            {organizations.length > 0 ? (
              <div className="space-y-3">
                {organizations.map((org: Organization) => (
                  <button
                    key={org.id}
                    type="submit"
                    name="organizationId"
                    value={org.id}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">{org.name}</div>
                    {org.domains && org.domains.length > 0 && (
                      <div className="text-sm text-gray-500">Domains: {org.domains.join(', ')}</div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  No organizations available. Please contact your administrator or try signing in
                  again.
                </p>
                <a
                  href="/auth/login"
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                >
                  Back to Login
                </a>
              </div>
            )}
          </Form>
        </div>
      </div>
    </div>
  );
}
