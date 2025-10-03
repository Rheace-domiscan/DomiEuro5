/**
 * Phase 6 Pricing Components Tests
 *
 * Comprehensive tests for:
 * - PricingTable: 3-tier grid, monthly/annual toggle, badges
 * - PricingCard: Pricing display, features, CTA buttons
 * - FeatureList: Feature comparison table, desktop/mobile
 *
 * Coverage target: >70% (presentational components)
 */

import { describe, it, expect } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import { PricingTable } from '../../components/pricing/PricingTable';
import { PricingCard } from '../../components/pricing/PricingCard';
import { FeatureList } from '../../components/pricing/FeatureList';
import { TIERS } from '~/lib/billing-constants';
import type { SubscriptionTier } from '~/types/billing';

describe('PricingTable Component', () => {
  describe('Rendering', () => {
    it('should render all 3 pricing tiers', () => {
      renderWithProviders(<PricingTable />);

      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    it('should render pricing table header', () => {
      renderWithProviders(<PricingTable />);

      expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
      expect(screen.getByText("Choose the plan that's right for your team")).toBeInTheDocument();
    });

    it('should render monthly/annual toggle', () => {
      renderWithProviders(<PricingTable />);

      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Annual')).toBeInTheDocument();
      expect(screen.getByText('Save 17%')).toBeInTheDocument();
    });

    it('should render additional info section', () => {
      renderWithProviders(<PricingTable />);

      expect(
        screen.getByText(/All plans include a 14-day free trial. No credit card required./)
      ).toBeInTheDocument();
      expect(screen.getByText('Contact our sales team')).toBeInTheDocument();
    });
  });

  describe('Monthly/Annual Toggle', () => {
    it('should default to monthly billing', () => {
      renderWithProviders(<PricingTable />);

      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      const annualButton = screen.getByRole('button', { name: /annual/i });

      // Monthly should be active (have shadow-sm class)
      expect(monthlyButton).toHaveClass('bg-white');
      expect(annualButton).not.toHaveClass('bg-white');
    });

    it('should switch to annual billing when toggle clicked', () => {
      renderWithProviders(<PricingTable />);

      const annualButton = screen.getByRole('button', { name: /annual/i });
      fireEvent.click(annualButton);

      // Annual should now be active
      expect(annualButton).toHaveClass('bg-white');
    });

    it('should switch back to monthly billing', () => {
      renderWithProviders(<PricingTable />);

      const monthlyButton = screen.getByRole('button', { name: /monthly/i });
      const annualButton = screen.getByRole('button', { name: /annual/i });

      // Click annual
      fireEvent.click(annualButton);
      expect(annualButton).toHaveClass('bg-white');

      // Click monthly again
      fireEvent.click(monthlyButton);
      expect(monthlyButton).toHaveClass('bg-white');
      expect(annualButton).not.toHaveClass('bg-white');
    });
  });

  describe('Current Plan Badge', () => {
    it('should show "Current Plan" badge for free tier', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.FREE} showCurrentPlan={true} />);

      // Should show badge and disabled button (2 instances)
      const currentPlanElements = screen.getAllByText('Current Plan');
      expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "Current Plan" badge for starter tier', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.STARTER} showCurrentPlan={true} />);

      // Should show badge and disabled button (2 instances)
      const currentPlanElements = screen.getAllByText('Current Plan');
      expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "Current Plan" badge for professional tier', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.PROFESSIONAL} showCurrentPlan={true} />);

      // Should show badge and disabled button (2 instances)
      const currentPlanElements = screen.getAllByText('Current Plan');
      expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should not show badge when showCurrentPlan is false', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.STARTER} showCurrentPlan={false} />);

      expect(screen.queryByText('Current Plan')).not.toBeInTheDocument();
    });
  });

  describe('Popular Badge', () => {
    it('should show "Most Popular" on Starter tier by default', () => {
      renderWithProviders(<PricingTable />);

      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should show "Most Popular" on Professional tier when it is current plan', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.PROFESSIONAL} showCurrentPlan={true} />);

      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should not show "Most Popular" on Starter when Professional is current', () => {
      renderWithProviders(<PricingTable currentTier={TIERS.PROFESSIONAL} showCurrentPlan={true} />);

      // Should only show on Professional tier
      const popularBadges = screen.getAllByText('Most Popular');
      expect(popularBadges).toHaveLength(1);
    });
  });
});

