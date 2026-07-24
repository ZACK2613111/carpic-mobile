import { captureLinkUrl, type CaptureLink } from '../captureLinks.api';

jest.mock('@/lib/env', () => ({ SUPABASE_URL: 'https://proj.supabase.co' }));
jest.mock('@/lib/storage', () => ({
  publicUrlFor: (bucket: string, path: string) => `https://proj.supabase.co/storage/v1/object/public/${bucket}/${path}`,
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const link = (over: Partial<CaptureLink> = {}): CaptureLink => ({
  id: 'l1',
  project_id: 'p1',
  token: 'tok_123',
  expires_at: '',
  used_at: null,
  revoked_at: null,
  created_at: '',
  ...over,
});

describe('captureLinkUrl', () => {
  it('points at the capture page with the token and an encoded functions base', () => {
    const url = captureLinkUrl(link());
    expect(url).toBe(
      'https://proj.supabase.co/storage/v1/object/public/viewer/capture.html' +
        '?t=tok_123&e=' +
        encodeURIComponent('https://proj.supabase.co/functions/v1')
    );
    // the functions base must be URL-encoded so its :// and / don't corrupt the query
    expect(url).toContain('&e=https%3A%2F%2F');
  });
});
