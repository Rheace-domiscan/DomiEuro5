import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('~/lib/logger', () => ({
  logError: vi.fn(),
}));

import {
  sendWelcomeEmail,
  sendSeatChangeEmail,
  sendUserRemovedEmail,
  sendOwnershipTransferEmails,
} from '~/lib/email.server';
import { logError } from '~/lib/logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('email.server helpers', () => {
  it('logs welcome email payload', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendWelcomeEmail({
      to: 'new.user@example.com',
      recipientName: 'New User',
      inviterName: 'Inviter Admin',
      organizationName: 'Acme Ltd',
      dashboardUrl: 'https://example.com/dashboard',
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = infoSpy.mock.calls[0][1] as {
      template: string;
      to: string;
      subject: string;
    };
    expect(payload).toMatchObject({
      template: 'welcome',
      to: 'new.user@example.com',
      subject: 'Welcome to DomiEuro',
    });
  });

  it('skips welcome email when recipient missing', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendWelcomeEmail({ to: '' });

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('uses default welcome copy when optional fields omitted', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendWelcomeEmail({ to: 'simple@example.com' });

    const [, payload] = infoSpy.mock.calls[0] as [
      string,
      {
        text?: string;
      },
    ];
    expect(payload.text ?? '').toContain('Hi there,');
    expect(payload.text ?? '').toContain('https://app.domieuro.test/dashboard');
  });

  it('skips seat email when recipient missing', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendSeatChangeEmail({
      to: '',
      mode: 'added',
      seatsChanged: 1,
      seatsTotal: 5,
    });

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs seat added email with default fallback URL', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendSeatChangeEmail({
      to: 'owner@example.com',
      mode: 'added',
      seatsChanged: 2,
      seatsTotal: 8,
      performedByName: 'Owner User',
      manageSeatsUrl: 'notaurl',
    });

    const [, payload] = infoSpy.mock.calls[0] as [
      string,
      {
        template: string;
        text?: string;
      },
    ];
    expect(payload.template).toBe('seat_added');
    expect(payload.text ?? '').toContain('https://app.domieuro.test/settings/billing');
  });

  it('logs seat removed email', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendSeatChangeEmail({
      to: 'owner@example.com',
      mode: 'removed',
      seatsChanged: 1,
      seatsTotal: 6,
      performedByName: 'Owner User',
      organizationName: 'Acme',
    });

    const payload = infoSpy.mock.calls[0][1] as {
      template: string;
      to: string;
      subject: string;
    };
    expect(payload).toMatchObject({
      template: 'seat_removed',
      to: 'owner@example.com',
      subject: 'Seats removed for DomiEuro',
    });
  });

  it('logs user removed email with defaults', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendUserRemovedEmail({
      to: 'former.user@example.com',
      performedByName: 'Owner User',
    });

    const payload = infoSpy.mock.calls[0][1] as {
      template: string;
      to: string;
    };
    expect(payload).toMatchObject({
      template: 'user_removed',
      to: 'former.user@example.com',
    });
  });

  it('sends ownership transfer emails to both parties when provided', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendOwnershipTransferEmails({
      previousOwnerEmail: 'old.owner@example.com',
      newOwnerEmail: 'new.owner@example.com',
      newOwnerName: 'New Owner',
      organizationName: 'Acme',
    });

    expect(infoSpy).toHaveBeenCalledTimes(2);
    const templates = infoSpy.mock.calls.map(call => (call[1] as { template: string }).template);
    expect(templates).toEqual([
      'ownership_transfer_previous_owner',
      'ownership_transfer_new_owner',
    ]);
  });

  it('handles missing ownership recipients gracefully', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendOwnershipTransferEmails({});

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('sends ownership transfer email when only new owner provided', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendOwnershipTransferEmails({
      newOwnerEmail: 'solo.owner@example.com',
      organizationName: 'Solo Org',
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [, payload] = infoSpy.mock.calls[0] as [string, { template: string }];
    expect(payload.template).toBe('ownership_transfer_new_owner');
  });

  it('captures delivery errors and logs them', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('console failed');
    });

    const logErrorMock = logError as unknown as Mock;

    await sendWelcomeEmail({
      to: 'fail@example.com',
      recipientName: 'Failure Case',
    });

    expect(infoSpy).toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledWith(
      'Failed to record email notification',
      expect.any(Error)
    );
  });

  it('logs ownership transfer failures', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('ownership email failed');
    });

    const logErrorMock = logError as unknown as Mock;
    logErrorMock.mockImplementationOnce(() => {
      throw new Error('log handler failed');
    });

    await sendOwnershipTransferEmails({
      previousOwnerEmail: 'old.owner@example.com',
    });

    expect(logErrorMock).toHaveBeenCalledTimes(2);
    expect(logErrorMock).toHaveBeenNthCalledWith(
      2,
      'Failed to send one or more ownership transfer emails',
      expect.any(Error)
    );
  });
});
