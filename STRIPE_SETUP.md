# Stripe Setup Guide

This guide walks through configuring Stripe for the billing system, including creating products, prices, webhooks, and the Customer Portal.

---

## Prerequisites

- Stripe account created (sign up at https://stripe.com)
- Access to Stripe Dashboard
- `.env` file ready for configuration

---

## Step 1: Create Stripe Products

### 1.1 Create "Starter Plan - Monthly"

1. Go to **Stripe Dashboard → Products → Add Product**
2. Fill in:
   - **Name:** `Starter Plan - Monthly`
   - **Description:** `5 included seats, £50 per month`
   - **Pricing:**
     - **Price:** `50.00`
     - **Currency:** `GBP`
     - **Billing period:** `Monthly (recurring)`
   - **Product ID:** (auto-generated, will be like `prod_xxxxx`)
3. Click **Add product**
4. **Copy the Price ID** (starts with `price_xxxxx`) → Add to `.env` as `STRIPE_PRICE_STARTER_MONTHLY`

### 1.2 Create "Starter Plan - Annual"

1. Go to **Products → Add Product**
2. Fill in:
   - **Name:** `Starter Plan - Annual`
   - **Description:** `5 included seats, £500 per year (2 months free)`
   - **Pricing:**
     - **Price:** `500.00`
     - **Currency:** `GBP`
     - **Billing period:** `Yearly (recurring)`
3. Click **Add product**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_STARTER_ANNUAL`

### 1.3 Create "Professional Plan - Monthly"

1. Go to **Products → Add Product**
2. Fill in:
   - **Name:** `Professional Plan - Monthly`
   - **Description:** `20 included seats, £250 per month`
   - **Pricing:**
     - **Price:** `250.00`
     - **Currency:** `GBP`
     - **Billing period:** `Monthly (recurring)`
3. Click **Add product**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_PRO_MONTHLY`

### 1.4 Create "Professional Plan - Annual"

1. Go to **Products → Add Product**
2. Fill in:
   - **Name:** `Professional Plan - Annual`
   - **Description:** `20 included seats, £2,500 per year (2 months free)`
   - **Pricing:**
     - **Price:** `2500.00`
     - **Currency:** `GBP`
     - **Billing period:** `Yearly (recurring)`
3. Click **Add product**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_PRO_ANNUAL`

### 1.5 Create "Additional Seat"

1. Go to **Products → Add Product**
2. Fill in:
   - **Name:** `Additional Seat`
   - **Description:** `Add extra seats to your plan`
   - **Pricing:**
     - **Price:** `10.00`
     - **Currency:** `GBP`
     - **Billing period:** `Monthly (recurring)`
     - **Usage type:** `Metered` or `Licensed` (use Licensed)
3. Click **Add product**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ADDITIONAL_SEAT`

---

## Step 2: Configure Customer Portal

The Customer Portal lets users manage their subscriptions, payment methods, and billing.

1. Go to **Stripe Dashboard → Settings → Customer Portal**
2. Click **Activate test link** (for test mode)

### 2.1 Configure Features

Enable these features:

#### **Invoice history**

- ✅ Enable
- Allows customers to view past invoices

#### **Update payment method**

- ✅ Enable
- Allows customers to update their card

#### **Customer information**

- ✅ Enable
- Allowed updates: `Billing address`
- Allows customers to update billing address

#### **Subscription cancel**

- ✅ Enable
- **Cancellation behavior:** `At the end of the billing period`
- **Cancellation reasons:** ✅ Enable
- Prevents immediate loss of access

#### **Subscription update**

- ✅ Enable
- **Update behavior:** `Schedule downgrades at period end`
  - This is CRITICAL - ensures downgrades don't happen immediately
- **Proration:** `Create prorations`
- **Allowed updates:** Select products:
  - ✅ Starter Plan - Monthly
  - ✅ Starter Plan - Annual
  - ✅ Professional Plan - Monthly
  - ✅ Professional Plan - Annual

#### **Subscription pause** (Optional)

- ❌ Disable (not needed for this use case)

### 2.2 Customize Branding (Optional)

1. Go to **Branding** tab
2. Upload logo
3. Set brand colors
4. Configure support email

### 2.3 Save Configuration

Click **Save** at the top right.

---

## Step 3: Set Up Webhooks

Webhooks notify your app when Stripe events occur (payments, subscriptions, etc.).

### 3.1 Local Development (Stripe CLI)

For local testing, use the Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:5173/webhooks/stripe
```

**Copy the webhook signing secret** (starts with `whsec_`) → Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 3.2 Production Webhooks

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://yourdomain.com/webhooks/stripe`
4. **Description:** `Production webhook endpoint`
5. **Select events to listen to:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `subscription_schedule.created`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.updated`
6. Click **Add endpoint**
7. **Copy the signing secret** → Add to production `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Configure Environment Variables

Add all Stripe configuration to your `.env` file:

```env
# ==============================================
# STRIPE CONFIGURATION
# ==============================================

# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_51...  # Test mode: sk_test_... | Live mode: sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...  # Must start with VITE_ for client access

# Webhook Secret (different for local vs production)
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI (local) or Dashboard (production)

# Product Price IDs
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ADDITIONAL_SEAT=price_...
```

---

## Step 5: Test Stripe Integration

### 5.1 Test in Development

1. Start your dev server: `npm run dev`
2. Start Stripe CLI: `stripe listen --forward-to localhost:5173/webhooks/stripe`
3. Visit: `http://localhost:5173/pricing`
4. Click **Upgrade to Starter**
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete checkout
7. Check webhook logs in terminal (should see `checkout.session.completed`)
8. Verify subscription created in Convex

### 5.2 Stripe Test Cards

| Scenario           | Card Number           | Expected Behavior        |
| ------------------ | --------------------- | ------------------------ |
| Successful payment | `4242 4242 4242 4242` | Payment succeeds         |
| Payment declined   | `4000 0000 0000 0002` | Card declined            |
| Insufficient funds | `4000 0000 0000 9995` | Insufficient funds error |
| 3D Secure required | `4000 0027 6000 3184` | Triggers authentication  |

### 5.3 Trigger Webhook Events Manually

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription update
stripe trigger customer.subscription.updated

# Test failed payment
stripe trigger invoice.payment_failed

# Test subscription cancellation
stripe trigger customer.subscription.deleted
```

---

## Step 6: Switch to Live Mode (Production)

When ready for production:

1. **Get Live API Keys:**
   - Go to **Stripe Dashboard → Developers → API Keys**
   - Toggle to **Live mode** (top right)
   - Copy **Secret key** (starts with `sk_live_`)
   - Copy **Publishable key** (starts with `pk_live_`)

2. **Update `.env`:**

   ```env
   STRIPE_SECRET_KEY=sk_live_...  # Replace test key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Replace test key
   ```

3. **Recreate Products in Live Mode:**
   - Toggle dashboard to **Live mode**
   - Repeat Step 1 (Create Products) in live mode
   - Update `.env` with **live mode price IDs**

4. **Configure Live Webhooks:**
   - Follow Step 3.2 to add production webhook endpoint
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret

5. **Activate Customer Portal:**
   - Go to **Settings → Customer Portal**
   - Click **Activate live link**
   - Configure same settings as test mode

6. **Deploy Code:**
   - Ensure `.env` has live keys
   - Deploy to production
   - Monitor Stripe webhook dashboard for events

---

## Troubleshooting

### Webhook not receiving events

**Problem:** No webhook events showing in logs

**Solutions:**

1. Check Stripe CLI is running: `stripe listen --forward-to localhost:5173/webhooks/stripe`
2. Verify endpoint URL matches: `http://localhost:5173/webhooks/stripe`
3. Check webhook signature verification in code
4. Look for errors in Stripe Dashboard → Developers → Webhooks → View logs

### Payment fails with "Invalid API key"

**Problem:** `Invalid API key provided` error

**Solutions:**

1. Verify `STRIPE_SECRET_KEY` in `.env` starts with `sk_test_` (test) or `sk_live_` (live)
2. Check no extra spaces in `.env` value
3. Restart dev server after changing `.env`

### Customer Portal not showing subscription

**Problem:** User redirected to portal but sees "No active subscription"

**Solutions:**

1. Verify subscription created in Stripe Dashboard → Customers
2. Check `stripeCustomerId` stored correctly in Convex
3. Ensure customer has at least one active subscription

### Checkout redirects but subscription not created

**Problem:** Checkout succeeds but webhook doesn't fire

**Solutions:**

1. Check Stripe CLI is running (`stripe listen`)
2. Verify webhook endpoint route exists: `app/routes/webhooks/stripe.tsx`
3. Check webhook signature verification passes
4. Look for errors in server logs

### Proration not working correctly

**Problem:** Adding seats charges full amount instead of prorated

**Solutions:**

1. Verify `proration_behavior: 'create_prorations'` set in portal config
2. Check subscription is set to prorate in Stripe
3. Use Stripe's invoice preview API to verify prorated amount

---

## Security Best Practices

### ✅ Do's:

- ✅ Always verify webhook signatures with `STRIPE_WEBHOOK_SECRET`
- ✅ Use environment variables for all secrets (never hardcode)
- ✅ Keep test and live keys separate
- ✅ Use HTTPS in production (webhooks require HTTPS)
- ✅ Monitor Stripe dashboard for unusual activity
- ✅ Set up fraud detection rules in Stripe Radar

### ❌ Don'ts:

- ❌ Never commit API keys to Git
- ❌ Never use live keys in development
- ❌ Never skip webhook signature verification
- ❌ Never trust client-side data (always verify server-side)
- ❌ Never deploy to production with test keys

---

## Quick Reference

### Stripe Dashboard Links

- **Products:** https://dashboard.stripe.com/products
- **Customers:** https://dashboard.stripe.com/customers
- **Subscriptions:** https://dashboard.stripe.com/subscriptions
- **Webhooks:** https://dashboard.stripe.com/webhooks
- **API Keys:** https://dashboard.stripe.com/apikeys
- **Customer Portal:** https://dashboard.stripe.com/settings/billing/portal
- **Logs:** https://dashboard.stripe.com/logs

### Stripe CLI Commands

```bash
# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:5173/webhooks/stripe

# Trigger events
stripe trigger <event_name>

# View events
stripe events list

# View customers
stripe customers list

# View subscriptions
stripe subscriptions list
```

### Test Mode Indicators

- Test API keys start with: `sk_test_`, `pk_test_`
- Test webhook secrets start with: `whsec_test_`
- Test mode toggle: Top right of Stripe Dashboard (orange = test)

---

## Next Steps

After completing Stripe setup:

1. ✅ Verify all price IDs in `.env`
2. ✅ Test checkout flow with test card
3. ✅ Verify webhooks firing (check Stripe CLI output)
4. ✅ Test Customer Portal (update payment method, view invoices)
5. ✅ Proceed to **Phase 3** of `BILLING_ROADMAP.md` (WorkOS RBAC Setup)

---

**Questions?** Reference the [Stripe Documentation](https://docs.stripe.com) or ask your AI assistant for help with specific configuration steps.
