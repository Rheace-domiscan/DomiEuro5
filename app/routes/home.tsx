import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { getUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  return { user };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home - My Remix App" },
    { name: "description", content: "Welcome to my Remix application with WorkOS!" },
  ];
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to My Remix App
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          This is a Remix app with WorkOS authentication integration.
        </p>
        
        {user ? (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Hello, {user.firstName || user.email}!
              </h2>
              <p className="text-gray-600 mb-4">
                You are successfully authenticated with WorkOS.
              </p>
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                >
                  Go to Dashboard
                </Link>
                <form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Get Started
              </h2>
              <p className="text-gray-600 mb-4">
                Sign in to access your dashboard and explore the app features.
              </p>
              <Link
                to="/auth/login"
                className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium"
              >
                Sign In with WorkOS
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
