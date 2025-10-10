import { useFetcher, useLoaderData } from 'react-router';
import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { recordMetric } from '~/lib/metrics.server';
import { api } from '../../convex/_generated/api';

export async function loader({ request }: LoaderFunctionArgs) {
  const providersModule = await import('~/services/providers.server');
  const { listFeatureFlags } = await import('~/lib/featureFlags.server');

  const user = await providersModule.rbacService.requireRole(request, ['owner', 'admin']);
  const featureFlags = listFeatureFlags();
  const onboardingEnabled = featureFlags.some(
    flag => flag.key === 'onboardingWizard' && flag.enabled
  );

  if (!onboardingEnabled) {
    return redirect('/settings');
  }

  if (!user.organizationId) {
    return redirect('/settings');
  }

  const progress = await providersModule.convexService.client.query(api.onboarding.getProgress, {
    organizationId: user.organizationId,
  });

  return data({ user, progress, featureFlags });
}

type ActionData = { ok: boolean; error?: string };

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent !== 'toggleTask') {
    return data<ActionData>({ ok: false, error: 'Unsupported intent' }, { status: 400 });
  }

  const taskKey = formData.get('taskKey');
  const completed = formData.get('completed') === 'true';

  if (typeof taskKey !== 'string') {
    return data<ActionData>({ ok: false, error: 'Missing task key' }, { status: 400 });
  }

  const providersModule = await import('~/services/providers.server');

  const user = await providersModule.rbacService.requireRole(request, ['owner', 'admin']);

  if (!user.organizationId) {
    return data<ActionData>({ ok: false, error: 'No organization' }, { status: 400 });
  }

  await providersModule.convexService.client.mutation(api.onboarding.toggleTask, {
    organizationId: user.organizationId,
    key: taskKey,
    completed,
  });

  recordMetric('domieuro.onboarding.taskToggled', {
    tags: { task: taskKey, completed, organizationId: user.organizationId },
  });

  return data<ActionData>({ ok: true });
}

const TASK_DESCRIPTIONS: Record<string, string> = {
  connect_domain: 'Point your domain to the app and configure SSL certificates.',
  invite_team: 'Add admins, managers, and teammates so everyone has access.',
  configure_billing: 'Review pricing tiers, Stripe products, and seat policies.',
  set_branding: 'Update logo, theme tokens, and marketing content for launch.',
};

export default function OnboardingChecklist() {
  const { user, progress } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();

  const isSubmitting = fetcher.state !== 'idle';

  const checklist = progress.checklist.map(item => ({
    ...item,
    description: TASK_DESCRIPTIONS[item.key] ?? '',
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Launch checklist</h1>
        <p className="text-sm text-secondary">
          Track onboarding steps for <span className="font-medium">{user.organizationId}</span> as
          you get ready for go-live.
        </p>
      </header>

      <ul className="space-y-4">
        {checklist.map(task => (
          <li
            key={task.key}
            className="rounded-lg border border-surface-subtle bg-surface-raised p-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="toggleTask" />
                <input type="hidden" name="taskKey" value={task.key} />
                <input type="hidden" name="completed" value={(!task.completed).toString()} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-1 h-5 w-5 rounded border transition ${
                    task.completed ? 'bg-indigo-600 text-white' : 'border-surface-subtle'
                  }`}
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.completed ? '✓' : ''}
                </button>
              </fetcher.Form>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-gray-900">{task.label}</h2>
                  {task.completed && task.completedAt ? (
                    <span className="text-xs text-secondary">
                      Completed {new Date(task.completedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                {task.description && <p className="text-sm text-secondary">{task.description}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!progress.checklist.some(item => !item.completed) ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          All onboarding tasks are complete. 🎉
        </div>
      ) : null}
    </div>
  );
}
