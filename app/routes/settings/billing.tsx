/**
 * Billing Settings Route
 *
 * Protected owner/admin dashboard for managing subscription billing:
 * - Displays current plan details and subscription status
 * - Shows seat usage with warnings when over the limit
 * - Provides Stripe Customer Portal access ("Manage Billing")
 * - Supports adding seats with Stripe invoice preview before confirmation
 * - Lists recent billing history events for transparency
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useFetcher,
  useLoaderData,
  useRevalidator,
  type FetcherWithComponents,
} from 'react-router';
import type { Route } from './+types/billing';
import { data, redirect } from 'react-router';
import { requireRole } from '~/lib/auth.server';
import { TIER_CONFIG, formatPrice } from '~/lib/billing-constants';
import type { AccessStatus, SubscriptionTier } from '~/types/billing';
import { convexServer } from '../../../lib/convex.server';
import { api } from '../../../convex/_generated/api';
import {
  createBillingPortalSession,
  getAdditionalSeatPriceId,
  getStripePriceId,
  stripe,
} from '~/lib/stripe.server';
import type Stripe from 'stripe';
import { BillingOverview } from '../../../components/billing/BillingOverview';
import { SeatManagement } from '../../../components/billing/SeatManagement';
import { BillingHistory } from '../../../components/billing/BillingHistory';
import { SeatWarningBanner } from '../../../components/billing/SeatWarningBanner';

interface BillingHistoryRecord {
  _id: string;
  eventType: string;
  description: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: number;
}

type SeatPreviewLine = {
  description: string;
  amount: number;
  currency: string;
  isProration: boolean;
  periodEnd?: number;
  taxes: Stripe.InvoiceLineItem.Tax[];
};

type SeatPreview = {
  immediateAmount: number;
  currency: string;
  seatsAfter: number;
  additionalSeatsAfter: number;
  prorationLines: SeatPreviewLine[];
  upcomingLines: SeatPreviewLine[];
};

type TaxGroupSummary = {
  label: string;
  amount: number;
  percentage?: number;
  reason?: string;
};

type SeatAdjustmentMode = 'add' | 'remove';

type SeatActionResponse =
  | {
      intent: 'previewSeatChange';
      mode: SeatAdjustmentMode;
      ok: true;
      preview: SeatPreview;
    }
  | {
      intent: 'previewSeatChange';
      ok: false;
      error: string;
    }
  | {
      intent: 'applySeatChange';
      mode: SeatAdjustmentMode;
      ok: true;
      seatsChanged: number;
      newSeatTotal: number;
    }
  | {
      intent: 'applySeatChange';
      ok: false;
      error: string;
    };

/**
 * Helper to format timestamps into friendly date strings.
 */
