/**
 * Pricing Page Route
 *
 * Public pricing page that displays all subscription tiers with:
 * - 3-tier comparison (Free, Starter, Professional)
 * - Monthly/Annual toggle
 * - Feature comparison table
 * - Checkout integration for paid tiers
 *
 * This route is PUBLIC - no authentication required to view.
 * Authentication is only required when initiating checkout.
 */

import { redirect, data } from 'react-router';
import type { Route } from './+types/pricing';
import { PricingTable } from '../../components/pricing/PricingTable';
import { FeatureList } from '../../components/pricing/FeatureList';
import { getUser } from '~/lib/auth.server';
import { createCheckoutSession } from '~/lib/stripe.server';
import { convexServer } from '../../lib/convex.server';
import { api } from '../../convex/_generated/api';
import { TIERS, TIER_CONFIG } from '~/lib/billing-constants';
import type { SubscriptionTier, BillingInterval } from '~/types/billing';

/**
 * Loader - Fetch current user and subscription info if authenticated
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Get user (optional - page is public)
  const user = await getUser(request);
  const url = new URL(request.url);
  const upgradeFeature = url.searchParams.get('upgrade');

  let currentTier: SubscriptionTier | undefined;

  // If user is authenticated, fetch their current subscription
  if (user?.organizationId) {
    try {
      const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
        organizationId: user.organizationId,
      });

      if (subscription) {
        currentTier = subscription.tier as SubscriptionTier;
      }
    } catch (_error) {
      // Subscription doesn't exist yet - user is on free tier
      // Error is expected for new users
    }
  }

  return data({
    user,
    currentTier: currentTier || TIERS.FREE,
    upgradeFeature: upgradeFeature || null,
  });
}

/**
 * Action - Handle checkout session creation
 */
