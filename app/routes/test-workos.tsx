import type { Route } from './+types/test-workos';
import { workos, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from '~/lib/workos.server';

export async function loader({ request: _request }: Route.LoaderArgs) {
  try {
    // Test WorkOS configuration
    const config = {
      clientId: WORKOS_CLIENT_ID,
      redirectUri: WORKOS_REDIRECT_URI,
      hasApiKey: !!process.env.WORKOS_API_KEY,
    };

    // Try to generate an authorization URL
    const authUrl = workos.userManagement.getAuthorizationUrl({
      clientId: WORKOS_CLIENT_ID,
      redirectUri: WORKOS_REDIRECT_URI,
      provider: 'authkit',
    });

    return {
      success: true,
      config,
      authUrl: authUrl, // Show full URL for debugging
      fullAuthUrl: authUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        clientId: WORKOS_CLIENT_ID,
        redirectUri: WORKOS_REDIRECT_URI,
        hasApiKey: !!process.env.WORKOS_API_KEY,
      },
    };
  }
}

import { useLoaderData } from 'react-router';

export default function TestWorkOS() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">WorkOS Configuration Test</h1>

        {/* Debug info */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-blue-800">Debug Info:</h3>
          <pre className="text-sm text-blue-700 mt-2">{JSON.stringify(data, null, 2)}</pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Configuration Status</h2>
          <div className="space-y-3">
            <div className="flex">
              <span className="font-semibold text-gray-700 w-32">Success:</span>
              <span className={`font-bold ${data.success ? 'text-green-600' : 'text-red-600'}`}>
                {data.success ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-32">Client ID:</span>
              <span className="text-gray-900 font-mono text-sm">
                {data.config?.clientId || 'Not found'}
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-32">Redirect URI:</span>
              <span className="text-gray-900 font-mono text-sm">
                {data.config?.redirectUri || 'Not found'}
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-700 w-32">Has API Key:</span>
              <span
                className={`font-bold ${data.config?.hasApiKey ? 'text-green-600' : 'text-red-600'}`}
              >
                {data.config?.hasApiKey ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {data.success && data.fullAuthUrl && (
          <div className="bg-green-50 p-6 rounded-lg shadow-lg mb-6 border border-green-200">
            <h2 className="text-xl font-semibold mb-4 text-green-800">✅ Generated Auth URL</h2>
            <div className="bg-white p-4 rounded border break-all text-sm text-gray-800">
              {data.fullAuthUrl}
            </div>
            <p className="text-green-700 mt-2 text-sm">
              This URL should redirect to WorkOS AuthKit for authentication.
            </p>
          </div>
        )}

        {!data.success && (
          <div className="bg-red-50 p-6 rounded-lg shadow-lg border border-red-200">
            <h2 className="text-xl font-semibold mb-4 text-red-800">❌ Error</h2>
            <p className="text-red-700 font-mono text-sm">{data.error || 'Unknown error'}</p>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside text-gray-700 space-y-1">
            <li>
              If successful, go back to{' '}
              <a href="/" className="text-blue-600 underline">
                home page
              </a>{' '}
              and test login
            </li>
            <li>If there&apos;s an error, check your WorkOS dashboard configuration</li>
            <li>Ensure AuthKit is enabled in your WorkOS application</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
