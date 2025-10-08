import * as stripeProvider from '~/lib/stripe.server';
import {
  getUser,
  requireUser,
  requireRole,
  requireTier,
  createOrganization,
  createOrganizationMembership,
  inviteOrAddUserToOrganization,
  inviteUserToOrganization,
  deactivateOrganizationMembership,
  reactivateOrganizationMembership,
  updateOrganizationMembershipRole,
  getOrganizationMembershipForUser,
  listOrganizations,
  syncUserRoleFromWorkOS,
} from '~/lib/auth.server';
import { convexServer, createOrUpdateUserInConvex } from '../../lib/convex.server';
import { hasRole, getRoleName, ROLES, hasTierAccess } from '~/lib/permissions';

export const billingService = {
  client: stripeProvider.stripe,
  createCheckoutSession: stripeProvider.createCheckoutSession,
  createBillingPortalSession: stripeProvider.createBillingPortalSession,
  createStripeCustomer: stripeProvider.createStripeCustomer,
  getStripeCustomer: stripeProvider.getStripeCustomer,
  getStripeSubscription: stripeProvider.getStripeSubscription,
  updateStripeSubscription: stripeProvider.updateStripeSubscription,
  settleSubscriptionInvoice: stripeProvider.settleSubscriptionInvoice,
  getStripePriceId: stripeProvider.getStripePriceId,
  getAdditionalSeatPriceId: stripeProvider.getAdditionalSeatPriceId,
  getPublishableKeyPreview: stripeProvider.getPublishableKeyPreview,
  getStripeMode: stripeProvider.getStripeMode,
  getTierFromPriceId: stripeProvider.getTierFromPriceId,
  verifyWebhookSignature: stripeProvider.verifyWebhookSignature,
};

export const rbacService = {
  getUser,
  requireUser,
  requireRole,
  requireTier,
  createOrganization,
  createOrganizationMembership,
  inviteOrAddUserToOrganization,
  inviteUserToOrganization,
  deactivateOrganizationMembership,
  reactivateOrganizationMembership,
  updateOrganizationMembershipRole,
  getOrganizationMembershipForUser,
  listOrganizations,
  syncUserRoleFromWorkOS,
  hasRole,
  hasTierAccess,
  getRoleName,
  ROLES,
};

export const convexService = {
  client: convexServer,
  createOrUpdateUser: createOrUpdateUserInConvex,
};

export type BillingService = typeof billingService;
export type RbacService = typeof rbacService;
export type ConvexService = typeof convexService;
