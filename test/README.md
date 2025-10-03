# Testing Guide

This directory contains the testing infrastructure and tests for the DomiEuro4 B2B SaaS template.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Mocking](#mocking)
- [Test Data](#test-data)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Overview

This template uses **Vitest** as the testing framework with the following setup:

- **Test Runner**: Vitest (fast, native ESM and TypeScript support)
- **DOM Environment**: happy-dom (lightweight DOM implementation)
- **Component Testing**: @testing-library/react
- **Coverage**: @vitest/coverage-v8
- **Mocks**: Vitest vi.fn() for WorkOS, Convex, and Stripe

### Why These Tools?

- **Vitest**: Native Vite integration, fast execution, excellent DX
- **happy-dom**: 2-3x faster than jsdom with good compatibility
- **Testing Library**: Encourages accessible, user-centric tests
- **Mock Infrastructure**: Prevents real API calls during testing

## Running Tests

### Basic Commands

```bash
# Run all tests (watch mode)
npm test

# Run all tests once (CI mode)
npm run test:run

# Watch mode with file filtering
npm run test:watch

# Interactive UI for debugging tests
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests in a specific file
npm test -- permissions.test.ts

# Run tests matching a pattern
npm test -- auth

# Run only tests with "RBAC" in the name
npm test -- -t "RBAC"
```

### Coverage Thresholds

The project enforces the following coverage thresholds:

| Metric     | Threshold | Security-Critical Code |
| ---------- | --------- | ---------------------- |
| Lines      | 80%       | 85%+                   |
| Functions  | 80%       | 85%+                   |
| Branches   | 80%       | 85%+                   |
| Statements | 80%       | 85%+                   |

**Security-critical code includes:**

- Authentication logic (`app/lib/auth.server.ts`)
- Permission system (`app/lib/permissions.ts`)
- Multi-tenancy isolation (`convex/users.ts`)
- Stripe webhook handlers (when implemented)

## Writing Tests

### Unit Tests

Unit tests focus on testing **individual functions** in isolation. Use unit tests for:

- Pure functions (input → output)
- Business logic
- Utility functions
- Permission checks
- Data transformations

**Example** (see `test/examples/example-unit.test.ts`):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, ROLES } from '~/lib/permissions';

describe('hasPermission()', () => {
  it('should return true when role has permission', () => {
    // Arrange
    const role = ROLES.OWNER;
    const permission = 'billing:manage';

    // Act
    const result = hasPermission(role, permission);

    // Assert
    expect(result).toBe(true);
  });
});
```

**Unit Test Structure (AAA Pattern):**

1. **Arrange**: Set up test data and preconditions
2. **Act**: Execute the function being tested
3. **Assert**: Verify the result matches expectations

### Integration Tests

Integration tests focus on testing **multiple components working together**. Use integration tests for:

- Authentication flows
- Database operations with multiple steps
- API integrations (WorkOS, Convex, Stripe)
- User workflows
- Error handling across layers

**Example** (see `test/examples/example-integration.test.ts`):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';
import { mockConvexServer, resetConvexMocks } from '../mocks/convex';

// Mock external services
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

vi.mock('../../lib/convex.server', () => ({
  convexServer: mockConvexServer,
}));

describe('User Authentication Flow', () => {
  beforeEach(() => {
    resetWorkOSMocks();
    resetConvexMocks();
  });

  it('should authenticate user and sync to Convex', async () => {
    // Arrange: Set up mock responses
    mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue({
      user: { id: 'user_123', email: 'test@example.com' },
      organizationId: 'org_123',
    });

    mockConvexServer.query.mockResolvedValue(null); // User doesn't exist yet
    mockConvexServer.mutation.mockResolvedValue('jx7abc123'); // User created

    // Act: Simulate authentication
    const authResult = await mockWorkOS.userManagement.authenticateWithCode({
      clientId: 'test_client',
      code: 'auth_code',
    });

    // Check if user exists in Convex
    const existingUser = await mockConvexServer.query('users:getUserByWorkosId', {
      workosUserId: authResult.user.id,
    });

    // Create user if not exists
    if (!existingUser) {
      await mockConvexServer.mutation('users:createUser', {
        email: authResult.user.email,
        workosUserId: authResult.user.id,
        organizationId: authResult.organizationId,
      });
    }

    // Assert: Verify the complete flow
    expect(mockWorkOS.userManagement.authenticateWithCode).toHaveBeenCalledWith({
      clientId: 'test_client',
      code: 'auth_code',
    });
    expect(mockConvexServer.mutation).toHaveBeenCalledWith('users:createUser', {
      email: 'test@example.com',
      workosUserId: 'user_123',
      organizationId: 'org_123',
    });
  });
});
```

### Component Tests

Component tests verify React components render and behave correctly.

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../helpers/test-utils';
import { Dashboard } from '~/routes/dashboard';

describe('Dashboard Component', () => {
  it('should render welcome message', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
  });
});
```

## Test Structure

```
test/
├── README.md                          # This file
├── setup.ts                          # Global test configuration
├── examples/                         # Example tests (documentation)
│   ├── example-unit.test.ts
│   └── example-integration.test.ts
├── mocks/                            # Mock implementations
│   ├── workos.ts                     # WorkOS SDK mock
│   ├── convex.ts                     # Convex client mock
│   └── stripe.ts                     # Stripe SDK mock
├── helpers/                          # Test utilities
│   ├── test-utils.tsx                # Render helpers, mock builders
│   └── test-data.ts                  # Reusable test fixtures
├── unit/                             # Unit tests
│   ├── permissions.test.ts
│   ├── auth.server.test.ts
│   └── billing-constants.test.ts
├── integration/                      # Integration tests
│   ├── auth-flow.test.ts
│   ├── multi-tenancy.test.ts
│   └── role-sync.test.ts
└── convex/                           # Convex function tests
    └── users.test.ts
