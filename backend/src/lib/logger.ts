type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

function formatLog(level: LogLevel, payload: LogPayload): string {
  const base = {
    timestamp: new Date().toISOString(),
    level,
    message: payload.message,
  };

  return JSON.stringify({
    ...base,
    ...(payload.context ? { context: payload.context } : {}),
    ...(payload.error ? { error: normalizeError(payload.error) } : {}),
  });
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    console.log(formatLog('info', { message, context }));
  },
  warn(message: string, context?: Record<string, unknown>) {
    console.warn(formatLog('warn', { message, context }));
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(formatLog('error', { message, error, context }));
  },
};
