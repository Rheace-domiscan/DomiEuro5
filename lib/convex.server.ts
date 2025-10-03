import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

// Server-side Convex client using HTTP
const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'CONVEX_URL environment variable is required for server-side operations. ' +
      'Please copy .env.example to .env and run "npx convex dev" to get your Convex URL. ' +
      'See CONVEX_SETUP.md for detailed setup instructions.'
  );
}

// TypeScript now knows convexUrl is defined after the check above
export const convexServer = new ConvexHttpClient(convexUrl);

// Server-side user operations
export async function createOrUpdateUserInConvex(workosUser: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string; // Required - organization is mandatory for our application
  role?: string; // Optional - user role from WorkOS
}) {
  // Check if user already exists
  const existingUser = await convexServer.query(api.users.getUserByWorkosId, {
    workosUserId: workosUser.id,
  });

  const userData = {
    email: workosUser.email,
    name: `${workosUser.firstName || ''} ${workosUser.lastName || ''}`.trim() || workosUser.email,
    workosUserId: workosUser.id,
    organizationId: workosUser.organizationId,
  };

  if (existingUser) {
    // Update existing user
    const { workosUserId: _ignored, ...updatableFields } = userData; // Convex update validator disallows workosUserId

    return await convexServer.mutation(api.users.updateUser, {
      id: existingUser._id,
      ...updatableFields,
    });
  } else {
    // Create new user (role will be synced separately via updateUserRole)
    return await convexServer.mutation(api.users.createUser, userData);
  }
}
