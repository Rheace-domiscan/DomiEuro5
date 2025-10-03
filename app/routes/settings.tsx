import { Outlet } from 'react-router';
import type { Route } from './+types/settings';
import { requireUser } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

export default function SettingsLayout() {
  return <Outlet />;
}
