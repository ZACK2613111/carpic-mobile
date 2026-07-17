import { useMemo, useSyncExternalStore } from 'react';

import { getPendingUploads, subscribeUploadQueue, type UploadTask } from '@/lib/uploadQueue';

/** Live view of queued (not-yet-synced) uploads, optionally scoped to a project. */
export function usePendingUploads(projectId?: string): UploadTask[] {
  const all = useSyncExternalStore(subscribeUploadQueue, getPendingUploads, getPendingUploads);
  return useMemo(() => (projectId ? all.filter((t) => t.projectId === projectId) : all), [all, projectId]);
}
