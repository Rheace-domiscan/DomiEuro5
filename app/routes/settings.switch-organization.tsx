import { redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { commitSession, getSession } from '~/lib/session.server';
import { logError } from '~/lib/logger';

function normaliseRedirect(target: unknown): string {
  const value = typeof target === 'string' ? target : '';

  return value.startsWith('/') ? value : '/dashboard';
}

export async function loader(_: LoaderFunctionArgs) {
  return redirect('/settings');
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    throw new Response('Method Not Allowed', { status: 405 });
  }

  const formData = await request.formData();
  const organizationId = formData.get('organizationId');
  const redirectTo = normaliseRedirect(formData.get('redirectTo'));

  if (typeof organizationId !== 'string' || organizationId.length === 0) {
    return redirect(`${redirectTo}?orgSwitch=missing`);
  }

  try {
    const { rbacService } = await import('~/services/providers.server');
    const user = await rbacService.requireUser(request);
    const organizations = await rbacService.listUserOrganizationsForNav(user.id);
    const targetOrganization = organizations.find(org => org.organizationId === organizationId);

    if (!targetOrganization) {
      return redirect(`${redirectTo}?orgSwitch=forbidden`);
    }

    const session = await getSession(request);
    session.set('organizationId', organizationId);

    const role = await rbacService.syncUserRoleFromWorkOS(user.id, organizationId);
    session.set('role', role);

    return redirect(redirectTo, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (error) {
    logError('Failed to switch organization', error, { organizationId });
    return redirect(`${redirectTo}?orgSwitch=error`);
  }
}
