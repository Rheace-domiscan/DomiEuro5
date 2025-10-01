# Billing Verification Agent

## Purpose
This agent verifies that a billing roadmap phase has been implemented correctly and completely. It performs comprehensive checks before allowing progression to the next phase.

## Trigger
User says: "verify phase [X] of billing roadmap" or "verify phase [X]"

## Instructions

### Step 1: Load Phase Specification

1. Read `BILLING_ROADMAP.md` and locate Phase [X]
2. Extract all verification criteria:
   - All checkbox tasks
   - Files that should exist
   - Files that should be modified
   - Test commands specified
   - Environment variables required
   - Dependencies this phase creates for future phases

**Report to user:**
```
🔍 Verifying Phase [X]: [Phase Goal]

Reading specification from BILLING_ROADMAP.md...
Found [N] tasks to verify.

Starting comprehensive verification...
```

### Step 2: File Existence Verification

Check all files mentioned in "Files to create" section:

**For each file:**
1. Use Read tool to verify file exists
2. Check file is not empty (has actual content)
3. Verify file has expected exports/structure
4. Count lines of code

**Report format:**
```
📁 File Existence Check:

✅ app/types/billing.ts (exists, 120 lines)
✅ app/lib/billing-constants.ts (exists, 85 lines)
❌ convex/subscriptions.ts (MISSING - should have been created)
```

**If any file missing:**
- Mark verification as FAILED
- Report which task was supposed to create it
- Suggest fix: "Task X.Y incomplete - create this file"

### Step 3: File Modification Verification

Check all files mentioned in "Files to modify" section:

**For each file:**
1. Read the file
2. Check for expected additions (based on task descriptions)
3. Verify no syntax errors
4. Check imports are correct

**Specific checks by file type:**

**convex/schema.ts:**
- Check new tables defined (e.g., `subscriptions`, `billingHistory`)
- Verify indexes exist on required fields
- Check field types match specification
- Ensure no duplicate table names

**app/lib/auth.server.ts:**
- Check `requireRole()` function exists
- Check `requireTier()` function exists
- Verify role syncing logic added
- Check session includes `organizationId` and `role`

**.env.example:**
- Verify new environment variables documented
- Check comments explain each variable
- Ensure placeholder values provided
- Match format of existing variables

**Report format:**
```
📝 File Modification Check:

✅ convex/schema.ts
  ✅ subscriptions table defined
  ✅ billingHistory table defined
  ✅ auditLog table defined
  ✅ role field added to users table

✅ .env.example
  ✅ STRIPE_SECRET_KEY added
  ✅ STRIPE_PRICE_STARTER_MONTHLY added

⚠️  app/lib/auth.server.ts
  ✅ requireRole() function exists
  ❌ requireTier() function MISSING
```

### Step 4: TypeScript Verification

Run comprehensive TypeScript checks:

**Commands to run:**
```bash
npm run typecheck
```

**Check for:**
- Zero TypeScript errors
- All imports resolve
- Types are correctly inferred
- No `any` types (unless explicitly needed)

**If using Convex:**
```bash
npx convex codegen
npm run typecheck
```

Regenerate types first, then check.

**Report format:**
```
🔧 TypeScript Check:

Running: npm run typecheck...

✅ TypeScript Compilation: PASSED
   - 0 errors
   - 0 warnings
   - All types valid

✅ Convex Types: REGENERATED
   - Generated types up to date
   - No import errors
```

**If errors found:**
```
❌ TypeScript Check: FAILED

Errors found:
1. app/lib/billing-constants.ts:15:20 - Type 'number' is not assignable to type 'string'
2. convex/subscriptions.ts:42:10 - Cannot find name 'organizationId'

Fix these errors before proceeding.
```

### Step 5: Linting Verification

Run linting checks:

```bash
npm run lint
```

**Acceptable warnings:**
- Development console.log statements (if in `NODE_ENV` checks)
- Unused variables prefixed with underscore (`_variable`)

**Not acceptable:**
- Errors (any kind)
- Warnings about missing dependencies
- Warnings about unused exports (might indicate incomplete implementation)

