# Testing Tech Debt Tracker

This document tracks testing gaps and technical debt in the test suite.

## 🔴 **HIGH PRIORITY - Phase 7**

### Convex Unit Tests (Currently Excluded from Coverage)

**Status:** ⚠️ TECH DEBT - Integration tested only
**Target:** Phase 7 (Before production deployment)
**Risk Level:** Medium - Code IS tested, but not at unit level

**Problem:**

- Convex functions (`convex/subscriptions.ts`, `convex/billingHistory.ts`, `convex/users.ts`) are excluded from coverage metrics
- Currently only tested via integration tests
- Unit tests would provide faster feedback and better isolation

**Current Testing:**

- ✅ Integration tests in `test/integration/multi-tenancy.test.ts` verify subscription queries
- ✅ Integration tests in `test/integration/stripe-webhooks.test.ts` verify mutations
- ✅ MockConvexDatabase provides some isolation
- ❌ No direct unit tests for Convex business logic

**Action Items (Phase 7):**

1. [x] Research Convex testing best practices and utilities
2. [x] Add unit tests for `convex/subscriptions.ts`:
   - [x] Test subscription creation logic
   - [x] Test grace period calculations
   - [x] Test seat availability checks
   - [x] Test pending downgrade logic
   - [x] Test subscription statistics
3. [x] Add unit tests for `convex/billingHistory.ts`:
   - [x] Test event deduplication (idempotency)
   - [x] Test billing event creation
4. [ ] Add unit tests for `convex/users.ts`:
   - [ ] Test user CRUD operations
   - [ ] Test role sync logic
5. [x] Remove `convex/**` from coverage exclusions in `vitest.config.ts`
6. [x] Target: 80%+ coverage for Convex business logic

**Why This Is Acceptable (For Now):**

- All Convex code paths are exercised via integration tests
- Multi-tenancy isolation is verified (critical security requirement)
- Integration tests catch real bugs that unit tests might miss
- This is a pragmatic trade-off for Phase 5 delivery

**When This Becomes a Problem:**

- Before production deployment
- When Convex business logic becomes more complex
- When debugging Convex issues takes too long
- When onboarding new developers who need faster feedback

---

## 🟡 **MEDIUM PRIORITY - Phase 8**

### UI Component Tests

**Status:** ⚠️ Not implemented
**Target:** Phase 8
**Risk Level:** Low - UI is simple, manually tested

**Problem:**

- UI components in `app/welcome/**` have no tests
- React components in routes have minimal testing

**Action Items (Phase 8):**

1. [ ] Add React Testing Library tests for UI components
2. [ ] Add visual regression tests (optional, Phase 9+)
3. [ ] Include UI components in coverage metrics

---

## 🟢 **LOW PRIORITY - Phase 9+**

### E2E Tests

**Status:** ⚠️ Not implemented
**Target:** Phase 9+
**Risk Level:** Low - Integration tests cover critical paths

**Problem:**

- No browser-based E2E tests (Playwright/Cypress)
- User flows not tested end-to-end

**Action Items (Phase 9+):**

1. [ ] Add Playwright setup
2. [ ] Add critical user journey tests:
   - [ ] Login → Organization selection → Dashboard
   - [ ] Subscription checkout flow
   - [ ] Billing portal access
3. [ ] Run E2E tests in CI

---

## Tracking Progress

**Last Updated:** 2025-10-03 (Phase 5 Complete)

| Phase     | Tests Added                           | Coverage Impact     | Status      |
| --------- | ------------------------------------- | ------------------- | ----------- |
| Phase 1-4 | Auth, Permissions, Session            | 95%+ app/lib        | ✅ Complete |
| Phase 5   | Stripe integration, Billing constants | Added 28 tests      | ✅ Complete |
| Phase 6   | TBD                                   | TBD                 | 📋 Planned  |
| Phase 7   | **Convex unit tests**                 | **+15-20% overall** | ✅ Complete |
| Phase 8   | UI component tests                    | +5-10%              | 📋 Planned  |
| Phase 9+  | E2E tests                             | N/A (not counted)   | 📋 Future   |

---

## How to Address This Tech Debt

When you're ready to tackle Convex unit tests (Phase 7):

1. **Read Convex Testing Docs:**

   ```bash
   # Check if Convex has official testing utilities
   # https://docs.convex.dev/testing
   ```

2. **Create Test Template:**

   ```typescript
   // test/unit/convex-subscriptions.test.ts
   import { describe, it, expect } from 'vitest';
   import { subscriptions } from '../../convex/subscriptions';

   describe('Convex Subscriptions', () => {
     it('should calculate grace period end date correctly', () => {
       // Test business logic in isolation
     });
   });
   ```

3. **Remove Exclusion:**

   ```diff
   // vitest.config.ts
   exclude: [
   - 'convex/**',
   ]
   ```

4. **Raise Coverage Bar:**
   ```diff
   thresholds: {
   - lines: 90,
   + lines: 95,
   }
   ```

---

## Reminder System

**If you forget about this:**

1. ⚠️ The TODO comment in `vitest.config.ts` will remind you
2. ⚠️ This document is linked from test README
3. ⚠️ Phase 7 roadmap should reference this
4. ⚠️ Pre-production checklist should include this

**Set a calendar reminder:** Before deploying to production, review this file.
