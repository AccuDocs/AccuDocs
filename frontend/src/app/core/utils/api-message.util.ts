const GENERIC_SUCCESS_MESSAGES = new Set([
  'success',
  'data retrieved successfully',
]);

export function extractBackendSuccessMessage(payload: unknown): string | null {
  const directMessage = firstString(
    getPath(payload, ['message']),
    getPath(payload, ['data', 'message'])
  );

  if (!directMessage || isGenericSuccessMessage(directMessage)) {
    return null;
  }

  return directMessage;
}

export function extractBackendErrorMessage(payload: unknown, fallback = 'An error occurred'): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  const validationMessage = formatValidationMessages(
    getPath(payload, ['errors']) ?? getPath(payload, ['error', 'details'])
  );

  const directMessage = firstString(
    getPath(payload, ['message']),
    getPath(payload, ['error', 'message']),
    getPath(payload, ['data', 'message'])
  );

  if (validationMessage && (!directMessage || /validation/i.test(directMessage))) {
    return validationMessage;
  }

  return directMessage || validationMessage || fallback;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getPath(source: unknown, path: string[]): unknown {
  let current = source;

  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function formatValidationMessages(value: unknown): string | null {
  const messages = collectMessages(value).slice(0, 5);

  if (!messages.length) {
    return null;
  }

  return messages.join(', ');
}

function collectMessages(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectMessages(entry));
  }

  if (typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const message = firstString(record['message']);
  const path = formatPath(record['path']);

  if (message) {
    return [path ? `${path}: ${message}` : message];
  }

  return Object.values(record).flatMap((entry) => collectMessages(entry));
}

function formatPath(value: unknown): string | null {
  if (Array.isArray(value)) {
    const path = value.filter((segment) => typeof segment === 'string' || typeof segment === 'number').join('.');
    return path || null;
  }

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isGenericSuccessMessage(message: string): boolean {
  return GENERIC_SUCCESS_MESSAGES.has(message.trim().toLowerCase());
}