```

### Naming Conventions

- **Test files**: `*.test.ts` or `*.test.tsx`
- **Test names**: `"should [expected behavior] when [condition]"`
- **Describe blocks**: Group related tests by function/feature
- **Mock files**: `<service>.ts` (e.g., `workos.ts`, `convex.ts`)

## Mocking

### Available Mocks

#### WorkOS Mock (`test/mocks/workos.ts`)

```typescript
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';

// Mock user authentication
mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue({
  user: { id: 'user_123', email: 'test@example.com' },
  organizationId: 'org_123',
});

// Mock organization membership
mockWorkOS.userManagement.listOrganizationMemberships.mockResolvedValue({
  data: [{ userId: 'user_123', role: { slug: 'owner' } }],
});

// Reset mocks (call in beforeEach)
resetWorkOSMocks();
```

#### Convex Mock (`test/mocks/convex.ts`)

```typescript
import { mockConvexServer, resetConvexMocks } from '../mocks/convex';

// Mock database query
mockConvexServer.query.mockResolvedValue({
  _id: 'jx7abc123',
  email: 'test@example.com',
});

// Mock database mutation
mockConvexServer.mutation.mockResolvedValue('jx7abc123');

// Reset mocks (call in beforeEach)
resetConvexMocks();
```

#### Stripe Mock (`test/mocks/stripe.ts`)

```typescript
import { mockStripe, resetStripeMocks } from '../mocks/stripe';

// Mock checkout session creation
mockStripe.checkout.sessions.create.mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/...',
});

// Mock webhook event construction
mockStripe.webhooks.constructEvent.mockReturnValue({
  id: 'evt_test_123',
  type: 'checkout.session.completed',
});

