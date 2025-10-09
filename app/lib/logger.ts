type ObservabilityTarget = 'console' | 'sentry';

const OBSERVABILITY_TARGET = (process.env.OBSERVABILITY_TARGET ?? 'console')
  .toLowerCase()
  .trim() as ObservabilityTarget;

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
const SENTRY_SAMPLE_RATE = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

let sentryInitPromise: Promise<typeof import('@sentry/node') | null> | null = null;

function ensureSentryInitialised(): Promise<typeof import('@sentry/node') | null> {
  if (sentryInitPromise) {
    return sentryInitPromise;
  }

  if (OBSERVABILITY_TARGET !== 'sentry' || !SENTRY_DSN) {
    sentryInitPromise = Promise.resolve(null);
    return sentryInitPromise;
  }

  sentryInitPromise = import('@sentry/node')
    .then(Sentry => {
      if (!Sentry?.getCurrentHub?.().getClient()) {
        Sentry.init({
          dsn: SENTRY_DSN,
          environment: SENTRY_ENVIRONMENT,
          tracesSampleRate: Number.isFinite(SENTRY_SAMPLE_RATE) ? SENTRY_SAMPLE_RATE : 0.1,
        });
      }

      return Sentry;
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error('[logger] Failed to initialise Sentry', error);
      return null;
    });

  return sentryInitPromise;
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function normaliseError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }

  try {
    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
  } catch (_jsonError) {
    return new Error('Unknown error');
  }
}

function consoleLog(level: 'error' | 'warn' | 'info', message: string, payload?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(prefix, message, payload ?? '');
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(prefix, message, payload ?? '');
      break;
    default:
      // eslint-disable-next-line no-console
      console.info(prefix, message, payload ?? '');
  }
}

export function logInfo(message: string, metadata?: Record<string, unknown>) {
  consoleLog('info', message, metadata);
}

export function logWarn(message: string, metadata?: Record<string, unknown>) {
  consoleLog('warn', message, metadata);
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const normalisedError = normaliseError(error);

  consoleLog('error', message, {
    ...context,
    error: normalisedError,
  });

  if (OBSERVABILITY_TARGET !== 'sentry' || !SENTRY_DSN) {
    return;
  }

  void ensureSentryInitialised().then(Sentry => {
    if (!Sentry) {
      return;
    }

    Sentry.captureException(normalisedError, {
      extra: context,
      tags: {
        source: 'domieuro-app',
      },
    });
  });
}

export async function flushLogger(timeoutMs = 2000) {
  if (OBSERVABILITY_TARGET !== 'sentry' || !SENTRY_DSN) {
    return;
  }

  const Sentry = await ensureSentryInitialised();
  await Sentry?.flush(timeoutMs);
}