export async function action({ request }: Route.ActionArgs) {
  // Parse form data
  const formData = await request.formData();
  const tier = formData.get('tier') as SubscriptionTier;
  const interval = formData.get('interval') as BillingInterval;
  const upgradeTriggerFeature = formData.get('upgradeTriggerFeature');

  // Validate tier and interval
  if (!tier || !interval) {
    return data({ error: 'Missing tier or interval' }, { status: 400 });
  }

  // Free tier doesn't need checkout
  if (tier === TIERS.FREE) {
    // If user is not authenticated, redirect to signup
    const user = await getUser(request);
    if (!user) {
      return redirect('/auth/login');
    }
    // If authenticated, redirect to dashboard
    return redirect('/dashboard');
  }

  // Validate tier is paid
  if (tier !== TIERS.STARTER && tier !== TIERS.PROFESSIONAL) {
    return data({ error: 'Invalid tier' }, { status: 400 });
  }

  // Validate interval
  if (interval !== 'monthly' && interval !== 'annual') {
    return data({ error: 'Invalid interval' }, { status: 400 });
  }

  // Require authentication for paid tiers
  const user = await getUser(request);
  if (!user) {
    // Store intended tier/interval in URL params and redirect to login
    return redirect(`/auth/login?redirect=/pricing&tier=${tier}&interval=${interval}`);
  }

  // Require organization
  if (!user.organizationId) {
    return redirect('/auth/organization-selection');
  }

  try {
    // Check if subscription already exists
    const existingSubscription = await convexServer.query(api.subscriptions.getByOrganization, {
      organizationId: user.organizationId,
    });

    // If they already have this tier or higher, redirect to billing
    if (existingSubscription) {
      const tierHierarchy = {
        free: 0,
        starter: 1,
        professional: 2,
      };

      const currentTierLevel = tierHierarchy[existingSubscription.tier as SubscriptionTier];
      const requestedTierLevel = tierHierarchy[tier];

      if (currentTierLevel >= requestedTierLevel) {
        // Already on this tier or higher - redirect to billing
        return redirect('/settings/billing');
      }
    }

    // Get included seats for the tier
    const includedSeats = TIER_CONFIG[tier].seats.included;

    // Build success and cancel URLs
    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/settings/billing?success=true`;
    const cancelUrl = `${origin}/pricing`;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      customerId: existingSubscription?.stripeCustomerId,
      customerEmail: user.email,
      tier,
      interval,
      seats: includedSeats, // Start with included seats
      organizationId: user.organizationId,
      successUrl,
      cancelUrl,
      upgradeTriggerFeature:
        typeof upgradeTriggerFeature === 'string' && upgradeTriggerFeature.length > 0
          ? upgradeTriggerFeature
          : undefined,
    });

    // Redirect to Stripe checkout
    if (!session.url) {
      throw new Error('Stripe checkout session URL is missing');
    }
    return redirect(session.url);
  } catch (_error) {
    // Error creating checkout session
    return data(
      {
        error: 'Failed to create checkout session. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Meta - SEO optimization
 */
export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Pricing - Choose Your Plan' },
    {
      name: 'description',
      content:
        'Simple, transparent pricing for teams of all sizes. Start free and upgrade as you grow.',
    },
    { property: 'og:title', content: 'Pricing - Choose Your Plan' },
    {
      property: 'og:description',
      content:
        'Simple, transparent pricing for teams of all sizes. Start free and upgrade as you grow.',
    },
  ];
}

/**
 * Pricing Page Component
 */
export default function Pricing({ loaderData }: Route.ComponentProps) {
  const { user, currentTier, upgradeFeature } = loaderData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold text-gray-900">
                Your App Name
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <a
                    href="/dashboard"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/settings/billing"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Billing
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/auth/login"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </a>
                  <a
                    href="/auth/login"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Get Started
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-16">
        {upgradeFeature && (
          <div className="mx-auto mb-12 max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5 text-sm text-indigo-900 shadow-sm">
              <p className="font-semibold">Unlock {upgradeFeature}</p>
              <p className="mt-1 text-indigo-800">
                Select a paid plan below to enable this feature for your team.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Table */}
        <PricingTable
          currentTier={currentTier}
          showCurrentPlan={!!user}
          upgradeTriggerFeature={upgradeFeature ?? undefined}
        />

        {/* Feature Comparison */}
        <FeatureList highlightTier={currentTier} />

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-12 divide-y divide-gray-200">
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">Can I change my plan later?</h3>
              <p className="mt-2 text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect
                immediately, while downgrades take effect at the end of your current billing period.
              </p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">
                What happens if I need more seats?
              </h3>
              <p className="mt-2 text-gray-600">
                Additional seats are available for £10/seat/month on both Starter and Professional
                plans. You can add seats at any time from your billing dashboard.
              </p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">Do you offer refunds?</h3>
              <p className="mt-2 text-gray-600">
                We offer a 14-day free trial for all paid plans. After that, we offer prorated
                refunds for annual subscriptions if you cancel within 30 days of purchase.
              </p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900">
                What payment methods do you accept?
              </h3>
              <p className="mt-2 text-gray-600">
                We accept all major credit cards, debit cards, and bank transfers through Stripe.
                All payments are processed securely.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mx-auto mt-24 max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-indigo-600 px-8 py-12 shadow-lg">
            <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
            <p className="mt-4 text-lg text-indigo-100">
              Join thousands of teams already using our platform to achieve their goals.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <a
                href="/auth/login"
                className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-indigo-600 shadow-sm hover:bg-gray-50"
              >
                Start Free Trial
              </a>
              <a
                href="/contact"
                className="rounded-lg border-2 border-white px-8 py-3 text-base font-semibold text-white hover:bg-indigo-500"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2025 Your Company. All rights reserved.</p>
            <div className="mt-4 space-x-6">
              <a href="/terms" className="hover:text-gray-900">
                Terms
              </a>
              <a href="/privacy" className="hover:text-gray-900">
                Privacy
              </a>
              <a href="/contact" className="hover:text-gray-900">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
