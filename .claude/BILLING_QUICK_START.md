# Billing Implementation Quick Start

## TL;DR

**To implement the complete billing system:**

```bash
# Phase 1
implement phase 1 of billing roadmap
verify phase 1 of billing roadmap

# Phase 2
implement phase 2 of billing roadmap
verify phase 2 of billing roadmap

# ... repeat for all 17 phases
```

## Two-Command Workflow

### Command 1: Implement
```
implement phase [X] of billing roadmap
```

**What happens:**
1. ✅ Checks prerequisites
2. ✅ Implements all code tasks
3. ⏸️  Pauses for manual tasks (Stripe/WorkOS)
4. ✅ Runs tests
5. ✅ Updates docs
6. ✅ Creates commit

### Command 2: Verify
```
verify phase [X] of billing roadmap
```

**What happens:**
1. ✅ Checks all files
2. ✅ Runs TypeScript/linting
3. ✅ Executes tests
4. ✅ Validates environment
5. ✅ Creates audit report
6. ✅ Approves or blocks progression

## When Agent Pauses

### For Manual Tasks

Agent will say:
```
✅ Automated Tasks Complete

**Manual Tasks Remaining:**
- Task X.Y: Create Stripe product in dashboard

[Detailed instructions here]

When ready, say "manual tasks complete"
```

**You respond:**
```
manual tasks complete
```

### For Blocked Dependencies

Agent will say:
```
⚠️ Blocked: Phase 5 requires Phase 1 complete

Please complete Phase 1 first.
```

**You respond:**
```
implement phase 1 of billing roadmap
```

## Phase Order (with Manual Work)

| Phase | Manual Work Required? | What You Do |
|-------|----------------------|-------------|
| 1 | ❌ No | Just run commands |
| 2 | ✅ Yes | Create Stripe products, copy price IDs |
| 3 | ✅ Yes | Create WorkOS roles |
| 4 | ❌ No | Just run commands |
| 5 | ✅ Yes | Configure Stripe webhook |
| 6-9 | ❌ No | Just run commands |
| 10-12 | ❌ No | Just run commands |
| 13 | ✅ Yes | Configure Stripe email settings |
| 14-17 | ❌ No | Just run commands |

**Total manual phases:** 4 out of 17 (~20%)

## Terminal Setup

**Terminal 1: Main work**
```bash
npm run dev
```

**Terminal 2: Convex**
```bash
npx convex dev
```

**Terminal 3: Stripe CLI (for Phase 5+)**
```bash
stripe listen --forward-to localhost:5173/webhooks/stripe
```

Keep all three running while implementing.

## Example Complete Session

```
# Terminal 1
npm run dev

# Terminal 2
npx convex dev

# Chat with Claude
implement phase 1 of billing roadmap

[Agent implements Phase 1]

verify phase 1 of billing roadmap

[Agent verifies - ✅ PASSED]

implement phase 2 of billing roadmap

[Agent pauses for manual tasks]

# You: Go to Stripe Dashboard, create products

manual tasks complete

[Agent completes Phase 2]

verify phase 2 of billing roadmap

[Agent verifies - ✅ PASSED]

implement phase 3 of billing roadmap

[Continue through Phase 17...]
```

## If Verification Fails

Agent will show:
```
❌ Phase [X] Verification: FAILED

**Failed Checks:**
1. ❌ TypeScript error in stripe.server.ts:45
   Fix: Update return type

**To fix:**
[Specific instructions]

Re-run verification after fixing.
```

**You:**
1. Fix the issues
2. Run: `verify phase [X] of billing roadmap`
3. Repeat until ✅ PASSED

## Progress Tracking

Check `.claude/verification-reports/` for audit trail:
```
.claude/verification-reports/
├── phase-1-2025-10-01.md  ✅ PASSED
├── phase-2-2025-10-01.md  ✅ PASSED
├── phase-3-2025-10-02.md  ❌ FAILED
└── phase-3-2025-10-02.md  ✅ PASSED (retry)
```

## Estimated Time

| Phases | Estimated Time | Manual Work |
|--------|---------------|-------------|
| 1-4 | 1-2 days | Stripe + WorkOS setup |
| 5-9 | 3-4 days | Webhook configuration |
| 10-13 | 2-3 days | Email setup |
| 14-17 | 2-3 days | None |
| **Total** | **8-12 days** | **~4 hours manual** |

## Prerequisites

Before Phase 1:
```bash
# Install dependencies
npm install stripe @stripe/stripe-js

# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
```

Before Phase 2:
- Create Stripe account (test mode)
- Have API keys ready

Before Phase 3:
- Enable WorkOS RBAC in dashboard

Before Phase 5:
- Stripe CLI installed and logged in

## Quick Troubleshooting

### "Prerequisites failed"
**Fix:** Complete previous phase first.

### "Manual tasks incomplete"
**Fix:** Complete tasks in Stripe/WorkOS, then say "manual tasks complete".

### "TypeScript errors"
**Fix:** Address errors shown, re-run verification.

### "Convex deployment failed"
**Fix:** Check `npx convex dev` is running, re-deploy with `npx convex deploy`.

### Agent seems stuck
**Say:** "continue phase [X]" to resume.

## File Locations

**Agents:**
- `.claude/agents/billing-implementation.md`
- `.claude/agents/billing-verification.md`

**Documentation:**
- `BILLING_ROADMAP.md` - What agents follow
- `BILLING_GUIDE.md` - Architecture reference
- `STRIPE_SETUP.md` - Manual Stripe steps
- `WORKOS_RBAC_SETUP.md` - Manual WorkOS steps

**Reports:**
- `.claude/verification-reports/` - Audit trail

## Success Criteria

✅ All 17 phases implemented
✅ All 17 phases verified
✅ All tests passing
✅ Production build works
✅ At least one test purchase complete

Then you're ready for production deployment! 🚀

## Getting Help

If stuck, ask Claude:
```
explain phase [X] of billing roadmap
show me the manual tasks for phase [X]
what are the prerequisites for phase [X]
where are we in the billing implementation?
```

---

**Ready to start?**
```
implement phase 1 of billing roadmap
```
