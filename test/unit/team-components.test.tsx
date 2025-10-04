import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FetcherWithComponents } from 'react-router';
import { TeamTable, type TeamMemberRow } from '../../components/team/TeamTable';
import { InviteUserModal } from '../../components/team/InviteUserModal';

function createMockFetcher<TData = unknown>(
  state: FetcherWithComponents<TData>['state'] = 'idle',
  data?: TData
): FetcherWithComponents<TData> {
  const fetcher = {
    state,
    data,
    Form: (({ children, ...props }: { children?: ReactNode }) => (
      <form {...props}>{children}</form>
    )) as FetcherWithComponents<TData>['Form'],
    submit: vi.fn() as FetcherWithComponents<TData>['submit'],
    load: vi.fn() as FetcherWithComponents<TData>['load'],
    reset: vi.fn(),
  } as Partial<FetcherWithComponents<TData>>;

  return fetcher as FetcherWithComponents<TData>;
}

describe('TeamTable', () => {
  const members: TeamMemberRow[] = [
    {
      id: 'user-1',
      email: 'owner@example.com',
      name: 'Owner User',
      role: 'owner',
      isActive: true,
      createdAt: Date.now() - 1000,
      workosUserId: 'user_owner_1',
    },
    {
      id: 'user-2',
      email: 'teammate@example.com',
      name: 'Team Mate',
      role: 'member',
      isActive: true,
      createdAt: Date.now(),
      workosUserId: 'user_member_1',
    },
  ];

  it('renders empty state when no members provided', () => {
    render(
      <TeamTable
        members={[]}
        currentUserWorkosId="user_owner_1"
        roleOptions={[{ value: 'member', label: 'Team Member' }]}
        onRoleChange={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    expect(screen.getByText('No team members yet')).toBeInTheDocument();
  });

  it('calls onRoleChange when role selection changes', () => {
    const onRoleChange = vi.fn();

    render(
      <TeamTable
        members={members}
        currentUserWorkosId="user_owner_1"
        roleOptions={[
          { value: 'member', label: 'Team Member' },
          { value: 'manager', label: 'Manager' },
        ]}
        onRoleChange={onRoleChange}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    const roleSelect = screen.getAllByLabelText(/Role for/)[1];
    fireEvent.change(roleSelect, { target: { value: 'manager' } });

    expect(onRoleChange).toHaveBeenCalledWith('user-2', 'manager');
  });

  it('disables actions for current user and owners', () => {
    const onDeactivate = vi.fn();

    render(
      <TeamTable
        members={members}
        currentUserWorkosId="user_owner_1"
        roleOptions={[{ value: 'member', label: 'Team Member' }]}
        onRoleChange={vi.fn()}
        onDeactivate={onDeactivate}
        onReactivate={vi.fn()}
      />
    );

    const deactivateButtons = screen.getAllByRole('button', { name: /Deactivate/ });
    expect(deactivateButtons[0]).toBeDisabled();
    expect(deactivateButtons[1]).toBeEnabled();
  });
});

describe('InviteUserModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <InviteUserModal
        isOpen={false}
        onClose={vi.fn()}
        fetcher={createMockFetcher()}
        roleOptions={[{ value: 'member', label: 'Team Member' }]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows success message when fetcher has successful response', () => {
    render(
      <InviteUserModal
        isOpen
        onClose={vi.fn()}
        fetcher={createMockFetcher('idle', {
          ok: true,
          message: 'Invitation sent',
          refresh: false,
        })}
        roleOptions={[{ value: 'member', label: 'Team Member' }]}
      />
    );

    expect(screen.getByText('Invitation sent')).toBeInTheDocument();
  });

  it('invokes onClose when cancel button clicked', () => {
    const onClose = vi.fn();

    render(
      <InviteUserModal
        isOpen
        onClose={onClose}
        fetcher={createMockFetcher()}
        roleOptions={[{ value: 'member', label: 'Team Member' }]}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
