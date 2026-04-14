type LogLevel = "info" | "warn" | "error";

type ErrorDetails = {
  name: string;
  message: string;
  stack?: string;
};

function serializeError(err: unknown): ErrorDetails | unknown {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  return err;
}

function writeLog(level: LogLevel, context: string, message: string, data?: unknown, meta?: unknown) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
  };

  if (level === "error") {
    payload.error = serializeError(data);
    if (meta !== undefined) {
      payload.meta = meta;
    }
  } else if (data !== undefined) {
    payload.meta = data;
  }

  console[level](JSON.stringify(payload));
}

export const logger = {
  info(context: string, message: string, meta?: unknown) {
    writeLog("info", context, message, meta);
  },

  warn(context: string, message: string, meta?: unknown) {
    writeLog("warn", context, message, meta);
  },

  error(context: string, message: string, err?: unknown, meta?: unknown) {
    writeLog("error", context, message, err, meta);
  },
};
