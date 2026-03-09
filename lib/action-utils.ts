/**
 * Common error-handling utility for server actions.
 *
 * Surfaces known, user-friendly error messages from the domain layer
 * (event-helpers, tenant validation, etc.) and falls back to a generic
 * message for unexpected errors.
 */

const KNOWN_ERROR_PATTERNS = [
  'Unauthorized',
  'not found',
  'not belong',
  'not approved',
  'Unique constraint',
  'Cannot change',
  'Cannot delete',
  'cannot be less',
  'already been checked in',
  'is not checked in',
  'does not belong',
];

export function handleActionError(
  error: unknown,
  fallbackMessage: string,
  customHandlers?: Record<string, string>,
): { error: string } {
  console.error(fallbackMessage + ':', error);

  if (error instanceof Error) {
    if (customHandlers) {
      for (const [pattern, message] of Object.entries(customHandlers)) {
        if (error.message.includes(pattern)) return { error: message };
      }
    }
    for (const pattern of KNOWN_ERROR_PATTERNS) {
      if (error.message.includes(pattern)) return { error: error.message };
    }
  }

  return { error: fallbackMessage };
}
