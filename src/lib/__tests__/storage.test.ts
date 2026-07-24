import { removeFolder } from '../storage';

// A fake storage tree: entries with an `id` are files, entries without are
// folders (mirrors how Supabase's non-recursive list() reports them).
jest.mock('expo-file-system/legacy', () => ({ EncodingType: { Base64: 'base64' }, readAsStringAsync: jest.fn() }));
jest.mock('@/lib/supabase', () => {
  const removed: string[] = [];
  const tree: Record<string, { name: string; id: string | null }[]> = {
    'u/p': [
      { name: 'manifest.json', id: 'f1' },
      { name: 'shots', id: null },
      { name: 'spin', id: null },
    ],
    'u/p/shots': [{ name: 'ext-front', id: null }],
    'u/p/shots/ext-front': [
      { name: 'original.jpg', id: 'f2' },
      { name: 'cutout.png', id: 'f3' },
    ],
    'u/p/spin': [
      { name: 'frame_000.jpg', id: 'f4' },
      { name: 'frame_001.jpg', id: 'f5' },
    ],
  };
  return {
    __removed: removed,
    supabase: {
      storage: {
        from: () => ({
          list: async (prefix: string) => ({ data: tree[prefix] ?? [], error: null }),
          remove: async (paths: string[]) => {
            removed.push(...paths);
            return { error: null };
          },
        }),
      },
    },
  };
});

const { __removed } = jest.requireMock('@/lib/supabase') as { __removed: string[] };

describe('removeFolder (recursive storage cleanup)', () => {
  beforeEach(() => {
    __removed.length = 0;
  });

  it('deletes every file across nested subfolders (not just the top level)', async () => {
    await removeFolder('projects', 'u/p');
    expect([...__removed].sort()).toEqual(
      [
        'u/p/manifest.json',
        'u/p/shots/ext-front/original.jpg',
        'u/p/shots/ext-front/cutout.png',
        'u/p/spin/frame_000.jpg',
        'u/p/spin/frame_001.jpg',
      ].sort()
    );
  });

  it('no-ops on an empty prefix', async () => {
    await removeFolder('projects', 'u/empty');
    expect(__removed).toHaveLength(0);
  });
});
