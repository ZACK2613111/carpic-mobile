// Bounded-concurrency helpers. On-device work (background removal) and network
// work (uploads / signed URLs) both benefit hugely from running a few items at
// once instead of a strict `for … await` loop, while still capping how many are
// in flight so we don't spike memory or open too many sockets.

export type MapWithConcurrencyOptions = {
  /** Max number of workers running at the same time. Defaults to 4. */
  concurrency?: number;
  /**
   * Called after each item settles (in completion order, not input order),
   * with how many have finished so far. Handy for progress UI.
   */
  onSettled?: (done: number, total: number) => void;
  /** Return true to stop launching new work (in-flight items still finish). */
  shouldCancel?: () => boolean;
};

/**
 * Run `worker` over `items` with at most `concurrency` in flight at once.
 * Results are returned in the SAME order as `items` (not completion order).
 * A worker that throws propagates the rejection, matching `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  options: MapWithConcurrencyOptions = {}
): Promise<R[]> {
  const { concurrency = 4, onSettled, shouldCancel } = options;
  const total = items.length;
  const results = new Array<R>(total);
  let nextIndex = 0;
  let done = 0;

  const limit = Math.max(1, Math.min(concurrency, total || 1));

  async function run(): Promise<void> {
    while (true) {
      if (shouldCancel?.()) return;
      const i = nextIndex++;
      if (i >= total) return;
      results[i] = await worker(items[i], i);
      done++;
      onSettled?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: limit }, run));
  return results;
}
