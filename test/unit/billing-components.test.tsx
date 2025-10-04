/**
 * Billing Components Unit Tests (Phase 7)
 *
 * Focused tests for billing dashboard UI building blocks:
 * - BillingOverview: plan summary + renewal info
 * - SeatWarningBanner: overage messaging
 * - SeatManagement: seat usage metrics + CTA wiring
 */

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import { BillingOverview } from '../../components/billing/BillingOverview';
import { SeatWarningBanner } from '../../components/billing/SeatWarningBanner';
import { SeatManagement } from '../../components/billing/SeatManagement';

const currentPeriodEnd = new Date('2025-03-01T00:00:00Z').getTime();

describe('BillingOverview', () => {
  it('renders tier, status, pricing, and renewal date', () => {
    renderWithProviders(
      <BillingOverview
        tier="starter"
        status="active"
        billingInterval="monthly"
        currentPeriodEnd={currentPeriodEnd}
        cancelAtPeriodEnd={false}
        accessStatus="active"
        pendingDowngrade={undefined}
      />
    );

    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('£50 / month')).toBeInTheDocument();
    expect(screen.getByText('Next renewal')).toBeInTheDocument();
    const renewalElements = screen.getAllByText((_, element) =>
      element?.textContent?.includes('1 Mar 2025') ?? false
    );
    expect(renewalElements.length).toBeGreaterThan(0);
  });

  it('shows cancellation notice when cancelAtPeriodEnd is true', () => {
    renderWithProviders(
      <BillingOverview
        tier="professional"
        status="active"
        billingInterval="annual"
        currentPeriodEnd={currentPeriodEnd}
        cancelAtPeriodEnd={true}
        accessStatus="active"
        pendingDowngrade={{ tier: 'starter', effectiveDate: currentPeriodEnd }}
      />
    );

    expect(screen.getByText(/cancellation scheduled/i)).toBeInTheDocument();
    const downgradeBadges = screen.getAllByText((_, element) =>
      element?.textContent?.includes('Downgrade to Starter scheduled for 1 Mar 2025') ?? false
    );
    expect(downgradeBadges.length).toBeGreaterThan(0);
  });
});

describe('SeatWarningBanner', () => {
  it('displays over-limit messaging and call to action', () => {
    renderWithProviders(
      <SeatWarningBanner
        seatsActive={15}
        seatsTotal={10}
        tier="professional"
        pendingDowngrade={{ tier: 'starter', effectiveDate: currentPeriodEnd }}
        cancelAtPeriodEnd={false}
      />
    );

    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/Add 5 seats/)).toBeInTheDocument();
    const warningMessages = screen.getAllByText((_, element) =>
      element?.textContent?.includes('Downgrade to Starter scheduled for 1 Mar 2025') ?? false
    );
    expect(warningMessages.length).toBeGreaterThan(0);
  });
});

describe('SeatManagement', () => {
  it('renders seat usage metrics and manage billing button', () => {
    const onAdjustSeats = vi.fn();

    renderWithProviders(
      <SeatManagement
        seatsIncluded={5}
        seatsTotal={7}
        seatsActive={6}
        seatsAvailable={1}
        maxSeats={19}
        tierName="Starter"
        isAtSeatCap={false}
        onAdjustSeats={onAdjustSeats}
        manageBillingAction={
          <form data-testid="portal-form">
            <input type="hidden" name="intent" value="manageBilling" />
            <button type="submit">Manage Billing</button>
          </form>
        }
      />
    );

    expect(screen.getByText(/Seat usage/)).toBeInTheDocument();
    expect(screen.getByText(/6 active/)).toBeInTheDocument();
    expect(screen.getByText(/Manage Billing/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Seats'));
    expect(onAdjustSeats).toHaveBeenCalledWith('add');
  });

  it('disables add seats button when at seat cap', () => {
    const onAdjustSeats = vi.fn();

    renderWithProviders(
      <SeatManagement
        seatsIncluded={20}
        seatsTotal={40}
        seatsActive={38}
        seatsAvailable={0}
        maxSeats={40}
        tierName="Professional"
        isAtSeatCap={true}
        onAdjustSeats={onAdjustSeats}
        manageBillingAction={<button disabled>Manage Billing</button>}
      />
    );

    const addSeatsButton = screen.getByRole('button', { name: /seat limit reached/i });
    expect(addSeatsButton).toBeDisabled();
    fireEvent.click(addSeatsButton);
    expect(onAdjustSeats).not.toHaveBeenCalled();
  });

  it('invokes remove callback when seats can be reduced', () => {
    const onAdjustSeats = vi.fn();

    renderWithProviders(
      <SeatManagement
        seatsIncluded={5}
        seatsTotal={8}
        seatsActive={5}
        seatsAvailable={3}
        maxSeats={19}
        tierName="Starter"
        isAtSeatCap={false}
        onAdjustSeats={onAdjustSeats}
        manageBillingAction={<button>Manage Billing</button>}
      />
    );

    fireEvent.click(screen.getByText('Remove Seats'));
    expect(onAdjustSeats).toHaveBeenCalledWith('remove');
  });

  it('disables remove seats button when at minimum allocation', () => {
    const onAdjustSeats = vi.fn();

    renderWithProviders(
      <SeatManagement
        seatsIncluded={5}
        seatsTotal={5}
        seatsActive={5}
        seatsAvailable={0}
        maxSeats={19}
        tierName="Starter"
        isAtSeatCap={false}
        onAdjustSeats={onAdjustSeats}
        manageBillingAction={<button>Manage Billing</button>}
      />
    );

    const removeButton = screen.getByText('Remove Seats');
    expect(removeButton).toBeDisabled();
    fireEvent.click(removeButton);
    expect(onAdjustSeats).not.toHaveBeenCalled();
    expect(screen.getByText(/All seats are included in your plan/)).toBeInTheDocument();
  });
});