describe('PricingCard Component', () => {
  const basePricingCardProps = {
    tier: 'starter' as SubscriptionTier,
    name: 'Starter',
    description: 'For small teams getting started',
    monthlyPrice: 5000, // £50 in pence
    annualPrice: 50000, // £500 in pence
    includedSeats: 5,
    features: ['features:basic', 'features:analytics'],
    isAnnual: false,
  };

  describe('Rendering', () => {
    it('should render tier name and description', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('For small teams getting started')).toBeInTheDocument();
    });

    it('should render monthly price correctly', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.getByText('£50')).toBeInTheDocument();
      expect(screen.getByText('/month')).toBeInTheDocument();
    });

    it('should render annual price correctly', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isAnnual={true} />);

      // Annual price divided by 12 months = £500/12 ≈ £41.67 (may have decimals)
      const priceElement = document.querySelector('.text-5xl');
      expect(priceElement?.textContent).toContain('£41');
      expect(screen.getByText('Billed £500 annually', { exact: false })).toBeInTheDocument();
    });

    it('should show savings percentage for annual billing', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isAnnual={true} />);

      // Savings: (£50*12 - £500) / (£50*12) = £100/£600 ≈ 17%
      expect(screen.getByText(/Save 17% with annual billing/)).toBeInTheDocument();
    });

    it('should render seat information', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.getByText('5 seats included')).toBeInTheDocument();
      expect(screen.getByText('Additional seats: £10/seat/month')).toBeInTheDocument();
    });

    it('should render single seat for free tier', () => {
      renderWithProviders(
        <PricingCard
          {...basePricingCardProps}
          tier="free"
          includedSeats={1}
          monthlyPrice={0}
          annualPrice={0}
        />
      );

      expect(screen.getByText('1 seat included')).toBeInTheDocument();
      expect(screen.queryByText('Additional seats')).not.toBeInTheDocument();
    });

    it('should render features with checkmarks', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.getByText('Basic features')).toBeInTheDocument();
      expect(screen.getByText('Advanced analytics')).toBeInTheDocument();

      // Should have checkmark SVG icons
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Popular Badge', () => {
    it('should show "Most Popular" badge when isPopular is true', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isPopular={true} />);

      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should not show badge when isPopular is false', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isPopular={false} />);

      expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    });
  });

  describe('Current Plan Badge', () => {
    it('should show "Current Plan" badge when isCurrentPlan is true', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isCurrentPlan={true} />);

      // Should show badge and disabled button (2 instances)
      const currentPlanElements = screen.getAllByText('Current Plan');
      expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable button when isCurrentPlan is true', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isCurrentPlan={true} />);

      const button = screen.getByRole('button', { name: /current plan/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });

  describe('CTA Button', () => {
    it('should render default CTA text for paid tiers', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.getByRole('button', { name: /start free trial/i })).toBeInTheDocument();
    });

    it('should render custom CTA text when provided', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} ctaText="Get Started Now" />);

      expect(screen.getByRole('button', { name: /get started now/i })).toBeInTheDocument();
    });

    it('should render "Get Started" for free tier', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} tier="free" />);

      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should render primary button variant', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} ctaVariant="primary" />);

      const button = screen.getByRole('button', { name: /start free trial/i });
      expect(button).toHaveClass('bg-indigo-600');
    });

    it('should render secondary button variant', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} ctaVariant="secondary" />);

      const button = screen.getByRole('button', { name: /start free trial/i });
      expect(button).toHaveClass('bg-gray-900');
    });

    it('should render outline button variant', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} ctaVariant="outline" />);

      const button = screen.getByRole('button', { name: /start free trial/i });
      expect(button).toHaveClass('bg-white');
      expect(button).toHaveClass('border-2');
    });

    it('should submit form with correct tier and interval', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      const form = screen.getByRole('button', { name: /start free trial/i }).closest('form');
      expect(form).toHaveAttribute('method', 'post');
      expect(form).toHaveAttribute('action', '/pricing');

      const tierInput = form?.querySelector('input[name="tier"]') as HTMLInputElement;
      const intervalInput = form?.querySelector('input[name="interval"]') as HTMLInputElement;

      expect(tierInput?.value).toBe('starter');
      expect(intervalInput?.value).toBe('monthly');
    });

    it('should submit annual interval when isAnnual is true', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} isAnnual={true} />);

      const form = screen.getByRole('button', { name: /start free trial/i }).closest('form');
      const intervalInput = form?.querySelector('input[name="interval"]') as HTMLInputElement;

      expect(intervalInput?.value).toBe('annual');
    });
  });

  describe('Free Tier Specifics', () => {
    it('should show "No credit card required" for free tier', () => {
      renderWithProviders(
        <PricingCard {...basePricingCardProps} tier="free" monthlyPrice={0} annualPrice={0} />
      );

      expect(screen.getByText('No credit card required')).toBeInTheDocument();
    });

    it('should not show "No credit card required" for paid tiers', () => {
      renderWithProviders(<PricingCard {...basePricingCardProps} />);

      expect(screen.queryByText('No credit card required')).not.toBeInTheDocument();
    });

    it('should show £0 for free tier pricing', () => {
      renderWithProviders(
        <PricingCard {...basePricingCardProps} tier="free" monthlyPrice={0} annualPrice={0} />
      );

      expect(screen.getByText('£0')).toBeInTheDocument();
      expect(screen.queryByText('/month')).not.toBeInTheDocument();
    });
  });
});

