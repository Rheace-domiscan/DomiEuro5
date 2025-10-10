import { useFetcher, useLoaderData, useNavigation } from 'react-router';
import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import crypto from 'node:crypto';
import { api } from '../../convex/_generated/api';
import { recordMetric } from '~/lib/metrics.server';
import type { Id } from '../../convex/_generated/dataModel';

function generateApiKey() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashApiKey(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

type ActionData = {
  ok: boolean;
  newKey?: { token: string; name: string; prefix: string };
  error?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const providersModule = await import('~/services/providers.server');
  const { listFeatureFlags } = await import('~/lib/featureFlags.server');

  const user = await providersModule.rbacService.requireRole(request, ['owner', 'admin']);
  const featureFlags = listFeatureFlags();
  const enabled = featureFlags.some(flag => flag.key === 'apiKeys' && flag.enabled);

  if (!enabled) {
    return redirect('/settings');
  }

  if (!user.organizationId) {
    return redirect('/settings');
  }

  const keys = await providersModule.convexService.client.query(api.apiKeys.listByOrganization, {
    organizationId: user.organizationId,
  });

  return data({ user, keys, featureFlags });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  const providersModule = await import('~/services/providers.server');

  const user = await providersModule.rbacService.requireRole(request, ['owner', 'admin']);

  if (!user.organizationId) {
    return data<ActionData>({ ok: false, error: 'Organization required' }, { status: 400 });
  }

  if (intent === 'create') {
    const name = formData.get('name');

    if (typeof name !== 'string' || name.trim().length === 0) {
      return data<ActionData>({ ok: false, error: 'Name is required' }, { status: 400 });
    }

    const token = generateApiKey();
    const hashed = hashApiKey(token);
    const keyPrefix = token.slice(0, 8);

    await providersModule.convexService.client.mutation(api.apiKeys.create, {
      organizationId: user.organizationId,
      name: name.trim(),
      keyPrefix,
      hashedKey: hashed,
      createdBy: user.id,
    });

    recordMetric('domieuro.apiKeys.created', {
      tags: { organizationId: user.organizationId },
    });

    return data<ActionData>({ ok: true, newKey: { token, name: name.trim(), prefix: keyPrefix } });
  }

  if (intent === 'revoke') {
    const keyId = formData.get('keyId');

    if (typeof keyId !== 'string') {
      return data<ActionData>({ ok: false, error: 'Missing key id' }, { status: 400 });
    }

    await providersModule.convexService.client.mutation(api.apiKeys.revoke, {
      apiKeyId: keyId as Id<'apiKeys'>,
    });

    recordMetric('domieuro.apiKeys.revoked', {
      tags: { organizationId: user.organizationId },
    });

    return data<ActionData>({ ok: true });
  }

  return data<ActionData>({ ok: false, error: 'Unsupported intent' }, { status: 400 });
}

function maskPrefix(prefix: string) {
  return `${prefix}…`;
}

export default function ApiKeysPage() {
  const { user, keys } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state !== 'idle' || fetcher.state !== 'idle';
  const newKey = fetcher.data?.newKey ?? null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">API access</h1>
        <p className="text-sm text-secondary">
          Generate scoped API keys for {user.organizationId}. Keys are shown once—store them
          securely.
        </p>
      </header>

      <section className="rounded-lg border border-surface-subtle bg-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Create new key</h2>
        <fetcher.Form method="post" className="mt-4 space-y-4">
          <input type="hidden" name="intent" value="create" />
          <label className="block text-sm font-medium text-gray-700">
            Label
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. staging-backend"
              className="mt-1 w-full rounded-md border border-surface-subtle px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            {isSubmitting ? 'Creating…' : 'Create API key'}
          </button>
        </fetcher.Form>

        {newKey ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Copy your new key now:</p>
            <code className="mt-2 block rounded bg-white px-3 py-2 text-xs text-gray-900">
              {newKey.token}
            </code>
            <p className="mt-2">This value will not be shown again.</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-surface-subtle bg-surface-raised p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Existing keys</h2>
        {keys.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">No keys have been issued yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-surface-subtle">
            <table className="min-w-full divide-y divide-surface-subtle text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-secondary">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-secondary">Prefix</th>
                  <th className="px-4 py-2 text-left font-medium text-secondary">Created</th>
                  <th className="px-4 py-2 text-left font-medium text-secondary">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle">
                {keys.map(key => (
                  <tr key={key._id} className="bg-surface-raised">
                    <td className="px-4 py-2 text-gray-900">{key.name}</td>
                    <td className="px-4 py-2 text-secondary">{maskPrefix(key.keyPrefix)}</td>
                    <td className="px-4 py-2 text-secondary">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-secondary">
                      {key.revokedAt ? 'Revoked' : 'Active'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {key.revokedAt ? (
                        <span className="text-xs text-secondary">Revoked</span>
                      ) : (
                        <fetcher.Form method="post" className="inline-flex">
                          <input type="hidden" name="intent" value="revoke" />
                          <input type="hidden" name="keyId" value={key._id} />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md border border-surface-subtle px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        </fetcher.Form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
