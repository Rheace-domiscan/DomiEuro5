import { useGetAllUsers, useCreateUser } from "../lib/useConvex";

export function UsersDemo() {
  const users = useGetAllUsers();
  const createUser = useCreateUser();

  const handleCreateUser = async () => {
    try {
      await createUser({
        email: "test@example.com",
        name: "Test User",
      });
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Users Demo</h2>

      <button
        onClick={handleCreateUser}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Create Test User
      </button>

      <div>
        <h3 className="text-lg font-semibold mb-2">All Users:</h3>
        {users === undefined ? (
          <p>Loading...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user._id} className="border p-2 rounded">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}</p>
                <p><strong>Active:</strong> {user.isActive ? "Yes" : "No"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}