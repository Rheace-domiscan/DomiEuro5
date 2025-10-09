/**
 * Email Notification Utilities
 *
 * Provides lightweight email helpers for billing-related workflows. These
 * helpers currently log structured messages to stdout so we can verify that
 * triggers fire during development. When we integrate a dedicated email
 * provider (SendGrid, Resend, etc.) we can replace the transport layer while
 * keeping the same template interfaces.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logError, logInfo } from '~/lib/logger';

type EmailTransport = 'console' | 'file';

function getEmailTransport(): EmailTransport {
  return (process.env.EMAIL_TRANSPORT ?? 'file').toLowerCase() as EmailTransport;
}

function getEmailPreviewDir(): string {
  return process.env.EMAIL_PREVIEW_DIR ?? path.join(process.cwd(), 'tmp', 'mail-previews');
}

/**
 * Supported email templates for billing notifications.
 */
type EmailTemplate =
  | 'welcome'
  | 'seat_added'
  | 'seat_removed'
  | 'user_removed'
  | 'ownership_transfer_previous_owner'
  | 'ownership_transfer_new_owner';

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  template: EmailTemplate;
  metadata?: Record<string, unknown>;
}

const DEFAULT_PRODUCT_NAME = 'DomiEuro';
const DEFAULT_SUPPORT_EMAIL = 'support@domieuro.test';

function normaliseUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).toString();
  } catch (_error) {
    return undefined;
  }
}

function serialiseMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) {
    return '';
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch (_error) {
    return '';
  }
}

async function writeEmailPreview(message: EmailMessage) {
  const timestamp = new Date();
  const id = `${timestamp.toISOString().replace(/[:.]/g, '-')}-${message.template}`;
  const filename = `${id}.md`;
  const previewDir = getEmailPreviewDir();
  const filepath = path.join(previewDir, filename);

  const lines: string[] = [
    `# ${message.subject}`,
    '',
    `- Sent: ${timestamp.toISOString()}`,
    `- To: ${message.to}`,
    `- Template: ${message.template}`,
  ];

  const metadata = serialiseMetadata(message.metadata);
  if (metadata) {
    lines.push('', '## Metadata', '', '```json', metadata, '```');
  }

  lines.push(
    '',
    '## Text body',
    '',
    '```',
    message.text,
    '```',
    '',
    '## HTML body',
    '',
    '```html',
    message.html,
    '```',
    ''
  );

  await mkdir(previewDir, { recursive: true });
  await writeFile(filepath, lines.join('\n'));

  logInfo('Email preview written', { filepath });
}

async function deliverEmail(message: EmailMessage): Promise<void> {
  try {
    const transport = getEmailTransport();

    if (transport === 'file') {
      await writeEmailPreview(message);
      return;
    }

    logInfo('[email]', {
      template: message.template,
      to: message.to,
      subject: message.subject,
      text: message.text,
      metadata: message.metadata,
    });
  } catch (error) {
    logError('Failed to record email notification', error);
  }
}

function buildHtmlParagraphs(paragraphs: string[]): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Email</title></head>',
    `<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">`,
    ...paragraphs.map(paragraph => `<p>${paragraph}</p>`),
    '<p style="margin-top: 24px; color: #6b7280; font-size: 12px;">This email was generated automatically by DomiEuro.</p>',
    '</body>',
    '</html>',
  ].join('');
}

function buildPlainText(lines: string[]): string {
  return `${lines.join('\n\n')}\n\n— ${DEFAULT_PRODUCT_NAME}`;
}

interface WelcomeEmailOptions {
  to: string;
  recipientName?: string | null;
  inviterName?: string | null;
  organizationName?: string | null;
  dashboardUrl?: string | null;
}

/**
 * Send a welcome email to a teammate who just gained access to the product.
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions): Promise<void> {
  const { to } = options;

  if (!to) {
    return;
  }

  const organization = options.organizationName?.trim() || 'your team';
  const recipientName = options.recipientName?.trim() || undefined;
  const inviter = options.inviterName?.trim() || 'A teammate';
  const dashboardUrl = normaliseUrl(options.dashboardUrl) ?? 'https://app.domieuro.test/dashboard';

  const subject = `Welcome to ${DEFAULT_PRODUCT_NAME}`;
  const lines = [
    recipientName ? `Hi ${recipientName},` : 'Hi there,',
    `${inviter} added you to ${organization}. You can now sign in to manage projects, collaborate with your team, and access billing tools.`,
    `Get started by visiting ${dashboardUrl}.`,
    'If you did not expect this invitation, please reach out to our support team.',
  ];

  await deliverEmail({
    to,
    subject,
    text: buildPlainText(lines),
    html: buildHtmlParagraphs([
      recipientName ? `Hi ${recipientName},` : 'Hi there,',
      `${inviter} added you to ${organization}. You can now sign in to manage projects, collaborate with your team, and access billing tools.`,
      `Get started by visiting <a href="${dashboardUrl}">${dashboardUrl}</a>.`,
      'If you did not expect this invitation, please reach out to our support team.',
    ]),
    template: 'welcome',
    metadata: {
      organization,
      inviter,
    },
  });
}

interface SeatChangeEmailOptions {
  to: string;
  mode: 'added' | 'removed';
  seatsChanged: number;
  seatsTotal: number;
  performedByName?: string | null;
  organizationName?: string | null;
  manageSeatsUrl?: string | null;
}

/**
 * Notify the actor that a seat adjustment succeeded.
 */
