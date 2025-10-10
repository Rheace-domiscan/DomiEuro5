import dgram from 'node:dgram';
import { logWarn } from './logger';

type MetricsTarget = 'console' | 'statsd';

type MetricOptions = {
  value?: number;
  tags?: Record<string, string | number | boolean>;
};

const METRICS_TARGET = (process.env.METRICS_TARGET ?? 'console').toLowerCase() as MetricsTarget;
const STATSD_HOST = process.env.METRICS_STATSD_HOST ?? '127.0.0.1';
const STATSD_PORT = Number(process.env.METRICS_STATSD_PORT ?? '8125');

let statsdSocket: dgram.Socket | null = null;

function ensureStatsdSocket() {
  if (statsdSocket) {
    return statsdSocket;
  }

  statsdSocket = dgram.createSocket('udp4');
  statsdSocket.unref();
  return statsdSocket;
}

function formatTags(tags: Record<string, string | number | boolean> | undefined) {
  if (!tags || Object.keys(tags).length === 0) {
    return '';
  }

  const encoded = Object.entries(tags)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');

  return `|#${encoded}`;
}

export function recordMetric(name: string, options: MetricOptions = {}) {
  const value = options.value ?? 1;

  if (METRICS_TARGET === 'statsd') {
    const socket = ensureStatsdSocket();
    const payload = `${name}:${value}|c${formatTags(options.tags)}`;

    socket.send(payload, STATSD_PORT, STATSD_HOST, error => {
      if (error) {
        logWarn('Failed to send StatsD metric', { name, error });
      }
    });

    return;
  }

  // Default: log to console via logger
  logWarn('[metric]', {
    name,
    value,
    tags: options.tags,
  });
}

export async function closeMetrics() {
  if (statsdSocket) {
    await new Promise(resolve => statsdSocket?.close(() => resolve(undefined)));
    statsdSocket = null;
  }
}
