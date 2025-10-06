# Stripe Billing Test Scenarios

Use this checklist when validating billing features locally. Start a webhook listener first:

```bash
stripe listen --forward-to http://localhost:5173/webhooks/stripe
```

Then exercise each scenario in order (all flows assume Stripe test keys and test customers).

## Scenarios

1. **Free -> Starter Upgrade**
   - Sign in as a free user, visit `/pricing`, choose Starter -> Monthly, and complete checkout.
   - Expect: Checkout success page, `subscriptions` table records tier `starter`, analytics logs conversion trigger.

2. **Starter -> Professional Upgrade**
   - From `/settings/billing`, open the Stripe Customer Portal and upgrade to Professional (any interval).
   - Expect: Webhook `customer.subscription.updated` updates tier to `professional` and billing history records change.

3. **Annual Conversion Flow**
   - From `/pricing`, toggle to annual billing and complete checkout for the Starter tier.
   - Expect: Subscription interval switches to `annual`, next invoice date reflects annual cadence, audit log entry created.

4. **Add Seats Mid-Cycle**
   - In the app, add seats beyond included allocation; confirm `settleSubscriptionInvoice` finalizes prorated invoice.
   - Expect: `payment_intent.succeeded` event, updated seat counts in Convex, invoice charge appears in Stripe Dashboard.

5. **Remove Seats Mid-Cycle**
   - Remove previously added seats.
   - Expect: Credit-only invoice finalized, billing history captures seat reduction, audit log entry stored.

6. **Grace Period Start (Failed Payment)**
   - Run `stripe trigger invoice.payment_failed` for the active subscription.
   - Expect: Grace period metadata saved, billing banner surfaces lock warning, audit log entry emitted.

7. **Grace Period Resolution**
   - Run `stripe trigger invoice.payment_succeeded`.
   - Expect: Grace period cleared, access restored, billing history notes payment recovery.

8. **Subscription Cancellation**
   - Trigger `stripe trigger customer.subscription.deleted`.
   - Expect: Subscription marked cancelled and read-only, owner sees reactivation banner, audit log captures event.

9. **Subscription Reactivation**
   - Use the reactivation banner on `/settings/billing` to create a new checkout session, or trigger `stripe trigger customer.subscription.updated` after reenabling the plan in the Customer Portal.
   - Expect: Subscription set back to active, reactivation banner disappears, billing history logs reactivation.

10. **Ownership Transfer Billing Check**
    - Transfer organization ownership via `/settings/team/transfer-ownership`.
    - Expect: Billing contact updates in Stripe, audit log entry created, WorkOS role sync confirms new owner.

Document any discrepancies next to the scenario before closing the test run.
