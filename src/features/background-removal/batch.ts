import { mapWithConcurrency } from '@/lib/concurrency';
import { activeEngine } from './registry';

export type BatchProgress = { done: number; total: number };

// The on-device engine handles one image per call, but a strict sequential loop
// leaves the device idle between frames (each call also reads the input file and
// encodes a trimmed PNG). Running a couple at once overlaps that I/O with the next
// frame's segmentation. Kept low so we don't spike memory holding several full-res
// bitmaps at once on lower-end Android.
const REMOVAL_CONCURRENCY = 2;

/**
 * Remove the background from many images with a small amount of concurrency,
 * reporting progress and honouring a cancel signal. Failed frames resolve to
 * null (in their original position) so one bad frame doesn't abort the whole
 * batch, and the returned array stays index-aligned with the input.
 */
export async function batchRemoveBackground(
  uris: string[],
  onProgress?: (p: BatchProgress) => void,
  shouldCancel?: () => boolean
): Promise<(string | null)[]> {
  return mapWithConcurrency(
    uris,
    async (uri) => {
      try {
        const result = await activeEngine.removeBackground(uri);
        return result.uri;
      } catch {
        return null;
      }
    },
    {
      concurrency: REMOVAL_CONCURRENCY,
      shouldCancel,
      onSettled: onProgress ? (done, total) => onProgress({ done, total }) : undefined,
    }
  );
}
