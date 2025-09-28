# Convex Database Setup - DomiEuro

## Overview
This project now includes a fully configured Convex database with a `users` table that integrates with WorkOS authentication.

## Database Schema

### Users Table
- **email**: string (indexed)
- **name**: string
- **createdAt**: number (timestamp, indexed)
- **updatedAt**: number (timestamp)
- **isActive**: boolean
- **workosUserId**: optional string (indexed) - for WorkOS integration
- **organizationId**: optional string (indexed) - for WorkOS organizations

## Available Functions

### Queries
- `getAllUsers()` - Get all users
- `getUserByEmail(email)` - Get user by email address
- `getUserByWorkosId(workosUserId)` - Get user by WorkOS ID
- `getUsersByOrganization(organizationId)` - Get users in an organization

### Mutations
- `createUser({ email, name, workosUserId?, organizationId? })` - Create new user
- `updateUser({ id, name?, email?, isActive?, organizationId? })` - Update user
- `deactivateUser({ id })` - Deactivate user (soft delete)

## Setup Steps

1. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Convex deployment URL to `.env.local`:
   ```
   CONVEX_URL=https://your-deployment.convex.cloud
   ```

2. **Deploy to Convex**
   ```bash
   npx convex deploy
   ```

3. **Wrap Your App with ConvexProvider**
   ```tsx
   import { ConvexClientProvider } from "./lib/ConvexProvider";

   function App() {
     return (
       <ConvexClientProvider>
         {/* Your app components */}
       </ConvexClientProvider>
     );
   }
   ```

4. **Use the Database Hooks**
   ```tsx
   import { useGetAllUsers, useCreateUser } from "./lib/useConvex";

   function MyComponent() {
     const users = useGetAllUsers();
     const createUser = useCreateUser();

     const handleCreate = () => {
       createUser({
         email: "user@example.com",
         name: "New User"
       });
     };

     return (
       <div>
         {users?.map(user => (
           <div key={user._id}>{user.name}</div>
         ))}
       </div>
     );
   }
   ```

## Files Created
- `convex.json` - Convex configuration
- `convex/schema.ts` - Database schema definition
- `convex/users.ts` - User CRUD operations
- `lib/convex.ts` - Convex client setup
- `lib/ConvexProvider.tsx` - React provider component
- `lib/useConvex.ts` - Custom hooks for database operations
- `components/UsersDemo.tsx` - Demo component for testing

## Type Safety
All database operations are fully type-safe with TypeScript. The Convex CLI automatically generates types based on your schema and functions.