import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;

const SECRET_PATTERN = /(password|secret|token|credential|authorization|cookie|api[_-]?key)/i;

function sanitizeContext(context: LogContext) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SECRET_PATTERN.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

export function logServerError(
  event: string,
  error: unknown,
  context: LogContext = {},
) {
  const details =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: "UnknownError", message: String(error) };

  console.error(`[RIKU_STORE] ${event}`, {
    ...details,
    context: sanitizeContext(context),
  });
}
