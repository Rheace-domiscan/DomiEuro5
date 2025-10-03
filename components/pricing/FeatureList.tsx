/**
 * FeatureList Component
 *
 * Displays a comprehensive feature comparison table across all pricing tiers.
 * Shows which features are available in each tier with checkmarks.
 */

import React from 'react';
import type { SubscriptionTier } from '~/types/billing';
import { TIER_CONFIG } from '~/lib/billing-constants';

export interface Feature {
  name: string;
  description?: string;
  tiers: SubscriptionTier[];
}

export interface FeatureCategory {
  name: string;
  features: Feature[];
}

const FEATURE_COMPARISON: FeatureCategory[] = [
  {
    name: 'Core Features',
    features: [
      {
        name: 'Basic features',
        description: 'Essential tools to get started',
        tiers: ['free', 'starter', 'professional'],
      },
      {
        name: 'Advanced analytics',
        description: 'Detailed insights and reporting',
        tiers: ['starter', 'professional'],
      },
      {
        name: 'Advanced reporting',
        description: 'Custom reports and data export',
        tiers: ['professional'],
      },
    ],
  },
  {
    name: 'API Access',
    features: [
      {
        name: 'API access (limited)',
        description: 'Up to 1,000 requests per month',
        tiers: ['starter'],
      },
      {
        name: 'Unlimited API access',
        description: 'No rate limits or restrictions',
        tiers: ['professional'],
      },
    ],
  },
  {
    name: 'Support',
    features: [
      {
        name: 'Email support',
        description: 'Response within 48 hours',
        tiers: ['starter', 'professional'],
      },
      {
        name: 'Priority support',
        description: 'Response within 4 hours',
        tiers: ['professional'],
      },
      {
        name: 'SLA guarantee',
        description: '99.9% uptime guarantee',
        tiers: ['professional'],
      },
    ],
  },
];

interface FeatureListProps {
  highlightTier?: SubscriptionTier;
}

export function FeatureList({ highlightTier }: FeatureListProps) {
  const tiers: SubscriptionTier[] = ['free', 'starter', 'professional'];

  return (
    <div className="mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Compare Features
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Everything you need to know about what&apos;s included in each plan
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          {/* Desktop View */}
          <div className="hidden lg:block">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
                  >
                    Features
                  </th>
                  {tiers.map(tier => (
                    <th
                      key={tier}
                      scope="col"
                      className={`px-6 py-4 text-center text-sm font-semibold ${
                        highlightTier === tier ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                      }`}
                    >
                      {TIER_CONFIG[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200 bg-white">
                {FEATURE_COMPARISON.map((category, categoryIdx) => (
                  <React.Fragment key={category.name}>
                    {/* Category Header */}
                    <tr className={categoryIdx === 0 ? '' : 'border-t-2 border-gray-300'}>
                      <th
                        colSpan={4}
                        scope="colgroup"
                        className="bg-gray-50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {category.name}
                      </th>
                    </tr>

                    {/* Category Features */}
                    {category.features.map(feature => (
                      <tr key={feature.name}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                          {feature.description && (
                            <div className="mt-1 text-xs text-gray-500">{feature.description}</div>
                          )}
                        </td>
                        {tiers.map(tier => (
                          <td
                            key={tier}
                            className={`px-6 py-4 text-center ${
                              highlightTier === tier ? 'bg-indigo-50' : ''
                            }`}
                          >
                            {feature.tiers.includes(tier) ? (
                              <svg
                                className="mx-auto h-5 w-5 text-indigo-600"
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
                            ) : (
                              <svg
                                className="mx-auto h-5 w-5 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden">
            {tiers.map(tier => (
              <div
                key={tier}
                className={`border-b border-gray-200 p-6 last:border-b-0 ${
                  highlightTier === tier ? 'bg-indigo-50' : ''
                }`}
              >
                <h3 className="mb-4 text-lg font-bold text-gray-900">{TIER_CONFIG[tier].name}</h3>

                {FEATURE_COMPARISON.map(category => (
                  <div key={category.name} className="mb-6 last:mb-0">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {category.name}
                    </h4>
                    <ul className="space-y-2">
                      {category.features.map(feature => (
                        <li key={feature.name} className="flex items-start">
                          {feature.tiers.includes(tier) ? (
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
                          ) : (
                            <svg
                              className="mr-3 h-5 w-5 flex-shrink-0 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                            {feature.description && (
                              <div className="mt-1 text-xs text-gray-500">
                                {feature.description}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
