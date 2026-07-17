import { useQuery, type QueryClient } from '@tanstack/react-query';

import { getSpinFrameUrls } from './spin.api';

export const spinKeys = {
  /** All frame queries for a project (any count/cutout variant) — for invalidation. */
  frames: (projectId: string) => ['spin-frames', projectId] as const,
  framesVariant: (projectId: string, frameCount: number, cutout: boolean) =>
    ['spin-frames', projectId, frameCount, cutout] as const,
};

/** Signed URLs for each spin frame (original or cutout), in order. */
export function useSpinFrames(projectId: string | undefined, frameCount: number, cutout: boolean) {
  return useQuery({
    queryKey: spinKeys.framesVariant(projectId ?? '', frameCount, cutout),
    queryFn: () => getSpinFrameUrls(projectId as string, frameCount, cutout),
    enabled: Boolean(projectId) && frameCount > 0,
  });
}

export function invalidateSpinFrames(qc: QueryClient, projectId: string): void {
  qc.invalidateQueries({ queryKey: spinKeys.frames(projectId) });
}
