import type { Route } from './+types/dashboard';
import { Outlet, useLoaderData } from 'react-router';
import { requireUser } from '~/lib/auth.server';
import { TopNav } from '../../components/navigation/TopNav';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user} />

      <main className="py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
