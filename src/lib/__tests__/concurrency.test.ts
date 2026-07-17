import { mapWithConcurrency } from '../concurrency';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('returns results in input order regardless of completion order', async () => {
    const input = [30, 10, 20, 0, 40];
    const out = await mapWithConcurrency(
      input,
      async (ms, i) => {
        await tick(ms);
        return i;
      },
      { concurrency: 5 }
    );
    expect(out).toEqual([0, 1, 2, 3, 4]);
  });

  it('never runs more than `concurrency` workers at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await tick(5);
        inFlight--;
      },
      { concurrency: 3 }
    );
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(maxInFlight).toBeGreaterThan(1); // proves it actually parallelised
  });

  it('reports progress once per settled item, up to total', async () => {
    const seen: number[] = [];
    const total = 6;
    await mapWithConcurrency(
      Array.from({ length: total }, (_, i) => i),
      async () => tick(1),
      {
        concurrency: 2,
        onSettled: (done, tot) => {
          expect(tot).toBe(total);
          seen.push(done);
        },
      }
    );
    expect(seen).toHaveLength(total);
    expect(seen[seen.length - 1]).toBe(total);
  });

  it('stops launching new work once shouldCancel returns true', async () => {
    let started = 0;
    let cancel = false;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      async () => {
        started++;
        if (started >= 4) cancel = true;
        await tick(1);
      },
      { concurrency: 1, shouldCancel: () => cancel }
    );
    // concurrency 1 + cancel after the 4th means we never launch all 20.
    expect(started).toBeLessThan(20);
    expect(started).toBeGreaterThanOrEqual(4);
  });

  it('handles an empty input list', async () => {
    const out = await mapWithConcurrency([], async (x) => x, { concurrency: 4 });
    expect(out).toEqual([]);
  });

  it('propagates a worker rejection', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      })
    ).rejects.toThrow('boom');
  });
});
