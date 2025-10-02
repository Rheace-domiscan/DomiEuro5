# Billing Roadmap Agents

This directory contains enhanced AI agent prompts for implementing the billing system from `BILLING_ROADMAP.md`.

## Available Agents

### 1. Implementation Agent

**File:** `billing-implementation.md`

**Purpose:** Implements a single phase of the billing roadmap with full automation, manual task identification, testing, and documentation updates.

**Usage:**

```
implement phase 1 of billing roadmap
implement phase 5
```

**What it does:**

- ✅ Reads phase specification from BILLING_ROADMAP.md
- ✅ Checks prerequisites and dependencies
- ✅ Separates manual vs automated tasks
- ✅ Implements all code tasks
- ✅ Pauses for user to complete manual tasks (Stripe Dashboard, etc.)
- ✅ Runs phase-specific tests
- ✅ Updates documentation
- ✅ Creates git commit
- ✅ Provides comprehensive summary

### 2. Verification Agent

**File:** `billing-verification.md`

**Purpose:** Verifies a phase is completely and correctly implemented before allowing progression to the next phase.

**Usage:**

```
verify phase 1 of billing roadmap
verify phase 5
```

**What it does:**

- ✅ Checks all files exist and are correct
- ✅ Runs TypeScript compilation
- ✅ Runs linting checks
- ✅ Verifies dependencies installed
- ✅ Checks environment variables configured
- ✅ Verifies Convex schema deployed
- ✅ Executes all test commands
- ✅ Confirms manual tasks complete
- ✅ Checks for regressions
- ✅ Creates verification report
- ✅ Blocks progression if any check fails

## Workflow

### Standard Phase Implementation Flow

**Step 1: Implement**

```
Claude, implement phase 1 of billing roadmap
```

The agent will:

1. Check prerequisites
2. Implement automated tasks
3. Pause for manual tasks
4. Wait for your confirmation

**Step 2: Complete Manual Tasks**

Follow agent's instructions for:

- Stripe Dashboard configuration
- WorkOS Dashboard setup
- Environment variable addition

Then say:

```
manual tasks complete
```

**Step 3: Agent Completes Phase**

Agent will:

- Run tests
- Update documentation
- Create commit
- Provide summary

**Step 4: Verify**

```
Claude, verify phase 1 of billing roadmap
```

The agent will run comprehensive checks and either:

- ✅ **PASS** - Safe to proceed to next phase
- ❌ **FAIL** - Fix issues and re-verify

**Step 5: Fix Issues (if verification failed)**

Address each failed check, then:

```
verify phase 1 of billing roadmap
```

**Step 6: Proceed to Next Phase**

Once verification passes:

```
implement phase 2 of billing roadmap
```

Repeat for all 17 phases.

## Enhanced Features

### Prerequisite Checking

- Verifies previous phases complete
- Checks dependencies installed
- Ensures Convex connected
- Validates environment setup

### Manual Task Handling

- Identifies Stripe Dashboard tasks
- Identifies WorkOS Dashboard tasks
- Provides step-by-step instructions
- Pauses until user confirms completion

### Comprehensive Testing

- TypeScript compilation
- ESLint checks
- Convex deployment verification
- Phase-specific test commands
- Stripe CLI webhook testing (where applicable)

### Documentation Updates

- Automatically updates .env.example
- Updates README.md when needed
- Updates TEMPLATE_USAGE.md
- Keeps package.json synchronized

### Quality Gates

- Zero TypeScript errors required
- Linting must pass
- All tests must succeed
- Manual tasks must be confirmed
- No regressions allowed

### Audit Trail

- Creates verification reports in `.claude/verification-reports/`
- Git commits after each phase
- Detailed pass/fail reporting
- Tracks dependencies for future phases

## Phase Dependencies

Some phases depend on previous phases:

| Phase | Depends On | Why                                        |
| ----- | ---------- | ------------------------------------------ |
| 1     | None       | Foundation                                 |
| 2     | None       | Stripe setup (manual)                      |
| 3     | None       | WorkOS setup (manual)                      |
| 4     | 3          | Needs WorkOS roles                         |
| 5     | 1, 2, 4    | Needs schema, Stripe products, permissions |
| 6     | 5          | Needs checkout session creation            |
| 7     | 5, 6       | Needs Stripe integration                   |
| 8     | 4, 7       | Needs permissions and billing              |
| 9     | 4, 6       | Needs permissions and pricing              |
| 10    | 5          | Needs webhooks                             |
| 11    | 10         | Needs grace period logic                   |
| 12    | 4, 8       | Needs permissions and team management      |
| 13    | 5          | Needs Stripe integration                   |
| 14    | None       | Independent                                |
| 15    | 5, 9       | Needs subscriptions and feature gates      |
| 16    | 2, 5       | Needs Stripe CLI and webhooks              |
| 17    | All        | Documentation phase                        |

Agents automatically check dependencies before starting.

## Example Session

