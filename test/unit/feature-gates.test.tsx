import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import { FeatureGate } from '../../components/feature-gates/FeatureGate';
import { LockedFeature } from '../../components/feature-gates/LockedFeature';
import { TIERS } from '~/lib/permissions';

describe('FeatureGate', () => {
  it('renders children when tier requirement met', () => {
    renderWithProviders(
      <FeatureGate
        feature="analytics"
        requiredTier={TIERS.STARTER}
        currentTier={TIERS.PROFESSIONAL}
        currentRole="owner"
      >
        <div data-testid="unlocked-content">Unlocked</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('unlocked-content')).toBeInTheDocument();
    expect(screen.queryByText(/Unlock this feature/)).not.toBeInTheDocument();
  });

  it('renders locked state when tier not met', () => {
    renderWithProviders(
      <FeatureGate
        feature="analytics"
        requiredTier={TIERS.STARTER}
        currentTier={TIERS.FREE}
        currentRole="member"
        previewImageSrc="/assets/feature-previews/analytics.png"
        upgradeTriggerFeature="dashboard-analytics"
      >
        <div data-testid="unlocked-content">Unlocked</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('unlocked-content')).not.toBeInTheDocument();
    expect(screen.getByText('Unlock this feature')).toBeInTheDocument();
    const upgradeLink = screen.getByRole('link', { name: /Upgrade to Starter/i });
    expect(upgradeLink).toHaveAttribute('href', '/pricing?upgrade=dashboard-analytics');
  });

  it('renders custom fallback when provided', () => {
    renderWithProviders(
      <FeatureGate
        feature="api"
        requiredTier={TIERS.STARTER}
        currentTier={TIERS.FREE}
        fallback={<div data-testid="custom-fallback">Please upgrade</div>}
      >
        <div data-testid="unlocked">Unlocked</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Starter/)).not.toBeInTheDocument();
  });
});

describe('LockedFeature', () => {
  it('displays upgrade CTA with preview image', () => {
    renderWithProviders(
      <LockedFeature
        feature="api"
        requiredTier={TIERS.STARTER}
        previewImageSrc="/assets/feature-previews/api.png"
        title="API requires Starter"
        description="Unlock tokens and monitoring by upgrading."
      />
    );

    expect(screen.getByText('API requires Starter')).toBeInTheDocument();
    expect(screen.getByText('Unlock tokens and monitoring by upgrading.')).toBeInTheDocument();
    const image = screen.getByRole('img', { name: /api preview/i });
    expect(image).toHaveAttribute('src', '/assets/feature-previews/api.png');
  });
});
