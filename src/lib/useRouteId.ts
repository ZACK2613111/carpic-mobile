import { useLocalSearchParams } from 'expo-router';

/**
 * Read a route `[id]` param and normalize it to a real string or null.
 *
 * `useLocalSearchParams<{ id: string }>()` lies at runtime: a malformed deep
 * link (`carstudio://editor/`) yields `undefined`, and a repeated param yields
 * a string[]. Screens that trusted the type showed an infinite spinner. This
 * returns null for anything that isn't a single non-empty string so callers can
 * render a proper "not found" state instead.
 */
export function useRouteId(key = 'id'): string | null {
  const params = useLocalSearchParams();
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.length > 0 ? value : null;
}
