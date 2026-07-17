/**
 * Compact unique id for client-side entities (hotspots). Not a UUID —
 * uniqueness within one project's doc is all that's needed.
 */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
