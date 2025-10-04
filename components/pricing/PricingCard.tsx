/**
 * PricingCard Component
 *
 * Displays an individual pricing tier card with:
 * - Tier name and description
 * - Pricing (monthly/annual with toggle)
 * - Included seats
 * - Feature list
 * - CTA button to start checkout
 */

import { Form } from 'react-router';
import type { SubscriptionTier } from '~/types/billing';
import { formatPrice } from '~/lib/billing-constants';

export interface PricingCardProps {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number; // in pence
  annualPrice: number; // in pence
  includedSeats: number;
  features: string[];
  isAnnual: boolean;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  ctaText?: string;
  ctaVariant?: 'primary' | 'secondary' | 'outline';
  upgradeTriggerFeature?: string;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'features:basic': 'Basic features',
  'features:analytics': 'Advanced analytics',
  'features:api_limited': 'API access (limited)',
  'features:api_unlimited': 'Unlimited API access',
  'features:email_support': 'Email support',
  'features:priority_support': 'Priority support',
  'features:sla': 'SLA guarantee',
  'features:advanced_reporting': 'Advanced reporting',
};

export function PricingCard({
  tier,
  name,
  description,
  monthlyPrice,
  annualPrice,
  includedSeats,
  features,
  isAnnual,
  isPopular = false,
  isCurrentPlan = false,
  ctaText,
  ctaVariant = 'primary',
  upgradeTriggerFeature,
}: PricingCardProps) {
  const displayPrice = isAnnual ? annualPrice : monthlyPrice;
  const pricePerMonth = isAnnual ? annualPrice / 12 : monthlyPrice;

  // Calculate savings for annual billing
  const annualSavings = isAnnual ? monthlyPrice * 12 - annualPrice : 0;
  const savingsPercentage = isAnnual ? Math.round((annualSavings / (monthlyPrice * 12)) * 100) : 0;

  // Default CTA text
  const buttonText = ctaText || (tier === 'free' ? 'Get Started' : 'Start Free Trial');

  // Button styles based on variant
  const buttonStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200',
    secondary:
      'bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md transition-all duration-200',
    outline:
      'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400 transition-all duration-200',
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-8 shadow-sm transition-all duration-200 hover:shadow-lg ${
        isPopular
          ? 'border-indigo-600 shadow-md'
          : isCurrentPlan
            ? 'border-green-500'
            : 'border-gray-200'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex rounded-full bg-green-500 px-4 py-1 text-sm font-semibold text-white shadow-sm">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-5xl font-bold tracking-tight text-gray-900">
            {formatPrice(pricePerMonth)}
          </span>
          {displayPrice > 0 && <span className="ml-2 text-lg text-gray-600">/month</span>}
        </div>

        {isAnnual && displayPrice > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-green-600">
              Save {savingsPercentage}% with annual billing
            </p>
            <p className="text-xs text-gray-500">Billed {formatPrice(annualPrice)} annually</p>
          </div>
        )}

        {!isAnnual && displayPrice > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">Billed {formatPrice(monthlyPrice)} monthly</p>
          </div>
        )}
      </div>

      {/* Seats */}
      <div className="mb-6 rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">
          {includedSeats === 1 ? '1 seat included' : `${includedSeats} seats included`}
        </p>
        {tier !== 'free' && (
          <p className="mt-1 text-xs text-gray-600">Additional seats: £10/seat/month</p>
        )}
      </div>

      {/* Features */}
      <div className="mb-8 flex-grow">
        <ul className="space-y-3">
          {features.map(feature => (
            <li key={feature} className="flex items-start">
              <svg
                className="mr-3 h-5 w-5 flex-shrink-0 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm text-gray-700">
                {FEATURE_DESCRIPTIONS[feature] || feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      {isCurrentPlan ? (
        <button
          type="button"
          disabled
          className="w-full rounded-lg border-2 border-gray-300 bg-gray-100 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : (
        <Form method="post" action="/pricing">
          <input type="hidden" name="tier" value={tier} />
          <input type="hidden" name="interval" value={isAnnual ? 'annual' : 'monthly'} />
          {upgradeTriggerFeature ? (
            <input type="hidden" name="upgradeTriggerFeature" value={upgradeTriggerFeature} />
          ) : null}
          <button
            type="submit"
            className={`w-full rounded-lg py-3 text-sm font-semibold ${buttonStyles[ctaVariant]}`}
          >
            {buttonText}
          </button>
        </Form>
      )}

      {/* Free tier note */}
      {tier === 'free' && (
        <p className="mt-3 text-center text-xs text-gray-500">No credit card required</p>
      )}
    </div>
  );
}
