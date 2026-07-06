import { activeEngine } from './registry';

export type BatchProgress = { done: number; total: number };

/**
 * Remove the background from many images sequentially (the on-device engine is
 * single-image), reporting progress and honouring a cancel signal. Failed frames
 * resolve to null so one bad frame doesn't abort the whole batch.
 */
export async function batchRemoveBackground(
  uris: string[],
  onProgress?: (p: BatchProgress) => void,
  shouldCancel?: () => boolean
): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (let i = 0; i < uris.length; i++) {
    if (shouldCancel?.()) break;
    try {
      const result = await activeEngine.removeBackground(uris[i]);
      out.push(result.uri);
    } catch {
      out.push(null);
    }
    onProgress?.({ done: i + 1, total: uris.length });
  }
  return out;
}
