import { useMemo, useSyncExternalStore } from 'react';

import { getFailedUploads, subscribeUploadQueue, type UploadTask } from '@/lib/uploadQueue';

/** Live view of dead-lettered uploads (permanent failures), optionally scoped to a project. */
export function useFailedUploads(projectId?: string): UploadTask[] {
  const all = useSyncExternalStore(subscribeUploadQueue, getFailedUploads, getFailedUploads);
  return useMemo(() => (projectId ? all.filter((t) => t.projectId === projectId) : all), [all, projectId]);
}
