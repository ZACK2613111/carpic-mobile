import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { type Query, QueryClient } from '@tanstack/react-query';

// Cache is the pragmatic offline story for the MVP: reads are served from cache,
// and mutations retry when connectivity returns. The cache is also persisted to
// AsyncStorage (below) so the app shows your projects instantly on next launch.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // keep for a day so the persisted cache survives
      // Don't burn retries (or the user's data) hammering a dead network — a
      // 404/403 won't fix itself, and onlineManager (NetInfo) refetches on
      // reconnect anyway. Capped exponential backoff for the transient cases.
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

// Signed URLs expire within the hour — persisting them hands the next launch a
// cache full of 403s (broken images until a refetch succeeds). Keep them
// session-only; project/shot metadata stays persisted for offline reads.
const VOLATILE_KEYS = new Set(['signed-url', 'shot-signed', 'spin-frames']);

export const dehydrateOptions = {
  shouldDehydrateQuery: (query: Query) =>
    query.state.status === 'success' && !VOLATILE_KEYS.has(String(query.queryKey[0])),
};

/**
 * Wipe all cached + persisted query data. Call this on sign-out so the next
 * account never sees the previous user's projects flash in from the persisted
 * AsyncStorage cache.
 */
export async function clearAppCache(): Promise<void> {
  queryClient.clear();
  try {
    await asyncStoragePersister.removeClient();
  } catch {
    // best-effort — a failed cache wipe shouldn't block signing out
  }
}