function formatDate(timestamp: number | undefined | null) {
  if (!timestamp) return '—';

  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Fetch Stripe subscription items and build update payload for seat operations.
 */
async function buildSubscriptionItemPayload(options: {
  subscriptionId: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingInterval: 'monthly' | 'annual';
  additionalSeatQuantity: number;
}) {
  const { subscriptionId, tier, billingInterval, additionalSeatQuantity } = options;

  // Retrieve subscription with expanded items so we can match prices.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  const basePriceId = getStripePriceId(tier, billingInterval);
  const additionalSeatPriceId = getAdditionalSeatPriceId();

  const baseItem = subscription.items.data.find(item => item.price?.id === basePriceId);

  if (!baseItem) {
    throw new Error('Unable to locate base plan price on subscription');
  }

  const additionalItem = subscription.items.data.find(item => item.price?.id === additionalSeatPriceId);

  const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [
    {
      id: baseItem.id,
      quantity: baseItem.quantity ?? 1,
    },
  ];

  // When additional seat item exists we update quantity, otherwise create new item.
  if (additionalItem) {
    updateItems.push({
      id: additionalItem.id,
      quantity: additionalSeatQuantity,
    });
  } else {
    updateItems.push({
      price: additionalSeatPriceId,
      quantity: additionalSeatQuantity,
    });
  }

  return { subscription, baseItem, additionalItem, updateItems };
}

/**
 * Retrieve upcoming invoice to preview proration for a seat quantity change.
 */
async function previewSeatQuantityChange(options: {
  subscriptionId: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingInterval: 'monthly' | 'annual';
  targetAdditionalSeats: number;
  seatsIncluded: number;
}) {
  const { subscriptionId, tier, billingInterval, targetAdditionalSeats, seatsIncluded } = options;

  const { subscription, updateItems } = await buildSubscriptionItemPayload({
    subscriptionId,
    tier,
    billingInterval,
    additionalSeatQuantity: targetAdditionalSeats,
  });

  const subscriptionItems = updateItems.map(item =>
    'id' in item
      ? {
          id: item.id,
          quantity: item.quantity,
        }
      : {
          price: item.price,
          quantity: item.quantity,
        }
  );

  const invoice = await stripe.invoices.createPreview({
    customer:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    subscription: subscriptionId,
    subscription_details: {
      items: subscriptionItems,
      proration_behavior: 'create_prorations',
    },
  });

  const preview: SeatPreview = {
    immediateAmount: 0,
    currency: invoice.currency ?? 'gbp',
    seatsAfter: seatsIncluded + targetAdditionalSeats,
    additionalSeatsAfter: targetAdditionalSeats,
    prorationLines: [],
    upcomingLines: [],
  };

  const normalizedLines = invoice.lines.data.map((line: Stripe.InvoiceLineItem) => {
      const isProration = Boolean(
        line.parent?.subscription_item_details?.proration || line.parent?.invoice_item_details?.proration
      );

      return {
        description: line.description ?? 'Billing item',
        amount: line.amount ?? 0,
        currency: line.currency ?? invoice.currency ?? 'gbp',
        isProration,
        periodEnd: line.period?.end,
        taxes: line.taxes ?? [],
      };
    });

  preview.prorationLines = normalizedLines.filter(line => line.isProration);
  preview.upcomingLines = normalizedLines.filter(line => !line.isProration);
  preview.immediateAmount = preview.prorationLines.reduce((sum, line) => sum + line.amount, 0);

  return preview;
}

/**
 * Apply seat quantity change by updating the Stripe subscription.
 */
async function applySeatQuantityChange(options: {
  subscriptionId: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingInterval: 'monthly' | 'annual';
  targetAdditionalSeats: number;
}) {
  const { subscriptionId, tier, billingInterval, targetAdditionalSeats } = options;

  const { updateItems } = await buildSubscriptionItemPayload({
    subscriptionId,
    tier,
    billingInterval,
    additionalSeatQuantity: targetAdditionalSeats,
  });

  await stripe.subscriptions.update(subscriptionId, {
    items: updateItems,
    proration_behavior: 'create_prorations',
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, ['owner', 'admin']);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  const [subscription, stats, billingHistory] = await Promise.all([
    convexServer.query(api.subscriptions.getByOrganization, {
      organizationId: user.organizationId,
    }),
    convexServer.query(api.subscriptions.getStats, {
      organizationId: user.organizationId,
    }),
    convexServer.query(api.billingHistory.getByOrganization, {
      organizationId: user.organizationId,
      limit: 25,
    }),
  ]);

  return data({
    user,
    subscription,
    stats,
    billingHistory: billingHistory ?? [],
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, ['owner', 'admin']);

  if (!user.organizationId) {
    return data({ intent: 'error', error: 'Organization required' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
    organizationId: user.organizationId,
  });

  if (!subscription) {
    if (intent === 'previewSeatChange') {
      return data<SeatActionResponse>({
        intent: 'previewSeatChange',
        ok: false,
        error: 'No active subscription found. Upgrade to a paid plan to manage seats.',
      });
    }

    if (intent === 'applySeatChange') {
      return data<SeatActionResponse>({
        intent: 'applySeatChange',
        ok: false,
        error: 'Cannot manage seats without an active subscription.',
      });
    }

    return data({ intent: 'error', error: 'Subscription not found' }, { status: 404 });
  }

  switch (intent) {
    case 'manageBilling': {
      if (!subscription.stripeCustomerId) {
        return data({ intent: 'error', error: 'Stripe customer not found' }, { status: 400 });
      }

      const origin = new URL(request.url).origin;
      const portalSession = await createBillingPortalSession(
        subscription.stripeCustomerId,
        `${origin}/settings/billing`
      );

      if (!portalSession.url) {
        return data({ intent: 'error', error: 'Unable to create billing portal session' }, { status: 500 });
      }

      throw redirect(portalSession.url);
    }

    case 'previewSeatChange': {
      const mode = (formData.get('mode') as SeatAdjustmentMode) ?? 'add';
      const seatsRequested = Number(formData.get('seats') || 0);

      if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: 'Enter a valid number of seats.',
        });
      }

      if (subscription.tier === 'free') {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: 'Seat management requires a paid subscription.',
        });
      }

      const tierConfig = TIER_CONFIG[subscription.tier as Exclude<SubscriptionTier, 'free'>];
      const currentAdditionalSeats = Math.max(0, subscription.seatsTotal - subscription.seatsIncluded);
      const currentTotalSeats = subscription.seatsTotal;
      const seatsActive = subscription.seatsActive ?? 0;
      const minTotalSeats = Math.max(subscription.seatsIncluded, seatsActive);

      const targetAdditionalSeats =
        mode === 'add' ? currentAdditionalSeats + seatsRequested : currentAdditionalSeats - seatsRequested;
      const targetTotalSeats = subscription.seatsIncluded + targetAdditionalSeats;

      if (targetAdditionalSeats < 0 || targetTotalSeats < minTotalSeats) {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: 'Cannot reduce seats below your included allocation or active users.',
        });
      }

      if (targetTotalSeats > tierConfig.seats.max) {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: `Cannot exceed ${tierConfig.seats.max} seats on the ${tierConfig.name} plan.`,
        });
      }

      if (mode === 'remove' && targetTotalSeats === currentTotalSeats) {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: 'No change in seats requested.',
        });
      }

      try {
        const preview = await previewSeatQuantityChange({
          subscriptionId: subscription.stripeSubscriptionId,
          tier: subscription.tier as Exclude<SubscriptionTier, 'free'>,
          billingInterval: subscription.billingInterval as 'monthly' | 'annual',
          targetAdditionalSeats,
          seatsIncluded: subscription.seatsIncluded,
        });

        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          mode,
          ok: true,
          preview,
        });
      } catch (error) {
        return data<SeatActionResponse>({
          intent: 'previewSeatChange',
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to preview invoice',
        });
      }
    }

    case 'applySeatChange': {
      const mode = (formData.get('mode') as SeatAdjustmentMode) ?? 'add';
      const seatsRequested = Number(formData.get('seats') || 0);

      if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          ok: false,
          error: 'Enter a valid number of seats.',
        });
      }

      if (subscription.tier === 'free') {
        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          ok: false,
          error: 'Seat management requires a paid subscription.',
        });
      }

      const tierConfig = TIER_CONFIG[subscription.tier as Exclude<SubscriptionTier, 'free'>];
      const currentAdditionalSeats = Math.max(0, subscription.seatsTotal - subscription.seatsIncluded);
      const seatsActive = subscription.seatsActive ?? 0;
      const minTotalSeats = Math.max(subscription.seatsIncluded, seatsActive);
      const targetAdditionalSeats =
        mode === 'add' ? currentAdditionalSeats + seatsRequested : currentAdditionalSeats - seatsRequested;
      const targetTotalSeats = subscription.seatsIncluded + targetAdditionalSeats;

      if (targetAdditionalSeats < 0 || targetTotalSeats < minTotalSeats) {
        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          ok: false,
          error: 'Cannot reduce seats below your included allocation or active users.',
        });
      }

      if (targetTotalSeats > tierConfig.seats.max) {
        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          ok: false,
          error: `Cannot exceed ${tierConfig.seats.max} seats on the ${tierConfig.name} plan.`,
        });
      }

      try {
        await applySeatQuantityChange({
          subscriptionId: subscription.stripeSubscriptionId,
          tier: subscription.tier as Exclude<SubscriptionTier, 'free'>,
          billingInterval: subscription.billingInterval as 'monthly' | 'annual',
          targetAdditionalSeats,
        });

        await convexServer.mutation(api.subscriptions.updateSeats, {
          subscriptionId: subscription._id,
          seatsTotal: targetTotalSeats,
        });

        const seatsChanged = seatsRequested;

        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          mode,
          ok: true,
          seatsChanged,
          newSeatTotal: targetTotalSeats,
        });
      } catch (error) {
        return data<SeatActionResponse>({
          intent: 'applySeatChange',
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to update seats. Please try again.',
        });
      }
    }

    default:
      return data({ intent: 'error', error: 'Unsupported action' }, { status: 400 });
  }
}

