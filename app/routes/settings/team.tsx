import { useEffect, useMemo, useRef, useState } from 'react';
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useRevalidator,
  type FetcherWithComponents,
} from 'react-router';
import type { Route } from './+types/team';
import type { Role } from '~/lib/permissions';
import { getRoleName, ROLES } from '~/lib/permissions';
import type { SubscriptionTier } from '~/types/billing';
import {
  createOrganizationMembership,
  deactivateOrganizationMembership,
  getOrganizationMembershipForUser,
  inviteOrAddUserToOrganization,
  reactivateOrganizationMembership,
  requireRole,
  updateOrganizationMembershipRole,
} from '~/lib/auth.server';
import { logError } from '~/lib/logger';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { convexServer, createOrUpdateUserInConvex } from '../../../lib/convex.server';
import { InviteUserModal } from '../../../components/team/InviteUserModal';
import { TeamTable, type TeamMemberRow } from '../../../components/team/TeamTable';
import { SeatWarningBanner } from '../../../components/billing/SeatWarningBanner';

interface SeatStats {
  hasSubscription: boolean;
  tier: SubscriptionTier;
  seatsIncluded: number;
  seatsTotal: number;
  seatsActive: number;
  seatsAvailable: number;
  isOverLimit: boolean;
  status: string;
  accessStatus: string;
  pendingDowngrade?: {
    tier: SubscriptionTier;
    effectiveDate: number;
  };
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
}

type RawMember = {
  _id: Id<'users'>;
  name: string;
  email: string;
  role?: string;
  isActive: boolean;
  createdAt: number;
  workosUserId: string;
};

interface LoaderData {
  members: TeamMemberRow[];
  seatStats: SeatStats;
  user: {
    id: string;
    role?: string;
    organizationId?: string;
  };
  availableRoles: Role[];
}

interface ActionSuccess {
  ok: true;
  message: string;
  intent: string;
  refresh: boolean;
}

interface ActionError {
  ok: false;
  error: string;
  intent: string;
  refresh: boolean;
}

type ActionResponse = ActionSuccess | ActionError;

type TargetAction = 'invite' | 'deactivate' | 'reactivate' | 'update-role';

function getAvailableRolesForUser(role: string | undefined): Role[] {
  if (role === ROLES.OWNER) {
    return [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.TEAM_MEMBER];
  }

  return [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.TEAM_MEMBER];
}

function successResponse(intent: TargetAction, message: string, refresh: boolean = true) {
  return data<ActionResponse>({ ok: true, intent, message, refresh });
}

function errorResponse(intent: TargetAction, error: string, status = 400) {
  return data<ActionResponse>({ ok: false, intent, error, refresh: false }, { status });
}

