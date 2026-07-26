import 'server-only';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogValue = unknown;

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  operation?: string;
  [key: string]: LogValue;
}

const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|api[-_]?key|email|phone|message|content|payload|qr)/i;

export function redact(value: LogValue, seen = new WeakSet<object>()): LogValue {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV === 'development' && value.stack ? { stack: value.stack } : {}),
    };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';

  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, seen),
    ]),
  );
}

export function log(level: LogLevel, event: string, context: LogContext = {}): void {
  const safeContext = redact(context) as Record<string, LogValue>;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'saas-masivos-web',
    ...safeContext,
  };
  const line = JSON.stringify(record);

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') console.debug(line);
  else console.info(line);
}

export function createLogger(base: LogContext) {
  return {
    debug: (event: string, context?: LogContext) => log('debug', event, { ...base, ...context }),
    info: (event: string, context?: LogContext) => log('info', event, { ...base, ...context }),
    warn: (event: string, context?: LogContext) => log('warn', event, { ...base, ...context }),
    error: (event: string, context?: LogContext) => log('error', event, { ...base, ...context }),
  };
}