// Reset mocks (call in beforeEach)
resetStripeMocks();
```

### Using Mocks in Tests

**Step 1: Import the mock**

```typescript
import { mockWorkOS, resetWorkOSMocks } from '../mocks/workos';
```

**Step 2: Mock the module with vi.mock()**

```typescript
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));
```

**Step 3: Reset mocks before each test**

```typescript
beforeEach(() => {
  resetWorkOSMocks();
});
```

**Step 4: Configure mock behavior in tests**

```typescript
it('should handle authentication', async () => {
  mockWorkOS.userManagement.authenticateWithCode.mockResolvedValue({
    user: { id: 'user_123' },
  });

  // ... test code
});
```

## Test Data

The `test/helpers/test-data.ts` file provides reusable test fixtures.

### Available Fixtures

```typescript
import {
  mockUser, // Owner user
  mockAdminUser, // Admin user
  mockManagerUser, // Manager user
  mockSalesUser, // Sales user
  mockMemberUser, // Team member user
  mockOrganization, // Test organization
  mockConvexUser, // Convex database user
  allMockUsers, // All user roles
  allMockSubscriptions, // All subscription tiers
} from '../helpers/test-data';
```

### Using Test Data

```typescript
import { mockUser, mockOrganization } from '../helpers/test-data';

it('should verify user belongs to organization', () => {
  expect(mockUser.organizationId).toBe(mockOrganization.id);
});
```

### Creating Custom Test Data

```typescript
import { createMockUser, createMockConvexUser } from '../helpers/test-data';

// Create custom user
const customUser = createMockUser({
  role: 'admin',
  email: 'custom@example.com',
});

// Create custom Convex user
const customConvexUser = createMockConvexUser({
  role: 'manager',
});
```

## Coverage Requirements

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Priorities

**🔴 Critical (85%+ coverage required):**

- `app/lib/auth.server.ts` - Authentication logic
- `app/lib/permissions.ts` - RBAC permission checks
- `convex/users.ts` - Multi-tenancy isolation

**🟡 High Priority (80%+ coverage required):**

- `app/lib/session.server.ts` - Session management
- `app/lib/workos.server.ts` - WorkOS integration
- `convex/subscriptions.ts` - Billing data (when implemented)

**🟢 Standard (80% coverage target):**

- All other application code
- Utility functions
- React components

### Excluded from Coverage

- Type definition files (`*.d.ts`)
- Generated code (`convex/_generated/`)
- Route files (`app/routes/` - tested via integration tests)
- Test files themselves
- **Convex functions (`convex/**`)\*\* - ⚠️ TEMPORARY EXCLUSION (Tech Debt)
  - Currently tested via integration tests only
  - Target: Add unit tests in Phase 7
  - See: [TECH_DEBT.md](./TECH_DEBT.md) for tracking and plan

### Testing Tech Debt

⚠️ **Important:** Some code is currently excluded from coverage metrics but should be properly unit tested in the future.

See **[test/TECH_DEBT.md](./TECH_DEBT.md)** for:

- What's excluded and why
- Timeline for addressing gaps (Phase 7+)
- Implementation plan for Convex unit tests
- Reminder system to prevent forgetting

## Best Practices

### 1. Follow the AAA Pattern

```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = 'test';

  // Act: Execute function
  const result = myFunction(input);

  // Assert: Verify result
  expect(result).toBe('expected');
});
```

### 2. Test Behavior, Not Implementation

❌ **Bad**: Testing implementation details

```typescript
it('should call fetchUser with correct parameters', () => {
  fetchUser('user_123');
  expect(mockFetch).toHaveBeenCalledWith('/api/users/user_123');
});
```

✅ **Good**: Testing user-facing behavior

```typescript
it('should display user name after loading', async () => {
  renderWithProviders(<UserProfile userId="user_123" />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### 3. Keep Tests Independent

Each test should be able to run in isolation without depending on other tests.

```typescript
beforeEach(() => {
  // Reset mocks before each test
  resetWorkOSMocks();
  resetConvexMocks();

  // Clear any global state
  vi.clearAllMocks();
});
```

### 4. Use Descriptive Test Names

❌ **Bad**: Vague test names

```typescript
it('works', () => {
  /* ... */
});
it('test permissions', () => {
  /* ... */
});
```

✅ **Good**: Clear, descriptive names

```typescript
it('should return true when owner has billing:manage permission', () => {
  /* ... */
});
it('should throw error when user lacks permission', () => {
  /* ... */
});
```

### 5. Test Error Cases

Don't just test the happy path - test error scenarios too.

```typescript
describe('authenticateWithCode()', () => {
  it('should authenticate user with valid code', async () => {
    // Test success case
  });

  it('should throw error with invalid code', async () => {
    mockWorkOS.userManagement.authenticateWithCode.mockRejectedValue(new Error('Invalid code'));

    await expect(authenticate('invalid')).rejects.toThrow('Invalid code');
  });
});
```

### 6. Use test.each() for Multiple Scenarios

Reduce duplication when testing similar scenarios.

```typescript
it.each([
  [ROLES.OWNER, 'billing:manage', true],
  [ROLES.ADMIN, 'billing:manage', false],
  [ROLES.MANAGER, 'billing:manage', false],
])('hasPermission(%s, %s) should return %s', (role, permission, expected) => {
  expect(hasPermission(role, permission)).toBe(expected);
});
```

### 7. Mock External Services

Never make real API calls in tests. Always use mocks.

```typescript
// ❌ Bad: Real API call
await fetch('https://api.workos.com/...');

