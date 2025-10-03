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

import { useEffect, useMemo, useState } from 'react';
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
};

type SeatPreview = {
  immediateAmount: number;
  currency: string;
  seatsAfter: number;
  additionalSeatsAfter: number;
  prorationLines: SeatPreviewLine[];
  upcomingLines: SeatPreviewLine[];
};

type SeatActionResponse =
  | {
      intent: 'previewSeats';
      ok: true;
      preview: SeatPreview;
    }
  | {
      intent: 'previewSeats';
      ok: false;
      error: string;
    }
  | {
      intent: 'addSeats';
      ok: true;
      seatsAdded: number;
      newSeatTotal: number;
    }
  | {
      intent: 'addSeats';
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
 * Retrieve upcoming invoice to preview proration for seat additions.
 */
async function previewSeatAddition(options: {
  subscriptionId: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingInterval: 'monthly' | 'annual';
  currentAdditionalSeats: number;
  seatsToAdd: number;
}) {
  const { subscriptionId, tier, billingInterval, currentAdditionalSeats, seatsToAdd } = options;

  const { subscription, updateItems } = await buildSubscriptionItemPayload({
    subscriptionId,
    tier,
    billingInterval,
    additionalSeatQuantity: currentAdditionalSeats + seatsToAdd,
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
    seatsAfter: TIER_CONFIG[tier].seats.included + currentAdditionalSeats + seatsToAdd,
    additionalSeatsAfter: currentAdditionalSeats + seatsToAdd,
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
      };
    });

  preview.prorationLines = normalizedLines.filter(line => line.isProration);
  preview.upcomingLines = normalizedLines.filter(line => !line.isProration);
  preview.immediateAmount = preview.prorationLines.reduce((sum, line) => sum + line.amount, 0);

  return preview;
}

/**
 * Apply seat addition by updating the Stripe subscription.
 */