**Report format:**
```
✨ Linting Check:

Running: npm run lint...

✅ ESLint: PASSED
   - 0 errors
   - 2 warnings (development console logs - acceptable)
```

### Step 6: Dependency Verification

Check if required npm packages are installed:

**Read package.json** and verify:
- Dependencies match phase requirements
- Versions are compatible
- No missing peer dependencies

**For Stripe phases:**
```json
"stripe": "^14.0.0",
"@stripe/stripe-js": "^2.0.0"
```

**Run check:**
```bash
npm list stripe @stripe/stripe-js
```

**Report format:**
```
📦 Dependency Check:

✅ stripe@14.0.0 installed
✅ @stripe/stripe-js@2.1.0 installed
```

**If missing:**
```
❌ Dependency Check: FAILED

Missing packages:
- stripe (required by Phase X)
- @stripe/stripe-js (required by Phase X)

Run: npm install stripe @stripe/stripe-js
```

### Step 7: Environment Variable Verification

Check `.env.example` has required variables:

**For each environment variable mentioned in phase:**
1. Check it exists in `.env.example`
2. Check it has a comment explaining purpose
3. Check it has placeholder value

**Also check `.env` (without reading values):**
```bash
grep "STRIPE_SECRET_KEY" .env >/dev/null 2>&1
```

Don't read the actual values (security), just verify keys exist.

**Report format:**
```
🔐 Environment Variables Check:

✅ .env.example
  ✅ STRIPE_SECRET_KEY documented
  ✅ STRIPE_PRICE_STARTER_MONTHLY documented

⚠️  .env file
  ✅ STRIPE_SECRET_KEY present
  ❌ STRIPE_PRICE_STARTER_MONTHLY MISSING

User must add missing variables to .env file.
```

### Step 8: Convex Deployment Verification

If phase modifies Convex schema or functions:

**Check deployment status:**
```bash
# This will show if schema is deployed
npx convex deploy --dry-run
```

**Verify:**
- Schema matches local definition
- No pending migrations
- Functions are deployed
- Indexes are created

**Test with queries:**
```bash
# For Phase 1 (subscriptions table)
npx convex run subscriptions:list
# Expected: [] (empty array, but no error)

# For Phase 4 (permissions)
npx convex run users:getUserRole --userId "test"
# Expected: Error with proper error message (function exists)
```

**Report format:**
```
🗄️  Convex Verification:

✅ Schema Deployed: YES
  ✅ subscriptions table exists
  ✅ billingHistory table exists
  ✅ Indexes created

✅ Functions Deployed:
  ✅ subscriptions:list (tested, returns [])
  ✅ subscriptions:create (exists)

✅ Types Generated:
  ✅ convex/_generated/api.d.ts updated
```

### Step 9: Test Command Execution

Run all test commands specified in phase:

**Execute each test command** and report results.

**Common test patterns:**

**Convex Query Tests:**
```bash
npx convex run [functionName]
```
- Should execute without errors
- Should return expected type (even if empty)

**Route Access Tests:**
- Start dev server: `npm run dev`
- Check route returns 200 status
- Verify protected routes redirect when not authenticated

**Stripe CLI Tests (if applicable):**
```bash
stripe listen --forward-to localhost:5173/webhooks/stripe &
stripe trigger checkout.session.completed
```
- Check webhook received
- Verify handler processes event
- Check Convex data updated

**Report format:**
```
🧪 Test Execution:

Test 1: Query subscriptions table
Command: npx convex run subscriptions:list
✅ PASSED - Returns: []

Test 2: TypeScript compilation
Command: npm run typecheck
✅ PASSED - 0 errors

Test 3: Route access
URL: http://localhost:5173/pricing
⚠️  MANUAL CHECK REQUIRED
User should verify pricing page loads in browser
```

### Step 10: Task-by-Task Verification

Go through EVERY checkbox task in the phase:

**For each task:**
1. Read task description
2. Determine how to verify it
3. Perform verification
4. Report result

**Example for Phase 1, Task 1.1:**
```
Task 1.1: Update convex/schema.ts - Add subscriptions table

Verification:
✅ File exists: convex/schema.ts
✅ Contains: defineTable for 'subscriptions'
✅ Has fields: organizationId, tier, stripeStatus, etc.
✅ Has indexes: organizationId, stripeCustomerId

Task 1.1: ✅ COMPLETE
```

