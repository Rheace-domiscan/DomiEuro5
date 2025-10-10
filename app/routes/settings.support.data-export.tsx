import { redirect } from 'react-router';
import { data, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { recordMetric } from '~/lib/metrics.server';

type ActionData = { ok: boolean; message?: string; error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const providers = await import('~/services/providers.server');
  const user = await providers.rbacService.requireRole(request, ['owner']);
  const featureFlagsData = await import('~/lib/featureFlags.server');
  const featureFlags = featureFlagsData.listFeatureFlags();

  const onboardingEnabled = featureFlags.some(
    flag => flag.key === 'onboardingWizard' && flag.enabled
  );

  if (!user.organizationId) {
    return redirect('/settings');
  }

  return data({ user, onboardingEnabled });
}

export async function action({ request }: ActionFunctionArgs) {
  const providers = await import('~/services/providers.server');
  const user = await providers.rbacService.requireRole(request, ['owner']);

  if (!user.organizationId) {
    return data<ActionData>({ ok: false, error: 'No organization' }, { status: 400 });
  }

  recordMetric('domieuro.dataExport.requested', {
    tags: { organizationId: user.organizationId },
  });

  // In a real implementation this would queue a background job to assemble the export.
  return data<ActionData>({
    ok: true,
    message: 'Export request logged. Ops team will follow up shortly.',
  });
}

export default function DataExportPage() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Data export requests</h1>
        <p className="text-sm text-secondary">
          Submit a request to export customer data for compliance or offboarding. Ops will receive a
          notification with your organization ID.
        </p>
      </header>

      <form
        method="post"
        className="rounded-lg border border-surface-subtle bg-surface-raised p-6 shadow-sm"
      >
        <p className="text-sm text-secondary">
          Press the button below to log an export request for{' '}
          <span className="font-medium">{user.organizationId}</span>. A background worker should
          handle the actual export in production; this template simply logs the intent.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          {isSubmitting ? 'Requesting…' : 'Request export'}
        </button>
      </form>

      {actionData?.ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionData.message}
        </div>
      ) : null}
    </div>
  );
}