async function addSeats(options: {
  subscriptionId: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingInterval: 'monthly' | 'annual';
  currentAdditionalSeats: number;
  seatsToAdd: number;
}) {
  const { subscriptionId, tier, billingInterval, currentAdditionalSeats, seatsToAdd } = options;

  const { updateItems } = await buildSubscriptionItemPayload({
    subscriptionId,
    tier,
    billingInterval,
    additionalSeatQuantity: currentAdditionalSeats + seatsToAdd,
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
    if (intent === 'previewSeats') {
      return data<SeatActionResponse>({
        intent: 'previewSeats',
        ok: false,
        error: 'No active subscription found. Upgrade to a paid plan to add seats.',
      });
    }

    if (intent === 'addSeats') {
      return data<SeatActionResponse>({
        intent: 'addSeats',
        ok: false,
        error: 'Cannot add seats without an active subscription.',
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

    case 'previewSeats': {
      const seatsToAdd = Number(formData.get('seatsToAdd') || 0);

      if (!Number.isInteger(seatsToAdd) || seatsToAdd <= 0) {
        return data<SeatActionResponse>({
          intent: 'previewSeats',
          ok: false,
          error: 'Enter a valid number of seats to add.',
        });
      }

      if (subscription.tier === 'free') {
        return data<SeatActionResponse>({
          intent: 'previewSeats',
          ok: false,
          error: 'Seat management requires a paid subscription.',
        });
      }

      const tierConfig = TIER_CONFIG[subscription.tier as Exclude<SubscriptionTier, 'free'>];
      const seatsAfter = subscription.seatsTotal + seatsToAdd;

      if (seatsAfter > tierConfig.seats.max) {
        return data<SeatActionResponse>({
          intent: 'previewSeats',
          ok: false,
          error: `Cannot exceed ${tierConfig.seats.max} seats on the ${tierConfig.name} plan.`,
        });
      }

      const currentAdditionalSeats = Math.max(0, subscription.seatsTotal - subscription.seatsIncluded);

      try {
        const preview = await previewSeatAddition({
          subscriptionId: subscription.stripeSubscriptionId,
          tier: subscription.tier as Exclude<SubscriptionTier, 'free'>,
          billingInterval: subscription.billingInterval as 'monthly' | 'annual',
          currentAdditionalSeats,
          seatsToAdd,
        });

        return data<SeatActionResponse>({
          intent: 'previewSeats',
          ok: true,
          preview,
        });
      } catch (error) {
        return data<SeatActionResponse>({
          intent: 'previewSeats',
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to preview invoice',
        });
      }
    }

    case 'addSeats': {
      const seatsToAdd = Number(formData.get('seatsToAdd') || 0);

      if (!Number.isInteger(seatsToAdd) || seatsToAdd <= 0) {
        return data<SeatActionResponse>({
          intent: 'addSeats',
          ok: false,
          error: 'Enter a valid number of seats to add.',
        });
      }

      if (subscription.tier === 'free') {
        return data<SeatActionResponse>({
          intent: 'addSeats',
          ok: false,
          error: 'Seat management requires a paid subscription.',
        });
      }

      const tierConfig = TIER_CONFIG[subscription.tier as Exclude<SubscriptionTier, 'free'>];
      const seatsAfter = subscription.seatsTotal + seatsToAdd;

      if (seatsAfter > tierConfig.seats.max) {
        return data<SeatActionResponse>({
          intent: 'addSeats',
          ok: false,
          error: `Cannot exceed ${tierConfig.seats.max} seats on the ${tierConfig.name} plan.`,
        });
      }

      const currentAdditionalSeats = Math.max(0, subscription.seatsTotal - subscription.seatsIncluded);

      try {
        await addSeats({
          subscriptionId: subscription.stripeSubscriptionId,
          tier: subscription.tier as Exclude<SubscriptionTier, 'free'>,
          billingInterval: subscription.billingInterval as 'monthly' | 'annual',
          currentAdditionalSeats,
          seatsToAdd,
        });

        await convexServer.mutation(api.subscriptions.updateSeats, {
          subscriptionId: subscription._id,
          seatsTotal: seatsAfter,
        });

        return data<SeatActionResponse>({
          intent: 'addSeats',
          ok: true,
          seatsAdded: seatsToAdd,
          newSeatTotal: seatsAfter,
        });
      } catch (error) {
        return data<SeatActionResponse>({
          intent: 'addSeats',
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to add seats. Please try again.',
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
  const addSeatsFetcher = useSeatActionFetcher();
  const revalidator = useRevalidator();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastPreviewSeats, setLastPreviewSeats] = useState<number | null>(null);

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
    previewFetcher.data?.intent === 'previewSeats' && previewFetcher.data.ok
      ? previewFetcher.data.preview
      : null;

  const chargeSummary = useMemo(() => {
    if (!previewResult) {
      return {
        chargeLines: [] as SeatPreviewLine[],
        creditLines: [] as SeatPreviewLine[],
        chargesTotal: 0,
        creditsTotal: 0,
        immediateTotal: 0,
      };
    }

    const chargeLines = previewResult.prorationLines.filter(line => line.amount > 0);
    const creditLines = previewResult.prorationLines.filter(line => line.amount < 0);
    const chargesTotal = chargeLines.reduce((sum, line) => sum + line.amount, 0);
    const creditsTotal = creditLines.reduce((sum, line) => sum + line.amount, 0);
    const immediateTotal = previewResult.immediateAmount ?? chargesTotal + creditsTotal;

    return {
      chargeLines,
      creditLines,
      chargesTotal,
      creditsTotal,
      immediateTotal,
    };
  }, [previewResult]);

  const formatSignedAmount = (amountInPence: number) => {
    const absolute = Math.abs(amountInPence);
    const formatted = formatPrice(absolute);
    if (amountInPence < 0) {
      return formatted.replace('£', '-£');
    }
    return formatted;
  };

  useEffect(() => {
    if (!isModalOpen) return;
    if (!subscription || subscription.tier === 'free') return;
    if (!Number.isInteger(seatsToAdd) || seatsToAdd <= 0) return;
    if (previewFetcher.state !== 'idle') return;

    const alreadyHasPreview =
      lastPreviewSeats === seatsToAdd && previewFetcher.data?.intent === 'previewSeats';

    if (alreadyHasPreview && previewFetcher.data?.ok) {
      return;
    }

    setLastPreviewSeats(seatsToAdd);
    previewFetcher.submit(
      { intent: 'previewSeats', seatsToAdd: seatsToAdd.toString() },
      { method: 'post', action: '/settings/billing' }
    );
  }, [isModalOpen, seatsToAdd, subscription, previewFetcher.state, previewFetcher.data, previewFetcher, lastPreviewSeats]);

  useEffect(() => {
    if (addSeatsFetcher.data?.intent === 'addSeats' && addSeatsFetcher.data.ok) {
      setSuccessMessage(
        `Successfully added ${addSeatsFetcher.data.seatsAdded} seat${
          addSeatsFetcher.data.seatsAdded === 1 ? '' : 's'
        }.`
      );
      setIsModalOpen(false);
      setLastPreviewSeats(null);
      revalidator.revalidate();
    }
  }, [addSeatsFetcher.data, revalidator]);

  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  const planSeats = TIER_CONFIG[currentTier].seats;
  const maxSeats = planSeats.max;
  const isAtSeatCap = subscription ? subscription.seatsTotal >= planSeats.max : true;

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
              seatsIncluded={subscription?.seatsIncluded ?? TIER_CONFIG.free.seats.included}
              seatsTotal={subscription?.seatsTotal ?? TIER_CONFIG.free.seats.included}
              seatsActive={subscription?.seatsActive ?? 0}
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
              onAddSeats={() => {
                setIsModalOpen(true);
                setSeatsToAdd(1);
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
                <h2 className="text-lg font-semibold text-gray-900">Add Seats</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Seats remaining this plan: {tierConfig ? tierConfig.seats.max - subscription.seatsTotal : 0}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="seatsToAdd">
                  Seats to add
                </label>
                <input
                  id="seatsToAdd"
                  type="number"
                  min={1}
                  max={tierConfig ? tierConfig.seats.max - subscription.seatsTotal : undefined}
                  value={seatsToAdd}
                  onChange={event => setSeatsToAdd(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Current: {subscription.seatsActive} active users / {subscription.seatsTotal} seats
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {previewFetcher.state === 'submitting' ? (
                  <p className="text-sm text-gray-600">Calculating proration…</p>
                ) : previewFetcher.data?.intent === 'previewSeats' && previewFetcher.data?.ok ? (
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total today</p>
                          <p className="text-xs text-gray-500">
                            {chargeSummary.immediateTotal >= 0
                              ? 'Charged immediately on the card on file'
                              : 'Credit applied immediately to your balance'}
                          </p>
                        </div>
                        <p
                          className={`text-lg font-semibold ${
                            chargeSummary.immediateTotal >= 0 ? 'text-gray-900' : 'text-emerald-600'
                          }`}
                        >
                          {formatSignedAmount(chargeSummary.immediateTotal)}
                        </p>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Seats after update: {previewResult?.seatsAfter ?? 0} total • Paid seats:{' '}
                        {previewResult?.additionalSeatsAfter ?? 0}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Charges for additional seats</span>
                        <span>{formatPrice(chargeSummary.chargesTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Credits for seats already paid</span>
                        <span>{formatSignedAmount(chargeSummary.creditsTotal)}</span>
                      </div>
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
                ) : previewFetcher.data?.intent === 'previewSeats' && !previewFetcher.data?.ok ? (
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
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>

              <addSeatsFetcher.Form method="post">
                <input type="hidden" name="intent" value="addSeats" />
                <input type="hidden" name="seatsToAdd" value={seatsToAdd} />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  disabled={
                    addSeatsFetcher.state !== 'idle' ||
                    seatsToAdd <= 0 ||
                    (tierConfig ? subscription.seatsTotal + seatsToAdd > tierConfig.seats.max : false)
                  }
                >
                  {addSeatsFetcher.state === 'submitting' ? 'Adding…' : 'Confirm & Add'}
                </button>
              </addSeatsFetcher.Form>
            </div>

            {addSeatsFetcher.data?.intent === 'addSeats' && !addSeatsFetcher.data.ok ? (
              <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600">
                {addSeatsFetcher.data.error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