function normalizeMembers(rawMembers: RawMember[]): TeamMemberRow[] {
  return rawMembers
    .map(member => ({
      id: member._id as string,
      name: member.name,
      email: member.email,
      role: member.role ?? 'member',
      isActive: member.isActive,
      createdAt: member.createdAt,
      workosUserId: member.workosUserId,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, [ROLES.OWNER, ROLES.ADMIN]);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  const [members, seatStats] = await Promise.all([
    convexServer.query(api.users.getTeamMembers, {
      organizationId: user.organizationId,
      includeInactive: true,
    }),
    convexServer.query(api.subscriptions.getStats, {
      organizationId: user.organizationId,
    }),
  ]);

  return data<LoaderData>({
    members: normalizeMembers((members ?? []) as RawMember[]),
    seatStats: seatStats as SeatStats,
    user,
    availableRoles: getAvailableRolesForUser(user.role),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, [ROLES.OWNER, ROLES.ADMIN]);

  if (!user.organizationId) {
    throw redirect('/auth/create-organization');
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (typeof intent !== 'string') {
    return errorResponse('invite', 'Missing action intent');
  }

  switch (intent as TargetAction) {
    case 'invite': {
      const emailValue = formData.get('email');
      const roleValue = formData.get('role');

      if (typeof emailValue !== 'string' || emailValue.trim().length === 0) {
        return errorResponse('invite', 'Email address is required');
      }

      const normalizedEmail = emailValue.trim().toLowerCase();
      const requestedRole = (typeof roleValue === 'string' ? roleValue : 'member') as Role;
      const availableRoles = getAvailableRolesForUser(user.role);

      if (!availableRoles.includes(requestedRole)) {
        return errorResponse('invite', 'You are not allowed to assign that role');
      }

      try {
        const result = await inviteOrAddUserToOrganization({
          email: normalizedEmail,
          organizationId: user.organizationId,
          roleSlug: requestedRole,
          inviterUserId: user.id,
        });

        if (result.type === 'invited') {
          return successResponse('invite', `Invitation sent to ${normalizedEmail}.`, false);
        }

        if (!result.user) {
          return successResponse('invite', `Processed invitation for ${normalizedEmail}.`, true);
        }

        const existingRecord = await convexServer.query(api.users.getUserByWorkosId, {
          workosUserId: result.user.id,
        });

        await createOrUpdateUserInConvex({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName || undefined,
          lastName: result.user.lastName || undefined,
          organizationId: user.organizationId,
          role: requestedRole,
        });

        if (existingRecord && !existingRecord.isActive) {
          await convexServer.mutation(api.users.reactivateUser, {
            id: existingRecord._id,
          });
        }

        await convexServer.mutation(api.users.updateUserRole, {
          workosUserId: result.user.id,
          role: requestedRole,
        });

        const message =
          result.type === 'existing_member'
            ? `Updated ${normalizedEmail}'s access and role.`
            : `Added ${normalizedEmail} to your organization.`;

        return successResponse('invite', message, true);
      } catch (error) {
        logError('Team invite failed', error);
        return errorResponse(
          'invite',
          'Failed to send invite. Verify the email address and WorkOS configuration.'
        );
      }
    }

    case 'deactivate': {
      const userIdValue = formData.get('userId');

      if (typeof userIdValue !== 'string') {
        return errorResponse('deactivate', 'Missing user identifier');
      }

      const userId = userIdValue as Id<'users'>;
      const targetUser = await convexServer.query(api.users.getUser, { id: userId });

      if (!targetUser) {
        return errorResponse('deactivate', 'User not found', 404);
      }

      if (targetUser.organizationId !== user.organizationId) {
        return errorResponse('deactivate', 'You cannot manage users from another organization');
      }

      if (targetUser.workosUserId === user.id) {
        return errorResponse('deactivate', 'You cannot deactivate your own account');
      }

      if (targetUser.role === ROLES.OWNER) {
        return errorResponse('deactivate', 'Owner accounts cannot be deactivated');
      }

      try {
        const membership = await getOrganizationMembershipForUser(
          user.organizationId,
          targetUser.workosUserId
        );

        if (membership && membership.status !== 'inactive') {
          await deactivateOrganizationMembership(membership.id);
        }

        await convexServer.mutation(api.users.deactivateUser, { id: userId });

        return successResponse('deactivate', `Deactivated ${targetUser.email}.`);
      } catch (error) {
        logError('Failed to deactivate team member', error);
        return errorResponse('deactivate', 'Unable to deactivate user. Please try again.');
      }
    }

    case 'reactivate': {
      const userIdValue = formData.get('userId');

      if (typeof userIdValue !== 'string') {
        return errorResponse('reactivate', 'Missing user identifier');
      }

      const userId = userIdValue as Id<'users'>;
      const targetUser = await convexServer.query(api.users.getUser, { id: userId });

      if (!targetUser) {
        return errorResponse('reactivate', 'User not found', 404);
      }

      if (targetUser.organizationId !== user.organizationId) {
        return errorResponse('reactivate', 'You cannot manage users from another organization');
      }

      try {
        const membership = await getOrganizationMembershipForUser(
          user.organizationId,
          targetUser.workosUserId
        );

        if (membership) {
          if (membership.status !== 'active') {
            await reactivateOrganizationMembership(membership.id);
          }

          const desiredRole = targetUser.role ?? 'member';

          if (membership.role?.slug !== desiredRole) {
            await updateOrganizationMembershipRole(membership.id, desiredRole);
          }
        } else {
          await createOrganizationMembership(
            user.organizationId,
            targetUser.workosUserId,
            targetUser.role ?? 'member'
          );
        }

        await convexServer.mutation(api.users.reactivateUser, { id: userId });

        const updatedRole = (targetUser.role ?? 'member') as Role;

        await convexServer.mutation(api.users.updateUserRole, {
          workosUserId: targetUser.workosUserId,
          role: updatedRole,
        });

        return successResponse('reactivate', `Reactivated ${targetUser.email}.`);
      } catch (error) {
        logError('Failed to reactivate team member', error);
        return errorResponse('reactivate', 'Unable to reactivate user. Please try again.');
      }
    }

    case 'update-role': {
      const userIdValue = formData.get('userId');
      const roleValue = formData.get('role');

      if (typeof userIdValue !== 'string' || typeof roleValue !== 'string') {
        return errorResponse('update-role', 'Missing role update data');
      }

      const newRole = roleValue as Role;
      const availableRoles = getAvailableRolesForUser(user.role);

      if (!availableRoles.includes(newRole)) {
        return errorResponse('update-role', 'You are not allowed to assign that role');
      }

      const userId = userIdValue as Id<'users'>;
      const targetUser = await convexServer.query(api.users.getUser, { id: userId });

      if (!targetUser) {
        return errorResponse('update-role', 'User not found', 404);
      }

      if (targetUser.organizationId !== user.organizationId) {
        return errorResponse('update-role', 'You cannot manage users from another organization');
      }

      if (targetUser.workosUserId === user.id) {
        return errorResponse('update-role', 'You cannot change your own role');
      }

      if (targetUser.role === ROLES.OWNER) {
        return errorResponse('update-role', 'Owner role cannot be reassigned');
      }

      try {
        const membership = await getOrganizationMembershipForUser(
          user.organizationId,
          targetUser.workosUserId
        );

        if (membership) {
          if (membership.status !== 'active') {
            await reactivateOrganizationMembership(membership.id);
          }

          if (membership.role?.slug !== newRole) {
            await updateOrganizationMembershipRole(membership.id, newRole);
          }
        } else {
          await createOrganizationMembership(user.organizationId, targetUser.workosUserId, newRole);
        }

        await convexServer.mutation(api.users.updateUserRole, {
          workosUserId: targetUser.workosUserId,
          role: newRole,
        });

        return successResponse(
          'update-role',
          `Updated ${targetUser.email}'s role to ${getRoleName(newRole)}.`,
          true
        );
      } catch (error) {
        logError('Failed to update team member role', error);
        return errorResponse('update-role', 'Unable to update role. Please try again.');
      }
    }

    default:
      return errorResponse('invite', 'Unsupported action');
  }
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

function useFetcherFeedback(
  fetcher: FetcherWithComponents<ActionResponse>,
  onSuccess: (response: ActionSuccess) => void,
  onError: (response: ActionError) => void
) {
  const lastHandledRef = useRef<ActionResponse | null>(null);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }

    if (lastHandledRef.current === fetcher.data) {
      return;
    }

    lastHandledRef.current = fetcher.data;

    if (fetcher.data.ok) {
      onSuccess(fetcher.data);
    } else {
      onError(fetcher.data);
    }
  }, [fetcher, onError, onSuccess]);
}

export default function TeamSettingsRoute() {
  const { members, seatStats, user, availableRoles } = useLoaderData<typeof loader>();
  const inviteFetcher = useFetcher<ActionResponse>();
  const manageFetcher = useFetcher<ActionResponse>();
  const revalidator = useRevalidator();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const roleOptions = useMemo(
    () =>
      availableRoles.map(role => ({
        value: role,
        label: getRoleName(role),
      })),
    [availableRoles]
  );

  const defaultInviteRole = useMemo<Role>(
    () => (availableRoles.includes(ROLES.TEAM_MEMBER) ? ROLES.TEAM_MEMBER : availableRoles[0]),
    [availableRoles]
  );

  useFetcherFeedback(
    inviteFetcher,
    response => {
      if (response.refresh) {
        revalidator.revalidate();
      }
      setFeedback({ type: 'success', message: response.message });
      setInviteOpen(false);
    },
    response => {
      setFeedback({ type: 'error', message: response.error });
    }
  );

  useFetcherFeedback(
    manageFetcher,
    response => {
      if (response.refresh) {
        revalidator.revalidate();
      }
      setFeedback({ type: 'success', message: response.message });
    },
    response => {
      setFeedback({ type: 'error', message: response.error });
    }
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = globalThis.setTimeout(() => setFeedback(null), 4000);
    return () => globalThis.clearTimeout(timeout);
  }, [feedback]);

  const handleDeactivate = (memberId: string) => {
    manageFetcher.submit(
      { intent: 'deactivate', userId: memberId },
      { method: 'post', action: '/settings/team' }
    );
  };

  const handleReactivate = (memberId: string) => {
    manageFetcher.submit(
      { intent: 'reactivate', userId: memberId },
      { method: 'post', action: '/settings/team' }
    );
  };

  const handleRoleChange = (memberId: string, role: Role) => {
    manageFetcher.submit(
      { intent: 'update-role', userId: memberId, role },
      { method: 'post', action: '/settings/team' }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Invite teammates, manage roles, and keep seat usage under control.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={() => setInviteOpen(true)}
        >
          Invite teammate
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {seatStats.isOverLimit && (
        <SeatWarningBanner
          seatsActive={seatStats.seatsActive}
          seatsTotal={seatStats.seatsTotal}
          tier={seatStats.tier}
          pendingDowngrade={seatStats.pendingDowngrade}
          cancelAtPeriodEnd={Boolean(seatStats.cancelAtPeriodEnd)}
        />
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Team members</h2>
          <p className="mt-1 text-sm text-gray-600">
            {seatStats.seatsActive} active users / {seatStats.seatsTotal} seats available
          </p>
        </div>
        <div className="px-6 py-6">
          <TeamTable
            members={members}
            currentUserWorkosId={user.id}
            roleOptions={roleOptions}
            onRoleChange={handleRoleChange}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            isBusy={manageFetcher.state !== 'idle'}
          />
        </div>
      </div>

      <InviteUserModal
        isOpen={isInviteOpen}
        onClose={() => setInviteOpen(false)}
        fetcher={inviteFetcher}
        roleOptions={roleOptions}
        defaultRole={defaultInviteRole}
      />
    </div>
  );
}
