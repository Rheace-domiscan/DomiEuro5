import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { TIERS } from '~/lib/permissions';
import type { Tier } from '~/lib/permissions';
import { requireTier } from '~/lib/auth.server';
import { INTERNAL_CALLERS, INTERNAL_GUARD_HEADER } from '~/lib/internal-guards';

const ALLOWED_CALLERS = new Set<string>(Object.values(INTERNAL_CALLERS));

export async function loader({ request }: LoaderFunctionArgs) {
  const guard = request.headers.get(INTERNAL_GUARD_HEADER);
  if (!guard || !ALLOWED_CALLERS.has(guard)) {
    return data({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');
  if (!tier || !isTier(tier)) {
    return data({ error: 'Tier query param required' }, { status: 400 });
  }

  try {
    const user = await requireTier(request, tier);
    return data({ user });
  } catch (error) {
    if (isRedirectResponse(error)) {
      throw error;
    }

    throw redirect('/pricing');
  }
}

function isTier(value: string): value is Tier {
  return Object.values(TIERS).includes(value as Tier);
}

function isRedirectResponse(error: unknown): error is Response {
  return error instanceof Response && error.status >= 300 && error.status < 400;
}
