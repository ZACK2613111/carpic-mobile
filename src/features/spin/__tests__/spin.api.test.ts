import { ensureSpinFrameCount, spinFramePath } from '../spin.api';

// jest.mock is hoisted above the imports, so spin.api's module graph resolves to
// these mocks — no real Supabase client or storage is touched. We reach the
// mocked client via requireMock (a direct @/lib/supabase import is lint-banned
// outside *.api.ts modules).
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('@/lib/storage', () => ({
  currentUserId: jest.fn(async () => 'user-1'),
  signedUrlFor: jest.fn(),
  uploadFile: jest.fn(),
}));
jest.mock('@/features/projects/projects.api', () => ({ updateProject: jest.fn() }));

const rpc = (jest.requireMock('@/lib/supabase') as { supabase: { rpc: jest.Mock } }).supabase.rpc;

describe('spinFramePath', () => {
  it('zero-pads the frame index and picks the right extension', () => {
    expect(spinFramePath('u', 'p', 0, false)).toBe('u/p/spin/frame_000.jpg');
    expect(spinFramePath('u', 'p', 7, false)).toBe('u/p/spin/frame_007.jpg');
    expect(spinFramePath('u', 'p', 23, true)).toBe('u/p/spin/frame_023_cutout.png');
    expect(spinFramePath('u', 'p', 123, true)).toBe('u/p/spin/frame_123_cutout.png');
  });
});

describe('ensureSpinFrameCount', () => {
  beforeEach(() => rpc.mockReset());

  it('raises the count via the atomic RPC (never a read-modify-write)', async () => {
    rpc.mockResolvedValue({ error: null });
    await ensureSpinFrameCount('proj-1', 12);
    expect(rpc).toHaveBeenCalledWith('raise_spin_frame_count', { p_project_id: 'proj-1', p_min: 12 });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('throws when the RPC errors so the queue retries the frame', async () => {
    rpc.mockResolvedValue({ error: new Error('nope') });
    await expect(ensureSpinFrameCount('proj-1', 3)).rejects.toThrow('nope');
  });
});