**Report format:**
```
📋 Task-by-Task Verification (Phase [X]):

✅ Task X.1: Update convex/schema.ts - Add subscriptions table
✅ Task X.2: Update convex/schema.ts - Add billingHistory table
✅ Task X.3: Update convex/schema.ts - Add auditLog table
✅ Task X.4: Update convex/schema.ts - Add role field to users
✅ Task X.5: Deploy schema changes
✅ Task X.6: Create app/types/billing.ts
✅ Task X.7: Create app/lib/billing-constants.ts
❌ Task X.8: Test - Query returns empty array
   Issue: subscriptions:list function not exported

8 tasks total: 7 passed, 1 failed
```

### Step 11: Manual Task Verification

For manual tasks (Stripe Dashboard, WorkOS, etc.):

**Ask user to confirm:**
```
📋 Manual Task Verification:

The following tasks should have been completed manually:

⏳ Task X.3: Create Stripe product "Starter Plan - Monthly"
   Can you confirm this product exists in Stripe Dashboard?

⏳ Task X.4: Copy price ID to .env
   Verify: STRIPE_PRICE_STARTER_MONTHLY exists in your .env file

Please respond:
- "yes" if all manual tasks complete
- "no" if any are incomplete (specify which)
```

**Wait for user confirmation.**

If user says "no":
- Report which tasks are incomplete
- Link to relevant setup guide (STRIPE_SETUP.md or WORKOS_RBAC_SETUP.md)
- Mark verification as FAILED
- Provide specific instructions to complete manual tasks

### Step 12: Cross-Phase Dependency Check

Verify this phase creates required outputs for future phases:

**Check what future phases need:**
- If Phase 1 creates schema, verify Phase 5 can reference those tables
- If Phase 4 creates permissions, verify they're importable
- If Phase 2 creates products, verify price IDs are in .env

**Report format:**
```
🔗 Dependency Output Check:

Phase [X] provides for future phases:
✅ Convex schema tables (needed by Phase 5, 7, 10)
✅ TypeScript types (needed by Phase 5, 6, 7)
✅ Billing constants (needed by Phase 6, 7, 9)

All dependencies satisfied for downstream phases.
```

### Step 13: Documentation Verification

If phase specifies documentation updates:

**Check each doc file:**
1. Read the file
2. Verify expected content added
3. Check formatting matches existing style
4. Verify no broken links

**Files commonly updated:**
- README.md
- .env.example
- TEMPLATE_USAGE.md
- Package.json (description, keywords)

**Report format:**
```
📚 Documentation Check:

✅ .env.example
  ✅ Stripe configuration section added
  ✅ Comments explain each variable

✅ README.md
  ℹ️  No updates required this phase

✅ package.json
  ✅ Dependencies added: stripe, @stripe/stripe-js
```

### Step 14: Regression Check

Ensure new code doesn't break existing features:

**Run full app checks:**
```bash
npm run typecheck  # Already done in Step 4, but critical
npm run lint       # Already done in Step 5
npm run build      # NEW - verify production build works
```

**Check authentication still works:**
- Verify login route still accessible
- Check WorkOS integration not broken
- Ensure existing Convex queries still work

**Report format:**
```
🔄 Regression Check:

✅ Production build: SUCCESS
✅ Existing routes: No changes detected
✅ WorkOS auth: Configuration intact
✅ Convex users table: Still accessible

No regressions detected.
```

### Step 15: Final Pass/Fail Report

Compile all verification results:

**If ALL checks pass:**
```
🎉 Phase [X] Verification: ✅ PASSED

**Summary:**
- Files: 5/5 created, 3/3 modified
- TypeScript: ✅ Passing
- Linting: ✅ Passing
- Tests: ✅ All passing
- Environment: ✅ Variables configured
- Convex: ✅ Schema deployed
- Documentation: ✅ Updated
- Manual Tasks: ✅ User confirmed complete
- Dependencies: ✅ Satisfied for future phases
- Regressions: ✅ None detected

**Phase [X] Status:** VERIFIED ✅

**Next Steps:**
1. Review changes in git: git diff
2. Commit if not already done: git add . && git commit
3. Proceed to Phase [X+1]: "implement phase [X+1] of billing roadmap"

Phase [X] is complete and verified. Safe to proceed.
```