export async function sendSeatChangeEmail(options: SeatChangeEmailOptions): Promise<void> {
  const { to } = options;

  if (!to) {
    return;
  }

  const actor = options.performedByName?.trim() || 'Your teammate';
  const organization = options.organizationName?.trim() || 'your organization';
  const verb = options.mode === 'removed' ? 'removed' : 'added';
  const seatWord = options.seatsChanged === 1 ? 'seat' : 'seats';
  const manageSeatsUrl =
    normaliseUrl(options.manageSeatsUrl) ?? 'https://app.domieuro.test/settings/billing';

  const subject = `Seats ${verb} for ${DEFAULT_PRODUCT_NAME}`;
  const lines = [
    `Heads up — ${actor} ${verb} ${options.seatsChanged} ${seatWord} for ${organization}.`,
    `Your plan now includes ${options.seatsTotal} total ${options.seatsTotal === 1 ? 'seat' : 'seats'}.`,
    `You can review seat usage any time at ${manageSeatsUrl}.`,
  ];

  await deliverEmail({
    to,
    subject,
    text: buildPlainText(lines),
    html: buildHtmlParagraphs([
      `Heads up — ${actor} ${verb} ${options.seatsChanged} ${seatWord} for ${organization}.`,
      `Your plan now includes <strong>${options.seatsTotal}</strong> total ${options.seatsTotal === 1 ? 'seat' : 'seats'}.`,
      `You can review seat usage any time at <a href="${manageSeatsUrl}">${manageSeatsUrl}</a>.`,
    ]),
    template: options.mode === 'removed' ? 'seat_removed' : 'seat_added',
    metadata: {
      seatsChanged: options.seatsChanged,
      seatsTotal: options.seatsTotal,
      mode: options.mode,
      organization,
    },
  });
}

interface UserRemovedEmailOptions {
  to: string;
  organizationName?: string | null;
  performedByName?: string | null;
  supportEmail?: string | null;
}

/**
 * Warn a user that their access was revoked.
 */
export async function sendUserRemovedEmail(options: UserRemovedEmailOptions): Promise<void> {
  const { to } = options;

  if (!to) {
    return;
  }

  const organization = options.organizationName?.trim() || 'DomiEuro';
  const performer = options.performedByName?.trim() || 'an administrator';
  const supportEmail = options.supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL;

  const subject = `Your ${organization} access changed`;
  const lines = [
    `This is a quick update to let you know that ${performer} removed your access to ${organization}.`,
    `If you believe this was a mistake, reply to this email or contact ${supportEmail}.`,
  ];

  await deliverEmail({
    to,
    subject,
    text: buildPlainText(lines),
    html: buildHtmlParagraphs([
      `This is a quick update to let you know that ${performer} removed your access to ${organization}.`,
      `If you believe this was a mistake, reply to this email or contact <a href="mailto:${supportEmail}">${supportEmail}</a>.`,
    ]),
    template: 'user_removed',
    metadata: {
      performer,
      organization,
    },
  });
}

interface OwnershipTransferEmailOptions {
  previousOwnerEmail?: string | null;
  newOwnerEmail?: string | null;
  newOwnerName?: string | null;
  organizationName?: string | null;
}

/**
 * Notify both the previous and new owner about the ownership transfer.
 */
export async function sendOwnershipTransferEmails(
  options: OwnershipTransferEmailOptions
): Promise<void> {
  const organization = options.organizationName?.trim() || DEFAULT_PRODUCT_NAME;
  const newOwnerName = options.newOwnerName?.trim();
  const tasks: Array<Promise<void>> = [];

  if (options.previousOwnerEmail) {
    const subject = `Ownership transferred for ${organization}`;
    const lines = [
      'We successfully processed your ownership transfer request.',
      newOwnerName
        ? `${newOwnerName} is now the primary owner for ${organization}.`
        : 'The selected administrator is now the primary owner.',
      'You retain admin access and can continue to manage billing, seats, and team members.',
    ];

    tasks.push(
      deliverEmail({
        to: options.previousOwnerEmail,
        subject,
        text: buildPlainText(lines),
        html: buildHtmlParagraphs([
          'We successfully processed your ownership transfer request.',
          newOwnerName
            ? `${newOwnerName} is now the primary owner for ${organization}.`
            : 'The selected administrator is now the primary owner.',
          'You retain admin access and can continue to manage billing, seats, and team members.',
        ]),
        template: 'ownership_transfer_previous_owner',
        metadata: {
          role: 'previous_owner',
          organization,
          newOwnerName,
        },
      })
    );
  }

  if (options.newOwnerEmail) {
    const subject = `You're now the owner of ${organization}`;
    const lines = [
      'Congratulations! Ownership of your workspace has been transferred to you.',
      'You can now manage billing, seats, and team members from the settings area.',
      'If you need to give ownership back, visit Settings → Team → Transfer Ownership.',
    ];

    tasks.push(
      deliverEmail({
        to: options.newOwnerEmail,
        subject,
        text: buildPlainText(lines),
        html: buildHtmlParagraphs([
          'Congratulations! Ownership of your workspace has been transferred to you.',
          'You can now manage billing, seats, and team members from the settings area.',
          'If you need to give ownership back, visit Settings → Team → Transfer Ownership.',
        ]),
        template: 'ownership_transfer_new_owner',
        metadata: {
          role: 'new_owner',
          organization,
          newOwnerName,
        },
      })
    );
  }

  if (tasks.length === 0) {
    return;
  }

  try {
    await Promise.all(tasks);
  } catch (error) {
    logError('Failed to send one or more ownership transfer emails', error);
  }
}
