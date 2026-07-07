import { batchRemoveBackground } from '../batch';

// jest hoists jest.mock() above imports, so the factory may only reference
// variables whose name starts with `mock`. The arrow is a lazy closure, so it
// reads `mockRemoveBackground` at call time (by then it's initialised).
const mockRemoveBackground = jest.fn();

jest.mock('../registry', () => ({
  activeEngine: { removeBackground: (uri: string) => mockRemoveBackground(uri) },
}));

beforeEach(() => {
  mockRemoveBackground.mockReset();
});

describe('batchRemoveBackground', () => {
  it('returns cutout uris index-aligned with the input', async () => {
    mockRemoveBackground.mockImplementation(async (uri: string) => ({ uri: `${uri}#cut` }));
    const out = await batchRemoveBackground(['a', 'b', 'c']);
    expect(out).toEqual(['a#cut', 'b#cut', 'c#cut']);
  });

  it('resolves a failed frame to null in place without aborting the batch', async () => {
    mockRemoveBackground.mockImplementation(async (uri: string) => {
      if (uri === 'b') throw new Error('unsupported frame');
      return { uri: `${uri}#cut` };
    });
    const out = await batchRemoveBackground(['a', 'b', 'c']);
    expect(out).toEqual(['a#cut', null, 'c#cut']);
  });

  it('reports progress up to the total frame count', async () => {
    mockRemoveBackground.mockImplementation(async (uri: string) => ({ uri }));
    const progress: { done: number; total: number }[] = [];
    await batchRemoveBackground(['a', 'b', 'c', 'd'], (p) => progress.push(p));
    expect(progress).toHaveLength(4);
    expect(progress[progress.length - 1]).toEqual({ done: 4, total: 4 });
    expect(progress.every((p) => p.total === 4)).toBe(true);
  });

  it('handles an empty frame list', async () => {
    const out = await batchRemoveBackground([]);
    expect(out).toEqual([]);
    expect(mockRemoveBackground).not.toHaveBeenCalled();
  });
});
