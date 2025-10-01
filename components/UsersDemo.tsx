import { useGetAllUsers, useCreateUser } from '../lib/useConvex';

/**
 * UsersDemo Component
 *
 * This is a demo component that shows how to interact with the Convex database.
 * It demonstrates:
 * - Using Convex query hooks (useGetAllUsers)
 * - Using Convex mutation hooks (useCreateUser)
 * - Handling loading states
 * - Displaying real-time data updates
 *
 * Pattern: Convex hooks are reactive - when data changes in the database,
 * the component automatically re-renders with the new data.
 *
 * In production, you would typically create users through the authentication flow
 * (see app/routes/auth/callback.tsx) rather than manually like this.
 */
export function UsersDemo() {
  // Query hook - automatically subscribes to database changes
  // Returns undefined while loading, then the array of users
  const users = useGetAllUsers();

  // Mutation hook - returns a function to create users
  const createUser = useCreateUser();

  const handleCreateUser = async () => {
    try {
      // Example: Create a demo user in Convex
      // IMPORTANT: workosUserId and organizationId are REQUIRED fields
      // In production, these come from WorkOS authentication
      await createUser({
        email: 'test@example.com',
        name: 'Test User',
        workosUserId: 'demo_user_' + Date.now(), // Unique ID for demo
        organizationId: 'demo_org_123', // Would come from WorkOS in production
      });

      // After mutation completes, the users query will automatically
      // re-execute and the UI will update with the new user
    } catch (error) {
      // Log errors in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to create user:', error);
      }
      // In production, you'd want to show a user-friendly error message
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Users Demo</h2>

      <button
        onClick={handleCreateUser}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4 transition-colors"
      >
        Create Test User
      </button>

      <div>
        <h3 className="text-lg font-semibold mb-2">All Users:</h3>

        {/* Loading state: users is undefined while query is loading */}
        {users === undefined ? (
          <p className="text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found. Create one to get started!</p>
        ) : (
          <ul className="space-y-2">
            {users.map(user => (
              <li key={user._id} className="border border-gray-200 p-3 rounded shadow-sm">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Organization:</strong> {user.organizationId}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Active:</strong> {user.isActive ? '✅ Yes' : '❌ No'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
