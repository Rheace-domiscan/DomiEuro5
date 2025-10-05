import { Outlet } from 'react-router';
import type { Route } from './+types/settings.team';
import { requireRole } from '~/lib/auth.server';
import { ROLES } from '~/lib/permissions';

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, [ROLES.OWNER, ROLES.ADMIN]);
  return null;
}

export { action } from './settings.team._index';

export default function TeamSettingsLayout() {
  return <Outlet />;
}
