/**
 * PricingTable Component
 *
 * Displays a responsive 3-column grid of pricing tiers.
 * Includes a monthly/annual toggle and renders PricingCard for each tier.
 */

import { useState } from 'react';
import { PricingCard } from './PricingCard';
import { TIER_CONFIG, TIERS } from '~/lib/billing-constants';
import type { SubscriptionTier } from '~/types/billing';

export interface PricingTableProps {
  currentTier?: SubscriptionTier;
  showCurrentPlan?: boolean;
}

const TIER_DESCRIPTIONS = {
  [TIERS.FREE]: 'Perfect for trying out the platform',
  [TIERS.STARTER]: 'For small teams getting started',
  [TIERS.PROFESSIONAL]: 'For growing teams that need advanced features',
};

export function PricingTable({ currentTier, showCurrentPlan = false }: PricingTableProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Choose the plan that&apos;s right for your team
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="mt-12 flex items-center justify-center">
        <div className="relative inline-flex rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
              !isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
              isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
        {/* Free Tier */}
        <PricingCard
          tier={TIERS.FREE}
          name={TIER_CONFIG.free.name}
          description={TIER_DESCRIPTIONS.free}
          monthlyPrice={TIER_CONFIG.free.price.monthly}
          annualPrice={TIER_CONFIG.free.price.annual}
          includedSeats={TIER_CONFIG.free.seats.included}
          features={TIER_CONFIG.free.features}
          isAnnual={isAnnual}
          isCurrentPlan={showCurrentPlan && currentTier === TIERS.FREE}
          ctaText="Get Started Free"
          ctaVariant="outline"
        />

        {/* Starter Tier */}
        <PricingCard
          tier={TIERS.STARTER}
          name={TIER_CONFIG.starter.name}
          description={TIER_DESCRIPTIONS.starter}
          monthlyPrice={TIER_CONFIG.starter.price.monthly}
          annualPrice={TIER_CONFIG.starter.price.annual}
          includedSeats={TIER_CONFIG.starter.seats.included}
          features={TIER_CONFIG.starter.features}
          isAnnual={isAnnual}
          isPopular={!showCurrentPlan || currentTier !== TIERS.PROFESSIONAL}
          isCurrentPlan={showCurrentPlan && currentTier === TIERS.STARTER}
          ctaText="Start Free Trial"
          ctaVariant="primary"
        />

        {/* Professional Tier */}
        <PricingCard
          tier={TIERS.PROFESSIONAL}
          name={TIER_CONFIG.professional.name}
          description={TIER_DESCRIPTIONS.professional}
          monthlyPrice={TIER_CONFIG.professional.price.monthly}
          annualPrice={TIER_CONFIG.professional.price.annual}
          includedSeats={TIER_CONFIG.professional.seats.included}
          features={TIER_CONFIG.professional.features}
          isAnnual={isAnnual}
          isPopular={showCurrentPlan && currentTier === TIERS.PROFESSIONAL}
          isCurrentPlan={showCurrentPlan && currentTier === TIERS.PROFESSIONAL}
          ctaText="Start Free Trial"
          ctaVariant="secondary"
        />
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600">
          All plans include a 14-day free trial. No credit card required.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Questions?{' '}
          <a href="/contact" className="font-medium text-indigo-600 hover:text-indigo-500">
            Contact our sales team
          </a>
        </p>
      </div>
    </div>
  );
}