function useSeatActionFetcher(): FetcherWithComponents<SeatActionResponse> {
  return useFetcher<SeatActionResponse>();
}

export default function BillingSettings() {
  const { subscription, stats, billingHistory } = useLoaderData<typeof loader>();
  const manageBillingFetcher = useFetcher();
  const previewFetcher = useSeatActionFetcher();
  const applySeatFetcher = useSeatActionFetcher();
  const revalidator = useRevalidator();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seatMode, setSeatMode] = useState<SeatAdjustmentMode>('add');
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastPreviewRequest, setLastPreviewRequest] = useState<{ mode: SeatAdjustmentMode; seats: number } | null>(null);

  const tierConfig = useMemo(() => {
    if (subscription?.tier && subscription.tier !== 'free') {
      return TIER_CONFIG[subscription.tier as Exclude<SubscriptionTier, 'free'>];
    }
    return null;
  }, [subscription?.tier]);

  const currentTier = (subscription?.tier ?? 'free') as SubscriptionTier;
  const currentAccessStatus = (subscription?.accessStatus ?? 'active') as AccessStatus;
  const normalizedPendingDowngrade = subscription?.pendingDowngrade
    ? {
        tier: subscription.pendingDowngrade.tier as SubscriptionTier,
        effectiveDate: subscription.pendingDowngrade.effectiveDate,
      }
    : undefined;

  const currentAdditionalSeats = subscription
    ? Math.max(0, subscription.seatsTotal - subscription.seatsIncluded)
    : 0;

  const seatsAvailable = stats?.seatsAvailable ?? 0;
  const isOverLimit = stats?.isOverLimit ?? false;

  const previewResult =
    previewFetcher.data?.intent === 'previewSeatChange' && previewFetcher.data.ok
      ? previewFetcher.data.preview
      : null;

  const previousSeatTotals = useMemo(() => {
    if (!subscription) {
      return {
        total: TIER_CONFIG.free.seats.max,
        paid: 0,
      };
    }

    return {
      total: subscription.seatsTotal,
      paid: Math.max(0, subscription.seatsTotal - subscription.seatsIncluded),
    };
  }, [subscription]);

  const summarizePreview = useCallback((preview: SeatPreview | null) => {
    if (!preview) {
      return {
        chargeLines: [] as SeatPreviewLine[],
        creditLines: [] as SeatPreviewLine[],
        chargesTotal: 0,
        creditsTotal: 0,
        immediateTotal: 0,
        totalTax: 0,
        hasTaxLines: false,
        taxGroups: {} as Record<string, TaxGroupSummary>,
      };
    }

    const chargeLines = preview.prorationLines.filter(line => line.amount > 0);
    const creditLines = preview.prorationLines.filter(line => line.amount < 0);
    const chargesTotal = chargeLines.reduce((sum, line) => sum + line.amount, 0);
    const creditsTotal = creditLines.reduce((sum, line) => sum + line.amount, 0);
    const immediateTotal = preview.immediateAmount ?? chargesTotal + creditsTotal;
    const totalTax = preview.prorationLines.reduce(
      (sum, line) =>
        sum + (line.taxes ?? []).reduce<number>((innerSum, tax) => innerSum + (tax.amount ?? 0), 0),
      0
    );
    const hasTaxLines = preview.prorationLines.some(line => (line.taxes ?? []).length > 0);
    const taxGroups = preview.prorationLines
      .flatMap(line => (line.taxes ?? []).map(tax => ({ line, tax })))
      .reduce<Record<string, TaxGroupSummary>>(
        (acc, { tax }) => {
          const taxDetails = ((tax.tax_rate_details ?? {}) as unknown) as Record<string, unknown>;
          const displayName = (taxDetails.display_name as string | undefined) ?? 'Tax';
          const percentage =
            typeof taxDetails.percentage === 'number' ? (taxDetails.percentage as number) : undefined;
          const key = displayName;
          if (!acc[key]) {
            acc[key] = {
              label: displayName,
              amount: 0,
              percentage,
              reason: tax.taxability_reason,
            };
          }
          acc[key].amount += tax.amount ?? 0;
          return acc;
        },
        {}
      );

    return {
      chargeLines,
      creditLines,
      chargesTotal,
      creditsTotal,
      immediateTotal,
      totalTax,
      hasTaxLines,
      taxGroups,
    };
  }, []);

  const computeSeatDelta = useCallback(
    (preview: SeatPreview | null) => {
      if (!preview) {
        return null;
      }

      const totalAfter = preview.seatsAfter ?? previousSeatTotals.total;
      const paidAfter = preview.additionalSeatsAfter ?? previousSeatTotals.paid;

      return {
        totalBefore: previousSeatTotals.total,
        totalAfter,
        totalChange: totalAfter - previousSeatTotals.total,
        paidBefore: previousSeatTotals.paid,
        paidAfter,
        paidChange: paidAfter - previousSeatTotals.paid,
      };
    },
    [previousSeatTotals]
  );

  const previewSummary = useMemo(() => summarizePreview(previewResult), [summarizePreview, previewResult]);
  const previewSeatDelta = useMemo(() => computeSeatDelta(previewResult), [computeSeatDelta, previewResult]);
  const taxGroupSummaries = useMemo(
    () => Object.values(previewSummary.taxGroups) as TaxGroupSummary[],
    [previewSummary]
  );

  const formatSignedAmount = (amountInPence: number) => {
    const absolute = Math.abs(amountInPence);
    const formatted = formatPrice(absolute);
    if (amountInPence < 0) {
      return formatted.replace('£', '-£');
    }
    return formatted;
  };

  const seatsIncluded = subscription?.seatsIncluded ?? TIER_CONFIG.free.seats.included;
  const seatsTotal = subscription?.seatsTotal ?? seatsIncluded;
  const seatsActive = subscription?.seatsActive ?? 0;
  const seatsRemovable = subscription
    ? Math.max(0, subscription.seatsTotal - Math.max(subscription.seatsIncluded, seatsActive))
    : 0;

  const seatsAvailableToAdd = subscription && tierConfig ? tierConfig.seats.max - subscription.seatsTotal : 0;

  const seatAdjustmentLimitExceeded = seatMode === 'add'
    ? Boolean(subscription && tierConfig && subscription.seatsTotal + seatsRequested > tierConfig.seats.max)
    : seatsRequested > seatsRemovable;

  const isSeatRequestValid =
    Number.isInteger(seatsRequested) && seatsRequested > 0 && !seatAdjustmentLimitExceeded;

  const seatRequestValidationError = (() => {
    if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
      return 'Enter a valid number of seats.';
    }

    if (seatMode === 'add') {
      if (subscription && tierConfig && subscription.seatsTotal + seatsRequested > tierConfig.seats.max) {
        return `Cannot exceed ${tierConfig.seats.max} seats on the ${tierConfig.name} plan.`;
      }
    } else if (seatsRequested > seatsRemovable) {
      return 'Cannot remove that many seats while users are active.';
    }

    return null;
  })();

  useEffect(() => {
    if (!isModalOpen) return;
    if (!subscription || subscription.tier === 'free') return;
    if (!isSeatRequestValid) return;
    if (previewFetcher.state !== 'idle') return;

    const alreadyHasPreview =
      lastPreviewRequest &&
      lastPreviewRequest.mode === seatMode &&
      lastPreviewRequest.seats === seatsRequested &&
      previewFetcher.data?.intent === 'previewSeatChange' &&
      previewFetcher.data.ok;

    if (alreadyHasPreview) {
      return;
    }

    setLastPreviewRequest({ mode: seatMode, seats: seatsRequested });
    previewFetcher.submit(
      {
        intent: 'previewSeatChange',
        mode: seatMode,
        seats: seatsRequested.toString(),
      },
      { method: 'post', action: '/settings/billing' }
    );
  }, [
    isModalOpen,
    subscription,
    seatMode,
    seatsRequested,
    lastPreviewRequest,
    isSeatRequestValid,
    previewFetcher,
    previewFetcher.state,
    previewFetcher.data,
  ]);

  useEffect(() => {
    if (applySeatFetcher.data?.intent === 'applySeatChange' && applySeatFetcher.data.ok) {
      const action = applySeatFetcher.data.mode === 'remove' ? 'removed' : 'added';
      const seatCount = applySeatFetcher.data.seatsChanged;
      setSuccessMessage(`Successfully ${action} ${seatCount} seat${seatCount === 1 ? '' : 's'}.`);
      setIsModalOpen(false);
      setLastPreviewRequest(null);
      revalidator.revalidate();
    }
  }, [applySeatFetcher.data, revalidator]);

  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  const planSeats = TIER_CONFIG[currentTier].seats;
  const maxSeats = planSeats.max;
  const isAtSeatCap = subscription ? subscription.seatsTotal >= planSeats.max : true;

  const seatModalTitle = seatMode === 'add' ? 'Add Seats' : 'Remove Seats';
  const seatInputLabel = seatMode === 'add' ? 'Seats to add' : 'Seats to remove';
  const seatInputId = seatMode === 'add' ? 'seatsToAdd' : 'seatsToRemove';
  const seatModalSubtext = seatMode === 'add'
    ? `Seats remaining on this plan: ${Math.max(0, seatsAvailableToAdd)}`
    : `Removable seats before reaching your limit: ${seatsRemovable}`;
  const seatInputMax =
    seatMode === 'add'
      ? tierConfig && subscription
        ? Math.max(1, tierConfig.seats.max - subscription.seatsTotal)
        : undefined
      : seatsRemovable || undefined;
  const confirmButtonLabel = seatMode === 'add' ? 'Confirm & Add' : 'Confirm & Remove';
  const confirmButtonSubmittingLabel = seatMode === 'add' ? 'Adding…' : 'Removing…';
  const confirmButtonClasses =
    seatMode === 'add'
      ? 'bg-indigo-600 hover:bg-indigo-700'
      : 'bg-rose-600 hover:bg-rose-700';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-600">
            Manage your subscription, seats, and billing history. Owners and admins can update billing
            details here.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {isOverLimit && subscription ? (
          <SeatWarningBanner
            seatsActive={subscription.seatsActive}
            seatsTotal={subscription.seatsTotal}
            tier={currentTier}
            pendingDowngrade={normalizedPendingDowngrade}
            cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          />
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BillingOverview
              tier={currentTier}
              status={subscription?.status ?? 'active'}
              billingInterval={(subscription?.billingInterval as 'monthly' | 'annual') ?? 'monthly'}
              currentPeriodEnd={subscription?.currentPeriodEnd}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
              accessStatus={currentAccessStatus}
              pendingDowngrade={normalizedPendingDowngrade}
            />

            <BillingHistory
              events={billingHistory.map(event => ({
                id: event._id,
                description: event.description,
                amount: event.amount,
                status: event.status,
                eventType: event.eventType,
                currency: event.currency ?? 'gbp',
                date: formatDate(event.createdAt),
              }))}
            />
          </div>

          <div className="space-y-6">
            <SeatManagement
              seatsIncluded={seatsIncluded}
              seatsTotal={seatsTotal}
              seatsActive={seatsActive}
              seatsAvailable={seatsAvailable}
              maxSeats={maxSeats}
              tierName={TIER_CONFIG[currentTier].name}
              isAtSeatCap={isAtSeatCap}
              manageBillingAction={
                subscription ? (
                  <manageBillingFetcher.Form method="post">
                    <input type="hidden" name="intent" value="manageBilling" />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                      disabled={manageBillingFetcher.state !== 'idle'}
                    >
                      {manageBillingFetcher.state === 'submitting' ? 'Opening…' : 'Manage Billing'}
                    </button>
                  </manageBillingFetcher.Form>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500"
                    disabled
                  >
                    Manage Billing (available on paid plans)
                  </button>
                )
              }
              onAdjustSeats={mode => {
                setSeatMode(mode);
                setSeatsRequested(1);
                setLastPreviewRequest(null);
                setIsModalOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      {isModalOpen && subscription ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{seatModalTitle}</h2>
                <p className="mt-1 text-sm text-gray-600">{seatModalSubtext}</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                onClick={() => {
                  setIsModalOpen(false);
                  setLastPreviewRequest(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor={seatInputId}>
                  {seatInputLabel}
                </label>
                <input
                  id={seatInputId}
                  type="number"
                  min={1}
                  max={seatInputMax}
                  value={Number.isNaN(seatsRequested) ? '' : seatsRequested}
                  onChange={event => {
                    const value = event.target.value;
                    setSeatsRequested(value === '' ? Number.NaN : Number(value));
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Current: {seatsActive} active users / {seatsTotal} seats
                </p>
                {seatRequestValidationError ? (
                  <p className="mt-1 text-xs text-red-600">{seatRequestValidationError}</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {previewFetcher.state === 'submitting' ? (
                  <p className="text-sm text-gray-600">Calculating proration…</p>
                ) : previewFetcher.data?.intent === 'previewSeatChange' && previewFetcher.data?.ok ? (
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total today</p>
                          <p className="text-xs text-gray-500">
                            {previewSummary.immediateTotal >= 0
                              ? 'Charged immediately on the card on file'
                              : 'Credit applied immediately to your balance'}
                          </p>
                        </div>
                        <p
                          className={`text-lg font-semibold ${
                            previewSummary.immediateTotal >= 0 ? 'text-gray-900' : 'text-emerald-600'
                          }`}
                        >
                          {formatSignedAmount(previewSummary.immediateTotal)}
                        </p>
                      </div>
                      {previewSeatDelta ? (
                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                          <p>
                            <span className="font-medium text-gray-700">Seats:</span>{' '}
                            {previewSeatDelta.totalBefore} → {previewSeatDelta.totalAfter}{' '}
                            {(previewSeatDelta.totalChange >= 0 ? '+' : '') + previewSeatDelta.totalChange}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">Paid seats:</span>{' '}
                            {previewSeatDelta.paidBefore} → {previewSeatDelta.paidAfter}{' '}
                            {(previewSeatDelta.paidChange >= 0 ? '+' : '') + previewSeatDelta.paidChange}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Charges for additional seats</span>
                        <span>{formatPrice(previewSummary.chargesTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Credits for seats already paid</span>
                        <span>{formatSignedAmount(previewSummary.creditsTotal)}</span>
                      </div>
                      {previewSummary.hasTaxLines ? (
                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="font-medium text-gray-700">Taxes included in total:</p>
                          {taxGroupSummaries.map(group => (
                            <div key={group.label} className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span>
                                  {group.label}
                                  {group.percentage !== undefined ? ` (${group.percentage}% )` : ''}
                                </span>
                                {group.reason ? (
                                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                    {group.reason.replace(/_/g, ' ')}
                                  </span>
                                ) : null}
                              </span>
                              <span>{formatSignedAmount(group.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Taxes will be calculated at confirmation if applicable.
                        </p>
                      )}
                    </div>

                    <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <summary className="cursor-pointer text-xs font-semibold text-indigo-600">
                        View detailed line items
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {previewResult?.prorationLines.map((line, index) => (
                          <li key={`detail-${line.description}-${index}`} className="flex justify-between">
                            <span>
                              {line.description}{' '}
                              {line.isProration ? (
                                <span className="text-[10px] uppercase tracking-wide text-amber-600">
                                  Prorated
                                </span>
                              ) : null}
                            </span>
                            <span>{formatSignedAmount(line.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>

                    {previewResult?.upcomingLines?.length ? (
                      <div className="border-t border-gray-200 pt-3 text-xs text-gray-500">
                        <p className="font-semibold uppercase tracking-wide text-gray-500">Next invoice</p>
                        <p className="mt-1">
                          These amounts will appear on your next regular Stripe invoice.
                        </p>
                        <ul className="mt-2 space-y-1 text-gray-600">
                          {previewResult.upcomingLines.map((line, index) => (
                            <li key={`upcoming-${line.description}-${index}`} className="flex justify-between">
                              <span>{line.description}</span>
                              <span>{formatPrice(line.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : previewFetcher.data?.intent === 'previewSeatChange' && !previewFetcher.data?.ok ? (
                  <p className="text-sm text-red-600">{previewFetcher.data?.error}</p>
                ) : (
                  <p className="text-sm text-gray-600">Enter the number of seats to preview charges.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                onClick={() => {
                  setIsModalOpen(false);
                  setLastPreviewRequest(null);
                }}
              >
                Cancel
              </button>

              <applySeatFetcher.Form method="post">
                <input type="hidden" name="intent" value="applySeatChange" />
                <input type="hidden" name="mode" value={seatMode} />
                <input type="hidden" name="seats" value={Number.isNaN(seatsRequested) ? '' : seatsRequested} />
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-gray-300 ${confirmButtonClasses}`}
                  disabled={applySeatFetcher.state !== 'idle' || !isSeatRequestValid}
                >
                  {applySeatFetcher.state === 'submitting'
                    ? confirmButtonSubmittingLabel
                    : confirmButtonLabel}
                </button>
              </applySeatFetcher.Form>
            </div>

            {applySeatFetcher.data?.intent === 'applySeatChange' && !applySeatFetcher.data.ok ? (
              <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600">
                {applySeatFetcher.data.error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
