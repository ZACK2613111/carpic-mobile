import type { Project } from '@/features/projects/types';
import type { Shot } from '@/features/shots/types';

import { publishProject } from '../publish';

// Mock only the I/O boundary; the pure helpers (getSlot, vin, spinFramePath)
// run for real. jest.mock is hoisted above the import.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/storage', () => ({
  currentUserId: jest.fn(async () => 'uid-1'),
  publicUrlFor: jest.fn((bucket, path) => `https://pub/${bucket}/${path}`),
  signedUrlFor: jest.fn(async (_bucket: string, path: string) => `https://signed/${path}`),
  uploadFile: jest.fn(async () => 'ok'),
}));
jest.mock('@/features/projects/projects.api', () => ({ updateProject: jest.fn(async () => ({})) }));
jest.mock('@/features/branding/brand', () => ({
  getBrand: () => ({ text: 'Auto Déclic', position: 'bottom-right', enabled: true }),
  watermarkVisible: () => true,
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

const storage = jest.requireMock('@/lib/storage');
const fs = jest.requireMock('expo-file-system/legacy');
const projectsApi = jest.requireMock('@/features/projects/projects.api');

const shot = (over: Partial<Shot> = {}): Shot => {
  const s = {
    id: 's1',
    project_id: 'p1',
    slot: 'ext-front',
    section: 'exterior',
    position: 0,
    cutout_path: null,
    audio_path: null,
    captured: true,
    background_id: 'studio-showroom',
    doc: { version: 1, hotspots: [] },
    ...over,
  };
  // Derive the storage path from the (possibly overridden) slot so per-slot
  // signed-URL mocking actually distinguishes shots.
  return { image_path: `uid-1/p1/shots/${s.slot}/original.jpg`, ...s } as unknown as Shot;
};
const project = (over: Partial<Project> = {}): Project =>
  ({ id: 'p1', name: 'My Car', vin: null, spin: null, ...over }) as unknown as Project;

const lastManifest = () => JSON.parse(fs.writeAsStringAsync.mock.calls[0][1]);

beforeEach(() => {
  jest.clearAllMocks();
  storage.signedUrlFor.mockImplementation(async (_b: string, path: string) => `https://signed/${path}`);
  globalThis.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
});

describe('publishProject', () => {
  it('builds the manifest, uploads it, and returns a viewer link', async () => {
    const shots = [shot(), shot({ id: 's2', slot: 'ext-rear', position: 4 })];
    const link = await publishProject(project(), shots);

    expect(storage.uploadFile).toHaveBeenCalledWith(
      'published',
      'uid-1/p1/manifest.json',
      expect.any(String),
      'application/json'
    );
    expect(link).toContain('viewer.html');
    expect(link).toContain(encodeURIComponent('https://pub/published/uid-1/p1/manifest.json'));

    const manifest = lastManifest();
    expect(manifest.name).toBe('My Car');
    expect(manifest.shots).toHaveLength(2);
    expect(manifest.shots[0]).toMatchObject({ slot: 'ext-front', url: expect.stringContaining('https://signed/') });
    expect(manifest.watermark).toEqual({ text: 'Auto Déclic', position: 'bottom-right' });
    expect(projectsApi.updateProject).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ status: 'published', published_url: link })
    );
  });

  it('fails loudly (and uploads nothing) if a captured photo URL cannot be signed', async () => {
    storage.signedUrlFor.mockImplementation(async (_b: string, path: string) =>
      path.includes('ext-rear') ? null : `https://signed/${path}`
    );
    const shots = [shot(), shot({ id: 's2', slot: 'ext-rear', position: 4 })];

    await expect(publishProject(project(), shots)).rejects.toThrow(/photo/i);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('fails loudly if a 360 frame URL cannot be signed', async () => {
    storage.signedUrlFor.mockImplementation(async (_b: string, path: string) =>
      path.includes('/spin/') ? null : `https://signed/${path}`
    );
    const proj = project({ spin: { frameCount: 3, hasCutout: false, backgroundId: 'transparent', hotspots: [] } });

    await expect(publishProject(proj, [shot()])).rejects.toThrow(/360|frame/i);
  });

  it('fails fast if the web viewer app is not installed', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false })) as unknown as typeof fetch;
    await expect(publishProject(project(), [shot()])).rejects.toThrow(/viewer/i);
  });

  it('includes a signed spin block when the project has a 360', async () => {
    const proj = project({ spin: { frameCount: 2, hasCutout: true, backgroundId: 'studio-blue', hotspots: [] } });
    await publishProject(proj, [shot()]);

    const manifest = lastManifest();
    expect(manifest.spin.frameCount).toBe(2);
    expect(manifest.spin.frames).toHaveLength(2);
    expect(manifest.spin.frames.every((f: unknown) => typeof f === 'string')).toBe(true);
  });
});
