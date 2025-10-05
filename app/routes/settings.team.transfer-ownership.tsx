import { Form, data, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/settings.team.transfer-ownership';
import {
  getOrganizationMembershipForUser,
  requireRole,
  updateOrganizationMembershipRole,
} from '~/lib/auth.server';
import { getSession, commitSession } from '~/lib/session.server';
import { ROLES, getRoleName } from '~/lib/permissions';
import type { Role } from '~/lib/permissions';
import { convexServer } from '../../lib/convex.server';
import { api } from '../../convex/_generated/api';
import { stripe } from '~/lib/stripe.server';
import { logError } from '~/lib/logger';

interface LoaderMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: number;
  workosUserId: string;
}

interface LoaderData {
  currentOwnerId: string;
  organizationId: string;
  eligibleAdmins: LoaderMember[];
}

interface ActionError {
  ok: false;
  error: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, [ROLES.OWNER]);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  const members = (await convexServer.query(api.users.getTeamMembers, {
    organizationId: user.organizationId,
    includeInactive: false,
  })) as Array<{
    _id: string;
    name: string;
    email: string;
    role?: string;
    createdAt: number;
    workosUserId: string;
    isActive: boolean;
  }>;

  const eligibleAdmins = members
    .filter(
      member => member.isActive && member.role === ROLES.ADMIN && member.workosUserId !== user.id
    )
    .map(member => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: ROLES.ADMIN,
      joinedAt: member.createdAt,
      workosUserId: member.workosUserId,
    }))
    .sort((a, b) => a.joinedAt - b.joinedAt);

  return data<LoaderData>({
    currentOwnerId: user.id,
    organizationId: user.organizationId,
    eligibleAdmins,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, [ROLES.OWNER]);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  const formData = await request.formData();
  const selectedAdmin = formData.get('targetWorkosUserId');

  if (typeof selectedAdmin !== 'string' || selectedAdmin.length === 0) {
    return data<ActionError>(
      { ok: false, error: 'Choose an admin to transfer ownership to.' },
      {
        status: 400,
      }
    );
  }

  if (selectedAdmin === user.id) {
    return data<ActionError>(
      {
        ok: false,
        error: 'You cannot transfer ownership to yourself.',
      },
      {
        status: 400,
      }
    );
  }

  const adminUser = await convexServer.query(api.users.getUserByWorkosId, {
    workosUserId: selectedAdmin,
  });

  if (!adminUser || adminUser.organizationId !== user.organizationId) {
    return data<ActionError>(
      {
        ok: false,
        error: 'Selected user is not part of your organization.',
      },
      {
        status: 400,
      }
    );
  }

  if (!adminUser.isActive) {
    return data<ActionError>(
      {
        ok: false,
        error: 'Selected user is not active. Reactivate them before transferring ownership.',
      },
      {
        status: 400,
      }
    );
  }

  if (adminUser.role !== ROLES.ADMIN) {
    return data<ActionError>(
      {
        ok: false,
        error: 'Ownership can only be transferred to an active admin.',
      },
      {
        status: 400,
      }
    );
  }

  const [currentMembership, targetMembership] = await Promise.all([
    getOrganizationMembershipForUser(user.organizationId, user.id),
    getOrganizationMembershipForUser(user.organizationId, selectedAdmin),
  ]);

  if (!currentMembership || currentMembership.role?.slug !== ROLES.OWNER) {
    return data<ActionError>(
      {
        ok: false,
        error: 'Your WorkOS membership does not list you as the owner. Please resync roles.',
      },
      {
        status: 409,
      }
    );
  }

  if (!targetMembership || targetMembership.role?.slug !== ROLES.ADMIN) {
    return data<ActionError>(
      {
        ok: false,
        error: 'Selected user is not an admin in WorkOS. Refresh the team list and try again.',
      },
      {
        status: 409,
      }
    );
  }

  await updateOrganizationMembershipRole(targetMembership.id, ROLES.OWNER);
  await updateOrganizationMembershipRole(currentMembership.id, ROLES.ADMIN);

  await Promise.all([
    convexServer.mutation(api.users.updateUserRole, {
      workosUserId: selectedAdmin,
      role: ROLES.OWNER,
    }),
    convexServer.mutation(api.users.updateUserRole, {
      workosUserId: user.id,
      role: ROLES.ADMIN,
    }),
  ]);

  const adminUserName = (adminUser.name as string | null | undefined) || adminUser.email;

  const billingEmailUpdated = await updateBillingEmailIfNeeded({
    organizationId: user.organizationId,
    previousOwnerEmail: user.email,
    newOwnerEmail: adminUser.email,
    newOwnerName: adminUserName,
  });

  await Promise.all([
    logOwnershipTransferEvent({
      organizationId: user.organizationId,
      performedBy: user.id,
      previousOwner: {
        id: user.id,
        email: user.email,
      },
      newOwner: {
        id: selectedAdmin,
        email: adminUser.email,
        name: adminUserName,
      },
      billingEmailUpdated,
      request,
    }),
    sendOwnershipTransferEmails({
      previousOwnerEmail: user.email,
      newOwnerEmail: adminUser.email,
      newOwnerName: adminUserName,
    }),
  ]);

  const session = await getSession(request);
  session.set('role', ROLES.ADMIN);

  return redirect('/settings/team?transfer=success', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface OwnershipTransferLogOptions {
  organizationId: string;
  performedBy: string;
  previousOwner: {
    id: string;
    email?: string;
  };
  newOwner: {
    id: string;
    email?: string;
    name?: string | null;
  };
  billingEmailUpdated: boolean;
  request: Request;
}

async function logOwnershipTransferEvent(options: OwnershipTransferLogOptions) {
  try {
    const { organizationId, performedBy, previousOwner, newOwner, billingEmailUpdated, request } =
      options;

    const forwardedFor = request.headers.get('x-forwarded-for') || undefined;
    const ipAddress =
      forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    await convexServer.mutation(api.auditLog.create, {
      organizationId,
      userId: performedBy,
      action: 'ownership_transferred',
      targetType: 'organization',
      targetId: organizationId,
      changes: {
        previousOwner: {
          id: previousOwner.id,
          role: {
            before: ROLES.OWNER,
            after: ROLES.ADMIN,
          },
        },
        newOwner: {
          id: newOwner.id,
          role: {
            before: ROLES.ADMIN,
            after: ROLES.OWNER,
          },
        },
      },
      metadata: {
        previousOwnerEmail: previousOwner.email,
        newOwnerEmail: newOwner.email,
        newOwnerName: newOwner.name,
        billingEmailUpdated,
      },
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      userAgent,
    });
  } catch (error) {
    logError('Failed to record ownership transfer in audit log', error);
  }
}

interface UpdateBillingEmailOptions {
  organizationId: string;
  previousOwnerEmail?: string | null;
  newOwnerEmail?: string | null;
  newOwnerName?: string | null;
}

async function updateBillingEmailIfNeeded(options: UpdateBillingEmailOptions): Promise<boolean> {
  const { organizationId, previousOwnerEmail, newOwnerEmail, newOwnerName } = options;

  if (!newOwnerEmail) {
    return false;
  }

  try {
    const subscription = await convexServer.query(api.subscriptions.getByOrganization, {
      organizationId,
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return false;
    }

    const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);

    if ('deleted' in customer && customer.deleted) {
      return false;
    }

    const normalizedPrev = previousOwnerEmail?.toLowerCase() ?? null;
    const currentEmail = customer.email?.toLowerCase() ?? null;
    const normalizedNew = newOwnerEmail.toLowerCase();

    if (currentEmail && normalizedPrev && currentEmail !== normalizedPrev) {
      return false;
    }

    if (currentEmail === normalizedNew) {
      return false;
    }

    await stripe.customers.update(subscription.stripeCustomerId, {
      email: newOwnerEmail,
      name: newOwnerName ?? undefined,
    });

    return true;
  } catch (error) {
    logError('Failed to update billing email after ownership transfer', error);
    return false;
  }
}

interface OwnershipTransferEmailOptions {
  previousOwnerEmail?: string | null;
  newOwnerEmail?: string | null;
  newOwnerName?: string | null;
}

async function sendOwnershipTransferEmails(options: OwnershipTransferEmailOptions) {
  const { previousOwnerEmail, newOwnerEmail, newOwnerName } = options;

  try {
    const messages: string[] = [];

    if (previousOwnerEmail) {
      messages.push(
        `Ownership transfer confirmation sent to previous owner (${previousOwnerEmail}).`
      );
    }

    if (newOwnerEmail) {
      messages.push(`Ownership transfer confirmation sent to new owner (${newOwnerEmail}).`);
    }

    if (messages.length === 0) {
      return;
    }

    // Placeholder implementation until dedicated email service is added (Phase 13)
    for (const message of messages) {
      // eslint-disable-next-line no-console
      console.info(message, newOwnerName ? { newOwnerName } : undefined);
    }
  } catch (error) {
    logError('Failed to send ownership transfer confirmation emails', error);
  }
}

export default function TransferOwnershipRoute() {
  const { eligibleAdmins } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const hasAdmins = eligibleAdmins.length > 0;

  const errorMessage = actionData && !actionData.ok ? actionData.error : null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Transfer Organization Ownership</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose an active admin to become the new owner. You will be demoted to admin
            automatically once the transfer completes.
          </p>
        </div>

        <div className="px-6 py-6">
          {!hasAdmins ? (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
              <h2 className="text-sm font-semibold text-yellow-800">No eligible admins found</h2>
              <p className="mt-1 text-sm text-yellow-700">
                Invite or promote at least one team member to admin before transferring ownership.
              </p>
            </div>
          ) : (
            <Form method="post" className="space-y-6">
              {errorMessage && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              <fieldset>
                <legend className="text-sm font-medium text-gray-900">Select new owner</legend>
                <div className="mt-4 space-y-4">
                  {eligibleAdmins.map(admin => {
                    const inputId = `transfer-target-${admin.workosUserId}`;

                    return (
                      <label
                        key={admin.workosUserId}
                        htmlFor={inputId}
                        aria-label={admin.name || admin.email}
                        className="relative flex items-center space-x-4 border border-gray-200 rounded-lg p-4 hover:border-indigo-400 focus-within:border-indigo-500"
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="targetWorkosUserId"
                          value={admin.workosUserId}
                          className="h-4 w-4 text-indigo-600 border-gray-300"
                          required
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {admin.name || admin.email}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 uppercase">
                              {getRoleName(admin.role)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Joined {formatDate(admin.joinedAt)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="rounded-md bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                The transfer will update roles in WorkOS and Convex instantly. You will lose owner
                permissions as soon as it completes.
              </div>

              <div className="flex justify-end space-x-3">
                <a
                  href="/settings/team"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {isSubmitting ? 'Transferring…' : 'Transfer Ownership'}
                </button>
              </div>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
