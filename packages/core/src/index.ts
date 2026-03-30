export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, options?: { code?: string; statusCode?: number; details?: unknown }) {
    super(message);
    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";
    this.statusCode = options?.statusCode ?? 500;
    this.details = options?.details;
  }
}

type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const REDACT_KEY_PATTERN = /(password|token|secret|signature|credential|api[_-]?key|keyHash)/i;

function sanitizeMeta(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMeta(entry));
  }
  if (typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      next[key] = REDACT_KEY_PATTERN.test(key) ? "[REDACTED]" : sanitizeMeta(entry);
    }
    return next;
  }
  return String(value);
}

export function createLogger(scope: string, baseMeta: LogMeta = {}) {
  function emit(level: LogLevel, message: string, meta?: LogMeta) {
    const mergedMeta = {
      ...baseMeta,
      ...(meta ?? {}),
    };
    const safeMeta = sanitizeMeta(mergedMeta) as LogMeta;
    const payload = {
      ts: new Date().toISOString(),
      level,
      scope,
      message,
      ...safeMeta,
    };
    if (level === "error") {
      console.error(JSON.stringify(payload));
      return;
    }
    if (level === "warn") {
      console.warn(JSON.stringify(payload));
      return;
    }
    console.log(JSON.stringify(payload));
  }

  return {
    child(meta: LogMeta) {
      return createLogger(scope, {
        ...baseMeta,
        ...meta,
      });
    },
    debug: (message: string, meta?: LogMeta) => emit("debug", message, meta),
    info: (message: string, meta?: LogMeta) => emit("info", message, meta),
    warn: (message: string, meta?: LogMeta) => emit("warn", message, meta),
    error: (message: string, meta?: LogMeta) => emit("error", message, meta),
  };
}