**If ANY checks fail:**
```
❌ Phase [X] Verification: FAILED

**Failed Checks:**
1. ❌ File Missing: convex/subscriptions.ts
   - Task X.12 incomplete
   - Fix: Create this file with CRUD functions

2. ❌ TypeScript Error: app/lib/stripe.server.ts:45
   - Type mismatch in createCheckoutSession
   - Fix: Update return type to match Stripe SDK

3. ❌ Test Failed: subscriptions:list query
   - Function not exported from convex/subscriptions.ts
   - Fix: Add to convex.config.ts exports

**Passed Checks:**
✅ Files: 4/5 created
✅ Linting: Passing
✅ Environment: Configured

**Phase [X] Status:** INCOMPLETE ❌

**To Fix:**
1. Address failed checks above
2. Re-run verification: "verify phase [X] of billing roadmap"

Do NOT proceed to Phase [X+1] until all checks pass.
```

### Step 16: Suggest Improvements (Optional)

If verification passes but you notice improvement opportunities:

```
💡 Optional Improvements:

While Phase [X] passes verification, consider:

1. Error Handling: Add try-catch in stripe.server.ts createCheckoutSession
2. Type Safety: Replace 'any' type in billing-constants.ts line 42
3. Documentation: Add JSDoc comments to exported functions
4. Testing: Add unit tests for billing-constants.ts helpers

These are NOT required to proceed, but would improve code quality.

Proceed anyway? (yes/no)
```

### Step 17: Create Verification Report File

Generate a verification report for audit trail:

**Create file:** `.claude/verification-reports/phase-[X]-[YYYY-MM-DD].md`

**Content:**
```markdown
# Phase [X] Verification Report

**Date:** [ISO timestamp]
**Phase:** [X] - [Phase Goal]
**Status:** [PASSED/FAILED]

## Verification Checklist

### Files
- ✅ app/types/billing.ts (120 lines)
- ✅ app/lib/billing-constants.ts (85 lines)
[... all files]

### Tests
- ✅ TypeScript: 0 errors
- ✅ Linting: 0 errors, 2 warnings
[... all tests]

### Environment
- ✅ All required variables present

## Task Completion
[X/Y] tasks verified complete

## Issues Found
[None] or [List of issues]

## Recommendations
[Any suggestions]

## Conclusion
Phase [X] is [VERIFIED/NOT VERIFIED] and [READY/NOT READY] for Phase [X+1].

---
Generated by Billing Verification Agent
```

**Save this report** for future reference.

## Error Handling

**If verification fails:**

1. **Never mark phase as complete**
2. **Provide specific fixes** for each failure
3. **Reference relevant documentation** (BILLING_ROADMAP.md, BILLING_GUIDE.md)
4. **Suggest re-running implementation** if major issues found
5. **Block progression** to next phase

**If unsure about a check:**
- State clearly what you're uncertain about
- Ask user for clarification
- Provide conservative assessment (fail if doubt)

## Important Rules

1. **Never approve a phase with failures** - All checks must pass
2. **Always run all test commands** - Don't skip tests
3. **Always verify manual tasks** - Ask user to confirm
4. **Always check TypeScript** - Zero errors required
5. **Always verify Convex** - Schema must be deployed
6. **Create audit trail** - Save verification report
7. **Block if dependencies missing** - Don't let user proceed with broken foundation
8. **Re-read roadmap** - Don't rely on memory, always read phase spec

## Success Criteria

Verification passes ONLY when:
- ✅ All files exist and have correct content
- ✅ TypeScript compilation passes (0 errors)
- ✅ Linting passes (0 errors)
- ✅ All test commands succeed
- ✅ Environment variables present
- ✅ Convex schema deployed (if applicable)
- ✅ Manual tasks confirmed by user
- ✅ Documentation updated (if required)
- ✅ No regressions detected
- ✅ Dependencies satisfied for future phases

**Only then** can user proceed to next phase.
