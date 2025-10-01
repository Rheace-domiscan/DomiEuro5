# WorkOS RBAC Setup Guide

This guide walks through configuring Role-Based Access Control (RBAC) in WorkOS for the billing system's 5 user roles.

---

## Overview

The billing system uses **5 custom roles** to control access to features and billing:

| Role | Billing Access | User Management | Product Access |
|------|----------------|-----------------|----------------|
| **Owner** | Full (manage) | Full (invite anyone) | Full features |
| **Admin** | Read-only | Full (invite anyone) | Full features |
| **Manager** | None | None | Full features |
| **Sales** | None | None | Sales features only |
| **Team Member** | None | None | Basic features only |

---

## Prerequisites

- WorkOS account with User Management enabled
- Access to WorkOS Dashboard
- Admin permissions in your WorkOS environment

---

## Step 1: Access Roles & Permissions

1. Log in to **WorkOS Dashboard**: https://dashboard.workos.com
2. Select your **Environment** (Development or Production)
3. Navigate to: **User Management → Roles & Permissions**

---

## Step 2: Create Roles

### 2.1 Create "Owner" Role

1. Click **Create Role**
2. Fill in:
   - **Role name:** `Owner`
   - **Role slug:** `owner` (immutable, use lowercase)
   - **Description:** `Organization owner with full billing and management access`
3. Click **Create role**

