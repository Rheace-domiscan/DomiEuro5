import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import path from 'node:path';
import { readdir, rm, stat } from 'node:fs/promises';

const { logInfoMock, logErrorMock } = vi.hoisted(() => ({
  logInfoMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('~/lib/logger', () => ({
  logInfo: logInfoMock,
  logError: logErrorMock,
}));

process.env.EMAIL_TRANSPORT = 'console';

import {
  sendWelcomeEmail,
  sendSeatChangeEmail,
  sendUserRemovedEmail,
  sendOwnershipTransferEmails,
} from '~/lib/email.server';

afterEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_TRANSPORT = 'console';
  process.env.EMAIL_PREVIEW_DIR = '';
});

const previewDir = path.join(process.cwd(), 'tmp', 'mail-previews-test');

beforeEach(async () => {
  try {
    await rm(previewDir, { recursive: true, force: true });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code !== 'ENOENT'
    ) {
      throw error;
    }
  }
});

describe('email.server helpers', () => {
  it('logs welcome email payload', async () => {
    await sendWelcomeEmail({
      to: 'new.user@example.com',
      recipientName: 'New User',
      inviterName: 'Inviter Admin',
      organizationName: 'Acme Ltd',
      dashboardUrl: 'https://example.com/dashboard',
    });

    expect(logInfoMock).toHaveBeenCalledTimes(1);
    const payload = logInfoMock.mock.calls[0][1] as {
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
    await sendWelcomeEmail({ to: '' });
    expect(logInfoMock).not.toHaveBeenCalled();
  });

  it('uses default welcome copy when optional fields omitted', async () => {
    await sendWelcomeEmail({ to: 'simple@example.com' });

    const [, payload] = logInfoMock.mock.calls[0] as [
      string,
      {
        text?: string;
      },
    ];
    expect(payload.text ?? '').toContain('Hi there,');
    expect(payload.text ?? '').toContain('https://app.domieuro.test/dashboard');
  });

  it('skips seat email when recipient missing', async () => {
    await sendSeatChangeEmail({
      to: '',
      mode: 'added',
      seatsChanged: 1,
      seatsTotal: 5,
    });

    expect(logInfoMock).not.toHaveBeenCalled();
  });

  it('logs seat added email with default fallback URL', async () => {
    await sendSeatChangeEmail({
      to: 'owner@example.com',
      mode: 'added',
      seatsChanged: 2,
      seatsTotal: 8,
      performedByName: 'Owner User',
      manageSeatsUrl: 'notaurl',
    });

    const [, payload] = logInfoMock.mock.calls[0] as [
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
    await sendSeatChangeEmail({
      to: 'owner@example.com',
      mode: 'removed',
      seatsChanged: 1,
      seatsTotal: 6,
      performedByName: 'Owner User',
      organizationName: 'Acme',
    });

    const payload = logInfoMock.mock.calls[0][1] as {
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
    await sendUserRemovedEmail({
      to: 'former.user@example.com',
      performedByName: 'Owner User',
    });

    const payload = logInfoMock.mock.calls[0][1] as {
      template: string;
      to: string;
    };
    expect(payload).toMatchObject({
      template: 'user_removed',
      to: 'former.user@example.com',
    });
  });

  it('sends ownership transfer emails to both parties when provided', async () => {
    await sendOwnershipTransferEmails({
      previousOwnerEmail: 'old.owner@example.com',
      newOwnerEmail: 'new.owner@example.com',
      newOwnerName: 'New Owner',
      organizationName: 'Acme',
    });

    expect(logInfoMock).toHaveBeenCalledTimes(2);
    const templates = logInfoMock.mock.calls.map(
      call => (call[1] as { template: string }).template
    );
    expect(templates).toEqual([
      'ownership_transfer_previous_owner',
      'ownership_transfer_new_owner',
    ]);
  });

  it('handles missing ownership recipients gracefully', async () => {
    await sendOwnershipTransferEmails({});
    expect(logInfoMock).not.toHaveBeenCalled();
  });

  it('sends ownership transfer email when only new owner provided', async () => {
    await sendOwnershipTransferEmails({
      newOwnerEmail: 'solo.owner@example.com',
      organizationName: 'Solo Org',
    });

    expect(logInfoMock).toHaveBeenCalledTimes(1);
    const [, payload] = logInfoMock.mock.calls[0] as [string, { template: string }];
    expect(payload.template).toBe('ownership_transfer_new_owner');
  });

  it('captures delivery errors and logs them', async () => {
    logInfoMock.mockImplementation(() => {
      throw new Error('logger failed');
    });

    await sendWelcomeEmail({
      to: 'fail@example.com',
      recipientName: 'Failure Case',
    });

    expect(logInfoMock).toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledWith(
      'Failed to record email notification',
      expect.any(Error)
    );
  });

  it('writes email previews to disk when using file transport', async () => {
    process.env.EMAIL_TRANSPORT = 'file';
    process.env.EMAIL_PREVIEW_DIR = previewDir;

    await sendWelcomeEmail({ to: 'preview@example.com' });

    const entries = await readdir(previewDir);
    expect(entries.length).toBeGreaterThan(0);
    const firstEntry = entries[0];
    const fileStats = await stat(path.join(previewDir, firstEntry));
    expect(fileStats.isFile()).toBe(true);
  });
});
