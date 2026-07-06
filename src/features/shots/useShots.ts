import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getShot, listShots, shotSignedUrl, updateShot } from './shots.api';
import type { ShotPatch } from './types';

export const shotKeys = {
  list: (projectId: string) => ['shots', projectId] as const,
  detail: (id: string) => ['shot', id] as const,
  signed: (path: string | null) => ['shot-signed', path] as const,
};

export function useShots(projectId: string | undefined) {
  return useQuery({
    queryKey: shotKeys.list(projectId ?? ''),
    queryFn: () => listShots(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useShot(id: string | undefined) {
  return useQuery({
    queryKey: shotKeys.detail(id ?? ''),
    queryFn: () => getShot(id as string),
    enabled: Boolean(id),
  });
}

export function useShotSignedUrl(path: string | null) {
  return useQuery({
    queryKey: shotKeys.signed(path),
    queryFn: () => shotSignedUrl(path),
    enabled: Boolean(path),
    staleTime: 45 * 60 * 1000,
  });
}

export function useUpdateShot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ShotPatch }) => updateShot(id, patch),
    onSuccess: (shot) => {
      qc.setQueryData(shotKeys.detail(shot.id), shot);
      qc.invalidateQueries({ queryKey: shotKeys.list(shot.project_id) });
    },
  });
}
