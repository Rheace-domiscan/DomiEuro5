import type { Route } from './+types/dashboard';
import { Outlet, data, useLoaderData } from 'react-router';
import { TopNav } from '../../components/navigation/TopNav';

export async function loader({ request }: Route.LoaderArgs) {
  const { rbacService } = await import('~/services/providers.server');
  const user = await rbacService.requireUser(request);
  const organizations = await rbacService.listUserOrganizationsForNav(user.id);

  return data({ user, organizations });
}

export default function Dashboard() {
  const { user, organizations } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user} organizations={organizations} />

      <main className="py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
