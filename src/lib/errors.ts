/**
 * Human-readable message from an unknown thrown value, with a fallback.
 * Replaces the `e instanceof Error ? e.message : fallback` idiom repeated across
 * the app; also treats an empty Error message as "no message" and falls back.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
