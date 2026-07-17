import * as FileSystem from 'expo-file-system/legacy';

import { getBrand, watermarkVisible } from '@/features/branding/brand';
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

/**
 * The viewer web app is uploaded ONCE by the developer to the read-only public
 * "viewer" bucket — clients can only write manifest.json (see
 * supabase/schema_v3.sql). Fails fast with an actionable error if that
 * one-time setup step hasn't been done.
 */
async function viewerAppUrl(): Promise<string> {
  const url = publicUrlFor('viewer', 'viewer.html');
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) {
    throw new Error(
      'Web viewer not installed — upload web/viewer.html to the public "viewer" bucket (see supabase/schema_v3.sql).'
    );
  }
  return url;
}

export async function publishProject(project: Project, shots: Shot[], onStep?: PublishStep): Promise<string> {
  const uid = await currentUserId();
  const viewerUrl = await viewerAppUrl();

  onStep?.('Preparing photos');
  const captured = shots.filter((s) => s.captured && s.image_path);
  // Sign every shot's URL(s) in parallel rather than one round-trip at a time;
  // then drop any shot whose main image URL failed, preserving order.
  const signed = await Promise.all(
    captured.map(async (s) => {
      const useCutout = Boolean(s.cutout_path);
      const path = useCutout ? (s.cutout_path as string) : (s.image_path as string);
      const [url, audioUrl] = await Promise.all([
        signedUrlFor('projects', path, YEAR),
        s.audio_path ? signedUrlFor('projects', s.audio_path, YEAR) : Promise.resolve(null),
      ]);
      if (!url) return null;
      return {
        slot: s.slot,
        section: s.section,
        label: getSlot(s.slot)?.label ?? s.slot,
        url,
        cutout: useCutout,
        backgroundId: s.background_id,
        hotspots: s.doc?.hotspots ?? [],
        shadow: s.doc?.shadow ?? null,
        plate: s.doc?.plate ?? null,
        audioUrl,
      };
    })
  );
  const manifestShots = signed.filter((s): s is NonNullable<typeof s> => s !== null);
  if (manifestShots.length < captured.length) {
    // Publishing with silently dropped photos ships a broken gallery to the
    // buyer — fail loudly instead; publish is retryable.
    throw new Error('Some photos could not be prepared — check your connection and publish again.');
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
    if (frames.some((f) => !f)) {
      throw new Error('Some 360° frames could not be prepared — check your connection and publish again.');
    }
    spin = {
      frameCount: project.spin.frameCount,
      hasCutout,
      backgroundId: project.spin.backgroundId ?? 'transparent',
      frames,
      hotspots: project.spin.hotspots ?? [],
      shadow: project.spin.shadow ?? null,
    };
  }

  onStep?.('Publishing');
  const brand = getBrand();
  const watermark = watermarkVisible(brand) ? { text: brand.text.trim(), position: brand.position } : null;
  const manifest = {
    name: project.name,
    generatedAt: new Date().toISOString(),
    shots: manifestShots,
    spin,
    watermark,
  };

  const manifestTmp = `${FileSystem.cacheDirectory}manifest-${project.id}.json`;
  await FileSystem.writeAsStringAsync(manifestTmp, JSON.stringify(manifest), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const manifestPath = `${uid}/${project.id}/manifest.json`;
  try {
    await uploadFile('published', manifestPath, manifestTmp, 'application/json');
  } finally {
    // temp manifest is per-publish garbage — don't let the cache accumulate them
    await FileSystem.deleteAsync(manifestTmp, { idempotent: true }).catch(() => {});
  }
  const manifestUrl = publicUrlFor('published', manifestPath);

  const link = `${viewerUrl}?d=${encodeURIComponent(manifestUrl)}`;

  await updateProject(project.id, {
    status: 'published',
    published_url: link,
    published_at: new Date().toISOString(),
  });

  return link;
}