// ✅ Good: Mocked API
vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));
```

### 8. Test Multi-Tenancy Isolation

**CRITICAL**: Always verify data isolation between organizations.

```typescript
it('should only return users from the same organization', async () => {
  const org1Users = await getUsersByOrganization('org_123');
  const org2Users = await getUsersByOrganization('org_456');

  // Verify no data leakage
  expect(org1Users).not.toContainEqual(
    expect.objectContaining({
      organizationId: 'org_456',
    })
  );
  expect(org2Users).not.toContainEqual(
    expect.objectContaining({
      organizationId: 'org_123',
    })
  );
});
```

### 9. Prefer Integration Tests for Critical Paths

For security-critical flows (auth, billing), write integration tests that verify the entire workflow.

```typescript
describe('Authentication Flow (Integration)', () => {
  it('should authenticate user, create in Convex, and set session', async () => {
    // Test the entire auth flow end-to-end
    // 1. WorkOS authentication
    // 2. User creation in Convex
    // 3. Session creation
    // 4. Redirect to dashboard
  });
});
```

### 10. Keep Tests Fast

- Unit tests should run in < 100ms
- Use `happy-dom` instead of `jsdom` (2-3x faster)
- Mock external services to avoid network calls
- Avoid unnecessary `setTimeout()` or delays

## Troubleshooting

### Tests Failing Locally

1. **Check environment variables**: Verify `test/setup.ts` has correct mock values
2. **Clear cache**: `rm -rf node_modules/.vite`
3. **Reinstall dependencies**: `npm install`

### Mock Not Working

1. **Check mock import**: Ensure you're importing from correct path
2. **Verify vi.mock() placement**: Must be at top of file, outside describe blocks
3. **Reset mocks**: Call `resetWorkOSMocks()` in `beforeEach()`

### Coverage Too Low

1. **Run coverage report**: `npm run test:coverage`
2. **View HTML report**: `open coverage/index.html`
3. **Check untested branches**: Coverage report shows uncovered lines
4. **Add missing tests**: Focus on red/yellow sections in coverage report

### Type Errors in Tests

1. **Regenerate types**: `npm run typecheck` (runs React Router type generation)
2. **Check tsconfig**: Verify `test/**/*` is included
3. **Import correct types**: Use generated types from `convex/_generated/`

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mocking Best Practices](https://kentcdodds.com/blog/stop-mocking-fetch)

## Getting Help

If you have questions about testing:

1. Check the example tests in `test/examples/`
2. Review this README
3. Check the [Vitest docs](https://vitest.dev/)
4. Open an issue on GitHub