```
User: implement phase 1 of billing roadmap

Agent: 🔍 Phase 1: Foundation - Convex Schema

✅ Prerequisites Check:
- Dependencies: None (foundation phase)
- TypeScript: Passing
- Environment: .env configured
- Convex: Connected

📋 Phase 1 Task Breakdown:

**Automated Tasks (I will complete):**
- [ ] 1.1: Update convex/schema.ts - Add subscriptions table
- [ ] 1.2: Update convex/schema.ts - Add billingHistory table
- [ ] 1.3: Update convex/schema.ts - Add auditLog table
- [ ] 1.4: Update convex/schema.ts - Add role field to users table
- [ ] 1.5: Deploy schema changes
- [ ] 1.6: Create app/types/billing.ts
- [ ] 1.7: Create app/lib/billing-constants.ts
- [ ] 1.8: Test - Query subscriptions table

**Manual Tasks:** None

Starting implementation...

[Agent implements all tasks]

✅ Automated Tasks Complete
🧪 Running tests...

✅ Test Results:
- TypeScript: Passing
- Convex Query: subscriptions:list returns []

🎉 Phase 1 Implementation Complete

[Detailed summary]

Phase 1 ready for verification. Run: "verify phase 1 of billing roadmap"

---

User: verify phase 1 of billing roadmap

Agent: 🔍 Verifying Phase 1: Foundation - Convex Schema

[Runs all checks]

🎉 Phase 1 Verification: ✅ PASSED

**Phase 1 Status:** VERIFIED ✅

**Next Steps:**
Proceed to Phase 2: "implement phase 2 of billing roadmap"

---

User: implement phase 2 of billing roadmap

Agent: 🔍 Phase 2: Stripe Products Setup

✅ Prerequisites Check:
- Dependencies: Phase 1 complete
[...]

📋 Phase 2 Task Breakdown:

**Automated Tasks:**
- [ ] 2.6: Copy price IDs to .env
- [ ] 2.8: Test - View products in dashboard

**Manual Tasks (You must complete):**
- [ ] 2.1: Create Stripe product "Starter Plan - Monthly"
- [ ] 2.2: Create Stripe product "Starter Plan - Annual"
[...]

I cannot complete manual tasks. Please follow these steps:

**Creating Stripe Products:**
1. Log in to Stripe Dashboard (https://dashboard.stripe.com/test)
2. Navigate to Products → Create Product
[Detailed instructions from STRIPE_SETUP.md]

When ready, say "manual tasks complete"

---

User: manual tasks complete

Agent: ✅ Manual tasks confirmed

Completing automated tasks...
[Adds env vars, runs tests]

🎉 Phase 2 Implementation Complete

Phase 2 ready for verification.
```

## Troubleshooting

### Agent says "Prerequisites failed"

**Fix:** Complete the blocking prerequisite phase first.

### Agent says "Manual tasks incomplete"

**Fix:** Follow the agent's step-by-step instructions, then say "manual tasks complete".

### Verification fails with TypeScript errors

**Fix:** Address each error listed, then re-run verification.

### Verification fails with missing files

**Fix:** Re-run implementation agent for that phase.

### Agent blocked on Convex deployment

**Fix:**

1. Check `npx convex dev` is running
2. Check `.env` has CONVEX_URL
3. Run `npx convex deploy` manually

### Agent blocked on Stripe CLI

**Fix:**

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Re-run phase

## Tips for Success

1. **Work sequentially** - Don't skip phases
2. **Verify before moving on** - Always run verification agent
3. **Complete manual tasks** - Don't skip Stripe/WorkOS setup
4. **Keep dev server running** - For testing routes
5. **Keep Convex running** - `npx convex dev` in separate terminal
6. **Commit frequently** - Agents create commits, review before pushing
7. **Read verification reports** - Understand what passed/failed

## Files Generated

### During Implementation

- Code files (as specified in roadmap)
- Git commits (one per phase)
- Documentation updates

### During Verification

- `.claude/verification-reports/phase-[X]-[date].md` - Audit trail

## Reference Documentation

Agents automatically reference:

- `BILLING_ROADMAP.md` - Phase specifications
- `BILLING_GUIDE.md` - Architecture patterns
- `STRIPE_SETUP.md` - Stripe configuration
- `WORKOS_RBAC_SETUP.md` - Role setup
- `FEATURE_GATES.md` - Feature gating patterns

You don't need to tell agents to check these - they do it automatically.

## Estimated Timeline

With these agents:

- **Phase 1-4:** ~1-2 days (foundation)
- **Phase 5-9:** ~3-4 days (core billing)
- **Phase 10-13:** ~2-3 days (advanced features)
- **Phase 14-17:** ~2-3 days (polish & docs)

**Total:** ~8-12 days vs 14 days manual (40% faster)

## Support

If agents get stuck or confused:

1. Check the agent's error message
2. Reference BILLING_ROADMAP.md for context
3. Fix the blocking issue
4. Say "continue phase [X]" to resume

---

**Ready to start?**

```
implement phase 1 of billing roadmap
```
