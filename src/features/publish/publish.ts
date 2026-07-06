import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import { getSlot } from '@/features/capture/shotTemplate';
import { updateProject } from '@/features/projects/projects.api';
import type { Project } from '@/features/projects/types';
import type { Shot } from '@/features/shots/types';
import { spinFramePath } from '@/features/spin/spin.api';
import { currentUserId, publicUrlFor, signedUrlFor, uploadFile } from '@/lib/storage';

// Assets stay in the PRIVATE bucket; the public manifest embeds long-lived signed
// URLs (1 year) so the shared link works without copying dozens of images. Only
// the small manifest.json + the viewer app go into the public bucket.
const YEAR = 31_536_000;

export type PublishStep = (label: string) => void;

export async function publishProject(project: Project, shots: Shot[], onStep?: PublishStep): Promise<string> {
  const uid = await currentUserId();

  onStep?.('Preparing photos');
  const captured = shots.filter((s) => s.captured && s.image_path);
  const manifestShots = [];
  for (const s of captured) {
    const useCutout = Boolean(s.cutout_path);
    const path = useCutout ? (s.cutout_path as string) : (s.image_path as string);
    const url = await signedUrlFor('projects', path, YEAR);
    if (!url) continue;
    const audioUrl = s.audio_path ? await signedUrlFor('projects', s.audio_path, YEAR) : null;
    manifestShots.push({
      slot: s.slot,
      section: s.section,
      label: getSlot(s.slot)?.label ?? s.slot,
      url,
      cutout: useCutout,
      backgroundId: s.background_id,
      hotspots: s.doc?.hotspots ?? [],
      audioUrl,
    });
  }

  let spin: unknown = null;
  if (project.spin && project.spin.frameCount > 0) {
    onStep?.('Preparing 360°');
    const hasCutout = Boolean(project.spin.hasCutout);
    const frames = await Promise.all(
      Array.from({ length: project.spin.frameCount }, (_, i) =>
        signedUrlFor('projects', spinFramePath(uid, project.id, i, hasCutout), YEAR)
      )
    );
    spin = {
      frameCount: project.spin.frameCount,
      hasCutout,
      backgroundId: project.spin.backgroundId ?? 'transparent',
      frames,
      hotspots: project.spin.hotspots ?? [],
    };
  }

  onStep?.('Publishing');
  const manifest = { name: project.name, generatedAt: new Date().toISOString(), shots: manifestShots, spin };

  const manifestTmp = `${FileSystem.cacheDirectory}manifest-${project.id}.json`;
  await FileSystem.writeAsStringAsync(manifestTmp, JSON.stringify(manifest), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const manifestPath = `${uid}/${project.id}/manifest.json`;
  await uploadFile('published', manifestPath, manifestTmp, 'application/json');
  const manifestUrl = publicUrlFor('published', manifestPath);

  // Upload the bundled viewer app (once per user; re-upload is a harmless upsert).
  const asset = Asset.fromModule(require('../../../web/viewer.html'));
  await asset.downloadAsync();
  if (asset.localUri) {
    await uploadFile('published', `${uid}/viewer.html`, asset.localUri, 'text/html');
  }
  const viewerUrl = publicUrlFor('published', `${uid}/viewer.html`);
  const link = `${viewerUrl}?d=${encodeURIComponent(manifestUrl)}`;

  await updateProject(project.id, {
    status: 'published',
    published_url: link,
    published_at: new Date().toISOString(),
  });

  return link;
}
