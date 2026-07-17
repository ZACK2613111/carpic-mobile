import { projectKeys } from '@/features/projects/useProjects';
import { uploadShotAsset, upsertShot } from '@/features/shots/shots.api';
import { shotKeys } from '@/features/shots/useShots';
import { ensureSpinFrameCount, uploadSpinFrame } from '@/features/spin/spin.api';
import { initNetworkListener } from '@/lib/network';
import { queryClient } from '@/lib/queryClient';
import {
  drainUploadQueue,
  enqueueUpload,
  initUploadQueue,
  registerUploadHandler,
  type UploadTask,
} from '@/lib/uploadQueue';

export type ShotUploadPayload = { slot: string; section: string; position: number };
export type SpinFrameUploadPayload = { frame: number };

/**
 * Queue a captured photo for upload. Returns immediately: the photo is copied
 * to the durable outbox, so the caller can advance even with no network. The
 * shot row is written to the DB only once the file upload succeeds.
 */
export function enqueueShotUpload(args: {
  projectId: string;
  slot: string;
  section: string;
  position: number;
  sourceUri: string;
}): Promise<UploadTask> {
  return enqueueUpload({
    kind: 'shot',
    projectId: args.projectId,
    // One live task per slot: retaking a photo replaces the queued upload.
    key: `shot:${args.projectId}:${args.slot}`,
    sourceUri: args.sourceUri,
    contentType: 'image/jpeg',
    payload: { slot: args.slot, section: args.section, position: args.position } satisfies ShotUploadPayload,
  });
}

/** Queue a 360° frame for upload — same durable-outbox guarantees as shots. */
export function enqueueSpinFrameUpload(args: {
  projectId: string;
  frame: number;
  sourceUri: string;
}): Promise<UploadTask> {
  return enqueueUpload({
    kind: 'spin-frame',
    projectId: args.projectId,
    key: `spin:${args.projectId}:${args.frame}`,
    sourceUri: args.sourceUri,
    contentType: 'image/jpeg',
    payload: { frame: args.frame } satisfies SpinFrameUploadPayload,
  });
}

let initialized = false;

/** Wire handlers + restore the persisted queue + drain on reconnect. Call once at app start. */
export function initUploads(): void {
  if (initialized) return;
  initialized = true;

  registerUploadHandler('shot', async (task, fileUri) => {
    const { slot, section, position } = task.payload as ShotUploadPayload;
    const path = await uploadShotAsset(task.projectId, slot, 'original', fileUri, 'image/jpeg');
    await upsertShot(task.projectId, slot, section, position, { image_path: path, captured: true });
    void queryClient.invalidateQueries({ queryKey: shotKeys.list(task.projectId) });
  });

  registerUploadHandler('spin-frame', async (task, fileUri) => {
    const { frame } = task.payload as SpinFrameUploadPayload;
    await uploadSpinFrame(task.projectId, frame, fileUri, false);
    // Converge frameCount even when the capture screen's saveSpin ran offline.
    await ensureSpinFrameCount(task.projectId, frame + 1);
    void queryClient.invalidateQueries({ queryKey: ['spin-frames', task.projectId] });
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(task.projectId) });
  });

  void initUploadQueue();
  initNetworkListener(() => void drainUploadQueue());
}