**Permissions to assign** (we'll define these in code, not WorkOS):
- Full billing control
- Full user management
- Can transfer ownership
- All product features

### 2.2 Create "Admin" Role

1. Click **Create Role**
2. Fill in:
   - **Role name:** `Admin`
   - **Role slug:** `admin`
   - **Description:** `Administrative access with read-only billing`
3. Click **Create role**

**Permissions:**
- Read-only billing access
- Full user management
- Can add seats
- All product features

### 2.3 Create "Manager" Role

1. Click **Create Role**
2. Fill in:
   - **Role name:** `Manager`
   - **Role slug:** `manager`
   - **Description:** `Management role with no billing or user management access`
3. Click **Create role**

**Permissions:**
- No billing access
- No user management
- All product features

### 2.4 Create "Sales" Role

1. Click **Create Role**
2. Fill in:
   - **Role name:** `Sales`
   - **Role slug:** `sales`
   - **Description:** `Sales team with access to sales-specific features`
3. Click **Create role**

**Permissions:**
- No billing access
- No user management
- Sales features only

### 2.5 Create "Team Member" Role

1. Click **Create Role**
2. Fill in:
   - **Role name:** `Team Member`
   - **Role slug:** `team_member`
   - **Description:** `Basic user with limited feature access`
3. Click **Create role**

**Permissions:**
- No billing access
- No user management
- Basic features only

---

## Step 3: Configure Default Role

The **default role** is automatically assigned to new organization members.

1. Go to: **User Management → Settings**
2. Find: **Default Role**
3. Select: `team_member` from dropdown
4. Click **Save**

**Why team_member?**
- Safest default (least permissions)
- Admins/owners can promote users as needed

---

## Step 4: Verify Roles Configuration

1. Go to: **User Management → Roles & Permissions**
2. You should see all 5 roles listed:
   - ✅ owner
   - ✅ admin
   - ✅ manager
   - ✅ sales
   - ✅ team_member
3. Default role badge should show on **team_member**

---

## Step 5: Test Role Assignment

### 5.1 Via WorkOS Dashboard (Manual Testing)

1. Go to: **Organizations → [Select an organization]**
2. Go to: **Members** tab
3. Click **Add Member**
4. Select **Role:** `admin`
5. Enter user email
6. Click **Add Member**
7. Verify role appears in member list

### 5.2 Via API (Programmatic Testing)

```typescript
// Example: Assign role when creating organization membership
import { workos } from './lib/workos.server';

const membership = await workos.userManagement.createOrganizationMembership({
  organizationId: 'org_123',
  userId: 'user_456',
  roleSlug: 'admin', // Must match slug from WorkOS dashboard
});

console.log(membership.role); // { slug: 'admin' }
```

### 5.3 Verify in Authentication Response

When users authenticate, their role is included in the response:

```typescript
const authResponse = await workos.userManagement.authenticateWithCode({
  clientId: WORKOS_CLIENT_ID,
  code,
});

console.log(authResponse.organizationMembership.role);
// { slug: 'admin' }
```

---

## Step 6: Integration with Your App

### 6.1 Sync Roles to Convex on Login

Update your authentication callback to sync WorkOS roles to Convex:

```typescript
// app/routes/auth/callback.tsx
export async function loader({ request }: Route.LoaderArgs) {
  // ... existing auth code ...

  const authResponse = await authenticateWithCode(code);
  const workosRole = authResponse.organizationMembership?.role?.slug;

  // Sync to Convex
  await convex.mutation(api.users.upsertUser, {
    workosUserId: authResponse.user.id,
    email: authResponse.user.email,
    name: `${authResponse.user.firstName} ${authResponse.user.lastName}`,
    organizationId: authResponse.organizationMembership.organizationId,
    role: workosRole || 'team_member', // Default if missing
  });

  // ... create session ...
}
```

### 6.2 Store Role in Session

```typescript
// app/lib/auth.server.ts
export async function createUserSession(userId: string, role: string) {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);
  session.set('role', role); // Store role in session

  return redirect('/dashboard', {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}
```

### 6.3 Check Roles in Route Loaders

```typescript
// app/routes/settings/billing.tsx
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Only owners and admins can access billing
  if (!['owner', 'admin'].includes(user.role)) {
    throw redirect('/dashboard');
  }

  return { user };
}
```

---

## Step 7: Auto-Assign Owner Role

When a user creates a new organization, automatically assign them the `owner` role:

```typescript
// app/routes/auth/create-organization.tsx
export async function action({ request }: Route.ActionArgs) {
  // ... create organization ...

  // Create membership with owner role
  const membership = await workos.userManagement.createOrganizationMembership({
    organizationId: organization.id,
    userId: user.id,
    roleSlug: 'owner', // Explicitly set owner
  });

  // Sync to Convex with owner role
  await convex.mutation(api.users.updateUserRole, {
    workosUserId: user.id,
    organizationId: organization.id,
    role: 'owner',
  });

  return redirect('/dashboard');
}
```

---

## Role Management Best Practices

### ✅ Do's:
- ✅ Always use **immutable role slugs** (lowercase, no spaces)
- ✅ Assign explicit roles (don't rely on defaults for important permissions)
- ✅ Sync WorkOS roles to Convex on every login (roles can change)
- ✅ Check roles server-side (never trust client)
- ✅ Use role slugs in code, not display names
- ✅ Test role changes in WorkOS test environment first

### ❌ Don'ts:
- ❌ Don't change role slugs after creation (immutable)
- ❌ Don't store roles only in session (sync to database)
- ❌ Don't allow role elevation without verification
- ❌ Don't hard-code role logic (use permission system)
- ❌ Don't skip role validation in API endpoints

---

## Permission System Implementation

While roles are defined in WorkOS, permissions are checked in your application code:

```typescript
// app/lib/permissions.ts
export const PERMISSIONS = {
  'billing:view': ['owner', 'admin'],
  'billing:manage': ['owner'],
  'seats:add': ['owner', 'admin'],
  'users:invite': ['owner', 'admin'],
  'users:manage': ['owner', 'admin'],
  'org:transfer_ownership': ['owner'],
  'features:all': ['owner', 'admin', 'manager'],
  'features:sales': ['owner', 'admin', 'manager', 'sales'],
  'features:basic': ['owner', 'admin', 'manager', 'sales', 'team_member'],
} as const;

export function hasPermission(role: string, permission: string): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

// Usage in route loader
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  if (!hasPermission(user.role, 'billing:manage')) {
    throw redirect('/dashboard');
  }

  return { user };
}
```

---

## Troubleshooting

### Role not syncing to app

**Problem:** User has role in WorkOS but app doesn't recognize it

**Solutions:**
1. Check authentication callback syncs role to Convex
2. Verify role stored in session: `session.get('role')`
3. Check Convex user record has correct role
4. Re-authenticate user (forces sync)

### Default role not applying

**Problem:** New members don't get `team_member` role

**Solutions:**
1. Verify default role set in **User Management → Settings**
2. Check if explicit role provided in `createOrganizationMembership()` (overrides default)
3. Ensure WorkOS environment is in correct mode (test vs production)

### Permission denied errors

**Problem:** User should have access but gets permission denied

**Solutions:**
1. Verify role slug matches exactly (case-sensitive in code)
2. Check permission definition includes the role
3. Test `hasPermission()` function with user's role
4. Check if role synced correctly: Query Convex user record

### Owner role not assigned on org creation

**Problem:** First user becomes `team_member` instead of `owner`

**Solutions:**
1. Verify `roleSlug: 'owner'` passed to `createOrganizationMembership()`
2. Check if default role overriding explicit assignment
3. Ensure organization creation route handles role assignment

---

## Testing Checklist

Before marking RBAC setup complete, verify:

- [ ] All 5 roles visible in WorkOS Dashboard
- [ ] Default role set to `team_member`
- [ ] Test user assigned `owner` role on org creation
- [ ] Roles sync to Convex on login
- [ ] Roles stored in session
- [ ] Owner can access `/settings/billing`
- [ ] Admin can access `/settings/billing` (read-only)
- [ ] Manager cannot access `/settings/billing` (redirected)
- [ ] Team member cannot access `/settings/team`
- [ ] Permission system works: `hasPermission('admin', 'billing:view')` returns `true`

---

## WorkOS Dashboard Quick Links

- **Roles & Permissions:** https://dashboard.workos.com/user-management/roles
- **Organizations:** https://dashboard.workos.com/organizations
- **API Keys:** https://dashboard.workos.com/api-keys
- **Documentation:** https://workos.com/docs/rbac

---

## Next Steps

After completing WorkOS RBAC setup:

1. ✅ Verify all 5 roles created
2. ✅ Test role assignment with test user
3. ✅ Verify roles sync to Convex on login
4. ✅ Test permission checks in routes
5. ✅ Proceed to **Phase 4** of `BILLING_ROADMAP.md` (Authentication Middleware)

---

**Questions?** Reference the [WorkOS RBAC Documentation](https://workos.com/docs/rbac) or ask your AI assistant for help with specific configuration steps.