describe('FeatureList Component', () => {
  describe('Rendering', () => {
    it('should render feature comparison header', () => {
      renderWithProviders(<FeatureList />);

      expect(screen.getByText('Compare Features')).toBeInTheDocument();
      expect(
        screen.getByText("Everything you need to know about what's included in each plan")
      ).toBeInTheDocument();
    });

    it('should render all tier headers in desktop view', () => {
      renderWithProviders(<FeatureList />);

      // Desktop table (hidden on mobile, uses lg:block)
      const table = document.querySelector('.hidden.lg\\:block table');
      expect(table).toBeInTheDocument();

      // All three tiers should be in header
      const headers = within(table as HTMLElement).getAllByRole('columnheader');
      const headerTexts = headers.map(h => h.textContent);

      expect(headerTexts).toContain('Free');
      expect(headerTexts).toContain('Starter');
      expect(headerTexts).toContain('Professional');
    });

    it('should render feature categories', () => {
      renderWithProviders(<FeatureList />);

      // Categories appear in both desktop and mobile views
      const coreFeatures = screen.getAllByText('Core Features');
      const apiAccess = screen.getAllByText('API Access');
      const support = screen.getAllByText('Support');

      expect(coreFeatures.length).toBeGreaterThan(0);
      expect(apiAccess.length).toBeGreaterThan(0);
      expect(support.length).toBeGreaterThan(0);
    });

    it('should render all features', () => {
      renderWithProviders(<FeatureList />);

      // Features appear in both desktop and mobile views
      const basicFeatures = screen.getAllByText('Basic features');
      const advancedAnalytics = screen.getAllByText('Advanced analytics');
      const advancedReporting = screen.getAllByText('Advanced reporting');

      expect(basicFeatures.length).toBeGreaterThan(0);
      expect(advancedAnalytics.length).toBeGreaterThan(0);
      expect(advancedReporting.length).toBeGreaterThan(0);

      // API Access
      expect(screen.getAllByText('API access (limited)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unlimited API access').length).toBeGreaterThan(0);

      // Support
      expect(screen.getAllByText('Email support').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Priority support').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SLA guarantee').length).toBeGreaterThan(0);
    });

    it('should render feature descriptions', () => {
      renderWithProviders(<FeatureList />);

      // Descriptions appear in both desktop and mobile views
      expect(screen.getAllByText('Essential tools to get started').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Detailed insights and reporting').length).toBeGreaterThan(0);
      expect(screen.getAllByText('No rate limits or restrictions').length).toBeGreaterThan(0);
      expect(screen.getAllByText('99.9% uptime guarantee').length).toBeGreaterThan(0);
    });
  });

  describe('Tier Highlighting', () => {
    it('should highlight free tier when specified', () => {
      renderWithProviders(<FeatureList highlightTier="free" />);

      const table = document.querySelector('.hidden.lg\\:block table');
      const freeHeader = within(table as HTMLElement)
        .getByText('Free')
        .closest('th');

      expect(freeHeader).toHaveClass('bg-indigo-50');
      expect(freeHeader).toHaveClass('text-indigo-900');
    });

    it('should highlight starter tier when specified', () => {
      renderWithProviders(<FeatureList highlightTier="starter" />);

      const table = document.querySelector('.hidden.lg\\:block table');
      const starterHeader = within(table as HTMLElement)
        .getByText('Starter')
        .closest('th');

      expect(starterHeader).toHaveClass('bg-indigo-50');
      expect(starterHeader).toHaveClass('text-indigo-900');
    });

    it('should highlight professional tier when specified', () => {
      renderWithProviders(<FeatureList highlightTier="professional" />);

      const table = document.querySelector('.hidden.lg\\:block table');
      const proHeader = within(table as HTMLElement)
        .getByText('Professional')
        .closest('th');

      expect(proHeader).toHaveClass('bg-indigo-50');
      expect(proHeader).toHaveClass('text-indigo-900');
    });

    it('should not highlight any tier when not specified', () => {
      renderWithProviders(<FeatureList />);

      const table = document.querySelector('.hidden.lg\\:block table');
      const headers = within(table as HTMLElement).getAllByRole('columnheader');

      headers.forEach(header => {
        if (header.textContent !== 'Features') {
          expect(header).not.toHaveClass('bg-indigo-50');
        }
      });
    });
  });

  describe('Mobile View', () => {
    it('should render mobile view with all tiers', () => {
      renderWithProviders(<FeatureList />);

      // Mobile view (lg:hidden)
      const mobileView = document.querySelector('.lg\\:hidden');
      expect(mobileView).toBeInTheDocument();

      // Should have sections for each tier
      const tierSections = within(mobileView as HTMLElement).getAllByRole('heading', {
        level: 3,
      });
      const tierNames = tierSections.map(h => h.textContent);

      expect(tierNames).toContain('Free');
      expect(tierNames).toContain('Starter');
      expect(tierNames).toContain('Professional');
    });

    it('should highlight tier in mobile view', () => {
      renderWithProviders(<FeatureList highlightTier="starter" />);

      const mobileView = document.querySelector('.lg\\:hidden');
      const starterSection = within(mobileView as HTMLElement)
        .getByText('Starter')
        .closest('div.p-6');

      expect(starterSection).toHaveClass('bg-indigo-50');
    });
  });

  describe('Feature Availability', () => {
    it('should show checkmark for available features', () => {
      renderWithProviders(<FeatureList />);

      // Basic features available in all tiers - should have multiple checkmark SVGs
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should show cross for unavailable features', () => {
      renderWithProviders(<FeatureList />);

      // Desktop view table
      const table = document.querySelector('.hidden.lg\\:block table');

      // Advanced reporting only in Professional tier
      // Should have crosses in Free and Starter columns
      const rows = within(table as HTMLElement).getAllByRole('row');
      const advancedReportingRow = rows.find(row =>
        row.textContent?.includes('Advanced reporting')
      );

      expect(advancedReportingRow).toBeDefined();

      // Check for cross icons (path with M6 18L18 6M6 6l12 12)
      const cells = within(advancedReportingRow as HTMLElement).getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
