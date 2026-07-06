import { updateProject } from '@/features/projects/projects.api';
import type { SpinData } from '@/features/projects/types';
import { currentUserId, signedUrlFor, uploadFile } from '@/lib/storage';

const BUCKET = 'projects';

function frameName(index: number, cutout: boolean): string {
  return `frame_${String(index).padStart(3, '0')}${cutout ? '_cutout.png' : '.jpg'}`;
}

export function spinFramePath(userId: string, projectId: string, index: number, cutout: boolean): string {
  return `${userId}/${projectId}/spin/${frameName(index, cutout)}`;
}

export async function uploadSpinFrame(
  projectId: string,
  index: number,
  localUri: string,
  cutout = false
): Promise<string> {
  const uid = await currentUserId();
  const path = spinFramePath(uid, projectId, index, cutout);
  return uploadFile(BUCKET, path, localUri, cutout ? 'image/png' : 'image/jpeg');
}

export async function saveSpin(projectId: string, spin: SpinData): Promise<void> {
  await updateProject(projectId, { spin });
}

/** Signed URLs for each spin frame (original or cutout), in order. */
export async function getSpinFrameUrls(
  projectId: string,
  frameCount: number,
  cutout: boolean
): Promise<(string | null)[]> {
  const uid = await currentUserId();
  return Promise.all(
    Array.from({ length: frameCount }, (_, i) => signedUrlFor(BUCKET, spinFramePath(uid, projectId, i, cutout)))
  );
}
